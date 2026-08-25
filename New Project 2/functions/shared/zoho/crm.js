/**
 * Zoho CRM Service
 * Handles server-side synchronization with Zoho CRM Leads and Contacts modules.
 * 
 * Rules:
 * 1. Checks for existing records by email to avoid duplicate records.
 * 2. Creates or updates Leads & Contacts with real mappings.
 * 3. Never returns fake record IDs if unconfigured or failed.
 */

const zohoOAuth = require('./oauth');

class ZohoCrmService {
  constructor() {
    this.apiDomain = process.env.ZOHO_CRM_API_DOMAIN || 'https://www.zohoapis.com';
  }

  isConfigured() {
    return zohoOAuth.isConfigured();
  }

  /**
   * Search for an existing lead by email in Zoho CRM
   * @param {string} email - Student email
   */
  async searchLeadByEmail(email) {
    if (!this.isConfigured()) return null;

    const url = `${this.apiDomain}/crm/v3/Leads/search?email=${encodeURIComponent(email)}`;
    try {
      const res = await zohoOAuth.authenticatedFetch(url, { method: 'GET' });
      if (res.status === 204) return null; // No Content / Not Found
      if (!res.ok) {
        throw new Error(`Zoho CRM Lead search failed with status ${res.status}`);
      }
      const data = await res.json();
      return data?.data?.[0] || null;
    } catch (err) {
      console.error('[Zoho CRM] searchLeadByEmail error:', err.message);
      throw err;
    }
  }

  /**
   * Search for an existing contact by email in Zoho CRM
   * @param {string} email - Student email
   */
  async searchContactByEmail(email) {
    if (!this.isConfigured()) return null;

    const url = `${this.apiDomain}/crm/v3/Contacts/search?email=${encodeURIComponent(email)}`;
    try {
      const res = await zohoOAuth.authenticatedFetch(url, { method: 'GET' });
      if (res.status === 204) return null;
      if (!res.ok) {
        throw new Error(`Zoho CRM Contact search failed with status ${res.status}`);
      }
      const data = await res.json();
      return data?.data?.[0] || null;
    } catch (err) {
      console.error('[Zoho CRM] searchContactByEmail error:', err.message);
      throw err;
    }
  }

  /**
   * Create or update a Lead in Zoho CRM
   * Avoids duplicates by searching email first.
   * @param {object} lead - Lead submission data
   */
  async upsertLead(lead) {
    if (!this.isConfigured()) {
      return {
        status: 'UNCONFIGURED',
        message: 'Zoho CRM credentials not configured. Stored in Catalyst Data Store only.'
      };
    }

    try {
      const existing = await this.searchLeadByEmail(lead.email);

      const payload = {
        data: [
          {
            Last_Name: lead.name || 'Student Lead',
            Email: lead.email,
            Phone: lead.phone || '',
            Lead_Source: lead.source || 'Website Inquiry Form',
            Description: `Study Interest: ${lead.studyInterest || 'General Study Abroad'} | Target University: ${lead.university || 'N/A'} | Program: ${lead.program || 'N/A'} | Message: ${lead.message || ''}`,
            Country: lead.country || '',
            ...(existing ? { id: existing.id } : {})
          }
        ]
      };

      const endpoint = `${this.apiDomain}/crm/v3/Leads`;
      const method = existing ? 'PUT' : 'POST';

      const res = await zohoOAuth.authenticatedFetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`Zoho CRM Lead upsert failed: ${res.status} - ${errBody}`);
      }

      const result = await res.json();
      const crmRecord = result?.data?.[0];

      return {
        status: 'SYNCED',
        action: existing ? 'UPDATED' : 'CREATED',
        crmLeadId: crmRecord?.details?.id || existing?.id,
        code: crmRecord?.code
      };
    } catch (err) {
      console.error('[Zoho CRM] upsertLead error:', err.message);
      return {
        status: 'SYNC_ERROR',
        error: 'CRM service is temporarily unavailable.'
      };
    }
  }

  /**
   * Create or update a Contact in Zoho CRM when student registers
   * @param {object} student - Registered student profile
   */
  async upsertContact(student) {
    if (!this.isConfigured()) {
      return {
        status: 'UNCONFIGURED',
        message: 'Zoho CRM credentials not configured.'
      };
    }

    try {
      const existing = await this.searchContactByEmail(student.email);

      const nameParts = (student.fullName || 'Student').trim().split(' ');
      const firstName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : '';
      const lastName = nameParts.slice(-1)[0] || 'Student';

      const payload = {
        data: [
          {
            First_Name: firstName,
            Last_Name: lastName,
            Email: student.email,
            Phone: student.phone || '',
            Mailing_Country: student.countryOfCitizenship || student.currentLocation || '',
            Description: `Student ID: ${student.studentId} | Target Degree: ${student.targetDegree || 'N/A'} | Target Countries: ${(student.targetCountries || []).join(', ')}`,
            ...(existing ? { id: existing.id } : {})
          }
        ]
      };

      const endpoint = `${this.apiDomain}/crm/v3/Contacts`;
      const method = existing ? 'PUT' : 'POST';

      const res = await zohoOAuth.authenticatedFetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`Zoho CRM Contact upsert failed: ${res.status} - ${errBody}`);
      }

      const result = await res.json();
      const crmRecord = result?.data?.[0];

      return {
        status: 'SYNCED',
        action: existing ? 'UPDATED' : 'CREATED',
        crmContactId: crmRecord?.details?.id || existing?.id
      };
    } catch (err) {
      console.error('[Zoho CRM] upsertContact error:', err.message);
      return {
        status: 'SYNC_ERROR',
        error: 'CRM service is temporarily unavailable.'
      };
    }
  }
}

const zohoCrm = new ZohoCrmService();
module.exports = zohoCrm;
