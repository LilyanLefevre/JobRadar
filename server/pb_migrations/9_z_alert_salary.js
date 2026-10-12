/// <reference path="../pb_data/types.d.ts" />
// Nommé 9_z_ car PocketBase trie les fichiers par nom : « 11_ » passerait avant « 1_ ».
// Critère de salaire pour les alertes : minimum annuel brut et option « salaire indiqué uniquement ».
migrate((app) => {
  const c = app.findCollectionByNameOrId("alerts")
  c.fields.add(new NumberField({ name: "salary_min", min: 0, max: 1000000, onlyInt: true }))
  c.fields.add(new BoolField({ name: "salary_required" }))
  app.save(c)
}, (app) => {
  const c = app.findCollectionByNameOrId("alerts")
  c.fields.removeByName("salary_min"); c.fields.removeByName("salary_required")
  app.save(c)
})
