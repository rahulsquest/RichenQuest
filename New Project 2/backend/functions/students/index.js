/**
 * Zoho Catalyst Function: Students
 * Handles student profile fetching, updates, and synchronization with Zoho CRM.
 */

const CatalystDataStore = require('../shared/dataStore');
const { sendSuccess, sendError } = require('../shared/response');
const ZohoClient = require('../shared/zohoClient');

const studentsTable = CatalystDataStore.getTable('Students');
const counselorsTable = CatalystDataStore.getTable('Counselors');

async function handleStudents(req, res) {
  const method = req.method;
  const studentId = req.params?.id;

  if (!studentId) {
    return sendError(res, 'BAD_REQUEST', 'Student ID is required.', 400);
  }

  // GET /api/students/:id
  if (method === 'GET') {
    const student = studentsTable.findOne(s => s.studentId === studentId || s.userId === studentId);
    if (!student) {
      return sendError(res, 'NOT_FOUND', 'Student profile not found.', 404);
    }

    const counselor = student.counselorId ? counselorsTable.findOne(c => c.counselorId === student.counselorId) : null;

    return sendSuccess(res, {
      student,
      counselor: counselor || null
    }, 'Student profile retrieved.');
  }

  // PUT /api/students/:id
  if (method === 'PUT' || method === 'PATCH') {
    const updates = req.body || {};
    const existing = studentsTable.findOne(s => s.studentId === studentId || s.userId === studentId);

    if (!existing) {
      return sendError(res, 'NOT_FOUND', 'Student profile not found to update.', 404);
    }

    // Protect immutable fields
    delete updates.studentId;
    delete updates.userId;
    delete updates.createdAt;

    const updated = studentsTable.update(s => s.studentId === existing.studentId, updates);

    // Sync updated details to Zoho CRM Contact
    ZohoClient.syncContactToCrm(updated).catch(err => console.error('[Student CRM Update Error]:', err.message));

    // Emit Profile Updated Flow Event
    ZohoClient.emitFlowEvent('STUDENT_PROFILE_UPDATED', {
      studentId: existing.studentId,
      updatedFields: Object.keys(updates)
    });

    return sendSuccess(res, updated, 'Student profile updated successfully.');
  }

  return sendError(res, 'METHOD_NOT_ALLOWED', 'Method not allowed.', 405);
}

module.exports = handleStudents;
