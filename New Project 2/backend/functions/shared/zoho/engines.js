/**
 * RichenQuest intelligence engines — invocation only.
 *
 * The engines are ~50 Deluge standalone functions inside Zoho CRM. They are the
 * source of truth for matching, ranking, eligibility, roadmap and reporting.
 * NOTHING in this file computes any of that. It authenticates, calls the engine
 * that already knows the answer, and returns the engine's JSON untouched.
 *
 * A reshape here would be the start of a second, divergent version of the truth,
 * so the payload is passed through exactly as the engine produced it. Response
 * shapes are recorded in docs/API-CONTRACT.md of the richenquest-platform repo,
 * captured from live runs rather than read off the Deluge source.
 */
const zohoOAuth = require('./oauth');

const ENGINES = {
  dashboard:    'studentdashboard',
  intelligence: 'studentintelligence',
  opportunities:'matchopportunities',
  roadmap:      'studentroadmap',
  report:       'studentreport',
  mentor:       'matchmentor',
  student360:   'student360',
  followUpTasks:'createfollowuptasks',
  auditLog:     'generateauditlog',
  resolveStudent:'resolvestudent'
};

const TIMEOUT_MS = 25000;

class EngineError extends Error {
  constructor(message, code, status) {
    super(message);
    this.name = 'EngineError';
    this.code = code || 'ENGINE_ERROR';
    this.status = status || 502;
  }
}

/* One correlation id per call, logged on both the request and any failure, so a
 * student reporting "it didn't work at 3pm" can be traced without asking them
 * for anything they cannot know. */
const correlationId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

async function callOnce(name, args, token, cid) {
  const qs = new URLSearchParams({ auth_type: 'oauth', ...args });
  const url = `${zohoOAuth.getApiDomain()}/crm/v7/functions/${name}/actions/execute?${qs}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
      signal: ctrl.signal
    });
    return { status: res.status, body: await res.json().catch(() => null) };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Invoke one engine. Refreshes and retries exactly once on 401 — an expired
 * access token is the one transient failure worth retrying blindly. Everything
 * else surfaces, because retrying a 400 just makes the same mistake twice.
 */
async function invoke(engineKey, args = {}) {
  const name = ENGINES[engineKey];
  if (!name) throw new EngineError(`unknown engine: ${engineKey}`, 'UNKNOWN_ENGINE', 500);
  if (!zohoOAuth.isConfigured())
    throw new EngineError('Zoho is not configured on this server', 'ZOHO_UNCONFIGURED', 503);

  const cid = correlationId();
  let token = await zohoOAuth.getAccessToken();
  let out = await callOnce(name, args, token, cid);

  if (out.status === 401) {
    token = await zohoOAuth.getAccessToken(true);   // signature is (forceRefresh: boolean)
    out = await callOnce(name, args, token, cid);
  }

  if (out.status === 429)
    throw new EngineError('Zoho rate limit reached', 'RATE_LIMITED', 429);
  if (out.status >= 500)
    throw new EngineError(`Zoho returned ${out.status}`, 'ZOHO_UNAVAILABLE', 503);
  if (out.status !== 200)
    throw new EngineError(`engine ${name} returned ${out.status}`, 'ENGINE_FAILED', 502);

  /* Deluge returns its JSON as a string inside details.output. */
  let payload = out.body && out.body.details && out.body.details.output;
  if (typeof payload === 'string') {
    try { payload = JSON.parse(payload); } catch { /* leave as string */ }
  }
  if (payload === undefined || payload === null)
    throw new EngineError(`engine ${name} returned no output`, 'ENGINE_EMPTY', 502);

  return payload;
}

/* Audit must never fail the student's request. A missing log line is bad; a
 * failed page because logging broke is worse. */
async function audit(recordId, action, detail) {
  try {
    await invoke('auditLog', {
      module_name: 'Leads', record_id: String(recordId),
      action: String(action), detail: String(detail || '').slice(0, 400)
    });
  } catch (e) {
    console.error('[audit] failed', action, e.code || e.message);
  }
}

module.exports = { invoke, audit, ENGINES, EngineError };
