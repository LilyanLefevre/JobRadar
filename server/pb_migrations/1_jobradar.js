/// <reference path="../pb_data/types.d.ts" />
// Connexion par OAuth2 uniquement (fournisseurs à configurer dans le dashboard), un CV par utilisateur,
// et une collection "secrets" sans aucune règle d'API : seule la couche serveur (pb_hooks) y accède.
migrate((app) => {
  const users = app.findCollectionByNameOrId("users")
  users.fields.add(new TextField({ name: "cv", max: 30000 }))
  users.passwordAuth.enabled = false
  users.oauth2.enabled = true
  app.save(users)

  app.save(new Collection({
    type: "base",
    name: "secrets",
    fields: [
      new RelationField({ name: "user", required: true, collectionId: users.id, maxSelect: 1, cascadeDelete: true }),
      new TextField({ name: "api_key_enc", required: true }),
    ],
    indexes: ["CREATE UNIQUE INDEX idx_secrets_user ON secrets (user)"],
  }))
}, (app) => {
  app.delete(app.findCollectionByNameOrId("secrets"))
  const users = app.findCollectionByNameOrId("users")
  users.fields.removeByName("cv")
  app.save(users)
})
