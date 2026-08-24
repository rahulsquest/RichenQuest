/**
 * Analytics Service
 * Centralized business event tracking ready for Zoho Analytics
 */

import apiClient from './apiClient';
import env from '../config/environment';

class AnalyticsService {
  track(eventName, properties = {}) {
    const eventPayload = {
      event: eventName,
      timestamp: new Date().toISOString(),
      url: window.location.pathname,
      properties
    };

    if (env.isDevelopment) {
      console.log(`[Zoho Analytics Event] ${eventName}:`, properties);
    }

    // Dispatch non-blocking event to backend
    apiClient.post('/events', { event: eventName, data: properties }).catch(() => {
      // Fire-and-forget
    });
  }

  pageView(pageName) {
    this.track('PAGE_VIEW', { page: pageName || window.location.pathname });
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;
