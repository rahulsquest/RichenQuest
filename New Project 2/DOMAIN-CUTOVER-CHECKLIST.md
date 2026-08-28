# DOMAIN-CUTOVER-CHECKLIST.md

For the founder / production owner. Getting `www.richenquest.com` onto the verified build.

**Release artifact: `assets/index-BFfCqogA.js`** — commit `cb03302`, see
`PRODUCTION-RELEASE-MANIFEST.md`.

Nothing in this checklist has been executed. No DNS, no bindings, no deploy.

---

## The situation, in one table

Verified live 2026-08-29:

| | Slate resource | Bundle served | Release-ready |
|---|---|---|---|
| `www.richenquest.com` | `7264000000019003` (`rq-site-ysgqnszn`) | `index-CxODATZa.js` | No — pre-August build |
| `rq-site-ugkizspd` | `8769000000005006` | `index-CcXANhqa.js` | No — carries `apiBaseUrl:"/api"` |
| Target | — | `index-BFfCqogA.js` | **Yes** |

The domain and `rq-site-ysgqnszn` return a **byte-identical object** — same ETag, same
`Last-Modified` — which is how we know the domain is bound to that app and not to the one
`scripts/deploy-production.sh` deploys to. It is also why every deploy so far has had no effect on
the live site.

DNS is **correct** and is not the problem. Do not change it.

---

## The one decision that picks the path

**Is `rq-site-ysgqnszn` (`7264000000019003`) a stale artifact, or the app production actually
deploys to?**

Nothing else can proceed until this is answered. Both paths end at the same place; they differ only
in whether the domain moves.

> **Both paths require a fresh deploy of `index-BFfCqogA.js`.** Neither currently-deployed bundle
> is release-ready — moving the domain alone would still ship a build calling `/api`.

---

## PATH A — `rq-site-ysgqnszn` is stale

Use when that app is a leftover and `rq-site` (`8769000000005006`) should own the domain.

1. **Deploy the verified artifact first**, so the destination is correct before the domain moves:
   ```
   VITE_API_BASE_URL=https://api.richenquest.com/api bash scripts/deploy-production.sh
   ```
2. Confirm the Slate app now serves it:
   ```
   curl -s https://rq-site-ugkizspd.onslate.in/ | grep -o "assets/index-[A-Za-z0-9_-]*\.js"
   ```
   Expect `index-BFfCqogA.js`.
3. In the Catalyst console, **release** `www.richenquest.com` from resource `7264000000019003`.
   Remove only that domain binding. Do not delete the app — it may hold history, and deleting is
   irreversible.
4. **Bind** `www.richenquest.com` to `rq-site` (`8769000000005006`), newest deployment.
5. Wait for propagation, then run the success check below.

**Order matters:** deploying first means that at no point does the domain point at an app serving
nothing.

---

## PATH B — `rq-site-ysgqnszn` is the legitimate production app

Use when that app is the real deploy target owned by whoever runs the website. **The domain does
not move.**

1. Deploy `index-BFfCqogA.js` to **that** app. `scripts/deploy-production.sh` targets `rq-site`
   via `catalyst.json`, so it must be pointed at the correct app name — confirm the Slate app name
   in the console first rather than assuming it is also called `rq-site`.
2. Do **not** unbind or move the domain.
3. Run the success check below.

**Do not overwrite another person's deployment without their agreement.** If that app is actively
maintained by someone else, agree the deploy with them first — this checklist assumes authorization,
it does not grant it.

---

## Success condition — identical for both paths

```
curl -s https://www.richenquest.com/ | grep -o "assets/index-[A-Za-z0-9_-]*\.js"
```

**Success:** `assets/index-BFfCqogA.js`
**Failure:** anything else — in particular `index-CxODATZa.js` (unchanged) or `index-CcXANhqa.js`
(the pre-guard build).

Confirm the API URL actually shipped:

```
curl -s https://www.richenquest.com/assets/index-BFfCqogA.js | grep -o 'apiBaseUrl:"[^"]*"'
```

**Success:** `apiBaseUrl:"https://api.richenquest.com/api"`
**Failure:** `apiBaseUrl:"/api"` — wrong artifact; stop and rebuild.

---

## POST-CUTOVER SMOKE TEST

### Part 1 — Static website tests

**Run these immediately after cutover.** They need no backend and must all pass.

| # | Check | How | Pass |
|---|---|---|---|
| 1 | Homepage loads | `curl -s -o /dev/null -w "%{http_code}" https://www.richenquest.com/` | `200` |
| 2 | Login page loads | same for `/login` | `200` |
| 3 | Signup page loads | same for `/signup` | `200` |
| 4 | All public routes | `/`, `/about`, `/services`, `/how-it-works`, `/contact`, `/faq`, `/login`, `/signup`, `/inquiry` | all `200` |
| 5 | API base URL correct | grep the bundle for `apiBaseUrl` | `https://api.richenquest.com/api` |
| 6 | No `/api` HTML fallback reachable by the app | grep bundle for `apiBaseUrl:"/api"` | **0** |
| 7 | No `admissions@` | grep bundle | **0** |
| 8 | No fabricated counsellor | grep bundle for `Eleanor Vance`, `London HQ`, `4.95` | **0** each |
| 9 | No stale claims | grep for `Tier 4`, `124 City Road`, `maximize acceptance rates` | **0** each |
| 10 | Consent still inactive | grep for `consent statement` | **0** |
| 11 | Honest consultation copy | grep for `Calendar invite & confirmation dispatched` | **0** |
| 12 | No fake availability wording | consultation slot label reads `Preferred Time Slot (IST)`, not availability | manual |
| 13 | Per-route titles | each route returns its own `<title>` | 9 distinct |

Note on #6: Slate answers unknown paths with `index.html` at HTTP 200 — a soft-404. That behaviour
is a property of Slate and is not fixed by this release. It is harmless **only** because the app no
longer calls a relative `/api`.

### Part 2 — Backend / CRM tests

**Do not run these at cutover.** They cannot pass until CRM credentials exist and the backend is
deployed, and running them early produces failures that look like release defects but are not.

| # | Check | Expected once backend is live |
|---|---|---|
| 1 | `GET /api/health` | `200 HEALTHY`, `crm.reachable: true` |
| 2 | CORS preflight from `https://www.richenquest.com` | `204` + matching allow-origin |
| 3 | Signup | `201` + token |
| 4 | CRM Contact created | exactly one row for the test address |
| 5 | **`leadId` handoff** | `GET /api/home` → `200`, **not** `409` |
| 6 | Authorization suite | `/api/leads` 403 as student, cross-student 403, body `studentId` 403 |
| 7 | Opportunities | 1–2 Hungarian options, score and confidence separate |
| 8 | Cleanup | test records deleted; lead `1292318000001187003` preserved |

Full sequence: `CREDENTIAL-ARRIVAL-RUNBOOK.md` (platform repo).

**Item 5 is the one to watch.** A `409 PROFILE_NOT_LINKED` after CRM is correctly configured is a
**P0 code defect**, not a configuration failure. Before credentials exist, that same 409 is correct
behaviour.

---

## What cutover does not achieve

Cutover ships the corrected **public website**. It does not make the product usable.

Still blocked afterwards: backend deployment · CRM connectivity · the student journey · consent
(inactive, awaiting advocate-approved wording) · pricing and invoicing (fail-closed) · mentors
(none verified).

Do not announce the product as launched on the strength of a successful cutover.
