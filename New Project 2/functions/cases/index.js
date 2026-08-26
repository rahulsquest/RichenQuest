/**
 * Zoho Catalyst Function: Cases
 * Handles student case roadmap, milestones, and status transitions.
 */

const CatalystDataStore = require('../shared/dataStore');
const { sendSuccess, sendError } = require('../shared/response');

const casesTable = CatalystDataStore.getTable('Cases');
const studentsTable = CatalystDataStore.getTable('Students');
const counselorsTable = CatalystDataStore.getTable('Counselors');

async function handleCases(req, res) {
  const method = req.method;
  const caseId = req.params?.id;

  if (!caseId) {
    return sendError(res, 'BAD_REQUEST', 'Case ID or Student ID is required.', 400);
  }

  // GET /api/cases/:id or /api/cases/student/:studentId
  if (method === 'GET') {
    const studentCase = casesTable.findOne(c => c.caseId === caseId || c.studentId === caseId);

    if (!studentCase) {
      return sendError(res, 'NOT_FOUND', 'Student admissions case not found.', 404);
    }

    const student = studentsTable.findOne(s => s.studentId === studentCase.studentId);
    const counselor = studentCase.counselorId ? counselorsTable.findOne(c => c.counselorId === studentCase.counselorId) : null;

    return sendSuccess(res, {
      case: studentCase,
      student: student || null,
      counselor: counselor || null
    }, 'Student case roadmap retrieved successfully.');
  }

  /*  PUT/PATCH /api/cases/:id — refused for students, not merely unfiltered.
   *
   *  Confirmed by testing before this fix: with no field filtering at all, a
   *  student's own PATCH request with {"status":"ACCEPTED","stage":"Offer
   *  Received"} silently rewrote both fields on their own case. Unlike the
   *  student profile (which has real student-owned fields, fixed separately
   *  with an allowlist), nothing on a Case record is student-owned — status,
   *  stage, milestones and counselorId are counselor/CRM-driven state, and
   *  application status is exactly the kind of field that must never be
   *  self-reportable. The legitimate write path for this data is the
   *  webhook handler (webhooks/index.js), authenticated separately, not a
   *  student's own session. */
  if (method === 'PUT' || method === 'PATCH') {
    return sendError(res, 'FORBIDDEN',
      'Case status and stage are managed by your counselor and cannot be edited directly.', 403);
  }

  return sendError(res, 'METHOD_NOT_ALLOWED', 'Method not allowed.', 405);
}

module.exports = handleCases;
