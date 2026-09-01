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
    this.apiDomain = process.env.ZOHO_CRM_API_DOMAIN || 'https://www.zohoapis.in';
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

  /*  Lead_Source and Lead_Source_Detail are PICKLISTS. Zoho accepts a value
   *  outside the list without error and then never matches it in a filter, so
   *  a wrong value here is silent corruption, not a visible failure.
   *
   *  Confirmed against the live org 2026-09-01: Lead_Source admits only the
   *  standard set (Web Download, External Referral, Advertisement, ...). This
   *  code was sending free text — "Website Inquiry Form", "Website Study
   *  Abroad Inquiry Form", "Contact Page Direct Message" — none of which are
   *  members. Every lead created through this path carried an unfilterable
   *  Lead_Source, and Lead_Source_Detail was never written at all, so channel
   *  attribution was lost.
   *
   *  parseInquiry.dg already does this correctly; these maps mirror it so the
   *  two ingestion paths agree. The caller's descriptive string is preserved
   *  verbatim in Description, so nothing is lost by normalising here. */
  static leadSourceFor(rawSource) {
    const MAP = {
      'Website Inquiry Form':            { Lead_Source: 'Web Download',      Lead_Source_Detail: 'Website Form' },
      'Website Study Abroad Inquiry Form': { Lead_Source: 'Web Download',    Lead_Source_Detail: 'Website Form' },
      'Contact Page Direct Message':     { Lead_Source: 'Web Download',      Lead_Source_Detail: 'Website Form' },
      'Referral':                        { Lead_Source: 'External Referral', Lead_Source_Detail: 'Referral' },
      'WhatsApp':                        { Lead_Source: 'Chat',              Lead_Source_Detail: 'WhatsApp' }
    };
    return MAP[rawSource] || { Lead_Source: 'Web Download', Lead_Source_Detail: 'Website Form' };
  }

  /*  Country is also a picklist — 248 standard names. TARGET_COUNTRIES in the
   *  frontend is a study-destination list, not a country list, and one entry
   *  ("Dubai (UAE)") is not a country name Zoho recognises. An empty string is
   *  not a valid member either, so the field is omitted rather than blanked. */
  static countryFor(rawCountry) {
    const ALIASES = { 'Dubai (UAE)': 'United Arab Emirates' };
    const v = (rawCountry || '').trim();
    if (!v) return null;
    return ALIASES[v] || v;
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

      const src = ZohoCrmService.leadSourceFor(lead.source);
      const country = ZohoCrmService.countryFor(lead.country);

      const payload = {
        data: [
          {
            Last_Name: lead.name || 'Student Lead',
            Email: lead.email,
            Phone: lead.phone || '',
            Lead_Source: src.Lead_Source,
            Lead_Source_Detail: src.Lead_Source_Detail,
            /* The caller's own wording is kept here so normalising the
             * picklists above loses no information. */
            Description: `Study Interest: ${lead.studyInterest || 'General Study Abroad'} | Target University: ${lead.university || 'N/A'} | Program: ${lead.program || 'N/A'} | Submitted via: ${lead.source || 'Website Inquiry Form'} | Message: ${lead.message || ''}`,
            ...(country ? { Country: country } : {}),
            /*  Consent into the real Leads consent fields — structured and
             *  filterable, never Description. Passed through from the lead
             *  record, which got them from consent.recordFor('Leads') with a
             *  server-generated timestamp. Absent entirely while the consent
             *  gate is off, so no empty values are written. */
            ...(lead.Consent_Given ? {
              Consent_Given: true,
              Consent_Timestamp: lead.Consent_Timestamp,
              Consent_Policy_Version: lead.Consent_Policy_Version
            } : {}),
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
            /* Present only once shared/consent.js is activated and consent was
             * actually given — see auth/index.js. Absent today, so this line
             * writes nothing. */
            ...(student.Consent_Given_On ? {
              Consent_Given_On: student.Consent_Given_On,
              Consent_Version: student.Consent_Version
            } : {}),
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
