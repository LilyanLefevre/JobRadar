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
  // Contexte commun des routes d'évaluation : clé de l'utilisateur, empreintes de cache calculées par le worker, entrées déjà en mémoire.
  evalCtx(e, jobs, mode) {
    const rec = this.secretOf($app, e.auth.id)
    if (!rec) return { error: e.json(400, { error: "Choisissez un fournisseur et ajoutez votre clé API." }) }
    const base = {
      provider: rec.getString("provider"),
      enc: rec.getString("api_key_enc"),
      cv: e.auth.getString("cv"),
      profile: JSON.parse(e.auth.getString("profile") || "null"),
    }
    const kr = this.worker("/keys", { ...base, jobs, mode }, 30)
    if (kr.statusCode !== 200) return { error: e.json(kr.statusCode, kr.json) }
    return { base, keys: kr.json.keys, hits: this.cacheGet($app, e.auth.id, kr.json.keys) }
  },
  secretOf(app, userId) {
    try {
      return app.findFirstRecordByFilter("secrets", "user = {:u}", { u: userId })
    } catch (_) {
      return null
    }
  },
}
