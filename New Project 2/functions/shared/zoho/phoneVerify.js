/**
 * Phone Verification Provider Abstraction
 * 
 * DESIGN PRINCIPLE:
 * Since Zoho does not provide a native turnkey client-facing SMS OTP verification service,
 * this provider defines a strict, pluggable interface for SMS providers (e.g. Twilio,
 * Sinch, AWS SNS, or Zoho SMS partner gateway).
 * 
 * RULES:
 * 1. Never fakes OTP generation or verification (no '123456', no hardcoded codes).
 * 2. Remains isolated from core Catalyst email/password authentication.
 * 3. Clearly reports 'PROVIDER_NOT_CONFIGURED' if external SMS credentials are missing.
 */

class PhoneVerificationProvider {
  constructor() {
    this.providerName = process.env.SMS_PROVIDER_NAME || null; // 'twilio' | 'custom_gateway'
  }

  isConfigured() {
    if (this.providerName === 'twilio') {
      return Boolean(
        process.env.TWILIO_ACCOUNT_SID &&
        process.env.TWILIO_AUTH_TOKEN &&
        process.env.TWILIO_VERIFY_SERVICE_SID
      );
    }
    return false;
  }

  getProviderStatus() {
    return {
      provider: this.providerName,
      configured: this.isConfigured(),
      status: this.isConfigured() ? 'READY' : 'CONFIGURATION_REQUIRED',
      requiredEnvironmentVariables: [
        'SMS_PROVIDER_NAME',
        'TWILIO_ACCOUNT_SID',
        'TWILIO_AUTH_TOKEN',
        'TWILIO_VERIFY_SERVICE_SID'
      ],
      note: 'Zoho Catalyst requires an approved external SMS/OTP provider (e.g., Twilio Verify API) for phone verification.'
    };
  }

  /**
   * Request phone verification OTP
   * @param {string} phoneNumber - Full E.164 phone number
   */
  async sendOtp(phoneNumber) {
    if (!this.isConfigured()) {
      return {
        success: false,
        status: 'PROVIDER_NOT_CONFIGURED',
        error: {
          code: 'SMS_PROVIDER_UNCONFIGURED',
          message: 'Phone verification is currently unavailable because an external SMS provider has not been configured in the environment.'
        }
      };
    }

    // In production with Twilio Verify configured:
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

      const url = `https://verify.twilio.com/v2/Services/${serviceSid}/Verifications`;
      const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

      const body = new URLSearchParams({ To: phoneNumber, Channel: 'sms' });

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || `Twilio Verify error ${res.status}`);
      }

      return {
        success: true,
        status: 'PENDING_VERIFICATION',
        to: data.to
      };
    } catch (err) {
      console.error('[PhoneVerificationProvider] sendOtp error:', err.message);
      return {
        success: false,
        status: 'SEND_FAILED',
        error: { code: 'OTP_SEND_FAILED', message: err.message }
      };
    }
  }

  /**
   * Verify received OTP code
   * @param {string} phoneNumber - Full E.164 phone number
   * @param {string} code - User input OTP
   */
  async verifyOtp(phoneNumber, code) {
    if (!this.isConfigured()) {
      return {
        success: false,
        status: 'PROVIDER_NOT_CONFIGURED',
        error: {
          code: 'SMS_PROVIDER_UNCONFIGURED',
          message: 'Phone verification is currently unavailable because an external SMS provider has not been configured in the environment.'
        }
      };
    }

    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

      const url = `https://verify.twilio.com/v2/Services/${serviceSid}/VerificationCheck`;
      const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

      const body = new URLSearchParams({ To: phoneNumber, Code: code });

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || `Twilio VerificationCheck error ${res.status}`);
      }

      if (data.status === 'approved') {
        return { success: true, status: 'VERIFIED' };
      }

      return {
        success: false,
        status: 'INVALID_CODE',
        error: { code: 'INVALID_OTP', message: 'The verification code entered is invalid or expired.' }
      };
    } catch (err) {
      console.error('[PhoneVerificationProvider] verifyOtp error:', err.message);
      return {
        success: false,
        status: 'VERIFICATION_FAILED',
        error: { code: 'VERIFICATION_ERROR', message: err.message }
      };
    }
  }
}

const phoneVerificationProvider = new PhoneVerificationProvider();
module.exports = phoneVerificationProvider;
