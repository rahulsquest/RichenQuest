/**
 * Payment & Invoicing Service
 * Communicates with Catalyst Payments function & Zoho Books
 */

import apiClient from './apiClient';

class PaymentService {
  async getInvoices(studentId) {
    const response = await apiClient.get('/payments', { params: { studentId } });
    return response.data;
  }

  async getReceipt(paymentId) {
    return apiClient.get(`/payments/${paymentId}/receipt`);
  }
}

export const paymentService = new PaymentService();
export default paymentService;
