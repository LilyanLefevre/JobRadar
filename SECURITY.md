# Sécurité

## Signaler une vulnérabilité
Ouvrez un signalement privé via l'onglet *Security > Report a vulnerability* du dépôt GitHub. Ne publiez pas de détails d'exploitation dans une issue publique.

## Modèle de menace
Application web ouverte à des utilisateurs authentifiés par OAuth, qui manipule des **CV** (données personnelles) et des **clés API tierces**. Le serveur est supposé accessible depuis Internet derrière un tunnel ou un reverse proxy.

## Mesures en place
| Risque | Mesure |
|---|---|
| Accès au compte d'un autre utilisateur | Règles d'accès PocketBase par utilisateur (lecture, modification et suppression de son seul compte). Testé : 404 sur les comptes tiers. |
| Vol des clés API en base | Chiffrement Fernet (clé dérivée de `SECRETS_KEY`) ; collection `secrets` sans règle d'API ; jamais renvoyées au navigateur. |
| Appel direct du worker | Non exposé ; secret partagé (`WORKER_SECRET`) comparé à temps constant. |
| Création de comptes en masse / contournement d'OAuth | Création directe par l'API refusée ; liste d'invités optionnelle ; limitation de débit. |
| Brute force de l'administration | Dashboard et API d'administration bloqués via le tunnel public ; limitation de débit sur l'authentification. |
| XSS | Tout contenu issu des offres ou de l'IA est échappé ; liens limités à http(s) ; CSP sans script en ligne. |
| SSRF | Les URL des fournisseurs viennent d'un fichier fixe, jamais de l'utilisateur. |
| Entrées invalides ou volumineuses | Champs bornés, taille de requête limitée, erreurs génériques sans détail interne. |
| Injection de prompt (via une offre ou un CV) | Le contenu est présenté comme donnée à analyser, la sortie est contrainte à un schéma et affichée échappée. Impact limité à l'évaluation de l'utilisateur lui-même. |
| Chaîne d'approvisionnement | Binaire PocketBase vérifié par SHA-256 au build ; Dependabot ; branche `main` protégée. |
| Conteneurs | Worker non-root, lecture seule, `cap_drop: ALL`, `no-new-privileges` ; app en lecture seule avec `no-new-privileges`. |

## Risques résiduels
- Le conteneur PocketBase tourne en root (son dossier de données appartient à root).
- Le CV est stocké en clair dans SQLite ; pensez au chiffrement du disque et des sauvegardes.
- Le runner de déploiement a accès à Docker : qui peut pousser sur `main` peut exécuter du code sur l'hôte. Activez la 2FA sur le compte GitHub.
- Les actions GitHub sont référencées par tag (non par empreinte) et les images de base ne sont pas figées.
- Le scraping de sites tiers peut enfreindre leurs conditions d'utilisation.
- Le CV est transmis au fournisseur d'IA choisi par l'utilisateur, dont certains traitent les données hors UE.
