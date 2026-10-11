/// <reference path="../pb_data/types.d.ts" />
// Profil structuré (JSON) : identité, expériences classées, compétences par catégorie, objectifs de recherche.
// Remplace le texte libre « cv » (conservé en lecture seule pour les anciens comptes).
migrate((app) => {
  const users = app.findCollectionByNameOrId("users")
  users.fields.add(new JSONField({ name: "profile", maxSize: 200000 }))
  app.save(users)

  const s = app.settings()
  s.rateLimits.rules = [{ label: "/jr/cv", duration: 60, maxRequests: 5 }, ...s.rateLimits.rules]
  app.save(s)
}, (app) => {
  const users = app.findCollectionByNameOrId("users")
  users.fields.removeByName("profile")
  app.save(users)
})
