/**
 * Student authorization gate.
 *
 * WHY THIS EXISTS
 *   An audit on 2026-08-25 found that /api/students/:id, /api/cases/:id,
 *   /api/documents, /api/notifications and /api/payments answered ANY caller.
 *   Unauthenticated GET /api/students/<real id> returned a student's full
 *   record — name, email, studentId, caseId, counselorId — and Student A's
 *   valid token returned Student B's record. Both were reproduced against live
 *   synthetic accounts before this file was written.
 *
 *   The fix is applied at the mount point rather than inside each handler, so
 *   working handler logic is left alone and no route can be added later that
 *   quietly misses the check.
 *
 * TWO SEPARATE PROPERTIES
 *   1. Authentication — is there a valid signed session at all?
 *   2. Authorization  — does the id in the URL belong to THAT session?
 *   The second is the one that was missing. A logged-in student is not
 *   thereby entitled to every other student's file.
 */
const session = require('./session');
const CatalystDataStore = require('./dataStore');
const { sendError } = require('./response');

/* Every identifier that legitimately belongs to this user. An id in the path
 * must match one of these or the request is refused. */
function identifiersFor(user) {
  const ids = new Set();
  const students = CatalystDataStore.getTable('Students');
  const own = students && students.findOne
    ? students.findOne(s => s.userId === user.userId) : null;
  [user.userId, user.studentId, user.leadId, user.contactId,
   own && own.studentId, own && own.caseId, own && own.leadId]
    .filter(Boolean).forEach(v => ids.add(String(v)));
  return { ids, student: own };
}

/* Path segments that look like an identifier rather than a sub-resource.
 *
 * This was previously an allow-list of five known prefixes, which silently let
 * DOC_ and BKG_ ids through unchecked — a live IDOR found by testing
 * /api/documents/DOC_OTHER and /api/bookings/BKG_OTHER, both of which returned
 * 200 for a student who owned neither.
 *
 * It is now shaped the other way round: ANY segment that looks like a generated
 * identifier is checked. A new resource prefix added later is therefore guarded
 * by default rather than exposed by default, which is the property that
 * actually matters here. Known route words are excluded explicitly. */
const ROUTE_WORDS = new Set([
  'api','me','read','read-all','receipt','status','invoice','services','sync',
  'login','logout','signup','verify-email','reset-password','events','profile',
  'home','opportunities','roadmap','report','mentor','request','students',
  'cases','documents','payments','bookings','notifications','leads','crm'
]);
const LOOKS_LIKE_ID = seg =>
  !ROUTE_WORDS.has(seg.toLowerCase()) &&
  (/^[A-Z]{2,6}_/.test(seg) || /^\d{8,}$/.test(seg) || /^[0-9a-f]{16,}$/i.test(seg));

function requireStudent(req, res, next) {
  const s = session.fromRequest(req);
  if (!s) return sendError(res, 'UNAUTHORIZED', 'Please sign in to continue.', 401);

  const users = CatalystDataStore.getTable('Users');
  const user = users.findOne(
    u => u.userId === s.userId ||
         (u.email || '').toLowerCase() === (s.email || '').toLowerCase());
  if (!user) return sendError(res, 'UNAUTHORIZED', 'Please sign in to continue.', 401);

  const { ids, student } = identifiersFor(user);

  /* Refuse any identifier in the path that is not this user's own. */
  const segments = (req.url || '').split('?')[0].split('/').filter(Boolean);
  for (const seg of segments) {
    const raw = decodeURIComponent(seg);
    if (LOOKS_LIKE_ID(raw) && !ids.has(raw)) {
      console.warn('[authz] refused cross-student access', {
        by: user.userId, requested: raw, path: req.url });
      return sendError(res, 'FORBIDDEN',
        'You do not have access to that record.', 403);
    }
  }

  /*  The same check for the REQUEST BODY.
   *
   *  The path guard above missed this entirely: POST /api/bookings reads
   *  studentId from req.body, so student A could book under student B simply
   *  by naming them in the payload — confirmed by test before this was added.
   *  An identity in the body is exactly as untrustworthy as one in the URL.
   *
   *  A body field naming someone else is refused rather than quietly
   *  overwritten, so a caller is never told an action succeeded against an
   *  identity that was silently swapped underneath them. */
  const IDENTITY_FIELDS = [
    'studentId', 'student_id', 'leadId', 'lead_id', 'userId', 'user_id',
    'recordId', 'record_id', 'contactId', 'contact_id', 'customerId'
  ];
  const body = req.body || {};
  for (const f of IDENTITY_FIELDS) {
    const v = body[f];
    if (v !== undefined && v !== null && v !== '' && !ids.has(String(v))) {
      console.warn('[authz] refused body-supplied identity', {
        by: user.userId, field: f, value: String(v), path: req.url });
      return sendError(res, 'FORBIDDEN',
        'You do not have access to that record.', 403);
    }
  }

  req.student = { user, student, ids: [...ids] };
  return next();
}

module.exports = requireStudent;
