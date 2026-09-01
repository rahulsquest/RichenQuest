#!/bin/bash
# RichenQuest production deploy — local source -> Catalyst Slate -> production.
# GitHub is source control only; this is the production path.
#
#   bash scripts/deploy-production.sh
#
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/client"

#  VITE_API_BASE_URL is baked into the bundle at BUILD time, so getting it
#  wrong cannot be fixed by configuring anything afterwards — it ships.
#
#  Every build before 2026-08-29 was produced without it and therefore carries
#  the code default, '/api' (config/environment.js). That is a relative path,
#  so the deployed SPA calls https://www.richenquest.com/api/... — which Slate
#  serves as static hosting. Verified against the live app: /api/auth/login
#  returns HTTP 200 with content-type text/html, i.e. index.html, not a 404.
#  The API client would then parse an HTML document as JSON and fail with a
#  syntax error that names nothing useful. Silent, and only visible once the
#  backend exists — which is exactly when nobody is looking for a build flag.
#
#  Failing loudly here is the same rule SESSION_SECRET, ZOHO_WEBHOOK_SECRET
#  and the unset prices already follow: refuse rather than ship a default that
#  looks like it works. Set it explicitly, even for a marketing-only deploy:
#
#    VITE_API_BASE_URL=https://api.richenquest.com/api bash scripts/deploy-production.sh
if [ -z "${VITE_API_BASE_URL:-}" ]; then
  echo "ERROR: VITE_API_BASE_URL is not set." >&2
  echo "  It is compiled into the bundle; unset means the build ships '/api'," >&2
  echo "  which Slate answers with index.html (HTTP 200, text/html) instead of" >&2
  echo "  the API. Re-run with it set — see .env.production.example." >&2
  exit 1
fi

#  An empty value was rejected above, but a RELATIVE one shipped happily and
#  produces the identical failure — the SPA calls the Slate origin and parses
#  index.html as JSON. Rejecting only the empty case guarded the accident
#  nobody makes and allowed the one people actually make.
case "$VITE_API_BASE_URL" in
  https://*) ;;
  http://localhost*|http://127.0.0.1*)
    echo "ERROR: VITE_API_BASE_URL points at localhost. That is a dev value; it" >&2
    echo "  cannot work for anyone but you once deployed." >&2
    exit 1 ;;
  /*)
    echo "ERROR: VITE_API_BASE_URL is relative ('$VITE_API_BASE_URL')." >&2
    echo "  A relative base makes the deployed SPA call the Slate static origin," >&2
    echo "  which answers HTML with HTTP 200 — so the failure looks like a JSON" >&2
    echo "  parse error, not a misconfiguration. Use the absolute API origin:" >&2
    echo "    VITE_API_BASE_URL=https://api.richenquest.com/api" >&2
    exit 1 ;;
  *)
    echo "ERROR: VITE_API_BASE_URL must be an absolute https:// URL." >&2
    echo "  Got: $VITE_API_BASE_URL" >&2
    exit 1 ;;
esac
echo "==> API base URL for this build: $VITE_API_BASE_URL"

echo "==> build (base '/' — required for the root domain, NOT /RichenQuest/)"
VITE_API_BASE_URL="$VITE_API_BASE_URL" node node_modules/vite/bin/vite.js build

# vite build empties dist/, which deletes the Slate config the CLI reads from
# inside the build output. Rewrite it before deploying or the deploy fails with
# 'Config file not present'.
echo "==> restore Slate config (wiped by the build)"
mkdir -p dist/.catalyst
printf 'framework = "static"\ndeployment_name = "default"\n' > dist/.catalyst/slate-config.toml

#  Bundle verification, before anything is published.
#
#  The build flag is only useful if it actually landed in the artifact, and a
#  bundle is also the easiest place to leak a secret by accident — every
#  VITE_* value is compiled in as plaintext and is readable by anyone who
#  opens the page.
echo "==> verify built bundle"
BUNDLE_HIT=$(grep -rlF "$VITE_API_BASE_URL" dist/assets 2>/dev/null | head -1 || true)
if [ -z "$BUNDLE_HIT" ]; then
  echo "ERROR: the API base URL is not present in the built bundle." >&2
  echo "  The build did not pick up VITE_API_BASE_URL. Refusing to deploy." >&2
  exit 1
fi
echo "    API base URL present in $(basename "$BUNDLE_HIT")"

if grep -rlqE 'client_secret|refresh_token|SESSION_SECRET|ZOHO_WEBHOOK_SECRET|1000\.[0-9a-f]{16}' dist 2>/dev/null; then
  echo "ERROR: a credential-shaped string is present in the built bundle." >&2
  echo "  Refusing to publish it. Inspect dist/ before retrying." >&2
  exit 1
fi
echo "    no credential-shaped strings in dist/"

#  DELIBERATELY NOT --production.
#
#  www.richenquest.com is served by the DEVELOPMENT environment of this Slate
#  app (rq-site-ysgqnszn). --production publishes to the Production environment
#  (rq-site-ugkizspd), which the customer domain does not point at — so the
#  deploy reports success and the live site does not change. That is what made
#  six shipped commits look deployed while customers saw the old bundle.
#
#  Change this only together with the domain mapping, never on its own.
echo "==> deploy to Catalyst Slate (Development env — the one the domain serves)"
cd "$ROOT"
catalyst deploy slate rq-site -m "release $(date +%Y-%m-%d\ %H:%M)"

echo "==> verify"
for R in / /about /services /login /signup /how-it-works; do
  printf '    %-16s %s\n' "$R" "$(curl -s -o /dev/null -w '%{http_code}' -m 20 "https://rq-site-ysgqnszn.onslate.in$R")"
done
