/**
 * Universal API Client for RichenQuest
 * Central point of communication between React Frontend and Zoho Catalyst Functions
 */

import env from '../config/environment';

class ApiClient {
  constructor() {
    this.baseUrl = env.apiBaseUrl;
    this.timeout = 15000;
  }

  getHeaders(customHeaders = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...customHeaders
    };

    const token = localStorage.getItem('richenquest_auth_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  async request(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), options.timeout || this.timeout);

    const config = {
      method: options.method || 'GET',
      headers: this.getHeaders(options.headers),
      signal: controller.signal,
      ...options
    };

    if (options.body && typeof options.body === 'object') {
      config.body = JSON.stringify(options.body);
    }

    if (env.isDevelopment) {
      console.log(`[API Request] ${config.method} ${url}`, config.body ? JSON.parse(config.body) : '');
    }

    try {
      const response = await fetch(url, config);
      clearTimeout(id);

      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = { message: await response.text() };
      }

      if (!response.ok) {
        const error = new Error(data?.error?.message || data?.message || `HTTP Error ${response.status}`);
        error.status = response.status;
        error.code = data?.error?.code || 'API_ERROR';
        error.data = data;
        throw error;
      }

      if (env.isDevelopment) {
        console.log(`[API Response] ${config.method} ${url}`, data);
      }

      return data;
    } catch (err) {
      clearTimeout(id);
      if (err.name === 'AbortError') {
        throw new Error(`Request timed out after ${this.timeout / 1000} seconds`);
      }
      throw err;
    }
  }

  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  post(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'POST', body });
  }

  put(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'PUT', body });
  }

  patch(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'PATCH', body });
  }

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
export default apiClient;
