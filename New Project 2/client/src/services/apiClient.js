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
        /*  A 2xx that is not JSON did not come from this API.
         *
         *  Every backend route answers through sendSuccess/sendError, so JSON
         *  is the only shape the API produces. When the app is built without
         *  VITE_API_BASE_URL it calls the relative '/api', which the static
         *  host answers with index.html and HTTP 200 — verified against the
         *  live site. That used to resolve successfully as
         *  { message: '<!doctype html>…' }, so callers saw no error, read
         *  undefined off it, and rendered empty lists and zero counts that
         *  look exactly like real data for a new student. A dashboard
         *  confidently showing nothing is a false statement, not a blank
         *  state, so this is treated as the failure it is. */
        const body = await response.text();
        if (response.ok) {
          const error = new Error(
            'The service is temporarily unavailable. Please try again shortly.');
          error.status = response.status;
          error.code = 'API_UNREACHABLE';
          error.detail = body.slice(0, 200);
          throw error;
        }
        data = { message: body };
      }

      if (!response.ok) {
        /*  Every response this API produces carries a boolean `success` — see
         *  shared/response.js. A JSON error without it did not come from us.
         *  The live case is the static host rejecting a POST to the relative
         *  '/api' with its own envelope and HTTP 405, which surfaced to a
         *  student submitting the inquiry form as the literal text "HTTP Error
         *  405". That is honest in that it is an error, and useless in that it
         *  tells them nothing they can act on. Same failure as the branch
         *  above — the API is not reachable — so it says the same thing. */
        if (typeof data?.success !== 'boolean') {
          const error = new Error(
            'The service is temporarily unavailable. Please try again shortly.');
          error.status = response.status;
          error.code = 'API_UNREACHABLE';
          error.detail = JSON.stringify(data).slice(0, 200);
          throw error;
        }
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
