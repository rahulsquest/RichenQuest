/**
 * Case & Application Milestone Service
 */

import apiClient from './apiClient';

class CaseService {
  async getCase(caseId) {
    const response = await apiClient.get(`/cases/${caseId}`);
    return response.data;
  }

  async updateCase(caseId, updates) {
    const response = await apiClient.put(`/cases/${caseId}`, updates);
    return response.data;
  }
}

export const caseService = new CaseService();
export default caseService;
