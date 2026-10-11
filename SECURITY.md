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
| Création de comptes en masse / contournement d'OAuth | Règle de création `@request.context = 'oauth2'` (création directe refusée) ; liste d'invités optionnelle ; limitation de débit. Flux OAuth complet testé en navigateur avec un faux fournisseur OIDC. |
| Brute force de l'administration | Via le tunnel public, liste blanche de collections : la connexion superuser (par nom ou identifiant `pbc_…`), les réglages, sauvegardes et logs sont bloqués ; limitation de débit sur l'authentification. L'interface statique de `/_/` est servie (page de succès OAuth) mais inutilisable sans ces API. |
| XSS | Tout contenu issu des offres ou de l'IA est échappé ; liens limités à http(s) ; CSP sans script ni style en ligne, polices servies par l'application (`font-src 'self'`). |
| SSRF | Les URL des fournisseurs viennent d'un fichier fixe, jamais de l'utilisateur. |
| Entrées invalides ou volumineuses | Champs bornés, taille de requête limitée, erreurs génériques sans détail interne. |
| Injection de prompt (via une offre ou un CV) | Le contenu est présenté comme donnée à analyser, la sortie est contrainte à un schéma et affichée échappée. Impact limité à l'évaluation de l'utilisateur lui-même. |
| Données dérivées du CV | La mémoire des évaluations (`eval_cache`) n'a aucune règle d'API, est supprimée avec le compte (cascade) et purgée après 30 jours ; elle est propre à chaque utilisateur (jamais partagée). |
| Alertes planifiées | Chaque passage n'utilise que le profil et la clé de son propriétaire ; plafond d'alertes par compte (3), d'offres évaluées par passage (60) et de relances manuelles (1 par 10 min) ; les collections d'alertes ont des règles d'accès par utilisateur, l'état du dernier passage n'est écrit que par le serveur ; verrou contre les passages simultanés. |
| Notifications push | L'adresse d'un abonnement est fournie par l'utilisateur : le worker n'envoie qu'aux services de push connus (Google, Mozilla, Apple, Microsoft, HTTPS uniquement), pour qu'on ne puisse pas lui faire appeler le réseau interne (SSRF). Messages chiffrés de bout en bout (Web Push, VAPID) ; abonnements expirés supprimés ; 10 appareils par compte ; collection sans accès API. La clé privée VAPID est dans la base (collection sans règle d'API). |
| Bascule entre fournisseurs | Chaque fournisseur d'un utilisateur est pausé selon la nature de l'erreur (24 h si la clé est refusée) ; jamais de blocage définitif (si tous sont en pause, on retente). Les clés ne sont jamais envoyées à un autre fournisseur que le leur. |
| PDF malveillants (import du CV) | Taille (5 Mo), pages (15) et texte limités ; analyse dans le worker non-root, en lecture seule, sans capacités ; erreurs génériques ; limitation de débit sur `/jr/cv`. |
| Chaîne d'approvisionnement | Binaire PocketBase vérifié par SHA-256 au build ; Dependabot ; branche `main` protégée. |
| Conteneurs | Worker non-root, lecture seule, `cap_drop: ALL`, `no-new-privileges` ; app en lecture seule avec `no-new-privileges`. |

## Risques résiduels
- Le conteneur PocketBase tourne en root (son dossier de données appartient à root).
- Le profil (CV structuré) est stocké en clair dans SQLite ; pensez au chiffrement du disque et des sauvegardes.
- Le runner de déploiement a accès à Docker : qui peut pousser sur `main` peut exécuter du code sur l'hôte. Activez la 2FA sur le compte GitHub.
- Les actions GitHub sont référencées par tag (non par empreinte) et les images de base ne sont pas figées.
- Le scraping de sites tiers peut enfreindre leurs conditions d'utilisation.
- Le CV est transmis au fournisseur d'IA choisi par l'utilisateur, dont certains traitent les données hors UE.
