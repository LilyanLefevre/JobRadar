// Appel du worker interne (réseau docker, jamais exposé). Les handlers n'ont pas accès à la portée du fichier: on passe par require().
module.exports = {
  worker(path, body, timeout, method) {
    return $http.send({
      url: $os.getenv("WORKER_URL") + path,
      method: method || "POST",
      body: body ? JSON.stringify(body) : undefined,
      headers: { "Content-Type": "application/json", "X-Worker-Secret": $os.getenv("WORKER_SECRET") },
      timeout: timeout || 60,
    })
  },
  // Mémoire des évaluations (collection eval_cache, sans accès API).
  cacheGet(app, userId, keys) {
    const out = {}
    if (!keys.length) return out
    const params = { u: userId }
    const conds = keys.map((k, i) => { params["k" + i] = k; return `key = {:k${i}}` })
    for (const r of app.findRecordsByFilter("eval_cache", `user = {:u} && (${conds.join(" || ")})`, "", 0, 0, params)) {
      out[r.getString("key")] = JSON.parse(r.getString("result"))
    }
    return out
  },
  cachePut(app, userId, key, mode, result) {
    try {
      const rec = new Record(app.findCollectionByNameOrId("eval_cache"))
      rec.set("user", userId); rec.set("key", key); rec.set("mode", mode); rec.set("result", result)
      app.save(rec)
    } catch (_) { /* doublon concurrent : déjà en mémoire */ }
  },
  // Contexte d'évaluation d'un utilisateur : clé, empreintes de cache calculées par le worker, entrées déjà en mémoire.
  evalCtx(user, jobs, mode) {
    const rec = this.secretOf($app, user.id)
    if (!rec) return { err: { status: 400, json: { error: "Choisissez un fournisseur et ajoutez votre clé API." } } }
    const base = {
      provider: rec.getString("provider"),
      enc: rec.getString("api_key_enc"),
      cv: user.getString("cv"),
      profile: JSON.parse(user.getString("profile") || "null"),
    }
    const kr = this.worker("/keys", { ...base, jobs, mode }, 30)
    if (kr.statusCode !== 200) return { err: { status: kr.statusCode, json: kr.json } }
    return { base, keys: kr.json.keys, batch: kr.json.batch || 8, hits: this.cacheGet($app, user.id, kr.json.keys) }
  },
  // Évalue des offres : mémoire d'abord, puis un appel d'IA par lot d'offres inconnues.
  evaluateLight(user, jobs) {
    const c = this.evalCtx(user, jobs, "light")
    if (c.err) return { results: [], error: (c.err.json && c.err.json.error) || "Évaluation impossible.", status: c.err.status }
    const results = c.keys.map((k) => c.hits[k] || null)
    const miss = results.map((r, i) => (r ? -1 : i)).filter((i) => i >= 0)
    for (let s = 0; s < miss.length; s += c.batch) {
      const idx = miss.slice(s, s + c.batch)
      const r = this.worker("/evaluate_batch", { ...c.base, jobs: idx.map((i) => jobs[i]) }, 240)
      if (r.statusCode !== 200) return { results, error: (r.json && r.json.error) || "Évaluation impossible.", status: r.statusCode }
      idx.forEach((i, n) => { const res = r.json.results[n]; results[i] = res; if (res) this.cachePut($app, user.id, c.keys[i], "light", res) })
    }
    return { results, cached: jobs.length - miss.length }
  },

  // ---- Alertes quotidiennes ----
  runAlert(alert) {
    const userId = alert.getString("user")
    const user = $app.findRecordById("users", userId)
    const stamp = () => alert.set("last_run_at", new DateTime())
    // verrou : une alerte déjà en cours depuis moins de 15 minutes n'est pas relancée
    if (alert.getString("last_status") === "running" && alert.getDateTime("last_run_at").time().after(new Date(Date.now() - 15 * 60 * 1000))) return
    alert.set("last_status", "running"); alert.set("queued", false); stamp(); $app.save(alert)

    const finish = (status, message, items, found) => {
      const run = new Record($app.findCollectionByNameOrId("alert_runs"))
      run.set("user", userId); run.set("alert", alert.id); run.set("status", status); run.set("message", message || "")
      run.set("found", found || 0); run.set("new_count", items.length); run.set("jobs", items); run.set("seen", items.length === 0)
      $app.save(run)
      alert.set("last_status", status); alert.set("last_message", message || ""); stamp(); alert.set("queued", false); $app.save(alert)
    }

    if (!this.secretOf($app, userId)) return finish("skipped", "IA non configurée : ajoutez votre clé dans les Paramètres.", [], 0)
    const profile = JSON.parse(user.getString("profile") || "null")
    if (!profile && !user.getString("cv").trim()) return finish("skipped", "Profil vide : importez votre CV.", [], 0)

    let sites = []
    try { sites = JSON.parse(alert.getString("sites") || "[]") } catch (_) {}
    const sr = this.worker("/search", { user: userId, scheduled: true, query: alert.getString("query"), location: alert.getString("location"), n: 15, hours: alert.getInt("hours") || 48, sites }, 240)
    if (sr.statusCode !== 200) return finish("error", (sr.json && sr.json.error) || "Recherche impossible.", [], 0)
    const jobs = sr.json.jobs || []

    // nouvelles offres seulement (clé = empreinte de l'adresse)
    const ukey = (j) => $security.sha256(String(j.url || j.titre + "|" + j.entreprise)).slice(0, 32)
    const known = {}
    if (jobs.length) {
      const params = { a: alert.id }
      const conds = jobs.map((j, i) => { params["k" + i] = ukey(j); return `ukey = {:k${i}}` })
      for (const r of $app.findRecordsByFilter("alert_seen", `alert = {:a} && (${conds.join(" || ")})`, "", 0, 0, params)) known[r.getString("ukey")] = true
    }
    const fresh = jobs.filter((j) => !known[ukey(j)]).slice(0, 60)
    if (!fresh.length) return finish("ok", "Aucune nouvelle offre.", [], jobs.length)

    const ev = this.evaluateLight(user, fresh)
    if (ev.error) return finish("error", ev.error, [], fresh.length) // rien n'est marqué comme vu : on retentera demain
    const min = alert.getInt("min_score")
    const items = []
    fresh.forEach((j, i) => {
      const r = ev.results[i]
      if (r && r.match >= min) items.push({ titre: j.titre, entreprise: j.entreprise, lieu: j.lieu, site: j.site, url: j.url, date: j.date, match: r.match, cv_score: r.cv_score, verdict: r.verdict, forces: r.forces, manques: r.manques })
      if (r) { try { const rec = new Record($app.findCollectionByNameOrId("alert_seen")); rec.set("alert", alert.id); rec.set("ukey", ukey(j)); $app.save(rec) } catch (_) {} }
    })
    items.sort((a, b) => b.match - a.match)
    return finish("ok", `${fresh.length} nouvelle${fresh.length > 1 ? "s" : ""} offre${fresh.length > 1 ? "s" : ""} examinée${fresh.length > 1 ? "s" : ""}.`, items, jobs.length)
  },
  runAllAlerts() {
    for (const a of $app.findRecordsByFilter("alerts", "active = true", "user", 0, 0)) {
      try { this.runAlert(a) } catch (err) { try { a.set("last_status", "error"); a.set("last_message", String(err).slice(0, 300)); $app.save(a) } catch (_) {} }
    }
    $app.db().newQuery("DELETE FROM alert_runs WHERE ran_at < datetime('now','-60 day')").execute()
    $app.db().newQuery("DELETE FROM alert_seen WHERE created < datetime('now','-90 day')").execute()
  },
  runQueued() {
    for (const a of $app.findRecordsByFilter("alerts", "queued = true", "", 5, 0)) {
      try {
        const last = a.getString("last_run_at")
        if (last && a.getDateTime("last_run_at").time().after(new Date(Date.now() - 10 * 60 * 1000)) && a.getString("last_status") !== "running") {
          a.set("queued", false); a.set("last_message", "Dernier passage trop récent : réessayez dans quelques minutes."); $app.save(a); continue
        }
        this.runAlert(a)
      } catch (err) { try { a.set("queued", false); a.set("last_status", "error"); a.set("last_message", String(err).slice(0, 300)); $app.save(a) } catch (_) {} }
    }
  },
  secretOf(app, userId) {
    try {
      return app.findFirstRecordByFilter("secrets", "user = {:u}", { u: userId })
    } catch (_) {
      return null
    }
  },
}
