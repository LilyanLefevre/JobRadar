/// <reference path="../pb_data/types.d.ts" />
// Limite l'envoi de notifications de test (5 par minute et par adresse).
migrate((app) => {
  const s = app.settings()
  s.rateLimits.rules = [{ label: "/jr/push/test", duration: 60, maxRequests: 5 }, ...s.rateLimits.rules]
  app.save(s)
}, (app) => {
  const s = app.settings()
  s.rateLimits.rules = s.rateLimits.rules.filter((r) => r.label !== "/jr/push/test")
  app.save(s)
})
