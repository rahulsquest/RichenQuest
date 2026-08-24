/**
 * Zoho Flow Service
 * Dispatches real webhook events to configured Zoho Flow Webhook URLs.
 */

class ZohoFlowService {
  /**
   * Get configured webhook URL for an event category
   * @param {string} event - Event name
   */
  getWebhookUrl(event) {
    if (event.startsWith('LEAD') || event.startsWith('STUDENT')) {
      return process.env.ZOHO_FLOW_LEAD_WEBHOOK_URL;
    }
    if (event.startsWith('BOOKING')) {
      return process.env.ZOHO_FLOW_BOOKING_WEBHOOK_URL || process.env.ZOHO_FLOW_LEAD_WEBHOOK_URL;
    }
    if (event.startsWith('DOCUMENT')) {
      return process.env.ZOHO_FLOW_DOCUMENT_WEBHOOK_URL || process.env.ZOHO_FLOW_LEAD_WEBHOOK_URL;
    }
    if (event.startsWith('PAYMENT')) {
      return process.env.ZOHO_FLOW_PAYMENT_WEBHOOK_URL || process.env.ZOHO_FLOW_LEAD_WEBHOOK_URL;
    }
    return process.env.ZOHO_FLOW_LEAD_WEBHOOK_URL;
  }

  isConfigured(event = 'GENERIC') {
    return Boolean(this.getWebhookUrl(event));
  }

  /**
   * Emit standardized event to Zoho Flow
   * @param {string} event - Event name
   * @param {object} payload - Event data
   */
  async emitEvent(event, payload) {
    const webhookUrl = this.getWebhookUrl(event);
    const eventRecord = {
      eventId: 'EVT_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      event,
      timestamp: new Date().toISOString(),
      source: 'richenquest_catalyst_backend',
      version: '1.0',
      data: payload
    };

    if (!webhookUrl) {
      return {
        status: 'UNCONFIGURED',
        message: `Zoho Flow webhook URL not configured for ${event}.`,
        eventRecord
      };
    }

    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventRecord)
      });

      if (!res.ok) {
        throw new Error(`Zoho Flow webhook returned status ${res.status}`);
      }

      return {
        status: 'DISPATCHED',
        statusCode: res.status,
        eventRecord
      };
    } catch (err) {
      console.error(`[Zoho Flow Webhook] Failed to deliver ${event}:`, err.message);
      return {
        status: 'DISPATCH_FAILED',
        error: err.message,
        eventRecord
      };
    }
  }
}

const zohoFlow = new ZohoFlowService();
module.exports = zohoFlow;
