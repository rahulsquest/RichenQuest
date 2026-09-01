/**
 * Zoho Bookings Service
 * Handles server-side integration with Zoho Bookings API.
 * 
 * Rules:
 * 1. Fetches real availability slots for counselor staff/service.
 * 2. Books appointments in Zoho Bookings.
 * 3. Never returns fake appointments or slots when unconfigured.
 */

const zohoOAuth = require('./oauth');

class ZohoBookingsService {
  constructor() {
    this.apiDomain = process.env.ZOHO_BOOKINGS_API_DOMAIN || 'https://www.zohoapis.in/bookings/v1/json';
  }

  isConfigured() {
    return Boolean(
      process.env.ZOHO_BOOKINGS_SERVICE_ID &&
      zohoOAuth.isConfigured()
    );
  }

  /**
   * Fetch available consultation slots for a service and date
   * @param {string} date - Format YYYY-MM-DD
   * @param {string} serviceId - Optional Zoho Bookings Service ID
   * @param {string} staffId - Optional Zoho Bookings Staff ID
   */
  async getAvailableSlots(date, serviceId, staffId) {
    if (!this.isConfigured()) {
      return {
        configured: false,
        availableSlots: [],
        message: 'No consultation availability is currently available.'
      };
    }

    const sId = serviceId || process.env.ZOHO_BOOKINGS_SERVICE_ID;
    const stId = staffId || process.env.ZOHO_BOOKINGS_STAFF_ID;

    let url = `${this.apiDomain}/availableslots?service_id=${sId}&selected_date=${date}`;
    if (stId) {
      url += `&staff_id=${stId}`;
    }

    try {
      const res = await zohoOAuth.authenticatedFetch(url);
      if (!res.ok) {
        throw new Error(`Zoho Bookings returned status ${res.status}`);
      }

      const data = await res.json();
      const slots = data?.response?.returnvalue?.availableslots || [];

      return {
        configured: true,
        availableSlots: slots,
        message: slots.length === 0 ? 'No consultation availability is currently available.' : null
      };
    } catch (err) {
      console.error('[Zoho Bookings] getAvailableSlots error:', err.message);
      return {
        configured: true,
        availableSlots: [],
        error: 'No consultation availability is currently available.'
      };
    }
  }

  /**
   * Create an appointment in Zoho Bookings
   * @param {object} bookingData - Details of the booking
   */
  async createAppointment(bookingData) {
    if (!this.isConfigured()) {
      return {
        status: 'UNCONFIGURED',
        message: 'Zoho Bookings is not configured. Booking saved locally in Catalyst Data Store.'
      };
    }

    const serviceId = process.env.ZOHO_BOOKINGS_SERVICE_ID;
    const staffId = process.env.ZOHO_BOOKINGS_STAFF_ID;

    const postData = {
      service_id: serviceId,
      staff_id: staffId,
      from_time: `${bookingData.bookingDate} ${bookingData.timeSlot?.split(' - ')[0] || '10:00:00'}`,
      customer_details: {
        name: bookingData.studentName || 'Student',
        email: bookingData.studentEmail || '',
        phone_number: bookingData.studentPhone || ''
      },
      notes: bookingData.notes || ''
    };

    const url = `${this.apiDomain}/appointment`;
    try {
      const res = await zohoOAuth.authenticatedFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData)
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Zoho Bookings appointment creation failed: ${res.status} - ${body}`);
      }

      const data = await res.json();
      const bookingRecord = data?.response?.returnvalue;

      return {
        status: 'BOOKED',
        zohoBookingsId: bookingRecord?.booking_id,
        appointmentUrl: bookingRecord?.join_url || null
      };
    } catch (err) {
      console.error('[Zoho Bookings] createAppointment error:', err.message);
      return {
        status: 'BOOKING_ERROR',
        error: 'Consultation scheduling service is temporarily unavailable.'
      };
    }
  }

  /**
   * Cancel an appointment in Zoho Bookings
   * @param {string} zohoBookingsId - Booking ID
   */
  async cancelAppointment(zohoBookingsId) {
    if (!this.isConfigured() || !zohoBookingsId) return null;

    const url = `${this.apiDomain}/rescheduleappointment`;
    try {
      const res = await zohoOAuth.authenticatedFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: zohoBookingsId, action: 'cancel' })
      });
      return res.ok;
    } catch (err) {
      console.error('[Zoho Bookings] cancelAppointment error:', err.message);
      return false;
    }
  }
}

const zohoBookings = new ZohoBookingsService();
module.exports = zohoBookings;
