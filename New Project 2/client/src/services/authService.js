/**
 * Authentication Service
 * Communicates with Zoho Catalyst Auth Functions.
 * 
 * Rules:
 * - Real API requests only (NO mock data or demo fallbacks).
 * - Stores authentic session token in localStorage.
 * - Handles login, signup, session check, logout, password reset, and email verification.
 */

import apiClient from './apiClient';

class AuthService {
  async login(email, password) {
    const response = await apiClient.post('/auth/login', { email, password });
    if (response?.data?.token) {
      localStorage.setItem('richenquest_auth_token', response.data.token);
    }
    return response.data;
  }

  async signup(data) {
    const response = await apiClient.post('/auth/signup', data);
    if (response?.data?.token) {
      localStorage.setItem('richenquest_auth_token', response.data.token);
    }
    return response.data;
  }

  async getCurrentUser() {
    const token = localStorage.getItem('richenquest_auth_token');
    if (!token) return null;

    try {
      const response = await apiClient.get('/me');
      return response.data;
    } catch (err) {
      this.logout();
      return null;
    }
  }

  async logout() {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('richenquest_auth_token');
    }
  }

  async resetPassword(email) {
    return apiClient.post('/auth/reset-password', { email });
  }

  async verifyEmail(token) {
    return apiClient.post('/auth/verify-email', { token });
  }
}

export const authService = new AuthService();
export default authService;
