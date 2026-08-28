# BACKEND-HANDOFF-FOR-WEBSITE-DEVELOPER.md

For whoever owns the deployment of `https://www.richenquest.com`.

**The live website remains the product website. Nothing here replaces it, and no second website
is being built.** The full API reference is `EXISTING-WEBSITE-INTEGRATION.md`; this is the short
version plus the one thing that actually needs doing.

---

## 1. Read this first — the live site is an older build of this repository

Checked on 2026-08-29 by downloading the live bundle and reading it:

- It calls the **identical** endpoint set as `client/src/services/*`
- It uses the **identical** auth mechanism (`Authorization: Bearer …`)
- It carries the **identical** `apiBaseUrl:"/api"`
- It still contains strings deleted from this repo in August — `"Zoho Catalyst Protected
  Architecture"`, `"124 City Road"`, `"Tier 4"`, `"London Advisory Hub"`, `"Apply Now"` — and
  **none** of the strings added since

So this is one codebase at two versions, not two systems. **There is no integration work to do in
the sense of wiring two applications together.** The live domain is simply serving a build from
before the August content, security and truthfulness fixes.

Practical consequence: the frontend does not need changing to "become compatible". It needs
**rebuilding with one variable set, and the domain needs to point at that build.**

---

## 2. What is already built and verified

| Area | State |
|---|---|
| Backend API | Complete — auth, profile, opportunities, roadmap, report, mentor, bookings, documents, payments, notifications |
| Security regression | **20/20 passing** |
| Targeted security tests | **12/12 passing** |
| Client build | Clean |
| Secrets | None in either repository's history; `.env` files untracked |

Security controls verified live: unauthenticated access blocked · student PII protected
(`/api/leads` is staff-only) · cross-student reads refused · body-supplied `studentId` rejected ·
analytics events allowlisted · client-supplied invoice amounts ignored · webhook auth fails closed ·
health reports DEGRADED honestly rather than pretending.

**Do not weaken any of these, and do not edit a test to make it pass.**

---

## 3. What you must actually do

### a. Rebuild the frontend with the API base URL set

This is the single most important item. `VITE_API_BASE_URL` is **inlined at build time** — no
server-side setting can fix it afterwards.

```
VITE_API_BASE_URL=https://api.richenquest.com/api bash scripts/deploy-production.sh
```

The deploy script now **refuses to build** without it. That guard is intentional.

Why it matters: a build carrying the `'/api'` default calls
`https://www.richenquest.com/api/...`, which Slate answers as static hosting. Verified live —
`/api/auth/login` returns **HTTP 200 with `content-type: text/html`**, i.e. `index.html`. The app
then parses HTML as JSON and fails with an error that explains nothing. **The bundle on the domain
today has exactly this defect.**

Confirm after building:

```
grep -o 'apiBaseUrl:"[^"]*"' client/dist/assets/*.js
```

Must print the real HTTPS origin, not `"/api"`.

### b. Set the backend CORS origin

```
CORS_ALLOWED_ORIGINS=https://www.richenquest.com
```

The browser's origin, not the API host. It previously read `https://app.richenquest.com` — a host
that does not exist; corrected 2026-08-29. CORS fails closed, and because the frontend sends an
`Authorization` header every call is preflighted, so a wrong value blocks everything before it
reaches a route.

### c. Point the domain at the current build

`www.richenquest.com` currently resolves through Slate resource **`7264000000019003`**
(`rq-site-ysgqnszn`), which is **not** the app this repo deploys to (`rq-site-ugkizspd`, app
`8769000000005006`). Proven: the domain and `rq-site-ysgqnszn` return a byte-identical object —
same ETag, same `Last-Modified`.

That is why deploying `rq-site` has never changed the live site.

**This needs a decision, not a guess:** is `rq-site-ysgqnszn` a stale artifact, or the app you
deploy to? Nothing has been changed here — no DNS, no bindings, no redeploy.

---

## 4. Environment variables

**Frontend (build time — compiled into the bundle, public):**

| Variable | Production value |
|---|---|
| `VITE_API_BASE_URL` | `https://api.richenquest.com/api` |
| `VITE_APP_ENV` | `production` |
| `VITE_SUPPORT_EMAIL` | `support@richenquest.com` |
| `VITE_SUPPORT_PHONE` / `VITE_WHATSAPP_NUMBER` | real numbers |

`support@` is the decided address of record for student and DPDP/legal contact
(`EMAIL-IDENTITY-DECISION.md`, 2026-08-23); `official@` is institutional. Do not reintroduce
`admissions@`.

**Backend (server-side — never prefix any of these `VITE_`):**

`SESSION_SECRET` · `CORS_ALLOWED_ORIGINS` · `NODE_ENV=production` · `ZOHO_CRM_CLIENT_ID` ·
`ZOHO_CRM_CLIENT_SECRET` · `ZOHO_CRM_REFRESH_TOKEN`

Full list and safe defaults: `.env.production.example`.

---

## 5. Authentication flow

1. `POST /auth/signup` or `POST /auth/login` → `{ token, user, student, counselor }`
2. Store the token (current client uses `localStorage['richenquest_auth_token']`)
3. Send `Authorization: Bearer <token>` on every subsequent request
4. `401` = missing/invalid token · `403` = valid token, someone else's record

The token is an opaque HMAC-signed payload, not a JWT — never parse it. The server also reads an
httpOnly `rq_sess` cookie, but **nothing sets it today**; bearer is the only live path.

`counselor` is `null` unless a real counsellor exists. Fall back to a generic label — a fabricated
counsellor was removed from seed data and must not return.

---

## 6. Signup → CRM → leadId (what should happen)

```
POST /auth/signup
  → local account created
  → Zoho CRM Contact created (async)
  → on success, leadId + crmModule written to the Users record
  → intelligence routes resolve the student from that leadId
```

Until the `leadId` exists, **every** intelligence route returns `409 PROFILE_NOT_LINKED`. That is
correct, honest behaviour — not a bug — while CRM is unconfigured.

**After CRM is configured, a 409 there is a P0 code defect, not a misconfiguration.** This handoff
path has a history: signup once wrote CRM status to the `Students` table while every consumer read
`leadId` from `Users`. The fix is in `auth/index.js` but has **never executed against a real CRM**,
because it only runs inside a real sync's success branch.

---

## 7. Consultation behaviour

A booking is `CONFIRMED` with a `meetingUrl` **only** when Zoho Bookings confirms it. Otherwise it
is `PENDING_CONFIRMATION` with `meetingUrl: null`.

**Render the server's `message` field.** Do not hardcode a success line. The UI previously always
said *"Consultation confirmed! Calendar invite & confirmation dispatched."* even when nothing was
sent — fixed 2026-08-29; do not reintroduce it.

Times are **IST** and the slot list is a *preferred time* request. Nothing checks a real calendar.
Do not present it as availability, and do not build a fake calendar integration.

---

## 8. Truthfulness rules — product constraints, not preferences

1. Match Score ≠ Evidence Confidence. Never merge them; never present either as a probability of
   admission, scholarship or visa.
2. Never render a counsellor, mentor, partner, office, rating or statistic that does not exist.
3. Never claim a booking is confirmed or an invite sent unless the server says so.
4. Never show an unverified opportunity as actionable. Only **two** records currently pass the
   five-field verification gate (University of Pécs, University of Debrecen).
5. `price: null` is not `0`. Never display a price the server did not give you.

The verification gate is the product. Do not weaken it to make a screen look fuller.

---

## 9. What is NOT ready

| Area | State |
|---|---|
| **Backend deployment** | Not deployed. `api.richenquest.com` does not resolve. |
| **CRM connectivity** | Application OAuth credentials do not exist. Never verified. |
| **Signup → CRM → leadId** | **Unverified against a real CRM.** |
| **Consent capture** | Implemented but inactive — `READY=false`. Blocked on advocate-approved wording. **Do not activate or invent wording.** |
| **Pricing / invoicing** | All five prices `null`; fails closed. Blocked on founder + CA. |
| **Zoho Books** | Not production-ready. |
| **Mentors** | Zero verified mentors. |
| **Domain binding** | Serving an older build via a different Slate resource. |

Until CRM credentials exist, the correct behaviour of a signed-up student hitting the dashboard is
`409 PROFILE_NOT_LINKED` on every intelligence route. That is the system being honest, not broken.

---

## 10. Your checklist

- [ ] Confirm whether `rq-site-ysgqnszn` (`7264000000019003`) is stale or the app you deploy to
- [ ] Rebuild with `VITE_API_BASE_URL=https://api.richenquest.com/api`
- [ ] Verify the built bundle does **not** contain `apiBaseUrl:"/api"`
- [ ] Set `CORS_ALLOWED_ORIGINS=https://www.richenquest.com` on the backend
- [ ] Point the domain at the current build
- [ ] Do not reintroduce `admissions@`, "Tier 4", "London HQ", or the hardcoded booking-success line
- [ ] Do not weaken CORS, the `VITE_API_BASE_URL` guard, or any security test

Once CRM credentials arrive, follow `CREDENTIAL-ARRIVAL-RUNBOOK.md` in order — especially Step 8,
the `leadId` handoff test.
