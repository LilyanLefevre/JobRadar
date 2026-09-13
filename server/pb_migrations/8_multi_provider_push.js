/// <reference path="../pb_data/types.d.ts" />
// Plusieurs fournisseurs d'IA par utilisateur (ordre de priorité, pause automatique en cas de panne),
// appareils abonnés aux notifications push, et un petit magasin clé/valeur (clés VAPID du serveur).
migrate((app) => {
  const secrets = app.findCollectionByNameOrId("secrets")
  secrets.fields.add(new NumberField({ name: "position" }))
  secrets.fields.add(new NumberField({ name: "cooldown_until" })) // epoch en secondes ; 0 = disponible
  secrets.fields.add(new TextField({ name: "last_error", max: 300 }))
  secrets.fields.add(new TextField({ name: "last_code", max: 20 }))
  secrets.indexes = ["CREATE UNIQUE INDEX idx_secrets_user_provider ON secrets (user, provider)"]
  app.save(secrets)

  const users = app.findCollectionByNameOrId("users")
  app.save(new Collection({
    type: "base",
    name: "push_subs",
    fields: [
      { name: "user", type: "relation", required: true, collectionId: users.id, maxSelect: 1, cascadeDelete: true },
      { name: "endpoint", type: "text", required: true, max: 700 },
      { name: "p256dh", type: "text", max: 200 },
      { name: "auth", type: "text", max: 100 },
      { name: "label", type: "text", max: 80 },
      { name: "created", type: "autodate", onCreate: true },
    ],
    indexes: ["CREATE UNIQUE INDEX idx_push_endpoint ON push_subs (endpoint)", "CREATE INDEX idx_push_user ON push_subs (user)"],
  }))

  app.save(new Collection({
    type: "base",
    name: "kv",
    fields: [
      { name: "k", type: "text", required: true, max: 80 },
      { name: "v", type: "text", max: 5000 },
    ],
    indexes: ["CREATE UNIQUE INDEX idx_kv_k ON kv (k)"],
  }))
}, (app) => {
  app.delete(app.findCollectionByNameOrId("kv"))
  app.delete(app.findCollectionByNameOrId("push_subs"))
  const secrets = app.findCollectionByNameOrId("secrets")
  for (const n of ["position", "cooldown_until", "last_error", "last_code"]) secrets.fields.removeByName(n)
  secrets.indexes = ["CREATE UNIQUE INDEX idx_secrets_user ON secrets (user)"]
  app.save(secrets)
})
