/// <reference path="../pb_data/types.d.ts" />
// Mémoire des évaluations : une offre déjà évaluée pour le même profil, le même fournisseur et le même prompt n'est pas repayée.
// Aucune règle d'API : seule la couche serveur (pb_hooks) y accède. Supprimée avec le compte (cascade).
migrate((app) => {
  const users = app.findCollectionByNameOrId("users")
  app.save(new Collection({
    type: "base",
    name: "eval_cache",
    fields: [
      { name: "user", type: "relation", required: true, collectionId: users.id, maxSelect: 1, cascadeDelete: true },
      { name: "key", type: "text", required: true },
      { name: "mode", type: "text" },
      { name: "result", type: "json", maxSize: 20000 },
      { name: "created", type: "autodate", onCreate: true },
    ],
    indexes: ["CREATE UNIQUE INDEX idx_eval_cache_user_key ON eval_cache (user, key)", "CREATE INDEX idx_eval_cache_created ON eval_cache (created)"],
  }))
}, (app) => {
  app.delete(app.findCollectionByNameOrId("eval_cache"))
})
