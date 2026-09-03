/**
 * Zoho Integration Client & Boundary Layer
 * Aggregates modular Zoho services (OAuth, CRM, Books, Bookings, WorkDrive, Flow, PhoneVerify).
 */

const zohoOAuth = require('./zoho/oauth');
const zohoCrm = require('./zoho/crm');
const zohoBooks = require('./zoho/books');
const zohoBookings = require('./zoho/bookings');
const zohoWorkDrive = require('./zoho/workdrive');
const zohoFlow = require('./zoho/flow');
const phoneVerify = require('./zoho/phoneVerify');
const CatalystDataStore = require('./dataStore');

class ZohoClient {
  /**
   * Check configuration status for all Zoho services
   */
  static getIntegrationStatus() {
    return {
      zohoCrm: {
        configured: zohoCrm.isConfigured(),
        status: zohoCrm.isConfigured() ? 'CONNECTED' : 'UNCONFIGURED',
        description: 'Primary customer & student case record system'
      },
      zohoFlow: {
        configured: zohoFlow.isConfigured(),
        status: zohoFlow.isConfigured() ? 'CONNECTED' : 'UNCONFIGURED',
        description: 'Multi-service automation & webhook orchestration'
      },
      zohoBookings: {
        configured: zohoBookings.isConfigured(),
        status: zohoBookings.isConfigured() ? 'CONNECTED' : 'UNCONFIGURED',
        description: 'Counselor appointment scheduling & synchronization'
      },
      zohoWorkDrive: {
        configured: zohoWorkDrive.isConfigured(),
        status: zohoWorkDrive.isConfigured() ? 'CONNECTED' : 'UNCONFIGURED',
        description: 'Secure cloud file storage for student dossiers'
      },
      zohoBooks: {
        configured: zohoBooks.isConfigured(),
        status: zohoBooks.isConfigured() ? 'CONNECTED' : 'UNCONFIGURED',
        description: 'Student invoicing, fee tracking, and receipt generation'
      },
      zohoSalesIQ: {
        configured: Boolean(process.env.VITE_SALESIQ_WIDGET_CODE),
        status: Boolean(process.env.VITE_SALESIQ_WIDGET_CODE) ? 'CONNECTED' : 'UNCONFIGURED',
        description: 'Live student visitor chat & instant lead capture'
      },
      phoneVerification: phoneVerify.getProviderStatus()
    };
  }

  // Delegated methods
  static async emitFlowEvent(event, payload) {
    /*  The audit row is bounded; the payload sent onward to Flow is NOT.
     *  Only Catalyst has the 10,000-character text ceiling, so the real
     *  payload still reaches Flow in full — it is the stored copy that gets a
     *  marker when it is too large, and the marker says so out loud.
     *
     *  `eventTimestamp`, not `timestamp`: Catalyst rejects `timestamp` as a
     *  reserved keyword, the same way it rejects `read` and `date`. */
    /*  The audit row is written AFTER the dispatch, so it can record what
     *  actually happened rather than only that an attempt was made.
     *
     *  It used to be inserted first and never updated, so a delivered event
     *  and a failed one were byte-identical in the audit log — there was no
     *  way to ask "which Flow events never reached Zoho". direction carries
     *  the outcome because it is an existing column; no schema change, and
     *  OUTBOUND_FAILED fits its Text(16). */
    const result = await zohoFlow.emitEvent(event, payload);
    const delivered = result?.status === 'DISPATCHED';
    if (!delivered) {
      console.warn(`[zohoClient] Flow event ${event} not delivered:`, result?.status || 'UNKNOWN');
    }
    CatalystDataStore.getTable('IntegrationEvents').insert({
      event,
      eventTimestamp: new Date().toISOString(),
      direction: delivered ? 'OUTBOUND' : 'OUTBOUND_FAILED',
      payload: CatalystDataStore.boundAuditValue(payload, `IntegrationEvents.payload (${event})`)
    });
    return result;
  }

  static async syncLeadToCrm(leadData) {
    return zohoCrm.upsertLead(leadData);
  }

  static async syncContactToCrm(studentData) {
    return zohoCrm.upsertContact(studentData);
  }

  static async createZohoBooking(bookingData) {
    return zohoBookings.createAppointment(bookingData);
  }

  static async getBookingSlots(date, serviceId, staffId) {
    return zohoBookings.getAvailableSlots(date, serviceId, staffId);
  }

  static async getBooksInvoices(customerEmail) {
    return zohoBooks.getInvoices(customerEmail);
  }

  static async uploadWorkDriveFile(folderId, file) {
    return zohoWorkDrive.uploadFile(folderId, file);
  }
}

module.exports = ZohoClient;
