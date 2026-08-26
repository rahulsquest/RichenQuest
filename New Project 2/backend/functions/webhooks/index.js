/**
 * Zoho Catalyst Function: Webhooks
 * Secure inbound webhook handler for Zoho Flow and Zoho CRM callbacks.
 */

const CatalystDataStore = require('../shared/dataStore');
const { sendSuccess, sendError } = require('../shared/response');

const notificationsTable = CatalystDataStore.getTable('Notifications');
const casesTable = CatalystDataStore.getTable('Cases');
const documentsTable = CatalystDataStore.getTable('Documents');

async function handleWebhooks(req, res) {
  const method = req.method;

  if (method !== 'POST') {
    return sendError(res, 'METHOD_NOT_ALLOWED', 'Webhooks only accept POST requests', 405);
  }

  const { event, token, data } = req.body || {};

  /*  Fail closed, not conditionally. The previous check —
   *  `if (expectedSecret && token && token !== expectedSecret)` — skipped
   *  verification entirely whenever the caller simply omitted the token
   *  field, regardless of whether ZOHO_WEBHOOK_SECRET was configured.
   *  Confirmed live before this fix: a plain unauthenticated POST with no
   *  token and no Authorization header rewrote a real case's counselorId
   *  and stage. A missing secret now refuses every request rather than
   *  silently accepting unauthenticated writes — same "fail loud on a
   *  missing secret" rule session.js already applies to session signing. */
  const expectedSecret = process.env.ZOHO_WEBHOOK_SECRET;
  if (!expectedSecret || token !== expectedSecret) {
    return sendError(res, 'UNAUTHORIZED', 'Invalid webhook verification token', 401);
  }

  console.log(`[Inbound Zoho Webhook] Received event: ${event}`, data);

  // Store in IntegrationEvents audit log
  CatalystDataStore.getTable('IntegrationEvents').insert({
    direction: 'INBOUND',
    event,
    data,
    receivedAt: new Date().toISOString()
  });

  // Handle specific Zoho Flow events
  switch (event) {
    case 'COUNSELOR_ASSIGNED': {
      if (data?.caseId && data?.counselorId) {
        casesTable.update(c => c.caseId === data.caseId, {
          counselorId: data.counselorId,
          stage: 'Counselor Assigned & Consultation Scheduled'
        });
      }
      break;
    }
    case 'DOCUMENT_VERIFIED': {
      if (data?.documentId) {
        documentsTable.update(d => d.documentId === data.documentId, {
          reviewStatus: 'VERIFIED',
          reviewerNotes: data.notes || 'Verified by admissions counselor.'
        });
        if (data?.studentId) {
          notificationsTable.insert({
            notificationId: `NTF_${Date.now()}`,
            studentId: data.studentId,
            type: 'DOCUMENT_APPROVED',
            title: 'Document Approved by Counselor',
            message: data.message || 'Your submitted document has been approved.',
            read: false,
            createdAt: new Date().toISOString(),
            actionUrl: '/documents'
          });
        }
      }
      break;
    }
    case 'APPLICATION_OFFER_RECEIVED': {
      if (data?.studentId) {
        notificationsTable.insert({
          notificationId: `NTF_${Date.now()}`,
          studentId: data.studentId,
          type: 'APPLICATION_UPDATE',
          title: '🎉 University Offer Letter Received!',
          message: data.message || 'Congratulations! An offer letter has been uploaded to your case.',
          read: false,
          createdAt: new Date().toISOString(),
          actionUrl: '/applications'
        });
      }
      break;
    }
  }

  return sendSuccess(res, { processed: true, event }, 'Webhook event processed successfully');
}

module.exports = handleWebhooks;
