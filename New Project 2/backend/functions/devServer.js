/**
 * RichenQuest Catalyst Functions Local API Gateway Runner
 * Mimics Zoho Catalyst API Gateway routing for local development & production Node runtime.
 */

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authHandler = require('./auth');
const leadsHandler = require('./leads');
const studentsHandler = require('./students');
const casesHandler = require('./cases');
const bookingsHandler = require('./bookings');
const documentsHandler = require('./documents');
const paymentsHandler = require('./payments');
const notificationsHandler = require('./notifications');
const crmHandler = require('./crm');
const intelligenceHandler = require('./intelligence');
const requireStudent = require('./shared/requireStudent');
const webhooksHandler = require('./webhooks');
const ZohoClient = require('./shared/zohoClient');
const { sendSuccess, sendError } = require('./shared/response');
const { createRateLimiter } = require('./shared/rateLimit');
const CatalystDataStore = require('./shared/dataStore');

const app = express();

/*  One hop: the Catalyst edge sits in front of this process. Without this,
 *  req.ip is the edge's address, every visitor shares a single rate-limit
 *  bucket, and the first bot locks out every real student. Trusting exactly
 *  one hop means a client-supplied X-Forwarded-For cannot be used to forge a
 *  different identity — Express takes the entry the edge appended, not the
 *  attacker's. */
app.set('trust proxy', 1);
/*  Port resolution across every environment this app runs in.
 *  Catalyst AppSail supplies the port it will probe; binding anywhere else
 *  makes the platform report "Execution failed. Please check the startup
 *  command or port." even though the process started cleanly. Local dev keeps
 *  using PORT. 0.0.0.0 is explicit because a container that binds localhost
 *  only is unreachable from outside it. */
const PORT = process.env.X_ZOHO_CATALYST_LISTEN_PORT
  || process.env.CATALYST_LISTEN_PORT
  || process.env.PORT
  || 9000;
const HOST = '0.0.0.0';

/*  Fail closed. origin '*' let any page on the internet call this API, and it
 *  is incompatible with credentialed requests anyway — a browser refuses to send
 *  cookies to a wildcard origin, so session auth would silently never work.
 *  The allowed origin comes from config, never hardcoded per component. */
const ALLOWED_ORIGINS = (process.env.CORS_ALLOWED_ORIGINS ||
  process.env.VITE_APP_ORIGIN || 'http://localhost:3000')
  .split(',').map(o => o.trim()).filter(Boolean);

app.use(cors({
  origin(origin, cb) {
    // Same-origin/curl requests send no Origin header; those are not browser
    // cross-origin calls and are allowed through.
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error('origin not allowed'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Catalyst-Client']
}));

/*  Security headers.
 *
 *  Safe to make this strict because this process serves JSON and nothing
 *  else — verified: no express.static, no sendFile, no template rendering
 *  anywhere in the app. The website is built by Vite and served by Catalyst
 *  Slate from a different origin, so none of these headers reach, or can
 *  break, the frontend. They only harden API responses.
 *
 *  Deliberately omitted: anything that constrains what a page may load
 *  (script-src, style-src, connect-src). Those belong on the Slate response
 *  that actually serves the document; setting them here would do nothing
 *  useful and would mislead the next reader into thinking the site is
 *  covered. */
app.use((req, res, next) => {
  //  A JSON API has no legitimate reason to be interpreted as any other type.
  res.setHeader('X-Content-Type-Options', 'nosniff');
  //  Nothing here is meant to be framed; default-src 'none' is the modern
  //  equivalent but X-Frame-Options still covers older browsers.
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  //  An API response should never load a resource of any kind. If a response
  //  is ever rendered as a document, this makes it inert.
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");

  /*  HSTS only on connections that already arrived over TLS. Catalyst
   *  terminates TLS ahead of this process, so req.secure depends on the
   *  trust-proxy setting above; x-forwarded-proto is checked too rather than
   *  relying on that alone. Scoped to this host — no includeSubDomains and no
   *  preload, both of which commit domains this API does not own and are not
   *  reversible on the timescale of a mistake. */
  if (req.secure || req.get('x-forwarded-proto') === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=15552000');
  }
  next();
});

/*  Must be registered BEFORE the global parser below. body-parser marks the
 *  request once parsed and later parsers skip it, so whichever runs first owns
 *  the limit — a route-level parser mounted after the global one is silently a
 *  no-op (verified: a 200 KB inquiry was accepted until this was moved up).
 *
 *  An inquiry form has no business sending more than 64 KB. The global limit
 *  stays 10 MB because /api/documents legitimately accepts base64 uploads;
 *  lowering it globally would break document upload. */
app.use('/api/leads', express.json({ limit: '64kb' }));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging for development
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'test') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  }
  next();
});

// Health check & System Info
/*  Root liveness route. AppSail probes / to decide whether the container is
 *  healthy; without it Express answers 404 and the platform reports
 *  "Execution failed. Please check the startup command or port." even though
 *  the process is running and serving /api correctly. This is deliberately
 *  dependency-free so it stays 200 even when Zoho is unreachable — /api/health
 *  is the endpoint that reports real degradation. */
/*  Catalyst identity arrives per request, not per process.
 *
 *  AppSail does not set CATALYST_CONFIG, so the SDK's initializeApp() path is
 *  unavailable there and the Data Store would silently stay in-memory — a
 *  student's enquiry would reach the durability gate with nowhere durable to
 *  go. The Catalyst edge does attach the identity headers, so the app is
 *  built from the first request that carries them and cached.
 *
 *  Deliberately cheap and non-blocking: it runs once, is skipped forever
 *  after, and a failure is logged and ignored rather than failing the
 *  request — a store that cannot initialise must degrade honestly, which the
 *  layers below already do, not take the API down with it. */
let _catalystAdopted = false;
app.use((req, res, next) => {
  if (!_catalystAdopted && !CatalystDataStore.isCatalystAvailable()) {
    if (req.get('x-zc-project-key') || req.get('x-zc-projectid')) {
      _catalystAdopted = true;
      try {
        const catalyst = require('zcatalyst-sdk-node');
        CatalystDataStore.adoptCatalystApp(catalyst.initialize(req));
      } catch (e) {
        console.warn('[dataStore] request-scoped Catalyst init failed:', e && e.message);
      }
    }
  }
  next();
});

app.get('/', (req, res) => res.status(200).json({
  service: 'RichenQuest API',
  status: 'ok',
  time: new Date().toISOString()
}));

/*  Health must distinguish "the process is up" from "Zoho actually answers".
 *  A health check that only proves Express started is how an outage gets
 *  reported as healthy. It returns no token and no credential — only whether
 *  one could be obtained. */
app.get('/api/health', async (req, res) => {
  const zohoOAuth = require('./shared/zoho/oauth');
  const out = {
    status: 'HEALTHY',
    platform: 'RichenQuest Student Platform',
    runtime: 'Zoho Catalyst Functions Gateway',
    timestamp: new Date().toISOString(),
    session: { secretConfigured: Boolean(
      (process.env.SESSION_SECRET || process.env.ZOHO_WEBHOOK_SECRET || '').length >= 16) },
    zohoAuth: { configured: zohoOAuth.isConfigured(), reachable: false, detail: null },
    crm: { reachable: false, detail: null },
    /*  Whether writes actually persist, per table.
     *
     *  This was the one thing health did not say, and it is the thing that
     *  decides whether a student's enquiry survives a restart. The endpoint
     *  already separates "the process is up" from "Zoho answers"; storage
     *  belongs in that same distinction. PERSISTENT only once a table's
     *  existence probe has genuinely succeeded — everything else, including
     *  "not checked yet", reports IN_MEMORY_FALLBACK, because that is the
     *  store actually serving reads and writes right now.
     *
     *  sdkInitialised is reported separately: a Data Store that is entirely
     *  absent and one where a single table is missing are different faults,
     *  and without this they look identical from outside. */
    storage: {
      sdkInitialised: CatalystDataStore.isCatalystAvailable(),
      /*  Which Catalyst identity headers the edge actually attaches.
       *
       *  The SDK initialises two ways: initializeApp() from a CATALYST_CONFIG
       *  environment variable, or initialize(req) from these request headers.
       *  AppSail does not set CATALYST_CONFIG — proven, sdkInitialised is
       *  false and the SDK's own error is "Options provided for initializeApp
       *  in invalid." So whether the header path is available decides which
       *  fix is correct, and guessing between them would mean a refactor that
       *  might not work.
       *
       *  NAMES ONLY. x-zc-project-key and x-zc-project-secret-key are
       *  credentials; their presence is diagnostic, their values are never
       *  returned. */
      catalystHeadersPresent: [
        'x-zc-projectid', 'x-zc-project-domain', 'x-zc-project-key',
        'x-zc-environment', 'x-zc-project-secret-key'
      ].filter(h => Boolean(req.get(h))),
      tables: CatalystDataStore.getStorageReport()
    },
    integrations: ZohoClient.getIntegrationStatus()
  };

  if (out.zohoAuth.configured) {
    try {
      const token = await zohoOAuth.getAccessToken();
      out.zohoAuth.reachable = Boolean(token);     // the token itself is never returned
      try {
        const r = await fetch(`${zohoOAuth.getApiDomain()}/crm/v8/settings/modules`,
          { headers: { Authorization: `Zoho-oauthtoken ${token}` } });
        out.crm.reachable = r.ok;
        if (!r.ok) out.crm.detail = `CRM returned ${r.status}`;
      } catch (e) { out.crm.detail = 'CRM unreachable'; }
    } catch (e) {
      // The Zoho error code is safe to surface; it names the fault, not the secret.
      out.zohoAuth.detail = String(e.message || '').slice(0, 120);
    }
  } else {
    out.zohoAuth.detail = 'ZOHO_CRM_CLIENT_ID / CLIENT_SECRET / REFRESH_TOKEN not all set';
  }

  if (!out.zohoAuth.reachable || !out.crm.reachable) out.status = 'DEGRADED';
  res.status(out.status === 'HEALTHY' ? 200 : 503).json(out);
});

// Direct Catalyst Route Handlers using express sub-routing
/*  Every route handler is async, and each was invoked as handler(req, res)
 *  with the returned promise discarded. Express 4 does not catch an async
 *  rejection, so a throw inside a handler meant the response was simply never
 *  sent: the request hung until the platform killed it. Observed on the
 *  deployed backend — signup returned AppSail's "Execution Time Exceeded"
 *  after 36 seconds because generateToken() throws when SESSION_SECRET is
 *  unset, and nothing caught it.
 *
 *  A student waiting 36 seconds for a timeout is strictly worse than being
 *  told plainly that something failed. This routes every rejection to the
 *  error handler below. */
function run(handler) {
  return (req, res, next) => {
    try {
      Promise.resolve(handler(req, res)).catch(next);
    } catch (e) {
      next(e);
    }
  };
}

app.use('/api/me', (req, res, next) => {
  req.url = '/me';
  run(authHandler)(req, res, next);
});

/*  Login is the brute-force surface: unauthenticated, unlimited attempts, and
 *  a correct guess yields a 12-hour session. Signup is the spam surface.
 *
 *  Deliberately looser than the lead form, because locking out a real student
 *  who mistypes a password is its own failure. Five attempts in fifteen
 *  minutes stops credential stuffing while leaving room for honest fumbling;
 *  password reset is limited on the same bucket because it sends mail.
 *  Signup gets its own hourly bucket — a real person creates one account.
 *
 *  Read-only auth routes (/me, verify-email) are intentionally not limited. */
const loginRateLimit  = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 5,  name: 'login' });
const signupRateLimit = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 10, name: 'signup' });

app.use('/api/auth', (req, res, next) => {
  if (req.method !== 'POST') return next();
  const p = (req.url || '').split('?')[0].replace(/\/+$/, '');
  if (p === '/login' || p === '' || p === '/reset-password') return loginRateLimit(req, res, next);
  if (p === '/signup') return signupRateLimit(req, res, next);
  return next();
}, (req, res, next) => {
  run(authHandler)(req, res, next);
});

/*  The only public, unauthenticated route that writes to CRM, so it is the one
 *  that needs a throttle. 10 per 15 minutes per IP: a family submitting an
 *  inquiry, sending a contact message and correcting a typo uses three or four
 *  and never notices, while a script filling the CRM is stopped early.
 *  Its 64 KB body limit is registered further up, before the global parser. */
const leadsRateLimit = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10, name: 'leads' });

app.use('/api/leads', (req, res, next) => {
  // GET is staff-only and already gated; the flood risk is the public POST.
  if (req.method === 'POST') return leadsRateLimit(req, res, next);
  return next();
}, (req, res, next) => {
  run(leadsHandler)(req, res, next);
});

app.use('/api/students', requireStudent, (req, res, next) => {
  const parts = req.url.split('?')[0].split('/').filter(Boolean);
  if (parts.length > 0) req.params = { id: parts[0] };
  run(studentsHandler)(req, res, next);
});

app.use('/api/cases', requireStudent, (req, res, next) => {
  const parts = req.url.split('?')[0].split('/').filter(Boolean);
  if (parts.length > 0) req.params = { id: parts[0] };
  run(casesHandler)(req, res, next);
});

app.use('/api/bookings', requireStudent, (req, res, next) => {
  const parts = req.url.split('?')[0].split('/').filter(Boolean);
  if (parts.length > 0) req.params = { id: parts[0] };
  run(bookingsHandler)(req, res, next);
});

app.use('/api/documents', requireStudent, (req, res, next) => {
  const parts = req.url.split('?')[0].split('/').filter(Boolean);
  if (parts.length > 0) req.params = { id: parts[0] };
  run(documentsHandler)(req, res, next);
});

app.use('/api/payments', requireStudent, (req, res, next) => {
  const parts = req.url.split('?')[0].split('/').filter(Boolean);
  if (parts.length > 0) req.params = { id: parts[0] };
  run(paymentsHandler)(req, res, next);
});

app.use('/api/notifications', requireStudent, (req, res, next) => {
  run(notificationsHandler)(req, res, next);
});

/*  RichenQuest intelligence. Every route derives the student's record id from
 *  the signed session — none of them accept an id from the caller. */
['home','profile','profile-score','opportunities','roadmap','report','mentor','request'].forEach(r => {
  app.use(`/api/${r}`, (req, res, next) => {
    req.url = `/${r}`;
    run(intelligenceHandler)(req, res, next);
  });
});

/*  Confirmed live and unauthenticated before this fix: GET /api/crm/status
 *  returned integration status plus the last 10 IntegrationEvents (student
 *  ids, document ids, invoice ids) to anyone, no session required — the
 *  only route among the student-data endpoints missing requireStudent.
 *  POST /api/crm/sync/:studentId was also unauthenticated, though it never
 *  actually worked (req.params.studentId was never populated here, unlike
 *  every sibling route), which this also fixes. Both are called only from
 *  the student's own Profile page (zohoService.js), so requireStudent is
 *  the right gate — and it validates the STU_ id in the URL is the
 *  caller's own automatically, the same as every other route below. */
app.use('/api/crm', requireStudent, (req, res, next) => {
  const parts = req.url.split('?')[0].split('/').filter(Boolean);
  if (parts[0] === 'sync' && parts[1]) req.params = { studentId: parts[1] };
  run(crmHandler)(req, res, next);
});

app.use('/api/webhooks/zoho', (req, res, next) => {
  run(webhooksHandler)(req, res, next);
});

/*  Front-end analytics beacon. This route must stay unauthenticated — a page
 *  view from a logged-out visitor on the public site is the main thing it
 *  records (PublicLayout calls it on every route change).
 *
 *  It previously forwarded ANY caller-supplied event name straight to
 *  ZohoClient.emitFlowEvent, and flow.js routes by name prefix: LEAD_*,
 *  STUDENT_*, BOOKING_*, DOCUMENT_* and PAYMENT_* each reach a real Zoho Flow
 *  automation webhook. An anonymous request to POST /api/events with
 *  {"event":"PAYMENT_RECEIVED", ...} would therefore inject attacker-chosen
 *  data into the payment automation — and every call also wrote an unbounded
 *  IntegrationEvents row. Harmless only while the Flow URLs are unset; live
 *  the moment production credentials are supplied.
 *
 *  The allowlist is the complete set of events the client actually emits
 *  (analyticsService.js: pageView + the two auth events). Anything else is
 *  refused rather than forwarded, so a business event can only ever be
 *  emitted by the server-side handler that genuinely performed the action. */
const PUBLIC_ANALYTICS_EVENTS = new Set([
  'PAGE_VIEW', 'LOGIN_COMPLETED', 'SIGNUP_COMPLETED'
]);

app.post('/api/events', async (req, res) => {
  const { event, data } = req.body || {};
  if (!PUBLIC_ANALYTICS_EVENTS.has(String(event || ''))) {
    return sendError(res, 'UNKNOWN_EVENT',
      'That event type is not accepted here.', 400);
  }
  const result = await ZohoClient.emitFlowEvent(event, data || {});
  return sendSuccess(res, result, 'Event emitted to Zoho Flow boundary');
});

// 404 Catch-all for undefined API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `API endpoint ${req.method} ${req.originalUrl} does not exist on Catalyst Gateway`
    }
  });
});


/*  Final error handler. Without one, a rejected handler promise left the
 *  request hanging until the platform timed it out — 36 seconds of nothing,
 *  then a raw AppSail error page.
 *
 *  The message is deliberately generic: an exception string can carry a
 *  connection string, a file path or a token, and this endpoint is public.
 *  The real error is logged in full server-side, where it belongs. */
app.use((err, req, res, next) => {
  console.error(`[unhandled] ${req.method} ${req.originalUrl}:`, err && err.stack ? err.stack : err);
  if (res.headersSent) return next(err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong on our side. Please try again shortly.'
    },
    timestamp: new Date().toISOString()
  });
});

if (require.main === module) {
  const CatalystDataStore = require('./shared/dataStore');
  CatalystDataStore.hydrate().finally(() => {
    app.listen(PORT, HOST, () => {
      console.log(`\n======================================================`);
      console.log(`  RICHENQUEST CATALYST BACKEND RUNNING ON PORT ${PORT}`);
      console.log(`  Gateway URL: http://localhost:${PORT}/api/health`);
      console.log(`======================================================\n`);
    });
  });
}

module.exports = app;
