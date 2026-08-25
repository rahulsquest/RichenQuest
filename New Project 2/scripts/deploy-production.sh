#!/bin/bash
# RichenQuest production deploy — local source -> Catalyst Slate -> production.
# GitHub is source control only; this is the production path.
#
#   bash scripts/deploy-production.sh
#
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/client"

echo "==> build (base '/' — required for the root domain, NOT /RichenQuest/)"
node node_modules/vite/bin/vite.js build

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
