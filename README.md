# JobRadar

Cherchez des offres d'emploi sur Indeed, HelloWork, LinkedIn et Glassdoor, puis laissez une IA comparer **votre CV** à chaque offre : score de match, score du CV pour cette offre, forces, manques et **modifications concrètes à apporter au CV**.

Application web multi-utilisateurs : connexion Google / GitHub, et **chaque utilisateur choisit son fournisseur d'IA et fournit sa propre clé API** (Gemini, Mistral, Groq, Z.ai, DeepSeek ou Claude : plusieurs ont une offre gratuite). L'opérateur n'avance aucun frais d'IA.

> L'application aide à postuler, elle ne postule jamais à votre place.

## Sommaire
- [Fonctionnement](#fonctionnement) · [Architecture](#architecture) · [Fournisseurs d'IA](#fournisseurs-dia)
- [Démarrage rapide](#démarrage-rapide) · [Configuration](#configuration) · [Mise en service](#mise-en-service)
- [Déploiement continu](#déploiement-continu) · [Développement local](#développement-local)
- [Sécurité et données](#sécurité-et-données) · [Limites](#limites) · [Structure du dépôt](#structure-du-dépôt)

## Fonctionnement

L'interface a trois pages : **Recherche**, **Mon profil** et **Paramètres** (accessible, comme le compte, depuis le menu de l'avatar). Une pastille « Terminer la configuration » reste dans la barre tant que l'IA ou le CV manque.

1. **Connexion** avec GitHub ou Google.
2. **Paramètres** : l'utilisateur choisit un fournisseur d'IA et colle sa clé API (vérifiée, puis stockée chiffrée).
3. **Mon profil** : il importe son CV en **PDF** (ou colle son texte, ou remplit à la main). Le texte est extrait puis structuré par son IA. Il **vérifie et corrige** ensuite chaque information : identité, expériences (avec leur *catégorie* : emploi, stage, alternance, freelance, projet, bénévolat), formations, compétences classées par catégorie, langues et critères de recherche (postes visés, contrats, lieux, télétravail, niveau). Le PDF n'est pas conservé ; l'utilisateur n'écrit jamais de fichier markdown.
4. **Recherche** : poste, lieu, sites, ancienneté (préremplis depuis le profil). Les offres arrivent, puis les évaluations se remplissent au fil de l'eau, triées par score de match. Les scores sont calculés **par lot d'offres en une seule requête d'IA** (le profil n'est envoyé qu'une fois ; taille du lot propre à chaque fournisseur, de 8 à 25). Une offre déjà évaluée pour le même profil n'est **pas réévaluée** (mémoire par empreinte), et si l'IA saute une offre d'un lot, elle est redemandée une fois. Les modifications de CV, plus coûteuses, se demandent offre par offre.
5. Pour chaque offre, la **description complète** s'affiche directement (rendue en mise en forme, pas en markdown brut), avec : scores (match profil/offre et qualité du CV pour cette offre), forces, points à renforcer, et modifications proposées en « avant / après » avec la raison. L'utilisateur reste libre de les appliquer ou non.

**Sans configuration, la recherche fonctionne quand même** : si l'IA ou le profil manque, une fenêtre propose de configurer (ou de chercher sans scores). Les offres s'affichent alors sans évaluation, et chacune peut être évaluée plus tard.

## Design

Direction « signalisation routière » : le match d'une offre se lit comme une distance sur un panneau de direction (plein = proche, contour = moyen, pointillé = loin), la source est une pastille ronde, le jaune est réservé à la sélection et au focus. Lettrage Barlow (hébergé avec l'application, licence SIL OFL), clair et sombre selon le système, accessibilité AA. Le système est décrit dans [DESIGN.md](DESIGN.md) ; le contexte produit dans [PRODUCT.md](PRODUCT.md).

## Architecture

```mermaid
flowchart LR
    U([Navigateur]) -->|HTTPS| T[Tunnel Cloudflare<br/><i>optionnel</i>]
    T --> PB
    U -.->|réseau local| PB

    subgraph Hôte Docker
        PB["<b>app</b> : PocketBase<br/>comptes OAuth2 · CV · interface<br/>routes /jr/* (hooks JS)"]
        W["<b>worker</b> : Python / Flask<br/>JobSpy · appels aux IA<br/><i>réseau interne, non exposé</i>"]
        DB[("pb_data<br/>SQLite : comptes, CV,<br/>clés API chiffrées")]
        PB -->|WORKER_SECRET| W
        PB --- DB
    end

    W -->|scraping| JB[(Indeed · LinkedIn · Glassdoor)]
    W -->|clé API de l'utilisateur| IA[(Gemini · Mistral · Groq<br/>Z.ai · DeepSeek · Claude)]
```

| Composant | Rôle |
|---|---|
| **app** (`server/`) | PocketBase : connexion OAuth2, stockage du profil, limitation de débit, en-têtes de sécurité, interface web statique (modules JS sans build) et routes `/jr/*`. C'est la seule porte d'entrée. |
| **worker** (`worker/`) | Service Python interne : recherche d'offres (JobSpy), vérification et chiffrement des clés, extraction du texte des PDF (pypdf) et structuration du CV, évaluation par le fournisseur d'IA choisi. N'accepte que les appels de l'app (secret partagé). |
| **cloudflared** | Optionnel : expose l'app sur Internet sans ouvrir de port. |

### Le parcours d'une évaluation

```mermaid
sequenceDiagram
    actor U as Utilisateur
    participant A as app (PocketBase)
    participant W as worker
    participant IA as Fournisseur d'IA

    U->>A: POST /jr/key (fournisseur + clé)
    A->>W: /seal
    W->>IA: vérifie la clé
    W-->>A: clé chiffrée (Fernet)
    A->>A: stocke dans « secrets » (aucun accès API)

    U->>A: POST /jr/cv/import (PDF en base64 ou texte)
    A->>W: /cv/extract (clé chiffrée)
    W->>W: extrait le texte du PDF
    W->>IA: structure le CV (JSON)
    W-->>U: profil à vérifier et corriger
    U->>A: enregistre le profil validé (users.profile)

    U->>A: POST /jr/search
    A->>W: /search (id utilisateur)
    W-->>U: offres + descriptions (via app)

    loop pour chaque offre
        U->>A: POST /jr/evaluate (offre)
        A->>W: /evaluate (clé chiffrée + profil + offre)
        W->>W: déchiffre la clé
        W->>IA: prompt profil + offre
        IA-->>W: JSON structuré
        W-->>U: scores + modifications
    end
```

## Fournisseurs d'IA

Définis dans [`worker/providers.json`](worker/providers.json) (identifiant, libellé, URL, modèle, mention de confidentialité). Le champ `batch` règle le nombre d'offres évaluées par requête (grand pour les modèles à long contexte, petit pour les offres gratuites limitées en débit). Pour en ajouter un : toute API compatible OpenAI (`"kind": "openai"`) s'ajoute avec une entrée, sans toucher au code.

| Fournisseur | Gratuit | Remarque |
|---|---|---|
| Google Gemini | oui (limité) | En gratuit, Google peut réutiliser les données. |
| Mistral | oui (limité) | Entreprise française ; le palier gratuit demande d'accepter l'entraînement sur les données. |
| Groq (Llama) | oui (limité) | Serveurs aux États-Unis. |
| Z.ai (GLM) | oui (limité) | Fournisseur chinois. |
| DeepSeek | non, très bon marché | Fournisseur chinois. |
| Claude (Anthropic) | non | Meilleure qualité ; clé API à l'usage, **distincte d'un abonnement Claude Pro**. |

Les noms de modèles et les offres gratuites évoluent vite : vérifiez-les dans `providers.json`. Le CV de l'utilisateur est envoyé au fournisseur qu'il choisit ; l'interface affiche la mention de confidentialité correspondante.

## Démarrage rapide

Prérequis : Docker avec Compose.

```bash
git clone https://github.com/LilyanLefevre/JobRadar.git && cd JobRadar
cp .env.example .env
# renseigner WORKER_SECRET et SECRETS_KEY (openssl rand -hex 32 pour chacun)
docker compose up -d --build
```

Interface : <http://localhost:8090> · Dashboard PocketBase : <http://localhost:8090/_/>

Créez ensuite le compte administrateur (voir [Mise en service](#mise-en-service)) et configurez la connexion OAuth.

## Configuration

Tout se règle dans `.env` (modèle : [`.env.example`](.env.example)). Jamais commité.

| Variable | Défaut | Rôle |
|---|---|---|
| `WORKER_SECRET` | *(obligatoire)* | Secret partagé entre l'app et le worker. |
| `SECRETS_KEY` | *(obligatoire)* | Chiffre les clés API en base. **Ne plus la changer** une fois en service (les clés enregistrées deviendraient illisibles). |
| `SEARCHES_PER_DAY` | `10` | Recherches par utilisateur et par jour. |
| `EVAL_BATCH` | vide | Remplace la taille de lot des fournisseurs (1 à 40). |
| `SIGNUP_ALLOWLIST` | vide | E-mails autorisés à s'inscrire, séparés par des virgules. Vide = inscription ouverte. |
| `JOBRADAR_MODEL` | vide | Remplace le modèle Claude de `providers.json`. |
| `JOBRADAR_BIND` | `127.0.0.1` | Adresse d'écoute (`0.0.0.0` pour le réseau local). |
| `JOBRADAR_PORT` | `8090` | Port exposé sur l'hôte. |
| `JOBRADAR_IMAGE` / `JOBRADAR_WORKER_IMAGE` | images de ce dépôt | Images à utiliser. |
| `COMPOSE_PROFILES` | vide | `tunnel` pour démarrer `cloudflared`. |
| `CLOUDFLARED_TOKEN` | vide | Jeton du tunnel Cloudflare (profil `tunnel`). |
| `ADMIN_PUBLIC` | vide | `1` pour autoriser le dashboard via le tunnel public (déconseillé). |
| `PROVIDERS_FILE` | `worker/providers.json` | Fichier de fournisseurs alternatif (variable du worker). |

## Mise en service

### 1. Compte administrateur
Au premier démarrage, PocketBase affiche dans les logs un lien d'installation, valable environ une heure :
```bash
docker compose logs app | grep pbinstall
```
Ouvrez-le (en remplaçant l'hôte par le vôtre), ou créez le compte en ligne de commande :
```bash
docker compose exec app /pb/pocketbase superuser upsert vous@exemple.com 'mot-de-passe-long' --dir /pb/pb_data
```

### 2. Connexion OAuth
Dans le dashboard : *Collections > users > Edit collection > Options > OAuth2*, ajoutez GitHub et/ou Google avec l'identifiant et le secret créés dans leurs consoles développeur. URL de redirection à déclarer chez eux :
```
https://<votre-domaine>/api/oauth2-redirect
```
La connexion par mot de passe est désactivée : les comptes ne se créent que par OAuth.

### 3. Exposer sur Internet (optionnel)
1. Créez un tunnel dans le tableau de bord Cloudflare (Zero Trust > Networks > Tunnels) et ajoutez un *Public Hostname* vers le service `http://app:8090`.
2. Dans `.env` : `COMPOSE_PROFILES=tunnel` et `CLOUDFLARED_TOKEN=<jeton>`, puis `docker compose up -d`.

Quand la requête arrive par le tunnel, seule la collection des utilisateurs est joignable : les API d'administration (connexion superuser, réglages, sauvegardes, logs…) sont **bloquées**, par nom comme par identifiant. L'interface statique de `/_/` reste servie (PocketBase y affiche la page de succès de la connexion OAuth) mais ne peut pas se connecter. Pour administrer, passez par le port local ou un tunnel SSH :
```bash
ssh -L 8090:127.0.0.1:8090 <hôte>   # puis http://localhost:8090/_/
```

### 4. Inviter des amis
Mettez leurs e-mails dans `SIGNUP_ALLOWLIST`, puis `docker compose up -d`. Chacun choisit son fournisseur d'IA et ajoute sa clé.

### Sauvegarde et mise à jour
- À sauvegarder : le dossier `pb_data/` (comptes, CV, clés chiffrées) **et** `SECRETS_KEY`.
- Mise à jour manuelle : `git pull && docker compose up -d --pull always`. Avec le déploiement continu, c'est automatique.

## Déploiement continu

```mermaid
flowchart LR
    D([git push main]) --> GH[GitHub Actions]
    GH -->|build amd64 + arm64| R[(ghcr.io<br/>jobradar · jobradar-worker)]
    GH --> RN[Runner auto-hébergé<br/>sur l'hôte]
    RN -->|git pull +<br/>docker compose up -d --pull always| H[Hôte Docker]
    R -.->|pull des images| H
```

Le workflow [`deploy.yml`](.github/workflows/deploy.yml) construit les deux images, les publie, puis un runner GitHub installé sur la machine hôte (connexion sortante uniquement, aucun port à ouvrir) met à jour le déploiement dans `~/JobRadar`. Il n'utilise que `GITHUB_TOKEN` : les secrets (`.env`) ne vivent que sur l'hôte. Dependabot propose des mises à jour hebdomadaires (actions, images Docker, dépendances Python).

## Développement local

Sans Docker (nécessite Python 3.12 et le binaire [PocketBase](https://pocketbase.io/docs/)) :

```bash
# 1. Worker
cd worker && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
WORKER_SECRET=dev SECRETS_KEY=dev .venv/bin/python -m flask --app app run -p 5055

# 2. PocketBase (autre terminal, depuis server/)
WORKER_URL=http://127.0.0.1:5055 WORKER_SECRET=dev \
  pocketbase serve --http=127.0.0.1:8090 --dir=../pb_data \
  --migrationsDir=pb_migrations --hooksDir=pb_hooks --publicDir=pb_public
```

Tests : `node --test tests/md.test.mjs` vérifie le rendu des descriptions (titres, listes, jamais de HTML actif).

Pour tester sans clé réelle, `PROVIDERS_FILE` permet de pointer le worker vers un faux fournisseur local compatible OpenAI. Pour tester la connexion sans GitHub ni Google, PocketBase accepte un fournisseur OIDC générique (*users > Options > OAuth2 > oidc*) que l'on peut pointer vers un petit faux serveur local.

## Sécurité et données

Résumé ci-dessous ; détails et risques résiduels dans [SECURITY.md](SECURITY.md).

- Connexion OAuth2 uniquement ; création de compte directe par l'API refusée (règle `@request.context = 'oauth2'`) ; inscription limitable par liste d'invités.
- Les clés API sont vérifiées puis **chiffrées** (Fernet) dans une collection sans aucune règle d'API : elles ne sont jamais renvoyées au navigateur.
- Le worker n'est pas exposé ; il vérifie un secret partagé à chaque appel.
- Limitation de débit, en-têtes de sécurité (CSP stricte, HSTS), API d'administration inaccessibles par le tunnel public (liste blanche de collections).
- Conteneurs durcis : worker non-root, système de fichiers en lecture seule, sans capacités.
- Chaque utilisateur peut **supprimer son compte** depuis l'interface (CV et clé API supprimés en cascade).

## Limites

- JobSpy ne couvre ni l'APEC, ni Welcome to the Jungle, ni France Travail : ces offres n'apparaissent pas.
- Le scraping des job boards peut enfreindre leurs conditions d'utilisation et provoquer des blocages d'IP : volumes modestes, quota par utilisateur, inscription sur invitation recommandée.
- Les résultats de recherche ne sont pas conservés ; seuls le profil, la clé API et une **mémoire des évaluations** (30 jours, supprimée avec le compte) le sont.
- L'import fonctionne sur les PDF contenant du texte (5 Mo et 15 pages maximum) ; un PDF scanné (image) n'est pas lu : collez le texte ou remplissez le profil. L'extraction par IA peut se tromper, d'où l'étape de vérification.
- Les évaluations sont des suggestions d'une IA : relisez-les, elles peuvent se tromper. N'y laissez jamais inventer d'expérience.
- Le profil et la mémoire des évaluations (texte généré à partir du CV) sont stockés en clair dans SQLite, sans chiffrement au repos, contrairement aux clés API. L'extraction demande à l'IA d'omettre e-mail, téléphone et adresse.

## Structure du dépôt

```
.
├── docker-compose.yml        # app + worker (+ cloudflared en option)
├── .env.example              # modèle de configuration
├── server/                   # PocketBase
│   ├── Dockerfile            # binaire vérifié par SHA-256, amd64 + arm64
│   ├── pb_migrations/        # schéma : profil, secrets, fournisseur, limites de débit, règle d'inscription
│   ├── pb_hooks/             # routes /jr/*, sécurité (en-têtes, admin, inscriptions)
│   └── pb_public/            # interface : index.html, style.css, app.js (routeur, menu de compte), search/profile/settings/md/icons.js, fonts/, SDK PocketBase
├── tests/                    # tests du rendu markdown des descriptions
├── PRODUCT.md · DESIGN.md    # contexte produit et système de design
├── worker/                   # service Python interne
│   ├── app.py                # recherche, chiffrement des clés, import du CV, évaluation
│   └── providers.json        # fournisseurs d'IA et modèles
└── .github/                  # déploiement continu, Dependabot
```
