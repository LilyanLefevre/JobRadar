#!/usr/bin/env bash
# Lance la pile de test (faux LLM, faux push, faux OIDC, worker, PocketBase vierge) puis toutes les suites.
# Prérequis : binaire `pocketbase` dans le PATH (ou PB_BIN), Python 3 avec worker/requirements.txt (venv ou PY),
# Node 20+, Chrome (ou PW_CHANNEL=chromium après `npx playwright install chromium`).
set -u
cd "$(dirname "$0")"; E2E=$PWD; ROOT=$(cd ../.. && pwd)
export E2E_TMP=$E2E/.work E2E_OUT=$E2E/.out BASE=http://localhost:8090
PY=${PY:-python3}; PB=${PB_BIN:-pocketbase}
ADMIN=admin@test.local PASS=adminpass123
export WORKER_SECRET=testsecret SECRETS_KEY=testkey PROVIDERS_FILE=$E2E/fakes/providers.json SEARCHES_PER_DAY=5000 \
  PUSH_ALLOWED_HOSTS=127.0.0.1 JOBS_FIXTURE=$E2E/fixtures/jobs.json
rm -rf "$E2E_TMP"; mkdir -p "$E2E_TMP" "$E2E_OUT"
[ -d node_modules ] || npm install --silent
PIDS=()
stop() { kill "${PIDS[@]}" 2>/dev/null; }; trap stop EXIT
for port in 5055 8090 9100 9997 9999; do kill $(lsof -ti :$port) 2>/dev/null; done; sleep 1
for f in llm push oidc; do $PY fakes/$f.py & PIDS+=($!); done
(cd "$ROOT/worker" && $PY -m flask --app app run -p 5055 >"$E2E_TMP/worker.log" 2>&1) & PIDS+=($!)
# copie de l'app avec la version fictive (comme le Dockerfile)
APP=$E2E_TMP/app; mkdir -p "$APP"; cp -r "$ROOT/server/pb_public" "$ROOT/server/pb_hooks" "$ROOT/server/pb_migrations" "$APP/"
find "$APP/pb_public" -type f \( -name '*.js' -o -name '*.html' \) ! -name pocketbase.umd.js -exec sed -i.bak "s/__V__/e2e/g" {} +
find "$APP" -name '*.bak' -delete
"$PB" superuser upsert $ADMIN $PASS --dir="$APP/pb_data" --migrationsDir="$APP/pb_migrations" >/dev/null
(WORKER_URL=http://127.0.0.1:5055 "$PB" serve --http=127.0.0.1:8090 --dir="$APP/pb_data" --migrationsDir="$APP/pb_migrations" \
  --hooksWatch=false --hooksDir="$APP/pb_hooks" --publicDir="$APP/pb_public" >"$E2E_TMP/pb.log" 2>&1) & PIDS+=($!)
for i in $(seq 60); do curl -sf $BASE/api/health >/dev/null && curl -sf localhost:5055/providers -H "X-Worker-Secret: $WORKER_SECRET" >/dev/null && break; sleep 1; done
tok() { curl -s $BASE/api/collections/_superusers/auth-with-password -H 'Content-Type: application/json' -d "{\"identity\":\"$ADMIN\",\"password\":\"$PASS\"}" | $PY -c "import sys,json;print(json.load(sys.stdin)['token'])"; }
SU=$(tok)
# fournisseur OIDC factice, limites de débit coupées (évite les attentes de 60 s)
curl -s -X PATCH $BASE/api/collections/users -H "Authorization: $SU" -H 'Content-Type: application/json' -d '{"oauth2":{"enabled":true,"providers":[{"name":"oidc","clientId":"x","clientSecret":"y","authURL":"http://127.0.0.1:9100/authorize","tokenURL":"http://127.0.0.1:9100/token","userInfoURL":"http://127.0.0.1:9100/userinfo","displayName":"Test"}]}}' >/dev/null
curl -s -X PATCH $BASE/api/settings -H "Authorization: $SU" -H 'Content-Type: application/json' -d '{"rateLimits":{"enabled":false}}' >/dev/null
cleanup() { SU=$(tok); I=$(curl -s "$BASE/api/collections/users/records?filter=email='new@t.io'" -H "Authorization: $SU" | $PY -c "import sys,json;i=json.load(sys.stdin)['items'];print(i[0]['id'] if i else '')"); [ -n "$I" ] && curl -s -o /dev/null -X DELETE $BASE/api/collections/users/records/$I -H "Authorization: $SU"; }
FAILS=0
run() { name=$1; shift; echo "##### $name"; cleanup; "$@" >"$E2E_OUT/$name.txt" 2>&1
  n=$(grep -c '^FAIL' "$E2E_OUT/$name.txt"); k=$(grep -c '^OK' "$E2E_OUT/$name.txt")
  echo "   OK $k / FAIL $n"; grep -E '^FAIL|Timeout|Error' "$E2E_OUT/$name.txt" | head -5
  [ "$n" -gt 0 ] || [ "$k" -eq 0 ] && FAILS=$((FAILS+1)); }
cd suites
run backend $PY backend.py
run batch20 $PY batch20.py
for s in journey alerts pwa install notifications mobile avatar touch; do run $s node $s.mjs; done
cd "$ROOT" && echo "##### md" && node --test tests/md.test.mjs >/dev/null 2>&1 || { echo "   FAIL md"; FAILS=$((FAILS+1)); }
echo "##### prefilter"; $PY tests/test_prefilter.py >/dev/null 2>&1 || { echo "   FAIL prefilter"; FAILS=$((FAILS+1)); }
echo; [ $FAILS -eq 0 ] && echo "TOUT PASSE" || echo "$FAILS suite(s) en échec (détails : tests/e2e/.out/)"
exit $FAILS
