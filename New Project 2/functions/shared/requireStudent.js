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

/* Path segments that look like an identifier rather than a sub-resource. */
const LOOKS_LIKE_ID = /^(USR_|STU_|CASE_|LEAD_|CNT_|\d{8,})/;

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
    if (LOOKS_LIKE_ID.test(raw) && !ids.has(raw)) {
      console.warn('[authz] refused cross-student access', {
        by: user.userId, requested: raw, path: req.url });
      return sendError(res, 'FORBIDDEN',
        'You do not have access to that record.', 403);
    }
  }

  req.student = { user, student, ids: [...ids] };
  return next();
}

module.exports = requireStudent;
