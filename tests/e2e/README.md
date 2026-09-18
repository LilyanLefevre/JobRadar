# Tests de bout en bout

`./run.sh` démarre la pile complète en local (faux LLM :9999, faux push :9997, faux OIDC :9100, worker :5055, PocketBase vierge :8090) et lance les suites de `suites/` ; code de sortie non nul si l'une échoue. Les captures et rapports vont dans `.out/`, l'état temporaire dans `.work/` (ignorés par git).

Variables : `PY` (Python du worker), `PB_BIN` (binaire PocketBase), `PW_CHANNEL` (`chrome` par défaut, `chromium` après `npx playwright install chromium`).

Hooks réservés aux tests : `JOBS_FIXTURE` (offres fixes) et `PUSH_ALLOWED_HOSTS` — jamais en production.
