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
echo "==> API base URL for this build: $VITE_API_BASE_URL"

echo "==> build (base '/' — required for the root domain, NOT /RichenQuest/)"
VITE_API_BASE_URL="$VITE_API_BASE_URL" node node_modules/vite/bin/vite.js build

# vite build empties dist/, which deletes the Slate config the CLI reads from
# inside the build output. Rewrite it before deploying or the deploy fails with
# 'Config file not present'.
echo "==> restore Slate config (wiped by the build)"
mkdir -p dist/.catalyst
printf 'framework = "static"\ndeployment_name = "default"\n' > dist/.catalyst/slate-config.toml

echo "==> deploy to Catalyst Slate production (existing app: rq-site)"
cd "$ROOT"
catalyst deploy slate rq-site --production -m "production $(date +%Y-%m-%d\ %H:%M)"

echo "==> verify"
for R in / /about /services /login /signup /how-it-works; do
  printf '    %-16s %s\n' "$R" "$(curl -s -o /dev/null -w '%{http_code}' -m 20 "https://rq-site-ugkizspd.onslate.in$R")"
done
