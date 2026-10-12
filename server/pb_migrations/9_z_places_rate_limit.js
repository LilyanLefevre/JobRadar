/// <reference path="../pb_data/types.d.ts" />
// Limite les suggestions de lieux (30 par minute et par adresse) : chaque requête sort vers l'annuaire des communes.
migrate((app) => {
  const s = app.settings()
  s.rateLimits.rules = [{ label: "/jr/places", duration: 60, maxRequests: 30 }, ...s.rateLimits.rules]
  app.save(s)
}, (app) => {
  const s = app.settings()
  s.rateLimits.rules = s.rateLimits.rules.filter((r) => r.label !== "/jr/places")
  app.save(s)
})
