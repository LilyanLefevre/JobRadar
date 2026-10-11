/// <reference path="../pb_data/types.d.ts" />
// Routes /jr/* : toutes exigent un utilisateur connecté ; le worker n'est joignable que d'ici.

routerAdd("GET", "/jr/status", (e) => {
  const lib = require(`${__hooks}/lib.js`)
  return e.json(200, { has_key: !!lib.secretOf($app, e.auth.id) })
}, $apis.requireAuth("users"))

routerAdd("POST", "/jr/key", (e) => {
  const lib = require(`${__hooks}/lib.js`)
  const body = e.requestInfo().body
  const r = lib.worker("/seal", { key: body.key || "" })
  if (r.statusCode !== 200) return e.json(r.statusCode, r.json)

  let rec = lib.secretOf($app, e.auth.id)
  if (!rec) {
    rec = new Record($app.findCollectionByNameOrId("secrets"))
    rec.set("user", e.auth.id)
  }
  rec.set("api_key_enc", r.json.enc)
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

routerAdd("POST", "/jr/evaluate", (e) => {
  const lib = require(`${__hooks}/lib.js`)
  const rec = lib.secretOf($app, e.auth.id)
  if (!rec) return e.json(400, { error: "Ajoutez d'abord votre clé API Anthropic." })
  const r = lib.worker("/evaluate", {
    enc: rec.getString("api_key_enc"),
    cv: e.auth.getString("cv"),
    job: e.requestInfo().body,
  }, 240)
  return e.json(r.statusCode, r.json)
}, $apis.requireAuth("users"))
