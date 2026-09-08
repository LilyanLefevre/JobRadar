/// <reference path="../pb_data/types.d.ts" />
// Routes /jr/* : toutes exigent un utilisateur connecté ; le worker n'est joignable que d'ici.

// En-têtes de sécurité, et API d'administration injoignables par le tunnel public
// (Cloudflare ajoute CF-Connecting-IP ; en direct, via le port local ou un tunnel SSH, tout reste accessible).
routerUse((e) => {
  const path = e.request.url.path
  const viaTunnel = !!e.request.header.get("CF-Connecting-IP")
  if (viaTunnel && $os.getenv("ADMIN_PUBLIC") !== "1") {
    // Liste blanche : par le tunnel, seule la collection des utilisateurs est joignable (par nom OU par identifiant,
    // les superusers répondent aussi à leur identifiant pbc_…). Les API d'administration sont bloquées (l'interface statique de /_/ reste servie: PocketBase y affiche la page de succès OAuth).
    const coll = path.startsWith("/api/collections") ? path.split("/")[3] || "" : null
    const adminApi = ["/api/settings", "/api/backups", "/api/logs", "/api/crons"]
    if (adminApi.some((p) => path.startsWith(p)) ||
        (coll !== null && coll !== "users" && coll !== "_pb_users_auth_")) {
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

routerAdd("POST", "/jr/evaluate/batch", (e) => {
  const lib = require(`${__hooks}/lib.js`)
  const rec = lib.secretOf($app, e.auth.id)
  if (!rec) return e.json(400, { error: "Choisissez un fournisseur et ajoutez votre clé API." })
  const r = lib.worker("/evaluate_batch", {
    provider: rec.getString("provider"),
    enc: rec.getString("api_key_enc"),
    cv: e.auth.getString("cv"),
    profile: JSON.parse(e.auth.getString("profile") || "null"),
    jobs: e.requestInfo().body.jobs,
  }, 240)
  return e.json(r.statusCode, r.json)
}, $apis.requireAuth("users"))

routerAdd("POST", "/jr/evaluate", (e) => {
  const lib = require(`${__hooks}/lib.js`)
  const rec = lib.secretOf($app, e.auth.id)
  if (!rec) return e.json(400, { error: "Choisissez un fournisseur et ajoutez votre clé API." })
  const r = lib.worker("/evaluate", {
    provider: rec.getString("provider"),
    enc: rec.getString("api_key_enc"),
    cv: e.auth.getString("cv"),
    profile: JSON.parse(e.auth.getString("profile") || "null"),
    job: e.requestInfo().body,
  }, 240)
  return e.json(r.statusCode, r.json)
}, $apis.requireAuth("users"))
