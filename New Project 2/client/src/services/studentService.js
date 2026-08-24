/**
 * Student Service
 * Fetches and updates student profiles, academic credentials, and target universities.
 */

import apiClient from './apiClient';

class StudentService {
  async getStudent(studentId) {
    const response = await apiClient.get(`/students/${studentId}`);
    return response.data;
  }

  async updateStudent(studentId, updates) {
    const response = await apiClient.put(`/students/${studentId}`, updates);
    return response.data;
  }
}

export const studentService = new StudentService();
export default studentService;
