# Production cutover

Prepared 2026-09-01. Everything here is derived from the code, verified locally where it can be,
and explicitly labelled where it cannot. Nothing in this document has been executed against
production.

Companion documents: `DATASTORE-SCHEMA.md` (table creation), `FOUNDER-ACTIONS.md` (A1–A10).

---

## 1. Environment inventory

Extracted from `process.env` usage in `backend/functions/**` and `backend/server.js`.
Node modules' own variables are excluded.

### Required before go-live

| Variable | Purpose | Where configured | Safe default | Production validation |
|---|---|---|---|---|
| `SESSION_SECRET` | Signs session tokens (HMAC-SHA256) | AppSail env only | **None — refuses to start signing** | Login returns a token; a tampered token is rejected |
| `ZOHO_CRM_CLIENT_ID` | OAuth client | AppSail env only | none | `/api/health` → `zohoAuth.configured: true` |
| `ZOHO_CRM_CLIENT_SECRET` | OAuth client secret | AppSail env only | none | as above |
| `ZOHO_CRM_REFRESH_TOKEN` | Long-lived CRM grant | AppSail env only | none | `/api/health` → `crm.reachable: true` |
| `CORS_ALLOWED_ORIGINS` | Browser origin allowlist | AppSail env | `http://localhost:3000` — wrong for prod | Preflight from `https://www.richenquest.com` returns 204 |
| `VITE_API_BASE_URL` | API origin baked into the SPA | **Build time**, client | `/api` — breaks silently | Guard rejects relative; bundle scan confirms it landed |

`SESSION_SECRET` falls back to `ZOHO_WEBHOOK_SECRET` if unset, and refuses anything under 16
characters. It never uses a default key.

### Optional / feature flags — absence disables a feature, honestly

| Variable | Purpose | Behaviour when unset |
|---|---|---|
| `ZOHO_WORKDRIVE_ROOT_FOLDER_ID` | Document storage | Upload returns **503**, no phantom review row |
| `ZOHO_FLOW_LEAD_WEBHOOK_URL` | Lead automation | `UNCONFIGURED`, lead still syncs to CRM |
| `ZOHO_FLOW_DOCUMENT_WEBHOOK_URL` | Document automation | `UNCONFIGURED` |
| `ZOHO_FLOW_BOOKING_WEBHOOK_URL` | Booking automation | `UNCONFIGURED` |
| `ZOHO_FLOW_PAYMENT_WEBHOOK_URL` | Payment automation | `UNCONFIGURED` |
| `ZOHO_BOOKS_AUTH_TOKEN`, `ZOHO_BOOKS_ORG_ID` | Invoicing | `/api/payments` → `configured: false` |
| `ZOHO_BOOKINGS_SERVICE_ID`, `ZOHO_BOOKINGS_STAFF_ID` | Consultations | No fabricated slots or meeting URLs |
| `ZOHO_WEBHOOK_SECRET` | Inbound webhook auth | Webhooks rejected |
| `SMS_PROVIDER_NAME`, `TWILIO_*` | Phone verification | Feature off |
| `VITE_SALESIQ_WIDGET_CODE` | Chat widget | Widget absent |
| `HYDRATE_TIMEOUT_MS` | Startup hydrate bound | Built-in default |

Domain overrides (`ZOHO_ACCOUNTS_URL`, `ZOHO_CRM_API_DOMAIN`, `ZOHO_BOOKS_API_DOMAIN`,
`ZOHO_BOOKINGS_API_DOMAIN`, `ZOHO_WORKDRIVE_API_DOMAIN`) already default to the **India DC**
(`accounts.zoho.in` / `zohoapis.in`). **Do not set them.**

### Development only

`PORT`, `NODE_ENV`, `VITE_APP_ORIGIN`, `ZOHO_CRM_CODE`, `ZOHO_CRM_REDIRECT_URI` (one-time OAuth
exchange only — not needed at runtime). `CATALYST_CONFIG`, `CATALYST_LISTEN_PORT` and
`X_ZOHO_CATALYST_LISTEN_PORT` are injected by the platform; never set them by hand.

### Must never be committed

`SESSION_SECRET`, `ZOHO_CRM_CLIENT_SECRET`, `ZOHO_CRM_REFRESH_TOKEN`, `ZOHO_BOOKS_AUTH_TOKEN`,
`ZOHO_WEBHOOK_SECRET`, `TWILIO_AUTH_TOKEN`.

`.env` is excluded by both `.gitignore` and `backend/.catalystignore` — verified. Note that
`pack.js` honours **only** `.catalystignore`, never `.gitignore`.

**Every `VITE_*` value is compiled into the bundle as readable plaintext.** Never put a secret
behind a `VITE_` prefix. `deploy-production.sh` now scans `dist/` for credential-shaped strings
and refuses to publish if it finds one.

---

## 2. SESSION_SECRET rotation

The old secret was packaged into four historical AppSail artifacts before `.catalystignore`
excluded `.env`. No Zoho OAuth credentials were exposed. **The old value is not retrieved,
printed, or reused anywhere in this plan.**

Impact of rotation: every existing session token becomes invalid, so everyone is logged out once.
No password is affected — password hashes are independent of this secret.

```bash
# 1. Generate. Do not paste this into a file, a commit, or a chat.
openssl rand -hex 32
```

2. Set it **only** in the AppSail environment configuration — never in `.env`, never committed.
3. Redeploy the backend **only once AppSail is functioning** (Blocker 1).
4. Verify: log in → a token is issued; call an authenticated route with a token minted before the
   rotation → it must be rejected.
5. Confirm no future artifact carries it: `unzip -p <artifact>.zip | grep -c SESSION_SECRET`
   must be `0`.

---

## 3. Zoho CRM pre-flight

### Scopes — pilot lead flow only

| Scope | Why it is needed | Evidence |
|---|---|---|
| `ZohoCRM.modules.leads.ALL` | Create, search and update Leads | `crm/v3/Leads`, `crm/v3/Leads/search` |
| `ZohoCRM.settings.modules.READ` | `/api/health` reachability probe | `crm/v8/settings/modules` |

**These two are sufficient. Request nothing else for the pilot.**

### Deliberately NOT requested yet

| Scope | Used by | Request when |
|---|---|---|
| `ZohoCRM.modules.contacts.ALL` | Signup + profile sync (`crm/v3/Contacts`) | Student accounts go live |
| `ZohoCRM.functions.execute.CREATE` | Deluge engines (`crm/v7/functions`) | Phase 9 (matching/intelligence) |

Unused code exists for both. That is not a reason to hold the scope.

### Verified in code

- **Lead creation/update** — upsert by email, so a repeat submission updates rather than duplicates.
- **Duplicate handling** — `crm/v3/Leads/search` by email before write.
- **Picklist validation** — `leadSourceFor()` maps every frontend source string to a valid
  `Lead_Source` / `Lead_Source_Detail` pair. Mapping is compile-time, not a runtime API call.
  Guarded by the readiness suite. This matters because CRM **accepts** an out-of-list value and
  then never matches a filter — silent corruption.
- **Country normalisation** — `countryFor()` maps `Dubai (UAE)` → `United Arab Emirates`; empty
  becomes null and the field is omitted rather than sent blank.
- **Field lengths** — clamped before send: `Last_Name` 80, `Email` 100, `Phone` 30,
  `Description` 32000. Prevents silent truncation server-side.
- **Consent fields** — the four existing Leads fields are used; none were created. See §5.
- **CRM failure reporting** — a failure is never reported as success; see the durability gate.

**Counsellor visibility is the one item that cannot be verified from code.** It depends on CRM
sharing rules and role assignment, and must be confirmed by a human in §4 step 9.

---

## 4. First real lead — controlled E2E test

Run **only** when every prerequisite below is already true.

**Prerequisites:** AppSail instances > 0 · `/api/health` 200 with `crm.reachable: true` ·
all nine Data Store tables report `PERSISTENT` · `api.richenquest.com` resolves over HTTPS ·
the deployed bundle carries the absolute API base URL.

Use a clearly identifiable test lead:

```text
Name:  RQ Cutover Test <YYYY-MM-DD>
Email: cutover-test-<YYYY-MM-DD>@richenquest.com
Phone: <a real number you control>
```

Submit it **through the website form** at `https://www.richenquest.com`, not by curl. The point is
to exercise the real browser → Slate → API → CRM path, including CORS.

Record every stage. A blank cell is a failure, not a pending item:

| Stage | Evidence to capture |
|---|---|
| Timestamp | ISO-8601, submission moment |
| Test identifier | The exact email used |
| HTTP response | Status + body. Must be **201**, not 503 |
| Message shown | Must be the counsellor wording — proves CRM sync, not just storage |
| Local persistence | Row present in the `Leads` Data Store table |
| Restart safety | Restart the instance, confirm the row is **still there** |
| CRM status | `zohoSync.crm.status` = `SYNCED` / `CREATED` / `UPDATED` |
| Zoho Lead ID | The real record id |
| Field mapping | Name, email, phone, country, `Lead_Source`, `Lead_Source_Detail` all correct |
| Counsellor visibility | **A human other than you** finds the lead in their CRM view |

If the response is 503 `SUBMISSION_NOT_STORED`, the durability gate did its job: nothing durable
held the lead. Do not retry blindly — fix the cause.

**Cleanup:** delete the test Lead from Zoho CRM and its `Leads` Data Store row. Record the
deletion. Do not leave a synthetic record behind; two were already deleted on 2026-08-27 for
exactly this reason.

---

## 5. Consent activation

Currently `READY=false`, `VERSION=null`, `TEXT=null` in both `backend/functions/shared/consent.js`
and `client/src/config/consent.js`. Inert — nothing is written, nothing is rendered.

**No legal wording is invented here.** The advocate/founder supplies `CONSENT_TEXT` and
`CONSENT_VERSION` verbatim.

1. Receive approved `TEXT` and `VERSION`.
2. Validate `VERSION` is **≤ 40 characters** — the ceiling comes from
   `Leads.Consent_Policy_Version`.
3. Set the constants in both files, verbatim. No paraphrasing.
4. Flip `READY` / `CONSENT_READY` to `true`.
5. Verify a submission **without** consent is rejected `CONSENT_REQUIRED`.
6. Verify **no local persistence** occurred for that rejected request.
7. Verify **no CRM write** occurred for it.
8. Verify the consent timestamp is **server-generated** — a client-supplied one is ignored.
9. Verify the CRM fields written are the four existing Leads fields: `Consent_Given`,
   `Consent_Timestamp`, `Consent_Policy_Version`, `Parent_Consent`. **Create no new fields.**
10. Run one controlled lead end-to-end per §4.

Steps 5–8 are already covered by the readiness suite against a throwaway copy with the gate
forced on, so they can be verified before the real wording exists.

The four `Consent_*` columns must exist on the `Leads` **Data Store** table before this — see
`DATASTORE-SCHEMA.md`.

---

## 6. Deluge engines

`matchOpportunities`, `studentIntelligence`, `readinessSweep`. Rounding and grammar fixes are
committed but **not deployed**.

Pre-flight, already passing:

```bash
bash scripts/check-deluge-rounding.sh   # PASS  no unrounded percentage arithmetic
```

**Do not deploy until** AppSail works · CRM E2E is complete · `ZohoCRM.functions.execute.CREATE`
is granted.

After deployment verify: a percentage renders as `89%` and never `88.88888888888889%` ·
grammar output reads correctly · outputs are visible in CRM · **no unexpected records modified**.

---

## 7. Frontend cutover

Only after `/api/health` works, `api.richenquest.com` resolves, and HTTPS is valid.

```bash
cd "New Project 2"
VITE_API_BASE_URL=https://api.richenquest.com/api bash scripts/deploy-production.sh
```

The script now enforces the pre-deployment checks itself: it rejects a relative, localhost or
non-https base URL; confirms the URL actually landed in `dist/assets/*.js`; and refuses to publish
if a credential-shaped string appears anywhere in `dist/`.

**It does not pass `--production`, deliberately.** `www.richenquest.com` is served by the
**Development** environment of the Slate app (`rq-site-ysgqnszn`). `--production` publishes to
`rq-site-ugkizspd`, which the domain does not point at — the deploy reports success and the live
site does not change. Change this only together with the domain mapping.

After deploying: `www.richenquest.com` loads · a form POST reaches the API · **no HTTP 405** ·
the network tab shows requests to `api.richenquest.com`, not to the Slate origin.

---

## 8. GO / NO-GO gate

One green check per row, each backed by production evidence. Local tests do not substitute.

| Requirement | Evidence | Status |
|---|---|---|
| Data Store tables exist | Console shows all nine; `/api/health` reports `PERSISTENT` | ⬜ |
| Durable lead storage | Real write survives an instance restart | ⬜ |
| AppSail instance running | Instances > 0 | ⬜ |
| `/api/health` works | HTTP 200 | ⬜ |
| API domain works | DNS + valid HTTPS | ⬜ |
| Correct frontend bundle live | Bundle carries the absolute API base URL | ⬜ |
| Lead request reaches backend | Real request logged | ⬜ |
| Lead durable before success | 201 only when durable — gate in `leads/index.js` | ⬜ |
| Lead reaches Zoho CRM | Real Zoho Lead ID | ⬜ |
| Counsellor can find lead | Human confirmation | ⬜ |
| Picklists valid | Values match the live picklist | ⬜ |
| Consent correctly enforced | Controlled test | ⬜ |
| Rate limiting works | Production-safe test | ⬜ |
| Session secret rotated | New secret set in AppSail only | ⬜ |
| No secrets in artifact | Artifact scan returns 0 | ⬜ |
| Deluge functions work | Live output in CRM | ⬜ |

Nothing may be marked READY until the controlled lead in §4 has completed the entire real path and
a counsellor has found the record in Zoho CRM.
