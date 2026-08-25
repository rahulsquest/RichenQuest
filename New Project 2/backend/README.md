# RichenQuest API — Catalyst AppSail source

Deployed as AppSail service `rq-api` in project 53691000000016002.
Deploy: `catalyst deploy appsail --name rq-api`

## Verified working in a clean room
A clean `npm install --omit=dev` from this package.json, started with
`X_ZOHO_CATALYST_LISTEN_PORT=9004 node server.js`, serves:

    /                 200      /api/crm/status   200
    /api/leads        200      /api/home         401 (auth required, correct)

## Real bug found and fixed
functions/devServer.js calls app.listen() only inside
`if (require.main === module)`. It exports the app, so any runtime that
REQUIRES the entry instead of executing it as main gets an app that never
binds and a process that exits 0. server.js now owns the listen, which works
either way. This would have broken production on any such runtime.

## Still failing in production, cause unidentified
The deploy succeeds; the container returns 503 with Catalyst's generic
"Execution failed. Please check the startup command or port." The identical
package and command work locally. Ruled out by testing: nested entry path,
require.main guard, port variable, bind address, missing root route, and the
96 MB upload (now 160 KB).

Container logs are console-only — Development > AppSail > rq-api > Logs.
No CLI command and no BaaS API endpoint exposes them; the CLI source contains
no appsail log endpoint at all. The startup error in those logs is the next
thing needed.
