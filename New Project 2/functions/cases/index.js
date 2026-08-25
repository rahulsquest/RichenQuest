/**
 * Zoho Catalyst Function: Cases
 * Handles student case roadmap, milestones, and status transitions.
 */

const CatalystDataStore = require('../shared/dataStore');
const { sendSuccess, sendError } = require('../shared/response');
const ZohoClient = require('../shared/zohoClient');

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

  // PUT /api/cases/:id
  if (method === 'PUT' || method === 'PATCH') {
    const updates = req.body || {};
    const existing = casesTable.findOne(c => c.caseId === caseId || c.studentId === caseId);

    if (!existing) {
      return sendError(res, 'NOT_FOUND', 'Case not found to update.', 404);
    }

    const updated = casesTable.update(c => c.caseId === existing.caseId, updates);

    ZohoClient.emitFlowEvent('APPLICATION_UPDATED', {
      caseId: existing.caseId,
      studentId: existing.studentId,
      stage: updated.stage,
      status: updated.status
    });

    return sendSuccess(res, updated, 'Student case updated successfully.');
  }

  return sendError(res, 'METHOD_NOT_ALLOWED', 'Method not allowed.', 405);
}

module.exports = handleCases;
