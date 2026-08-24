/**
 * Notification Service
 * Handles alerts, reminders, and activity feed.
 */

import apiClient from './apiClient';

class NotificationService {
  async getNotifications(studentId) {
    const response = await apiClient.get('/notifications', { params: { studentId } });
    return response.data;
  }

  async markAsRead(notificationId) {
    return apiClient.put(`/notifications/${notificationId}/read`);
  }

  async markAllAsRead(studentId) {
    return apiClient.put('/notifications/read-all', { studentId });
  }
}

export const notificationService = new NotificationService();
export default notificationService;
