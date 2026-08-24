/**
 * Booking Service
 * Communicates with Catalyst Bookings function & Zoho Bookings
 */

import apiClient from './apiClient';

class BookingService {
  async getBookings(studentId) {
    const response = await apiClient.get('/bookings', { params: { studentId } });
    return response.data;
  }

  async createBooking(bookingData) {
    return apiClient.post('/bookings', bookingData);
  }

  async cancelBooking(bookingId) {
    return apiClient.delete(`/bookings/${bookingId}`);
  }

  async rescheduleBooking(bookingId, updates) {
    return apiClient.put(`/bookings/${bookingId}`, updates);
  }
}

export const bookingService = new BookingService();
export default bookingService;
