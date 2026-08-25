/**
 * Zoho OAuth 2.0 Token Manager
 * Handles server-side OAuth authentication with Zoho Accounts (India & Global regions).
 * 
 * Rules & Architecture:
 * 1. Automatically uses stored `ZOHO_CRM_REFRESH_TOKEN` with `grant_type=refresh_token` to mint & cache short-lived access tokens.
 * 2. Caches valid access tokens in memory until expiry (typically 1 hour) — NO unnecessary API calls.
 * 3. Automatically refreshes access tokens when expired or 60s prior to expiry.
 * 4. Automatically retries requests once on 401 Unauthorized with a freshly minted token.
 * 5. Supports one-time initial exchange of temporary grant code (`ZOHO_CRM_CODE` or initial auth code) to permanently save the refresh token.
 * 6. Sends parameters strictly via application/x-www-form-urlencoded POST body per Zoho OAuth standard.
 * 7. Never requires manual token generation during runtime.
 */

const fs = require('fs');
const path = require('path');

class ZohoOAuth {
  constructor() {
    this.tokenCache = {
      accessToken: null,
      expiresAt: 0,
      scope: []
    };
  }

  getAccountsUrl() {
    return (process.env.ZOHO_ACCOUNTS_URL || 'https://accounts.zoho.in').trim();
  }

  getApiDomain() {
    return (process.env.ZOHO_CRM_API_DOMAIN || 'https://www.zohoapis.in').trim();
  }

  getClientId() {
    return (process.env.ZOHO_CRM_CLIENT_ID || '').trim();
  }

  getClientSecret() {
    return (process.env.ZOHO_CRM_CLIENT_SECRET || '').trim();
  }

  getRefreshToken() {
    return (process.env.ZOHO_CRM_REFRESH_TOKEN || '').trim();
  }

  getAuthCode() {
    return (process.env.ZOHO_CRM_CODE || '').trim();
  }

  /**
   * Check if credentials are configured
   */
  isConfigured() {
    return Boolean(
      this.getClientId() &&
      this.getClientSecret() &&
      (this.getRefreshToken() || this.getAuthCode())
    );
  }

  /**
   * Exchange a one-time authorization/grant code for permanent refresh_token and access_token
   * @param {string} code - Temporary authorization code from Zoho Developer Console (Self Client)
   */
  async exchangeAuthCode(code) {
    const rawCode = (code || this.getAuthCode() || this.getRefreshToken() || '').trim();
    if (!rawCode) {
      throw new Error('No authorization code provided for initial setup exchange.');
    }

    const accountsUrl = this.getAccountsUrl();
    const tokenUrl = `${accountsUrl}/oauth/v2/token`;

    const bodyParams = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.getClientId(),
      client_secret: this.getClientSecret(),
      code: rawCode
    });

    if (process.env.ZOHO_CRM_REDIRECT_URI) {
      bodyParams.append('redirect_uri', process.env.ZOHO_CRM_REDIRECT_URI.trim());
    }

    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: bodyParams.toString()
    });

    const data = await res.json();

    if (data.error) {
      const err = new Error(`Zoho Authorization Code Exchange Error: ${data.error}`);
      err.code = 'ZOHO_AUTH_CODE_ERROR';
      err.details = data;
      throw err;
    }

    if (!data.access_token) {
      throw new Error('Zoho response did not contain access_token');
    }

    const now = Date.now();
    this.tokenCache = {
      accessToken: data.access_token,
      expiresAt: now + ((data.expires_in || 3600) * 1000),
      scope: data.scope ? data.scope.split(',') : []
    };

    // If a permanent refresh token was returned, persist it
    if (data.refresh_token) {
      process.env.ZOHO_CRM_REFRESH_TOKEN = data.refresh_token;
      this.persistRefreshTokenToEnv(data.refresh_token);
      console.log('[Zoho OAuth] Permanent refresh_token acquired and persisted successfully.');
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in
    };
  }

  /**
   * Persist newly acquired refresh token to .env file
   */
  persistRefreshTokenToEnv(refreshToken) {
    try {
      const envPath = path.resolve(process.cwd(), '.env');
      if (fs.existsSync(envPath)) {
        let envContent = fs.readFileSync(envPath, 'utf8');
        if (envContent.includes('ZOHO_CRM_REFRESH_TOKEN=')) {
          envContent = envContent.replace(
            /ZOHO_CRM_REFRESH_TOKEN=.*/,
            `ZOHO_CRM_REFRESH_TOKEN=${refreshToken}`
          );
        } else {
          envContent += `\nZOHO_CRM_REFRESH_TOKEN=${refreshToken}`;
        }
        // Clear temporary code if present
        if (envContent.includes('ZOHO_CRM_CODE=')) {
          envContent = envContent.replace(/ZOHO_CRM_CODE=.*/, 'ZOHO_CRM_CODE=');
        }
        fs.writeFileSync(envPath, envContent, 'utf8');
      }
    } catch (e) {
      console.warn('[Zoho OAuth] Could not write refresh token to .env:', e.message);
    }
  }

  /**
   * Get valid access token (using cache or refreshing via refresh_token)
   * @param {boolean} forceRefresh - If true, ignore cache and request a fresh token
   */
  async getAccessToken(forceRefresh = false) {
    if (!this.isConfigured()) {
      const err = new Error('Zoho CRM credentials are not configured in environment variables.');
      err.code = 'ZOHO_CREDENTIALS_MISSING';
      throw err;
    }

    const now = Date.now();
    // 1. Use cached token if valid for at least 60 more seconds
    if (!forceRefresh && this.tokenCache.accessToken && this.tokenCache.expiresAt > (now + 60000)) {
      return this.tokenCache.accessToken;
    }

    const clientId = this.getClientId();
    const clientSecret = this.getClientSecret();
    const refreshToken = this.getRefreshToken();
    const accountsUrl = this.getAccountsUrl();

    // 2. If refresh token is available, use standard refresh_token grant
    if (refreshToken) {
      const tokenUrl = `${accountsUrl}/oauth/v2/token`;
      const bodyParams = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken
      });

      try {
        const res = await fetch(tokenUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: bodyParams.toString()
        });

        const data = await res.json();

        if (data.error) {
          // If refresh token failed with invalid_code and a grant code is available, try one-time exchange
          if (data.error === 'invalid_code' && this.getAuthCode()) {
            console.log('[Zoho OAuth] Stored token rejected. Attempting one-time exchange with ZOHO_CRM_CODE...');
            const exchangeResult = await this.exchangeAuthCode();
            return exchangeResult.accessToken;
          }

          const err = new Error(`Zoho OAuth Refresh Error: ${data.error}`);
          err.code = 'ZOHO_OAUTH_FAILED';
          err.details = data;
          err.httpStatus = res.status;
          throw err;
        }

        if (!data.access_token) {
          throw new Error('Zoho OAuth response did not contain access_token');
        }

        this.tokenCache = {
          accessToken: data.access_token,
          expiresAt: now + ((data.expires_in || 3600) * 1000),
          scope: data.scope ? data.scope.split(',') : []
        };

        return this.tokenCache.accessToken;
      } catch (err) {
        this.tokenCache.accessToken = null;
        this.tokenCache.expiresAt = 0;
        throw err;
      }
    }

    // 3. If only temporary authorization code is available, perform one-time initial exchange
    if (this.getAuthCode()) {
      const exchangeResult = await this.exchangeAuthCode();
      return exchangeResult.accessToken;
    }

    throw new Error('No refresh token or authorization code available.');
  }

  /**
   * Execute an authenticated request with automatic retry on token expiry (401)
   * @param {string} url - Target URL
   * @param {object} options - Fetch options
   */
  async authenticatedFetch(url, options = {}) {
    const token = await this.getAccessToken();

    const headers = {
      ...(options.headers || {}),
      'Authorization': `Zoho-oauthtoken ${token}`
    };

    let response = await fetch(url, { ...options, headers });

    // If 401 Unauthorized, refresh token once and retry automatically
    if (response.status === 401) {
      console.warn('[Zoho OAuth] Received 401. Automatically refreshing access token and retrying request...');
      const freshToken = await this.getAccessToken(true);
      headers['Authorization'] = `Zoho-oauthtoken ${freshToken}`;
      response = await fetch(url, { ...options, headers });
    }

    return response;
  }
}

const zohoOAuth = new ZohoOAuth();
module.exports = zohoOAuth;
