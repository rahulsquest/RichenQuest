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
    const existing = studentsTable.findOne(s => s.studentId === studentId || s.userId === studentId);

    if (!existing) {
      return sendError(res, 'NOT_FOUND', 'Student profile not found to update.', 404);
    }

    /*  Allowlist, not a denylist. A denylist of 3 fields (studentId, userId,
     *  createdAt) let a student PATCH counselorId/caseId/leadId/email — a
     *  real, confirmed-by-testing tamper: a student could reassign their own
     *  counselor or hijack another case id just by naming it in the body.
     *  Every field below is genuinely student-owned profile data; anything
     *  else (identity, relationship, or engine-owned) is never accepted from
     *  the caller, matching the same "guarded by default" shape as the
     *  requireStudent identifier check. */
    const EDITABLE_FIELDS = [
      'fullName', 'phone', 'countryOfCitizenship', 'currentLocation',
      'targetDegree', 'targetMajor', 'targetIntake', 'targetCountries',
      'targetUniversities', 'academicHistory'
    ];
    const body = req.body || {};
    const updates = {};
    for (const f of EDITABLE_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(body, f)) updates[f] = body[f];
    }

    const updated = studentsTable.update(s => s.studentId === existing.studentId, updates);

    // Sync updated details to Zoho CRM Contact
    /*  The result was previously discarded entirely — a profile change that
     *  never reached CRM left no trace at all, so the counsellor's view could
     *  drift from the student's without anyone being able to detect it. */
    ZohoClient.syncContactToCrm(updated).then(crmRes => {
      const synced = Boolean(crmRes?.crmContactId);
      if (!synced) console.warn('[students] profile change did not reach CRM:', crmRes?.status || 'UNKNOWN');
      studentsTable.update(s => s.studentId === existing.studentId, {
        zohoCrmSyncStatus: {
          synced,
          crmContactId: crmRes?.crmContactId || null,
          status: crmRes?.status || 'UNKNOWN',
          lastSyncTimestamp: new Date().toISOString()
        }
      });
    }).catch(err => {
      console.error('[Student CRM Update Error]:', err.message);
      studentsTable.update(s => s.studentId === existing.studentId, {
        zohoCrmSyncStatus: {
          synced: false, crmContactId: null,
          status: 'SYNC_ERROR', lastSyncTimestamp: new Date().toISOString()
        }
      });
    });

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
