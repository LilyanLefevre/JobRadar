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
  // ---- Fournisseurs d'IA multiples, avec bascule automatique ----
  providersOf(userId) {
    return [...$app.findRecordsByFilter("secrets", "user = {:u}", "position,id", 0, 0, { u: userId })] // vrai tableau JS (map/find/filter)
  },
  // Appelle le worker avec le premier fournisseur disponible ; en cas de panne (limite de débit, crédit épuisé, injoignable,
  // clé refusée), le passe en pause un moment et essaie le suivant. Renvoie la réponse du worker + { via } le fournisseur qui a répondu.
  callAI(user, path, payload, timeout) {
    const recs = this.providersOf(user.id)
    if (!recs.length) return { statusCode: 400, json: { error: "Choisissez un fournisseur et ajoutez votre clé API.", code: "no_key" } }
    const nowS = Math.floor(Date.now() / 1000)
    let pool = recs.filter((r) => r.getInt("cooldown_until") <= nowS)
    if (!pool.length) pool = recs.filter((r) => r.getString("last_code") !== "auth") // tous en pause : on retente quand même, sauf les clés refusées
    if (!pool.length) return { statusCode: 401, json: { error: "Toutes vos clés d'IA sont refusées : mettez-les à jour dans les Paramètres.", code: "auth" } }
    const errs = []
    for (const r of pool) {
      const res = this.worker(path, { ...payload, provider: r.getString("provider"), enc: r.getString("api_key_enc") }, timeout)
      if (res.statusCode === 200) {
        if (r.getInt("cooldown_until") || r.getString("last_error")) { r.set("cooldown_until", 0); r.set("last_error", ""); r.set("last_code", ""); $app.save(r) }
        return { statusCode: 200, json: res.json, via: r.getString("provider"), switched: errs.length > 0 }
      }
      const code = (res.json && res.json.code) || "unavailable"
      if (code === "invalid") return res // requête invalide : ce n'est pas une panne du fournisseur
      const msg = (res.json && res.json.error) || "Erreur du fournisseur."
      const cool = { auth: 86400, rate_limit: 120, unavailable: 300, bad_output: 0 }[code]
      r.set("cooldown_until", cool ? nowS + cool : 0); r.set("last_error", msg.slice(0, 300)); r.set("last_code", code); $app.save(r)
      errs.push(msg)
    }
    return { statusCode: 503, json: { error: errs.length > 1 ? "Aucun fournisseur d'IA disponible : " + errs.join(" · ") : errs[0], code: "all_failed" } }
  },

  // Contexte d'évaluation : empreintes de cache (indépendantes du fournisseur) et entrées déjà en mémoire.
  evalCtx(user, jobs, mode) {
    if (!this.providersOf(user.id).length) return { err: { status: 400, json: { error: "Choisissez un fournisseur et ajoutez votre clé API." } } }
    const base = { cv: user.getString("cv"), profile: JSON.parse(user.getString("profile") || "null") }
    const kr = this.worker("/keys", { ...base, jobs, mode }, 30)
    if (kr.statusCode !== 200) return { err: { status: kr.statusCode, json: kr.json } }
    return { base, keys: kr.json.keys, batch: kr.json.batch || 15, hits: this.cacheGet($app, user.id, kr.json.keys) }
  },
  // Évalue des offres : mémoire d'abord, puis un appel d'IA par lot d'offres inconnues.
  evaluateLight(user, jobs) {
    const c = this.evalCtx(user, jobs, "light")
    if (c.err) return { results: [], error: (c.err.json && c.err.json.error) || "Évaluation impossible.", status: c.err.status }
    const results = c.keys.map((k) => c.hits[k] || null)
    const miss = results.map((r, i) => (r ? -1 : i)).filter((i) => i >= 0)
    let via = "", switched = false
    for (let s = 0; s < miss.length; s += c.batch) {
      const idx = miss.slice(s, s + c.batch)
      const r = this.callAI(user, "/evaluate_batch", { ...c.base, jobs: idx.map((i) => jobs[i]) }, 240)
      if (r.statusCode !== 200) return { results, error: (r.json && r.json.error) || "Évaluation impossible.", status: r.statusCode }
      via = r.via; switched = switched || r.switched
      idx.forEach((i, n) => { const res = r.json.results[n]; results[i] = res; if (res) this.cachePut($app, user.id, c.keys[i], "light", res) })
    }
    return { results, cached: jobs.length - miss.length, via, switched }
  },

  // ---- Notifications : un seul point d'envoi, un canal par moyen (push aujourd'hui, e-mail ensuite) ----
  kvGet(k) { try { return $app.findFirstRecordByFilter("kv", "k = {:k}", { k }).getString("v") } catch (_) { return "" } },
  kvSet(k, v) {
    let rec
    try { rec = $app.findFirstRecordByFilter("kv", "k = {:k}", { k }) } catch (_) { rec = new Record($app.findCollectionByNameOrId("kv")); rec.set("k", k) }
    rec.set("v", v); $app.save(rec)
  },
  vapid() {
    let pub = this.kvGet("vapid_public"), priv = this.kvGet("vapid_private")
    if (!pub || !priv) {
      const r = this.worker("/vapid/new", {}, 30)
      if (r.statusCode !== 200) throw new Error("Génération des clés VAPID impossible.")
      pub = r.json.public; priv = r.json.private; this.kvSet("vapid_public", pub); this.kvSet("vapid_private", priv)
    }
    return { public: pub, private: priv }
  },
  pushTo(user, msg) {
    const subs = [...$app.findRecordsByFilter("push_subs", "user = {:u}", "", 0, 0, { u: user.id })]
    if (!subs.length) return 0
    const r = this.worker("/push", {
      subs: subs.map((s) => ({ endpoint: s.getString("endpoint"), p256dh: s.getString("p256dh"), auth: s.getString("auth") })),
      payload: msg, vapid_private: this.vapid().private, subject: $os.getenv("VAPID_SUBJECT") || "mailto:noreply@example.com",
    }, 60)
    if (r.statusCode !== 200) return 0
    r.json.results.forEach((st, i) => { if (st === "gone" || st === "blocked") $app.delete(subs[i]) }) // abonnements expirés
    return r.json.results.filter((x) => x === "ok").length
  },
  notify(user, msg) {
    // Pour ajouter l'e-mail : un canal « mailTo(user, msg) » appelé ici selon les préférences de l'utilisateur.
    return { push: this.pushTo(user, msg) }
  },

  // ---- Alertes quotidiennes ----
  // Mots-clés du profil (compétences, métiers visés) pour la pertinence estimée sans IA.
  keywordsOf(user) {
    try {
      const pr = JSON.parse(user.getString("profile") || "null") || {}
      return [...(pr.recherche && pr.recherche.metiers || []), ...(pr.competences || []).flatMap((c) => c.items || [])].filter((k) => typeof k === "string").slice(0, 60)
    } catch (_) { return [] }
  },
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
      if (status === "ok" && items.length) {
        try { this.notify(user, { title: `JobRadar · ${alert.getString("name") || alert.getString("query")}`, body: `${items.length} nouvelle${items.length > 1 ? "s" : ""} offre${items.length > 1 ? "s" : ""}${items[0].match != null ? ` (meilleur match ${items[0].match} %)` : ""}`, url: "/#/alerts", tag: "alert-" + alert.id }) } catch (_) { /* une notification manquée ne casse pas le rapport */ }
      }
    }

    let sites = []
    try { sites = JSON.parse(alert.getString("sites") || "[]") } catch (_) {}
    const sr = this.worker("/search", { user: userId, scheduled: true, query: alert.getString("query"), location: alert.getString("location"), n: 15, hours: alert.getInt("hours") || 48, sites, keywords: this.keywordsOf(user), salary_min: alert.getInt("salary_min"), salary_required: alert.getBool("salary_required") }, 240)
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

    // L'IA est un plus : sans clé, sans profil ou en cas de panne, les nouvelles offres sont quand même transmises (pertinence estimée).
    const profile = JSON.parse(user.getString("profile") || "null")
    let ev = null, note = ""
    if (this.providersOf(userId).length && (profile || user.getString("cv").trim())) {
      ev = this.evaluateLight(user, fresh)
      if (ev.error) { note = ` IA indisponible (${ev.error}) : offres non évaluées.`; ev = null }
    } else note = " Sans IA : offres classées par pertinence estimée."
    const min = alert.getInt("min_score")
    const items = []
    fresh.forEach((j, i) => {
      const r = ev && ev.results[i]
      if (!r || r.match >= min) items.push({ titre: j.titre, entreprise: j.entreprise, lieu: j.lieu, site: j.site, url: j.url, date: j.date, salaire: j.salaire, contrat: j.contrat, teletravail: j.teletravail, pre: j.pre, match: r ? r.match : null, cv_score: r ? r.cv_score : null, verdict: r ? r.verdict : "", forces: r ? r.forces : [], manques: r ? r.manques : [] })
      try { const rec = new Record($app.findCollectionByNameOrId("alert_seen")); rec.set("alert", alert.id); rec.set("ukey", ukey(j)); $app.save(rec) } catch (_) {}
    })
    items.sort((a, b) => (b.match == null ? -1 : b.match) - (a.match == null ? -1 : a.match) || (b.pre || 0) - (a.pre || 0))
    return finish("ok", `${fresh.length} nouvelle${fresh.length > 1 ? "s" : ""} offre${fresh.length > 1 ? "s" : ""} examinée${fresh.length > 1 ? "s" : ""}.${note}`, items, jobs.length)
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
}
