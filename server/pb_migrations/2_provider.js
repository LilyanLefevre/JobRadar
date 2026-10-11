/// <reference path="../pb_data/types.d.ts" />
// Fournisseur d'IA choisi par l'utilisateur (id défini dans worker/providers.json).
migrate((app) => {
  const secrets = app.findCollectionByNameOrId("secrets")
  secrets.fields.add(new TextField({ name: "provider", required: true, max: 40 }))
  app.save(secrets)
}, (app) => {
  const secrets = app.findCollectionByNameOrId("secrets")
  secrets.fields.removeByName("provider")
  app.save(secrets)
})
