/**
 * Zoho Flow Integration Definitions
 * Event constants and schema templates for backend webhook orchestration
 */

export const FLOW_EVENTS = {
  LEAD_CREATED: 'LEAD_CREATED',
  STUDENT_REGISTERED: 'STUDENT_REGISTERED',
  CONSULTATION_REQUESTED: 'CONSULTATION_REQUESTED',
  BOOKING_CREATED: 'BOOKING_CREATED',
  BOOKING_CANCELLED: 'BOOKING_CANCELLED',
  DOCUMENT_UPLOADED: 'DOCUMENT_UPLOADED',
  DOCUMENT_APPROVED: 'DOCUMENT_APPROVED',
  PAYMENT_COMPLETED: 'PAYMENT_COMPLETED',
  APPLICATION_UPDATED: 'APPLICATION_UPDATED'
};

export function createFlowPayload(eventName, data = {}) {
  return {
    event: eventName,
    timestamp: new Date().toISOString(),
    source: 'richenquest_web',
    version: '1.0',
    data
  };
}
