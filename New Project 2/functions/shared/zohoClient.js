/**
 * Zoho Integration Client & Boundary Layer
 * Aggregates modular Zoho services (OAuth, CRM, Books, Bookings, WorkDrive, Flow, PhoneVerify).
 */

const zohoOAuth = require('./zoho/oauth');
const zohoCrm = require('./zoho/crm');
const zohoBooks = require('./zoho/books');
const zohoBookings = require('./zoho/bookings');
const zohoWorkDrive = require('./zoho/workDrive');
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
    // Also save event in Catalyst Data Store
    CatalystDataStore.getTable('IntegrationEvents').insert({
      event,
      timestamp: new Date().toISOString(),
      payload
    });
    return zohoFlow.emitEvent(event, payload);
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
