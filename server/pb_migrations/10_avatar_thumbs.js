/// <reference path="../pb_data/types.d.ts" />
// Miniatures de la photo du compte (reprise du fournisseur OAuth) : l'interface charge la petite version, pas l'image d'origine.
migrate((app) => {
  const users = app.findCollectionByNameOrId("users")
  const f = users.fields.getByName("avatar")
  if (f) { f.thumbs = ["96x96", "192x192"]; app.save(users) }
}, (app) => {
  const users = app.findCollectionByNameOrId("users")
  const f = users.fields.getByName("avatar")
  if (f) { f.thumbs = []; app.save(users) }
})
