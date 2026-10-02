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
    if (path === "/manifest.webmanifest") h.set("Content-Type", "application/manifest+json")
    h.set("Content-Security-Policy", "default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; manifest-src 'self'; worker-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'self'; frame-ancestors 'none'")
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

routerAdd("POST", "/jr/places", (e) => {
  const lib = require(`${__hooks}/lib.js`)
  const r = lib.worker("/places", { q: String(e.requestInfo().body.q || "") }, 8)
  return e.json(200, r.statusCode === 200 ? r.json : { places: [] })
}, $apis.requireAuth("users"))

routerAdd("GET", "/jr/providers", (e) => {
  const lib = require(`${__hooks}/lib.js`)
  const r = lib.worker("/providers", null, 20, "GET")
  return e.json(r.statusCode, r.json)
}, $apis.requireAuth("users"))

// Fournisseurs d'IA de l'utilisateur, dans l'ordre de priorité (le premier est le principal).
routerAdd("GET", "/jr/status", (e) => {
  const lib = require(`${__hooks}/lib.js`)
  const nowS = Math.floor(Date.now() / 1000)
  const recs = lib.providersOf(e.auth.id)
  return e.json(200, {
    has_key: recs.length > 0,
    provider: recs.length ? recs[0].getString("provider") : "",
    providers: recs.map((r) => ({ provider: r.getString("provider"), ok: r.getInt("cooldown_until") <= nowS, cooldown_until: r.getInt("cooldown_until"), last_error: r.getString("last_error"), last_code: r.getString("last_code") })),
  })
}, $apis.requireAuth("users"))

routerAdd("POST", "/jr/key", (e) => {
  const lib = require(`${__hooks}/lib.js`)
  const body = e.requestInfo().body
  const r = lib.worker("/seal", { provider: body.provider || "", key: body.key || "" })
  if (r.statusCode !== 200) return e.json(r.statusCode, r.json)
  const recs = lib.providersOf(e.auth.id)
  let rec = recs.find((x) => x.getString("provider") === body.provider)
  if (!rec) {
    if (recs.length >= 6) return e.json(400, { error: "6 fournisseurs maximum." })
    rec = new Record($app.findCollectionByNameOrId("secrets"))
    rec.set("user", e.auth.id); rec.set("provider", body.provider); rec.set("position", recs.length)
  }
  rec.set("api_key_enc", r.json.enc); rec.set("cooldown_until", 0); rec.set("last_error", ""); rec.set("last_code", "")
  $app.save(rec)
  return e.json(200, { ok: true })
}, $apis.requireAuth("users"))

routerAdd("DELETE", "/jr/key", (e) => {
  const lib = require(`${__hooks}/lib.js`)
  const provider = e.request.url.query().get("provider")
  const recs = lib.providersOf(e.auth.id)
  recs.filter((r) => !provider || r.getString("provider") === provider).forEach((r) => $app.delete(r))
  lib.providersOf(e.auth.id).forEach((r, i) => { if (r.getInt("position") !== i) { r.set("position", i); $app.save(r) } })
  return e.json(200, { ok: true })
}, $apis.requireAuth("users"))

// Nouvel ordre de priorité : { order: ["mistral", "gemini"] }
routerAdd("POST", "/jr/keys/order", (e) => {
  const lib = require(`${__hooks}/lib.js`)
  const order = e.requestInfo().body.order || []
  lib.providersOf(e.auth.id).forEach((r) => {
    const i = order.indexOf(r.getString("provider"))
    if (i >= 0 && r.getInt("position") !== i) { r.set("position", i); $app.save(r) }
  })
  return e.json(200, { ok: true })
}, $apis.requireAuth("users"))

// Mémoire des évaluations : vider (utile après un changement de fournisseur principal).
routerAdd("DELETE", "/jr/cache", (e) => {
  $app.db().newQuery("DELETE FROM eval_cache WHERE user = {:u}").bind({ u: e.auth.id }).execute()
  return e.json(200, { ok: true })
}, $apis.requireAuth("users"))

// ---- Notifications push ----
routerAdd("GET", "/jr/push/key", (e) => {
  const lib = require(`${__hooks}/lib.js`)
  return e.json(200, { public: lib.vapid().public })
}, $apis.requireAuth("users"))

routerAdd("GET", "/jr/push/devices", (e) => {
  const subs = [...$app.findRecordsByFilter("push_subs", "user = {:u}", "-created", 0, 0, { u: e.auth.id })]
  return e.json(200, { devices: subs.map((s) => ({ id: s.id, label: s.getString("label"), created: s.getString("created"), endpoint: s.getString("endpoint") })) })
}, $apis.requireAuth("users"))

routerAdd("POST", "/jr/push/subscribe", (e) => {
  const lib = require(`${__hooks}/lib.js`)
  const b = e.requestInfo().body
  const sub = b.subscription || {}
  const keys = sub.keys || {}
  if (!sub.endpoint || !keys.p256dh || !keys.auth) return e.json(400, { error: "Abonnement invalide." })
  if (!lib.worker("/push/check", { endpoint: sub.endpoint }, 10).json.ok) return e.json(400, { error: "Service de notification non pris en charge." })
  let rec
  try { rec = $app.findFirstRecordByFilter("push_subs", "endpoint = {:e}", { e: sub.endpoint }) } catch (_) {
    const n = $app.countRecords("push_subs", $dbx.exp("user = {:u}", { u: e.auth.id }))
    if (n >= 10) return e.json(400, { error: "10 appareils maximum." })
    rec = new Record($app.findCollectionByNameOrId("push_subs"))
  }
  rec.set("user", e.auth.id); rec.set("endpoint", sub.endpoint); rec.set("p256dh", keys.p256dh); rec.set("auth", keys.auth); rec.set("label", String(b.label || "").slice(0, 80))
  $app.save(rec)
  return e.json(200, { ok: true })
}, $apis.requireAuth("users"))

routerAdd("POST", "/jr/push/unsubscribe", (e) => {
  const b = e.requestInfo().body
  const subs = [...$app.findRecordsByFilter("push_subs", "user = {:u}", "", 0, 0, { u: e.auth.id })]
  subs.filter((s) => s.id === b.id || (b.endpoint && s.getString("endpoint") === b.endpoint)).forEach((s) => $app.delete(s))
  return e.json(200, { ok: true })
}, $apis.requireAuth("users"))

routerAdd("POST", "/jr/push/test", (e) => {
  const lib = require(`${__hooks}/lib.js`)
  const sent = lib.notify(e.auth, { title: "JobRadar", body: "Les notifications fonctionnent sur cet appareil.", url: "/#/alerts", tag: "test" })
  return e.json(200, sent)
}, $apis.requireAuth("users"))

routerAdd("POST", "/jr/search", (e) => {
  const lib = require(`${__hooks}/lib.js`)
  const body = e.requestInfo().body
  const r = lib.worker("/search", { ...body, scheduled: false, user: e.auth.id, keywords: lib.keywordsOf(e.auth) }, 240)
  return e.json(r.statusCode, r.json)
}, $apis.requireAuth("users"))

routerAdd("POST", "/jr/cv/import", (e) => {
  const lib = require(`${__hooks}/lib.js`)
  if (!lib.providersOf(e.auth.id).length) return e.json(400, { error: "Configurez d'abord votre IA (Paramètres) : elle sert à structurer le CV." })
  const body = e.requestInfo().body
  const r = lib.callAI(e.auth, "/cv/extract", { kind: body.kind, data: body.data, text: body.text }, 240)
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
  return e.json(200, { results: ev.results, cached: ev.cached, via: ev.via, switched: ev.switched })
}, $apis.requireAuth("users"))

routerAdd("POST", "/jr/evaluate", (e) => {
  const lib = require(`${__hooks}/lib.js`)
  const job = e.requestInfo().body
  const c = lib.evalCtx(e.auth, [job], "full")
  if (c.err) return e.json(c.err.status, c.err.json)
  if (c.hits[c.keys[0]]) return e.json(200, { ...c.hits[c.keys[0]], cached: true })
  const r = lib.callAI(e.auth, "/evaluate", { ...c.base, job }, 240)
  if (r.statusCode === 200) lib.cachePut($app, e.auth.id, c.keys[0], "full", r.json)
  return e.json(r.statusCode, r.statusCode === 200 ? { ...r.json, via: r.via, switched: r.switched } : r.json)
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
