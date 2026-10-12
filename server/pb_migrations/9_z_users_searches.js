/// <reference path="../pb_data/types.d.ts" />
// Nommé 9_z_ : PocketBase trie les fichiers par nom. Historique des recherches synchronisé entre appareils.
migrate((app) => {
  const users = app.findCollectionByNameOrId("users")
  users.fields.add(new JSONField({ name: "searches", maxSize: 20000 }))
  app.save(users)
}, (app) => {
  const users = app.findCollectionByNameOrId("users")
  users.fields.removeByName("searches")
  app.save(users)
})
