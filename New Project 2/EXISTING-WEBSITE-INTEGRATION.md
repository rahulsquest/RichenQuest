# EXISTING-WEBSITE-INTEGRATION.md

The contract between the RichenQuest backend and the website served at
`https://www.richenquest.com`.

Every statement below is taken from code in this repository or from a live response. Nothing is
inferred. Endpoints that do not exist are not listed.

---

## First, a finding that changes what "integration" means here

**The live website is not a separate application. It is an older build of the frontend in this
repository.** Verified 2026-08-29 by downloading the live bundle
(`assets/index-CxODATZa.js`) and inspecting it:

| Evidence | Result |
|---|---|
| Endpoints it calls | Identical set to `client/src/services/*` — `/auth/login`, `/auth/signup`, `/home`, `/profile`, `/opportunities`, `/roadmap`, `/report`, `/mentor`, `/bookings`, `/documents`, `/payments`, `/notifications`, `/leads`, `/events` |
| Auth mechanism | `Authorization = \`Bearer …\`` — identical |
| API base URL | `apiBaseUrl:"/api"` — identical, including the same defect |
| Strings removed from this repo in Aug 2026 | All still present: "Zoho Catalyst Protected Architecture", "124 City Road", "Tier 4", "maximize acceptance rates", "Supporting University Placements", "London Advisory Hub", "Apply Now", "Submit Study Inquiry", "admissions@richenquest.com" |
| Strings added to this repo in Aug 2026 | All absent: "Your World.", "We Don't Guess", "Check My Fit", "Evidence Confidence", "support@richenquest.com" |

So there is **no second system to bridge to, and no competing frontend**. There is one codebase at
two versions: this repository (current) and the live domain (a build predating the August content,
security and truthfulness work).

**Consequence:** the integration contract below is already satisfied by construction — the live
site was built from this contract. The real task is not integration; it is **getting the current
build onto the domain**, which is a Slate binding question, not an engineering one.

---

## Required configuration

### API base URL

| | |
|---|---|
| Variable | `VITE_API_BASE_URL` |
| Production value | `https://api.richenquest.com/api` |
| Read at | **build time** — Vite inlines it into the bundle |

`scripts/deploy-production.sh` **refuses to build** when this is unset. That guard is deliberate
and must not be removed.

Why: `client/src/config/environment.js` defaults to `'/api'`, a relative path. A build carrying
that default asks `https://www.richenquest.com/api/...`, which Slate serves as static hosting.
Verified live: `/api/auth/login` on the Slate app returns **HTTP 200 with `content-type:
text/html`** — `index.html`, not a 404. The API client then parses HTML as JSON and fails with a
syntax error that names nothing useful.

**The bundle currently on the domain has this defect.** It must be rebuilt with the variable set;
no server-side configuration can fix an inlined value.

### CORS origin

| | |
|---|---|
| Variable | `CORS_ALLOWED_ORIGINS` (backend) |
| Production value | `https://www.richenquest.com` |

This is the origin the **browser** is on, not the API host. `devServer.js` fails closed: unknown
origins are rejected, and `'*'` is never valid because credentials are enabled.

Verified against the local backend:

- `Origin: https://www.richenquest.com` → `204`, `access-control-allow-origin: https://www.richenquest.com`, `access-control-allow-credentials: true`
- `Origin: https://evil.example` → no allow-origin header

### Other required backend variables

`SESSION_SECRET` (32+ bytes; the server refuses to sign sessions without it) ·
`ZOHO_CRM_CLIENT_ID` · `ZOHO_CRM_CLIENT_SECRET` · `ZOHO_CRM_REFRESH_TOKEN` · `NODE_ENV=production`.

India DC endpoints are already the code defaults — `ZOHO_ACCOUNTS_URL` and `ZOHO_CRM_API_DOMAIN`
need no value.

---

## Authentication

**Mechanism: bearer token in a header.** `client/src/services/apiClient.js` reads the token from
`localStorage['richenquest_auth_token']` and sends `Authorization: Bearer <token>` on every
request.

The server (`shared/session.js`) reads an httpOnly `rq_sess` cookie *first* and falls back to the
`Authorization` header. **No route currently sets that cookie** — `cookieHeader()` is exported but
never called — so bearer is the only live path. Do not build against the cookie.

The token is an HMAC-signed payload (`base64(json).hmac`), not a JWT. It is opaque to the client;
never parse it.

| Route | Method | Auth | Body | Success | Failure |
|---|---|---|---|---|---|
| `/auth/signup` | POST | none | `fullName`, `email`, `password`, `phone`, `countryOfCitizenship`, `targetDegree`, `targetCountries` | `201` + `{token, user, student, counselor}` | `400` validation · `409 EMAIL_EXISTS` |
| `/auth/login` | POST | none | `email`, `password` | `200` + `{token, user, student, counselor}` | `401` invalid credentials |
| `/auth/logout` | POST | bearer | — | `200` | — |
| `/auth/verify-email` | POST | none | verification token | `200` | `400` |
| `/auth/reset-password` | POST | none | `email` | `200` (always — does not disclose whether the account exists) | — |
| `/me` | GET | bearer | — | `200` + current user | `401` |

`counselor` is **`null`** unless a real counsellor record exists. The frontend must fall back to a
generic label — never invent a name. A fabricated counsellor ("Eleanor Vance", office "London HQ",
rating 4.95) was removed from seed data on 2026-08-29 and must not return.

Protected routes answer **`401`** with no/invalid token and **`403`** when a caller references a
record that is not theirs.

---

## Endpoints

### Student intelligence — identity comes from the session

These accept **no id parameter at all**. The student's CRM record id is resolved server-side from
the signed session, so there is nothing for a caller to tamper with. Do not send `studentId`.

| Route | Method | Auth | Success | Failure |
|---|---|---|---|---|
| `/home` | GET | bearer | `200` dashboard | `401` · **`409 PROFILE_NOT_LINKED`** |
| `/profile` | GET | bearer | `200` profile | `401` · `409` |
| `/profile` | POST | bearer | `200` `{updated[], rejected[]}` | `400 NOTHING_EDITABLE` · `409` |
| `/profile-score` | GET | bearer | `200` completeness + strength | `401` · `409` · `503` |
| `/opportunities` | GET | bearer | `200` `ranked[]` + `not_rankable[]` | `401` · `409` |
| `/roadmap` | GET | bearer | `200` roadmap | `401` · `409` |
| `/report` | GET | bearer | `200` report | `401` · `409` |
| `/mentor` | GET | bearer | `200` (honestly empty — no verified mentors exist) | `401` · `409` |
| `/request` | POST | bearer | `{kind, note}` → `200` | `400 UNKNOWN_REQUEST` · `409` |

**`409 PROFILE_NOT_LINKED` means the account has no CRM `leadId`.** Today that is expected for
every account, because no CRM credentials exist. After CRM is configured it is a **P0 code
defect**, not a configuration problem — see `CREDENTIAL-ARRIVAL-RUNBOOK.md` Step 8.

`/profile` POST writes only an allowlisted field set. Score, confidence, ranking, eligibility,
verification state and consent are engine-owned and silently rejected — they are reported back in
`rejected[]`, not applied.

### Student records — id in the path must be the caller's own

| Route | Method | Auth | Notes |
|---|---|---|---|
| `/students/:id` | GET | bearer | `403` for another student's id |
| `/cases/:id` | GET | bearer | `403` for another student's id |
| `/cases/:id` | PUT/PATCH | bearer | **always `403`** — case state is counsellor-owned |
| `/documents` | GET/POST | bearer | own documents only |
| `/notifications` | GET | bearer | own notifications |
| `/notifications/read-all` | PUT | bearer | — |
| `/crm/status` | GET | bearer | integration status |

### Consultation / booking

| Route | Method | Auth | Notes |
|---|---|---|---|
| `/bookings` | GET | bearer | own bookings |
| `/bookings` | POST | bearer | `studentId` in the body **must** be the caller's own, else `403` |
| `/bookings/:id` | PUT | bearer | reschedule |
| `/bookings/:id` | DELETE | bearer | cancel |

A booking is `CONFIRMED` with a `meetingUrl` **only** when Zoho Bookings actually confirms it.
Otherwise it is saved `PENDING_CONFIRMATION` with `meetingUrl: null`, and the response `message`
says so. **Display the server's `message`; do not assert that an invite was sent.** The hardcoded
slot list in the UI is a *preferred time* request — nothing checks a real calendar, and the
backend's `getAvailableSlots` is not currently called by the frontend.

### Payments

| Route | Method | Auth | Notes |
|---|---|---|---|
| `/payments` | GET | bearer | real Zoho Books state; `configured:false` when Books is unset |
| `/payments/services` | GET | bearer | `price: null`, `available_for_invoicing: false` while unpriced |
| `/payments/invoice` | POST | bearer | `{service_code}` only |

**Amount, currency and discount in the request body are ignored entirely.** Pricing is server-side.
While prices are unset the route returns `409 PRICE_NOT_CONFIGURED`. Invoice creation is idempotent
per student per service.

### Public

| Route | Method | Auth | Notes |
|---|---|---|---|
| `/leads` | POST | none | public inquiry form |
| `/leads` | GET | **staff only** | `401` unauthenticated, `403` for a student |
| `/events` | POST | none | analytics beacon; **allowlisted** to `PAGE_VIEW`, `LOGIN_COMPLETED`, `SIGNUP_COMPLETED`. Any other event name → `400` |
| `/health` | GET | none | `200 HEALTHY` or `503 DEGRADED`; never reports healthy when CRM is unreachable |

### Not implemented — do not build against these

`/feedback` (pilot feedback is captured outside the product today) ·
`/payments/:id/receipt` (`paymentService.getReceipt` calls it; no server route exists — always `404`) ·
`caseService.updateCase` (calls `PUT /cases/:id`, which always returns `403` by design).

`apiClient`'s `params` option is accepted but never applied to the URL — pass query strings
explicitly if a route ever needs one. Harmless today because no route reads query parameters.

---

## Truthfulness rules the frontend must not break

These are product constraints, not style preferences:

1. **Match Score and Evidence Confidence are separate numbers.** Never average, merge, or present
   either as a probability of admission, scholarship or visa.
2. **Never render a counsellor who does not exist.** `counselor: null` → a generic label.
3. **Never claim a booking is confirmed or an invite sent** unless the server says `CONFIRMED`.
4. **Never present an opportunity that failed verification as actionable.** Only two records
   currently pass the five-field gate.
5. **Never display a price where the server returned `null`.** `null` is not `0`.
6. **Never invent availability, mentors, partners, offices, or statistics.**

---

## Related documents

`CREDENTIAL-ARRIVAL-RUNBOOK.md` (platform repo) — the ordered sequence once CRM credentials exist.
`BACKEND-HANDOFF-FOR-WEBSITE-DEVELOPER.md` — the same contract written for whoever deploys the site.
