/**
 * Zoho Integration Service
 * Health checks, status reporting, and CRM sync
 */

import apiClient from './apiClient';

class ZohoService {
  async getStatus() {
    const response = await apiClient.get('/crm/status');
    return response.data;
  }

  async syncStudent(studentId) {
    return apiClient.post(`/crm/sync/${studentId}`);
  }
}

export const zohoService = new ZohoService();
export default zohoService;
