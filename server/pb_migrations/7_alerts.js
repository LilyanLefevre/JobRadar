/// <reference path="../pb_data/types.d.ts" />
// Alertes quotidiennes : recherches enregistrées, rapports (une ligne par passage) et offres déjà vues (déduplication).
migrate((app) => {
  const users = app.findCollectionByNameOrId("users")
  const own = "user = @request.auth.id"
  const rel = (name, coll) => ({ name, type: "relation", required: true, collectionId: coll.id, maxSelect: 1, cascadeDelete: true })

  const alerts = new Collection({
    type: "base",
    name: "alerts",
    listRule: own,
    viewRule: own,
    createRule: "@request.auth.id != '' && @request.body.user = @request.auth.id",
    // le propriétaire ne change jamais ; l'état du dernier passage n'est écrit que par le serveur
    updateRule: own + " && @request.body.user:isset = false && @request.body.last_status:isset = false && @request.body.last_message:isset = false && @request.body.last_run_at:isset = false",
    deleteRule: own,
    fields: [
      rel("user", users),
      { name: "name", type: "text", max: 80 },
      { name: "query", type: "text", required: true, max: 200 },
      { name: "location", type: "text", max: 100 },
      { name: "sites", type: "json", maxSize: 2000 },
      { name: "hours", type: "number", min: 12, max: 720 },
      { name: "min_score", type: "number", min: 0, max: 100 },
      { name: "active", type: "bool" },
      { name: "queued", type: "bool" },
      { name: "last_status", type: "text", max: 20 },
      { name: "last_message", type: "text", max: 400 },
      { name: "last_run_at", type: "date" },
      { name: "created", type: "autodate", onCreate: true },
    ],
    indexes: ["CREATE INDEX idx_alerts_user ON alerts (user)"],
  })
  app.save(alerts)

  app.save(new Collection({
    type: "base",
    name: "alert_runs",
    listRule: own,
    viewRule: own,
    createRule: null,
    // seul l'état « lu » est modifiable par l'utilisateur
    updateRule: own + " && @request.body.user:isset = false && @request.body.alert:isset = false && @request.body.status:isset = false && @request.body.message:isset = false && @request.body.found:isset = false && @request.body.new_count:isset = false && @request.body.jobs:isset = false",
    deleteRule: own,
    fields: [
      rel("user", users),
      rel("alert", alerts),
      { name: "status", type: "text", max: 20 },
      { name: "message", type: "text", max: 400 },
      { name: "found", type: "number" },
      { name: "new_count", type: "number" },
      { name: "jobs", type: "json", maxSize: 200000 },
      { name: "seen", type: "bool" },
      { name: "ran_at", type: "autodate", onCreate: true },
    ],
    indexes: ["CREATE INDEX idx_alert_runs_user ON alert_runs (user, ran_at)"],
  }))

  app.save(new Collection({
    type: "base",
    name: "alert_seen",
    fields: [
      rel("alert", alerts),
      { name: "ukey", type: "text", required: true },
      { name: "created", type: "autodate", onCreate: true },
    ],
    indexes: ["CREATE UNIQUE INDEX idx_alert_seen ON alert_seen (alert, ukey)", "CREATE INDEX idx_alert_seen_created ON alert_seen (created)"],
  }))
}, (app) => {
  for (const n of ["alert_seen", "alert_runs", "alerts"]) app.delete(app.findCollectionByNameOrId(n))
})
