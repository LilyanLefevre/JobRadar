# Journal des changements

## 1.1.0 (2026-10-12)
- **Sécurité** : regex de salaire protégées contre le backtracking (texte d'offre normalisé et borné à 6 000 caractères) ; `/jr/search` ignore le champ `scheduled` envoyé par le client, qui contournait le plafond de recherches par jour.
- **Mobile** : détail d'offre sans débordement horizontal à 320 px, menu du compte borné à l'écran.
- **Prétraitement sans IA** : salaire (champs du site ou formules courantes), contrat, télétravail et pertinence estimée, calculés par le worker (`worker/prefilter.py`).
- **Alertes sans IA** : sans clé, sans CV, quota épuisé ou panne, le passage réussit et transmet toutes les nouvelles offres, classées par pertinence estimée. Plus de pop-up d'erreur d'IA dans la recherche.
- **Filtres** : salaire minimum et « salaire indiqué uniquement », type de contrat, rayon en km, jusqu'à 3 lieux avec suggestions de communes (geo.api.gouv.fr), case « Évaluer avec l'IA » (cochée par défaut), panneau « Plus de filtres » replié. Les alertes reprennent salaire, contrat, lieux et rayon (migrations `9_z_alert_*`).
- **Mémoire de recherche** : reprise de la dernière recherche, six recherches récentes, synchronisées entre appareils par le compte (migration `9_z_users_searches`).
- Glassdoor coché par défaut ; cibles tactiles de 44 px sur écran tactile ; couleurs et décalages de barre passés aux jetons (`--bar-h`).
- **Tests** : suite de bout en bout versionnée dans `tests/e2e/` (`run.sh`).

## 1.0.0
Première version publique : recherche JobSpy multi-sites, évaluation par lots avec l'IA de chaque utilisateur (plusieurs fournisseurs, bascule, mémoire), profil structuré importé depuis un CV, alertes quotidiennes, PWA et notifications push, connexion OAuth2 (GitHub, Google), déploiement par GitHub Actions.
