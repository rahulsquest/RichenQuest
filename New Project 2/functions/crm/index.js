/**
 * Zoho Catalyst Function: CRM
 * Handles Zoho CRM sync status health checks and manual sync triggers.
 */

const CatalystDataStore = require('../shared/dataStore');
const { sendSuccess, sendError } = require('../shared/response');
const ZohoClient = require('../shared/zohoClient');

const studentsTable = CatalystDataStore.getTable('Students');

async function handleCrm(req, res) {
  const method = req.method;
  const path = req.path || '';

  // GET /api/crm/status
  if (method === 'GET' && (path === '/status' || path === '')) {
    const integrations = ZohoClient.getIntegrationStatus();
    const eventLogs = CatalystDataStore.getTable('IntegrationEvents').find().slice(-10);

    return sendSuccess(res, {
      environment: process.env.NODE_ENV || 'development',
      zohoEcosystem: integrations,
      recentEvents: eventLogs
    }, 'Zoho ecosystem status retrieved.');
  }

  // POST /api/crm/sync/:studentId
  if (method === 'POST' && path.startsWith('/sync')) {
    const studentId = req.params?.studentId;
    if (!studentId) {
      return sendError(res, 'BAD_REQUEST', 'Student ID is required for CRM synchronization.', 400);
    }

    const student = studentsTable.findOne(s => s.studentId === studentId);
    if (!student) {
      return sendError(res, 'NOT_FOUND', 'Student profile not found to synchronize.', 404);
    }

    const crmRes = await ZohoClient.syncContactToCrm(student);

    if (crmRes?.crmContactId) {
      studentsTable.update(s => s.studentId === studentId, {
        zohoCrmSyncStatus: {
          synced: true,
          crmContactId: crmRes.crmContactId,
          lastSyncTimestamp: new Date().toISOString()
        }
      });
    }

    return sendSuccess(res, {
      studentId,
      crmSyncResult: crmRes
    }, 'Student record synchronization processed with Zoho CRM.');
  }

  return sendError(res, 'NOT_FOUND', 'CRM endpoint not found.', 404);
}

module.exports = handleCrm;
