# JobRadar

Recherche d'offres avec [JobSpy](https://github.com/speedyapply/JobSpy), puis évaluation par Claude : score de match, score du CV pour l'offre et modifications proposées.

## Lancer en local
```
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python app.py   # http://localhost:5055
```
L'évaluation appelle la CLI `claude -p` : elle doit être installée et connectée.

## Docker
```
cp .env.example .env      # renseigner CLAUDE_CODE_OAUTH_TOKEN (`claude setup-token`)
docker compose up -d      # http://localhost:5055
docker compose --profile tunnel up -d   # + tunnel Cloudflare (CLOUDFLARED_TOKEN)
```
Le CV est stocké dans `./data/cv.md`.

## Déploiement continu
Un push sur `main` publie l'image `ghcr.io/<owner>/jobradar` (workflow `deploy.yml`), puis un runner GitHub auto-hébergé exécute `docker compose up -d` dans `~/JobRadar`.
Le workflow n'utilise aucun secret autre que `GITHUB_TOKEN` ; les identifiants (`.env`) ne vivent que sur la machine qui héberge l'app.

## Sécurité
L'app n'a pas d'authentification et utilise votre abonnement Claude : ne l'exposez publiquement que derrière un contrôle d'accès (par ex. Cloudflare Access).
