# Zoho Catalyst support request — Serverless/AppSail not provisioned

Send to: support@zohocatalyst.com
(That address is printed by Catalyst's own 404 page on the AppSail route.)

Subject: Serverless/AppSail entitlement missing on project 53691000000016002 despite active billing

---

Organization: 60076829044
Project:      RichenQuest
Project ID:   53691000000016002
Environment:  Development
Data centre:  India (.in)

Billing is active on this organization. The free-tier expiry banner and the
"$250 credits / configure your payment method" prompt have both cleared from
the org console. However, Serverless/AppSail is still absent from the project.

EVIDENCE

1. GET /baas/v1/project/53691000000016002/service
   returns: {"service":["Cloud Scale","Settings"]}
   Serverless is not listed.

2. GET /baas/v1/project/53691000000016002/appsail
   returns: {"status":"success","data":[]}

3. GET /baas/v1/project/53691000000016002/function
   returns: {"status":"success","data":[],"total_size":0}

4. Console route
   https://console.catalyst.zoho.in/baas/60076829044/project/53691000000016002/Development#/appsail
   renders: "404, Page not Found! Contact support@zohocatalyst.com for more details"
   The same 404 appears in the Production environment.

5. `catalyst deploy appsail --name rq-api` reports "DEPLOYMENT SUCCESSFUL" and
   returns an AppSail URL, but no service is created — the appsail list stays
   empty after every attempt, and the returned URL responds 503
   "Execution failed. Please check the startup command or port."

6. A minimal dependency-free Node http server (no Express, no imports, no
   environment variables) was deployed as a control and failed identically,
   which isolates the fault to provisioning rather than to the application.

REQUEST

Please provision/restore the Serverless AppSail entitlement for project
53691000000016002 under organization 60076829044. Billing is active, but the
Serverless/AppSail service is absent from the project API and the AppSail
console route returns 404.

Please do not make changes to any other project on this organization.

---

## Fresh evidence, 2026-08-26 — the fault is ORG-WIDE, not project-specific

Read-only comparison of both projects on organization 60076829044:

| Project | ID | services | appsail |
|---|---|---|---|
| RichenQuest | 53691000000016002 | `["Cloud Scale","Settings"]` | 0 |
| Project-Rainfall | 53691000000013024 | `undefined` | 0 |

Serverless is absent from BOTH projects, and the second returns no service list
at all. Whatever is wrong is at the organization/entitlement layer, not with
the RichenQuest project's own configuration. No write operation was performed
on Project-Rainfall.

Also attempted and ruled out:
- `catalyst appsail:add` + `catalyst deploy appsail` — reports DEPLOYMENT
  SUCCESSFUL and returns a URL, but no service is ever created and the URL
  answers 503.
- `catalyst init appsail` — this is local scaffolding that offers example
  repositories to clone. It does not provision the service entitlement.
- A dependency-free Node http server deployed as a control failed identically,
  which rules out the application as a cause.

CLI 1.27.0, authenticated as rahul@richenquest.com, project association
verified as RichenQuest / 53691000000016002 / Development before every attempt.

## Re-confirmed, same day, after real application fixes landed

`catalyst deploy --only appsail:rq-api -ni` was run once more after today's
port-binding fix (`c57c83a`: server.js now correctly owns `app.listen()`,
reads `X_ZOHO_CATALYST_LISTEN_PORT` first, and serves a dependency-free `/`
liveness route). Identity re-verified first (`project:list` shows
RichenQuest / 53691000000016002 as the active project).

Result: `DEPLOYMENT SUCCESSFUL`, URL
`https://rq-api-50043782438.development.catalystappsail.in`. Every route,
including the dependency-free `/`, answers identically:

    HTTP 503
    {"status":"failure","data":{"message":"Execution failed. Please check
    the startup command or port.","error_code":"INTERNAL_SERVER_ERROR"}}

This is the same signature the control test (a bare Node http server, no
Express, no env vars) already produced above. Since the actual application's
port/listen logic was independently fixed and verified locally today (15/15
regression, correct binding under both `PORT` and
`X_ZOHO_CATALYST_LISTEN_PORT`), and a dependency-free control server fails
identically, this re-confirms the fault sits at the platform provisioning
layer, not in application code. No further deploy attempts made — repeating
an unprovisioned deploy produces no new information.
