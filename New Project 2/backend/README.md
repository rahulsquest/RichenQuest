# RichenQuest API — Catalyst AppSail source

Lean copy of `functions/` plus a minimal `package.json`, deployed as the
Catalyst AppSail service `rq-api` in project 53691000000016002.

Deploy:  catalyst deploy appsail --name rq-api

STATUS 2026-08-25: deploys successfully but the container returns 503 —
"Execution failed. Please check the startup command or port." The app binds
X_ZOHO_CATALYST_LISTEN_PORT / CATALYST_LISTEN_PORT / PORT on 0.0.0.0 and still
fails. Container logs are not reachable from the CLI or the BaaS API, so the
cause is not yet identified. Reproduce with:
  curl -s https://rq-api-50043782438.development.catalystappsail.in/api/health

Why AppSail and not Catalyst Functions: the 11 handlers in functions/ are plain
Express (req,res) handlers written for devServer.js. They have no
catalyst-config.json, no per-function package.json, no Catalyst SDK, and they
import ../shared/* from outside their own directories — Catalyst packages each
function directory independently, so those imports would not resolve. Porting
all 11 would mean rewriting them; AppSail runs the existing Express app as-is.
