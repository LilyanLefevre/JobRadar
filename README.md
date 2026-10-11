# JobRadar

Recherche d'offres avec [JobSpy](https://github.com/speedyapply/JobSpy) (Indeed, LinkedIn, Glassdoor), puis évaluation par Claude : score de match, score du CV pour l'offre et modifications proposées.
Application multi-utilisateurs : connexion Google / GitHub, et **chaque utilisateur fournit sa propre clé API Anthropic** (les évaluations sont facturées sur son compte).

## Architecture
- `server/` : [PocketBase](https://pocketbase.io) : comptes OAuth2, CV, routes `/jr/*` (hooks JS) et interface (`pb_public`).
- `worker/` : service Python interne (JobSpy + appels à l'API Anthropic). Jamais exposé : seul PocketBase l'appelle, avec `WORKER_SECRET`.
- Les clés API sont vérifiées puis stockées **chiffrées** (Fernet, clé dérivée de `SECRETS_KEY`) dans une collection sans accès API ; elles ne sont jamais renvoyées au navigateur.

## Lancer
```bash
cp .env.example .env        # renseigner WORKER_SECRET et SECRETS_KEY (openssl rand -hex 32)
docker compose up -d --build
docker compose exec app /pb/pocketbase superuser upsert vous@exemple.com un-mot-de-passe-long --dir /pb/pb_data
```
Interface : http://localhost:8090 · dashboard PocketBase : http://localhost:8090/_/

**Connexion** : dans le dashboard, *Collections > users > Edit > Options > OAuth2*, ajoutez Google et/ou GitHub (identifiant et secret client créés dans leurs consoles développeur ; URL de redirection `https://<votre-domaine>/api/oauth2-redirect`).

## Configuration (`.env`)
Voir `.env.example` : modèle (`JOBRADAR_MODEL`), recherches par jour et par utilisateur (`SEARCHES_PER_DAY`), adresse d'écoute, images, tunnel Cloudflare optionnel (`COMPOSE_PROFILES=tunnel`, `CLOUDFLARED_TOKEN`).

## Déploiement continu
Un push sur `main` publie les images `ghcr.io/<owner>/jobradar` et `jobradar-worker` (workflow `deploy.yml`), puis un runner GitHub auto-hébergé lance `docker compose up -d` dans `~/JobRadar`.
Le workflow n'utilise que `GITHUB_TOKEN` ; les secrets (`.env`) ne vivent que sur la machine hôte.

## Limites
- Le scraping des job boards peut enfreindre leurs conditions d'utilisation et provoquer des blocages d'IP : gardez des volumes modestes.
- Les résultats de recherche ne sont pas conservés (seuls le CV et la clé API le sont).
