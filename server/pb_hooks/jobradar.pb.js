/// <reference path="../pb_data/types.d.ts" />
// Routes /jr/* : toutes exigent un utilisateur connecté ; le worker n'est joignable que d'ici.

// En-têtes de sécurité, et API d'administration injoignables par le tunnel public
// (Cloudflare ajoute CF-Connecting-IP ; en direct, via le port local ou un tunnel SSH, tout reste accessible).
routerUse((e) => {
  const path = e.request.url.path
  const viaTunnel = !!e.request.header.get("CF-Connecting-IP")
  if (viaTunnel && $os.getenv("ADMIN_PUBLIC") !== "1") {
    // Liste blanche : par le tunnel, seules les collections de l'utilisateur (compte, alertes, rapports) sont joignables ; leurs règles limitent chacun à ses propres données (par nom OU par identifiant,
    // les superusers répondent aussi à leur identifiant pbc_…). Les API d'administration sont bloquées (l'interface statique de /_/ reste servie: PocketBase y affiche la page de succès OAuth).
    const coll = path.startsWith("/api/collections") ? path.split("/")[3] || "" : null
    const adminApi = ["/api/settings", "/api/backups", "/api/logs", "/api/crons"]
    if (adminApi.some((p) => path.startsWith(p)) ||
        (coll !== null && !["users", "_pb_users_auth_", "alerts", "alert_runs"].includes(coll))) {
      return e.json(404, { message: "Not found" })
    }
  }
  if (!path.startsWith("/_/") && !path.startsWith("/api/")) {
    const h = e.response.header()
    h.set("Content-Security-Policy", "default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'self'; frame-ancestors 'none'")
    h.set("Cache-Control", "no-cache") // revalider à chaque fois : un cache de bord ne doit jamais figer une ancienne version
    h.set("Referrer-Policy", "no-referrer")
    h.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    if (viaTunnel) h.set("Strict-Transport-Security", "max-age=31536000")
  }
  return e.next()
})

// Liste d'invités optionnelle (SIGNUP_ALLOWLIST=a@x.io,b@y.io) : vide = inscription ouverte.
onRecordAuthWithOAuth2Request((e) => {
  const allow = ($os.getenv("SIGNUP_ALLOWLIST") || "").toLowerCase().split(",").map((x) => x.trim()).filter(Boolean)
  const mail = ((e.oAuth2User && e.oAuth2User.email) || "").toLowerCase()
  if (e.isNewRecord && allow.length && !allow.includes(mail)) {
    throw new ForbiddenError("Inscription sur invitation.")
  }
  e.next()
}, "users")

routerAdd("GET", "/jr/providers", (e) => {
  const lib = require(`${__hooks}/lib.js`)
  const r = lib.worker("/providers", null, 20, "GET")
  return e.json(r.statusCode, r.json)
}, $apis.requireAuth("users"))

routerAdd("GET", "/jr/status", (e) => {
  const lib = require(`${__hooks}/lib.js`)
  const rec = lib.secretOf($app, e.auth.id)
  return e.json(200, { has_key: !!rec, provider: rec ? rec.getString("provider") : "" })
}, $apis.requireAuth("users"))

routerAdd("POST", "/jr/key", (e) => {
  const lib = require(`${__hooks}/lib.js`)
  const body = e.requestInfo().body
  const r = lib.worker("/seal", { provider: body.provider || "", key: body.key || "" })
  if (r.statusCode !== 200) return e.json(r.statusCode, r.json)

  let rec = lib.secretOf($app, e.auth.id)
  if (!rec) {
    rec = new Record($app.findCollectionByNameOrId("secrets"))
    rec.set("user", e.auth.id)
  }
  rec.set("api_key_enc", r.json.enc)
  rec.set("provider", body.provider)
  $app.save(rec)
  return e.json(200, { ok: true })
}, $apis.requireAuth("users"))

routerAdd("DELETE", "/jr/key", (e) => {
  const lib = require(`${__hooks}/lib.js`)
  const rec = lib.secretOf($app, e.auth.id)
  if (rec) $app.delete(rec)
  return e.json(200, { ok: true })
}, $apis.requireAuth("users"))

routerAdd("POST", "/jr/search", (e) => {
  const lib = require(`${__hooks}/lib.js`)
  const body = e.requestInfo().body
  const r = lib.worker("/search", { ...body, user: e.auth.id }, 240)
  return e.json(r.statusCode, r.json)
}, $apis.requireAuth("users"))

routerAdd("POST", "/jr/cv/import", (e) => {
  const lib = require(`${__hooks}/lib.js`)
  const rec = lib.secretOf($app, e.auth.id)
  if (!rec) return e.json(400, { error: "Configurez d'abord votre IA (Paramètres) : elle sert à structurer le CV." })
  const body = e.requestInfo().body
  const r = lib.worker("/cv/extract", {
    provider: rec.getString("provider"),
    enc: rec.getString("api_key_enc"),
    kind: body.kind,
    data: body.data,
    text: body.text,
  }, 240)
  return e.json(r.statusCode, r.json)
}, $apis.requireAuth("users"))

// Évaluations déjà en mémoire pour ces offres (null = à évaluer) : le client ne remplit ses lots qu'avec les inconnues.
routerAdd("POST", "/jr/evaluate/lookup", (e) => {
  const lib = require(`${__hooks}/lib.js`)
  const jobs = e.requestInfo().body.jobs || []
  const c = lib.evalCtx(e.auth, jobs, "light")
  if (c.err) return e.json(c.err.status, c.err.json)
  return e.json(200, { results: c.keys.map((k) => c.hits[k] || null) })
}, $apis.requireAuth("users"))

routerAdd("POST", "/jr/evaluate/batch", (e) => {
  const lib = require(`${__hooks}/lib.js`)
  const jobs = e.requestInfo().body.jobs || []
  const ev = lib.evaluateLight(e.auth, jobs)
  if (ev.error) return e.json(ev.status || 502, { error: ev.error })
  return e.json(200, { results: ev.results, cached: ev.cached })
}, $apis.requireAuth("users"))

routerAdd("POST", "/jr/evaluate", (e) => {
  const lib = require(`${__hooks}/lib.js`)
  const job = e.requestInfo().body
  const c = lib.evalCtx(e.auth, [job], "full")
  if (c.err) return e.json(c.err.status, c.err.json)
  if (c.hits[c.keys[0]]) return e.json(200, { ...c.hits[c.keys[0]], cached: true })
  const r = lib.worker("/evaluate", { ...c.base, job }, 240)
  if (r.statusCode === 200) lib.cachePut($app, e.auth.id, c.keys[0], "full", r.json)
  return e.json(r.statusCode, r.json)
}, $apis.requireAuth("users"))

// ---- Alertes quotidiennes ----
// Les sites d'une alerte sont filtrés sur une liste fixe (à chaque création ou modification).
onRecordCreateRequest((e) => {
  const max = parseInt($os.getenv("ALERTS_PER_USER") || "3", 10)
  const n = $app.countRecords("alerts", $dbx.exp("user = {:u}", { u: e.auth.id }))
  if (n >= max) throw new BadRequestError(`${max} alertes maximum par compte.`)
  let sites = []
  try { sites = JSON.parse(e.record.getString("sites") || "[]") } catch (_) {}
  sites = sites.filter((s) => ["indeed", "hellowork", "linkedin", "glassdoor"].includes(s))
  e.record.set("sites", sites.length ? sites : ["indeed", "hellowork"])
  e.record.set("queued", false)
  e.record.set("last_status", "")
  e.next()
}, "alerts")
onRecordUpdateRequest((e) => {
  let sites = []
  try { sites = JSON.parse(e.record.getString("sites") || "[]") } catch (_) {}
  sites = sites.filter((s) => ["indeed", "hellowork", "linkedin", "glassdoor"].includes(s))
  e.record.set("sites", sites.length ? sites : ["indeed", "hellowork"])
  e.next()
}, "alerts")
cronAdd("alertsDaily", $os.getenv("ALERTS_CRON") || "0 7 * * *", () => { require(`${__hooks}/lib.js`).runAllAlerts() })
cronAdd("alertsQueue", "* * * * *", () => { require(`${__hooks}/lib.js`).runQueued() })

// Purge quotidienne : les évaluations de plus de 30 jours sont oubliées.
cronAdd("evalCachePurge", "17 4 * * *", () => {
  $app.db().newQuery("DELETE FROM eval_cache WHERE created < datetime('now','-30 day')").execute()
})
