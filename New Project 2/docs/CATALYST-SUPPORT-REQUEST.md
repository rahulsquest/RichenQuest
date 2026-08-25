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
