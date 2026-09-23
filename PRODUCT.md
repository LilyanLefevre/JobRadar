# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Chercheurs d'emploi et d'alternance en France (l'auteur et ses amis), en recherche active et régulière. Ils trient des dizaines d'offres par session, avec peu de patience, depuis un ordinateur et parfois un téléphone. Confirmé par le propriétaire : la tâche qui compte le plus à l'écran est de **trier les offres vite**.

## Product Purpose
Chercher des offres (Indeed, HelloWork, LinkedIn, Glassdoor via JobSpy), les faire comparer à un profil structuré par une IA (scores de match en un seul appel par lot d'offres), puis obtenir pour une offre précise des modifications « avant / après » du CV. L'application aide à postuler ; elle ne postule jamais à la place de l'utilisateur. Succès : l'utilisateur repère en quelques secondes les offres qui valent le coup et sait comment adapter son CV.

## Positioning
Chaque utilisateur apporte ses propres fournisseurs d'IA (un ou plusieurs, avec bascule automatique) et ses clés (plusieurs gratuits), donc aucun abonnement ni frais côté opérateur. Le CV n'est pas un fichier à écrire : il est importé en PDF, structuré, puis **vérifié et corrigé** par l'utilisateur (catégories d'expériences, compétences, critères de recherche).

## Operating Context
Connexion OAuth (GitHub, Google). Quatre pages : Recherche (formulaire, liste d'offres triée par score, détail avec description et analyse), Alertes (recherches quotidiennes et rapports), Mon profil (import PDF/texte, éditeur de profil structuré), Paramètres (fournisseurs d'IA classés avec bascule automatique, notifications, compte). Sur téléphone, la liste d'offres et le détail sont deux écrans successifs ; l'application s'installe (PWA) et notifie les alertes. La recherche fonctionne sans IA ; les scores arrivent ensuite par lots.

## Capabilities and Constraints
- Interface en français, HTML/CSS/JS natifs sans étape de build, servie par PocketBase.
- CSP stricte : aucun style en ligne, aucun script ou police externe (tout est servi depuis l'application).
- Thème clair et sombre suivant le système.
- Descriptions d'offres en markdown rendues par un rendu maison sûr (md.js).
- Alertes quotidiennes : recherches enregistrées relancées chaque matin avec le profil et la clé de l'utilisateur ; rapport consultable dans l'application (téléphone compris). Application installable (PWA) avec invitation à l'installation, notifications push ; e-mail prévu ensuite.

## Brand Commitments
Le nom « JobRadar » est conservé. Aucune autre identité visuelle n'est imposée : l'ancienne interface (sobre, vert, gabarit de tableau de bord) est jugée générique et sert d'anti-référence.

## Evidence on Hand
Aucun témoignage, client ou chiffre réel : ne rien inventer. Les offres affichées viennent de sites tiers en direct.

## Product Principles
1. Le tri d'abord : la liste et les scores sont l'écran principal, tout le reste s'efface.
2. L'IA propose, l'utilisateur vérifie : toute information extraite ou évaluée est corrigeable et son statut est visible.
3. Utile sans configuration : la recherche marche sans IA ; la configuration est suggérée, jamais imposée.
4. Transparence sur les données : l'utilisateur sait ce qui part chez son fournisseur d'IA.
5. Un compte et une navigation conformes aux usages des applications web modernes.
6. La recherche est le cœur, l'IA un plus : salaire, contrat, télétravail et pertinence estimée sont calculés sans IA, et les alertes continuent sans clé, quota épuisé ou panne.
7. Les filtres de base restent visibles, les autres se replient (« Plus de filtres ») avec le compte des filtres actifs ; la page reprend la dernière recherche et l'historique suit le compte.

## Accessibility & Inclusion
WCAG 2.2 AA : clavier complet, focus visible, contrastes, cibles tactiles de 44 px, mouvement réduit respecté, français.
