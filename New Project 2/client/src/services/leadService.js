/**
 * Lead & Inquiry Service
 * Communicates with Zoho Catalyst Leads Function and triggers Zoho CRM sync
 */

import apiClient from './apiClient';

class LeadService {
  async submitInquiry(formData) {
    return apiClient.post('/leads', formData);
  }

  async getLead(id) {
    return apiClient.get(`/leads/${id}`);
  }
}

export const leadService = new LeadService();
export default leadService;
