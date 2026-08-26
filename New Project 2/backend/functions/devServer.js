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
const { sendSuccess } = require('./shared/response');

const app = express();
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
app.use('/api/me', (req, res) => {
  req.url = '/me';
  authHandler(req, res);
});

app.use('/api/auth', (req, res) => {
  authHandler(req, res);
});

app.use('/api/leads', (req, res) => {
  leadsHandler(req, res);
});

app.use('/api/students', requireStudent, (req, res) => {
  const parts = req.url.split('?')[0].split('/').filter(Boolean);
  if (parts.length > 0) req.params = { id: parts[0] };
  studentsHandler(req, res);
});

app.use('/api/cases', requireStudent, (req, res) => {
  const parts = req.url.split('?')[0].split('/').filter(Boolean);
  if (parts.length > 0) req.params = { id: parts[0] };
  casesHandler(req, res);
});

app.use('/api/bookings', requireStudent, (req, res) => {
  const parts = req.url.split('?')[0].split('/').filter(Boolean);
  if (parts.length > 0) req.params = { id: parts[0] };
  bookingsHandler(req, res);
});

app.use('/api/documents', requireStudent, (req, res) => {
  const parts = req.url.split('?')[0].split('/').filter(Boolean);
  if (parts.length > 0) req.params = { id: parts[0] };
  documentsHandler(req, res);
});

app.use('/api/payments', requireStudent, (req, res) => {
  const parts = req.url.split('?')[0].split('/').filter(Boolean);
  if (parts.length > 0) req.params = { id: parts[0] };
  paymentsHandler(req, res);
});

app.use('/api/notifications', requireStudent, (req, res) => {
  notificationsHandler(req, res);
});

/*  RichenQuest intelligence. Every route derives the student's record id from
 *  the signed session — none of them accept an id from the caller. */
['home','profile','opportunities','roadmap','report','mentor','request'].forEach(r => {
  app.use(`/api/${r}`, (req, res) => {
    req.url = `/${r}`;
    intelligenceHandler(req, res);
  });
});

app.use('/api/crm', (req, res) => {
  crmHandler(req, res);
});

app.use('/api/webhooks/zoho', (req, res) => {
  webhooksHandler(req, res);
});

// Zoho Flow Generic Event Dispatcher
app.post('/api/events', async (req, res) => {
  const { event, data } = req.body || {};
  const result = await ZohoClient.emitFlowEvent(event || 'GENERIC_EVENT', data || {});
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
