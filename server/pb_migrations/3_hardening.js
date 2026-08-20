/// <reference path="../pb_data/types.d.ts" />
// Limitation de débit (par IP ; derrière Cloudflare l'IP vient de CF-Connecting-IP).
migrate((app) => {
  const s = app.settings()
  s.trustedProxy.headers = ["CF-Connecting-IP"]
  s.rateLimits.enabled = true
  s.rateLimits.rules = [
    { label: "*:auth", duration: 60, maxRequests: 20 },
    { label: "/jr/search", duration: 60, maxRequests: 6 },
    { label: "/jr/key", duration: 60, maxRequests: 10 },
    { label: "/jr/", duration: 60, maxRequests: 120 },
    { label: "/api/", duration: 10, maxRequests: 100 },
  ]
  app.save(s)
}, (app) => {
  const s = app.settings()
  s.rateLimits.enabled = false
  app.save(s)
})
