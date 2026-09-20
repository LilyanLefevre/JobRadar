/// <reference path="../pb_data/types.d.ts" />
// Nommé 9_z_ : PocketBase trie les fichiers par nom. Rayon de recherche (km) et jusqu'à 3 lieux par alerte.
migrate((app) => {
  const c = app.findCollectionByNameOrId("alerts")
  c.fields.add(new NumberField({ name: "radius", min: 0, max: 200, onlyInt: true }))
  c.fields.getByName("location").max = 200
  app.save(c)
}, (app) => {
  const c = app.findCollectionByNameOrId("alerts")
  c.fields.removeByName("radius"); c.fields.getByName("location").max = 100
  app.save(c)
})
