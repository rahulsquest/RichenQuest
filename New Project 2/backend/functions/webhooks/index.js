/**
 * Zoho Catalyst Function: Webhooks
 * Secure inbound webhook handler for Zoho Flow and Zoho CRM callbacks.
 */

const CatalystDataStore = require('../shared/dataStore');
const { sendSuccess, sendError } = require('../shared/response');

const notificationsTable = CatalystDataStore.getTable('Notifications');
const casesTable = CatalystDataStore.getTable('Cases');
const documentsTable = CatalystDataStore.getTable('Documents');


/*  Insert a notification at most once per real-world event.
 *
 *  Zoho Flow retries a webhook whenever it does not get a 2xx, so the same
 *  delivery arrives more than once as a matter of course. COUNSELOR_ASSIGNED
 *  survives that because it sets fields to fixed values, but both
 *  notification cases inserted a fresh row every time — a retried delivery
 *  showed the student the same "Document Approved" or "Offer Letter Received"
 *  twice, which reads as two separate events rather than one.
 *
 *  The id is derived from the event and its subject, so a replay resolves to
 *  the same row and is skipped. That uses the existing notificationId column
 *  and needs no schema change. Where the payload carries no stable reference
 *  there is nothing to derive from, so it falls back to the previous
 *  behaviour rather than dropping a genuine notification — with a random
 *  suffix, because two deliveries inside the same millisecond would otherwise
 *  collide on Date.now() alone.
 */
function insertNotificationOnce(table, key, fields) {
  const notificationId = key
    ? `NTF_${key}`
    : `NTF_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  if (key && table.findOne(n => n.notificationId === notificationId)) return false;
  table.insert({ notificationId, isRead: false, createdAt: new Date().toISOString(), ...fields });
  return true;
}

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
  /*  An inbound webhook body is whatever Zoho sends, under the 10 MB request
   *  limit. Bounded before storage so a large body cannot be silently cut in
   *  half by Catalyst's text ceiling — the event, direction and receivedAt
   *  columns are unaffected, so the audit trail still records what arrived
   *  and when even when the body itself was too big to keep inline. */
  CatalystDataStore.getTable('IntegrationEvents').insert({
    direction: 'INBOUND',
    event,
    data: CatalystDataStore.boundAuditValue(data, `IntegrationEvents.data (${event})`),
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
          insertNotificationOnce(notificationsTable, `DOC_VERIFIED_${data.documentId}`, {
            studentId: data.studentId,
            type: 'DOCUMENT_APPROVED',
            title: 'Document Approved by Counselor',
            message: data.message || 'Your submitted document has been approved.',
            actionUrl: '/documents'
          });
        }
      }
      break;
    }
    case 'APPLICATION_OFFER_RECEIVED': {
      if (data?.studentId) {
        const offerRef = data.applicationId || data.offerId || data.reference || null;
        insertNotificationOnce(notificationsTable, offerRef ? `OFFER_${offerRef}` : null, {
          studentId: data.studentId,
          type: 'APPLICATION_UPDATE',
          title: '🎉 University Offer Letter Received!',
          message: data.message || 'Congratulations! An offer letter has been uploaded to your case.',
          actionUrl: '/applications'
        });
      }
      break;
    }
  }

  return sendSuccess(res, { processed: true, event }, 'Webhook event processed successfully');
}

module.exports = handleWebhooks;
