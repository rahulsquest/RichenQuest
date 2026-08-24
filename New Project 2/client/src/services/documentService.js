/**
 * Document Service
 * Communicates with Catalyst Documents function & Zoho WorkDrive
 */

import apiClient from './apiClient';

class DocumentService {
  async getDocuments(studentId) {
    const response = await apiClient.get('/documents', { params: { studentId } });
    return response.data;
  }

  async uploadDocument(documentData) {
    return apiClient.post('/documents', documentData);
  }

  async deleteDocument(documentId) {
    return apiClient.delete(`/documents/${documentId}`);
  }
}

export const documentService = new DocumentService();
export default documentService;
