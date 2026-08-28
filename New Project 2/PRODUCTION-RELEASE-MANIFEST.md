# PRODUCTION-RELEASE-MANIFEST.md

The frontend artifact approved for production, and exactly what it does and does not deliver.

Built and verified 2026-08-29. **Not deployed.**

---

## Build

| | |
|---|---|
| Commit | `cb0330294f6bd3c667988804e6f6f97265a91121` (`cb03302`) |
| Working tree | clean at build time |
| Bundle | **`assets/index-BFfCqogA.js`** |
| Stylesheet | `assets/index-CWQ5_Hzi.css` |
| Reproducible | **Yes** — two clean builds from the same commit and env produced the identical hash |

### Build command

```
VITE_API_BASE_URL=https://api.richenquest.com/api bash scripts/deploy-production.sh
```

To produce the artifact without deploying:

```
cd client && rm -rf dist
VITE_API_BASE_URL=https://api.richenquest.com/api node node_modules/vite/bin/vite.js build
```

`client/dist/` is gitignored — the artifact is not committed. This manifest plus the commit is how
it is reproduced.

### Required build-time variable

| Variable | Value |
|---|---|
| `VITE_API_BASE_URL` | `https://api.richenquest.com/api` |

Vite **inlines** this. A build made without it carries the `'/api'` default from
`client/src/config/environment.js`, and no server-side setting can correct an inlined value.
`scripts/deploy-production.sh` refuses to build when it is unset.

---

## Verification of this artifact

**Required present**

| String | Count |
|---|---|
| `https://api.richenquest.com/api` | 1 |
| `support@richenquest.com` | 1 |

**Required absent — all zero**

`apiBaseUrl:"/api"` · `admissions@richenquest.com` · `Tier 4` · `124 City Road` · `London HQ` ·
`Eleanor Vance` · `4.95` · `guaranteed admission` · `maximize acceptance rates` ·
`Calendar invite & confirmation dispatched` · `BST` · `consent statement`

The last confirms the consent UI stays out of the bundle while `READY = false` in
`shared/consent.js`. Consent is **not** activated by this release.

---

## Runtime configuration this artifact expects

| | Value |
|---|---|
| Production API | `https://api.richenquest.com/api` |
| Browser origin | `https://www.richenquest.com` |
| Backend `CORS_ALLOWED_ORIGINS` | `https://www.richenquest.com` |

The CORS value is the origin the **browser** is on, not the API host. The frontend sends an
`Authorization` header, so every call is preflighted — a wrong origin blocks everything before it
reaches a route.

---

## Neither currently deployed artifact is release-ready

Three distinct artifacts exist. Verified live 2026-08-29:

| Location | Bundle | `apiBaseUrl` | Release-ready |
|---|---|---|---|
| `www.richenquest.com` | `index-CxODATZa.js` | `"/api"` | **No** — pre-August build; still carries "Tier 4", "124 City Road", "London Advisory Hub", `admissions@` |
| `rq-site-ugkizspd` (Slate) | `index-CcXANhqa.js` | `"/api"` | **No** — content is current, but built before the API-URL guard |
| This manifest | `index-BFfCqogA.js` | `https://api.richenquest.com/api` | **Yes** |

**Both cutover paths therefore require deploying this artifact.** Moving the domain to the Slate
app as it stands today would still ship a bundle calling `/api`, which Slate answers with
`index.html` at HTTP 200.

---

## Backend deployment dependency — read before announcing anything

**Deploying this frontend successfully does not make the product functional.**

Everything requiring CRM stays blocked until all three are true:

1. Zoho CRM application OAuth credentials exist (`ZOHO_CRM_CLIENT_ID`, `ZOHO_CRM_CLIENT_SECRET`,
   `ZOHO_CRM_REFRESH_TOKEN`) plus `SESSION_SECRET`
2. The backend is deployed and `api.richenquest.com` resolves
3. `GET /api/health` returns **200 `HEALTHY`** with `crm.reachable: true`

Until then a signed-up student receives **`409 PROFILE_NOT_LINKED`** on every intelligence route —
`/home`, `/profile`, `/opportunities`, `/roadmap`, `/report`, `/mentor`. That is the system being
honest, not broken.

What this release **does** deliver on its own: the corrected public site — accurate positioning,
real registered address, correct legal entity, `support@` as the address of record, no "Tier 4",
no fabricated offices, per-route SEO, and honest Match Score / Evidence Confidence wording.

What it does **not** deliver: any working student journey, consent capture, pricing, or invoicing.

---

## Related

`DOMAIN-CUTOVER-CHECKLIST.md` — the two cutover paths and the smoke test.
`CREDENTIAL-ARRIVAL-RUNBOOK.md` (platform repo) — the sequence once CRM credentials exist.
`BACKEND-HANDOFF-FOR-WEBSITE-DEVELOPER.md` — the contract for whoever deploys.
