/**
 * RichenQuest intelligence routes.
 *
 *   React → Node (here) → Zoho OAuth → Deluge engine → back
 *
 * THE SECURITY PROPERTY THAT MATTERS
 *   No route on this handler accepts a lead_id, contact_id or student_id from
 *   the caller. Identity is read from the signed session and the record id is
 *   looked up server-side. There is no id parameter to tamper with, so Student A
 *   cannot request Student B by changing a value.
 *
 * No scoring, ranking, eligibility or roadmap logic lives here. Every number a
 * student sees was produced by an engine.
 */
const { invoke, audit } = require('../shared/zoho/engines');
const session = require('../shared/session');
const { sendSuccess, sendError } = require('../shared/response');
const CatalystDataStore = require('../shared/dataStore');
const codeKitchenScore = require('../shared/codeKitchenScore');
const { COMPLETENESS_FIELDS } = codeKitchenScore;

/* Raw Zoho errors never reach the browser: they leak internals and mean nothing
 * to a family. The technical detail goes to the server log with a correlation id. */
function fail(res, e) {
  const cid = Math.random().toString(36).slice(2, 8);
  console.error(`[intelligence:${cid}]`, e.code || e.name, e.message);
  const M = {
    ZOHO_UNCONFIGURED: ['SERVICE_UNAVAILABLE',
      'Your information is temporarily unavailable. Please try again shortly.', 503],
    RATE_LIMITED: ['BUSY',
      'We are handling a lot of requests right now. Please try again in a minute.', 429],
    ZOHO_UNAVAILABLE: ['SERVICE_UNAVAILABLE',
      'Your information is temporarily unavailable. Please try again shortly.', 503]
  };
  const [code, msg, status] = M[e.code] ||
    ['SERVICE_ERROR', 'We could not load that right now. Please try again.', 502];
  return sendError(res, code, msg, status);
}

/* The student's CRM record id, derived ONLY from the signed session. */
function identify(req) {
  const s = session.fromRequest(req);
  if (!s) return null;
  const users = CatalystDataStore.getTable('Users');
  const user = users.findOne(
    u => u.userId === s.userId ||
         (u.email || '').toLowerCase() === (s.email || '').toLowerCase());
  if (!user) return null;
  return { user, leadId: user.leadId || null, module: user.crmModule || 'Leads' };
}

/* An allowlist, not a passthrough. Match score, confidence, ranking,
 * verification state, case state, provenance and counsellor approval are
 * engine-owned and must never be student-writable. */
const EDITABLE = new Set([
  'First_Name','Last_Name','Phone','City','Current_Education','Academic_Percentage',
  'Backlogs','Study_Gap_Years','Work_Experience_Years','English_Status','Passport_Status',
  'Budget_Range','Interested_Level','Interested_Country','Intended_Intake','Career_Goal',
  'Preferred_Domain','Skills','Interests','Project_Count','Projects_Detail',
  'Achievement_Level','Achievements_Detail','Extracurriculars','Languages_Spoken',
  'Funding_Source','Accommodation_Preference'
]);

const REQUEST_KINDS = {
  profile_review:      'Profile review requested',
  opportunity_review:  'Opportunity review requested',
  country_guidance:    'Country guidance requested',
  application_guidance:'Application guidance requested',
  mentor:              'Mentor requested'
};

module.exports = async function intelligenceHandler(req, res) {
  const path = (req.url || '/').split('?')[0].replace(/\/+$/, '') || '/';
  const method = req.method;

  const me = identify(req);
  if (!me) return sendError(res, 'UNAUTHORIZED', 'Please sign in to continue.', 401);

  /*  Field validation runs BEFORE the linkage check.
   *  Rejecting a field a student may never write is validation, not
   *  authorization — it must not depend on whether their file happens to be
   *  linked yet, and it must be observable in a test without a live CRM.
   *  Previously an unlinked account got 409 and the allowlist never ran, which
   *  meant the defence could not be exercised at all. */
  let pendingWrite = null;
  if (method === 'POST' && path === '/profile') {
    const body = req.body || {};
    const clean = {}; const rejected = [];
    for (const [k, v] of Object.entries(body)) {
      if (EDITABLE.has(k)) clean[k] = v; else rejected.push(k);
    }
    if (!Object.keys(clean).length)
      return sendError(res, 'NOTHING_EDITABLE',
        'None of the submitted fields can be edited here.', 400, { rejected });
    pendingWrite = { clean, rejected };
  }

  if (!me.leadId)
    return sendError(res, 'PROFILE_NOT_LINKED',
      'Your account is not yet linked to a student file. Complete your profile to continue.', 409);

  const who   = { record_id: String(me.leadId), module: me.module };
  const match = { lead_or_contact_id: String(me.leadId), module: me.module };

  try {
    if (method === 'GET') {
      const READ = {
        '/home':          () => invoke('dashboard', who),
        '/profile':       () => invoke('intelligence', who),
        '/opportunities': () => invoke('opportunities', match),
        '/roadmap':       () => invoke('roadmap', who),
        '/report':        () => invoke('report', who),
        '/mentor':        () => invoke('mentor', who)
      };
      if (READ[path]) return sendSuccess(res, await READ[path]());
    }

    /*  GET /profile-score — Code Kitchen Score (profile_strength +
     *  profile_completeness from codeKitchenScore.js, a faithful port of
     *  the real studentIntelligence Deluge engine). Identity is `me`,
     *  derived only from the session above; there is no id parameter here
     *  for a caller to tamper with, and every field the score depends on
     *  is engine-owned — nothing in this response can be influenced by
     *  request input at all, since this route accepts none.
     *
     *  Reads the raw fields directly (not through invoke('intelligence',..)
     *  which returns the Deluge engine's OWN computed profile_strength) so
     *  this module's local computation can be exercised end-to-end even
     *  while CRM/AppSail access is unavailable, using exactly the field
     *  set the live engine would read. When CRM is reachable, this is a
     *  real Zoho API response, not synthetic data. */
    if (method === 'GET' && path === '/profile-score') {
      const zohoOAuth = require('../shared/zoho/oauth');
      const { EngineError } = require('../shared/zoho/engines');
      if (!zohoOAuth.isConfigured())
        throw new EngineError('Zoho is not configured on this server', 'ZOHO_UNCONFIGURED', 503);
      const fields = [...new Set([...COMPLETENESS_FIELDS, 'Languages_Spoken'])].join(',');
      const token = await zohoOAuth.getAccessToken();
      const r = await fetch(
        `${zohoOAuth.getApiDomain()}/crm/v8/${me.module}/${me.leadId}?fields=${fields}`,
        { headers: { Authorization: `Zoho-oauthtoken ${token}` } });
      if (!r.ok) throw new EngineError(`CRM returned ${r.status}`, 'ZOHO_UNAVAILABLE', 503);
      const j = await r.json().catch(() => null);
      const record = j && j.data && j.data[0];
      if (!record) throw new EngineError('CRM record not found', 'ENGINE_EMPTY', 502);
      return sendSuccess(res, codeKitchenScore.calculate(record));
    }

    if (method === 'POST' && path === '/profile') {
      const { clean, rejected } = pendingWrite;   // validated above
      const zohoOAuth = require('../shared/zoho/oauth');
      const token = await zohoOAuth.getAccessToken();
      const r = await fetch(`${zohoOAuth.getApiDomain()}/crm/v8/Leads/${me.leadId}`, {
        method: 'PATCH',
        headers: { Authorization: `Zoho-oauthtoken ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: [clean] })
      });
      const j = await r.json().catch(() => null);
      const ok = Boolean(j && j.data && j.data[0] && j.data[0].code === 'SUCCESS');
      await audit(me.leadId, 'PROFILE_EDIT', `fields: ${Object.keys(clean).join(',')}`);
      if (!ok) return sendError(res, 'SAVE_FAILED',
        'We could not save those changes. Please try again.', 502);
      return sendSuccess(res, { updated: Object.keys(clean), rejected });
    }

    if (method === 'POST' && path === '/request') {
      const { kind, note } = req.body || {};
      if (!REQUEST_KINDS[kind])
        return sendError(res, 'UNKNOWN_REQUEST', 'That request type is not recognised.', 400);
      const out = await invoke('followUpTasks', {
        module_name: 'Leads', record_id: String(me.leadId),
        spec_json: JSON.stringify([{
          subject: REQUEST_KINDS[kind], due_in_days: 2, priority: 'High',
          note: String(note || '').slice(0, 500)
        }])
      });
      await audit(me.leadId, 'STUDENT_REQUEST', kind);
      return sendSuccess(res, { kind, result: out });
    }

    return sendError(res, 'NOT_FOUND', 'That resource does not exist.', 404);
  } catch (e) {
    return fail(res, e);
  }
};
