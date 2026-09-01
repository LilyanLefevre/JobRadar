/// <reference path="../pb_data/types.d.ts" />
// Les comptes ne se créent que par OAuth: une création directe via l'API (contexte "default") est refusée.
migrate((app) => {
  const users = app.findCollectionByNameOrId("users")
  users.createRule = "@request.context = 'oauth2'"
  app.save(users)
}, (app) => {
  const users = app.findCollectionByNameOrId("users")
  users.createRule = ""
  app.save(users)
})
