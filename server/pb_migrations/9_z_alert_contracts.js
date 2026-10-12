/// <reference path="../pb_data/types.d.ts" />
// Nommé 9_z_ : PocketBase trie les fichiers par nom. Types de contrat d'une alerte (« CDI,CDD » ; vide = tous).
migrate((app) => {
  const c = app.findCollectionByNameOrId("alerts")
  c.fields.add(new TextField({ name: "contracts", max: 100 }))
  app.save(c)
}, (app) => {
  const c = app.findCollectionByNameOrId("alerts")
  c.fields.removeByName("contracts")
  app.save(c)
})
