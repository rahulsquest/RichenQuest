/**
 * Zoho Books Service
 * Handles server-side integration with Zoho Books API.
 * 
 * Rules:
 * 1. Queries real invoices for student customer/contact.
 * 2. Defaults currency to INR using standard formatting.
 * 3. Never returns fake invoice records if Books API is unconfigured or unavailable.
 */

const zohoOAuth = require('./oauth');

class ZohoBooksService {
  constructor() {
    this.apiDomain = process.env.ZOHO_BOOKS_API_DOMAIN || 'https://www.zohoapis.in/books/v3';
  }

  isConfigured() {
    return Boolean(
      process.env.ZOHO_BOOKS_ORG_ID &&
      (process.env.ZOHO_BOOKS_AUTH_TOKEN || zohoOAuth.isConfigured())
    );
  }

  getOrgId() {
    return process.env.ZOHO_BOOKS_ORG_ID;
  }

  /**
   * Fetch invoices from Zoho Books for a student customer or organization
   * @param {string} customerEmail - Student email to filter invoices
   */
  async getInvoices(customerEmail) {
    if (!this.isConfigured()) {
      return {
        configured: false,
        invoices: [],
        summary: { totalInvoiced: 0, totalPaid: 0, totalPending: 0, currency: 'INR' },
        message: 'Zoho Books credentials not configured in environment.'
      };
    }

    const orgId = this.getOrgId();
    let url = `${this.apiDomain}/invoices?organization_id=${orgId}`;
    if (customerEmail) {
      url += `&email=${encodeURIComponent(customerEmail)}`;
    }

    try {
      let res;
      if (process.env.ZOHO_BOOKS_AUTH_TOKEN) {
        // Authtoken based (older Books config)
        res = await fetch(url, {
          headers: { 'Authorization': `Zoho-authtoken ${process.env.ZOHO_BOOKS_AUTH_TOKEN}` }
        });
      } else {
        // OAuth 2.0 based
        res = await zohoOAuth.authenticatedFetch(url);
      }

      if (!res.ok) {
        throw new Error(`Zoho Books returned HTTP ${res.status}`);
      }

      const data = await res.json();
      const rawInvoices = data?.invoices || [];

      const formattedInvoices = rawInvoices.map(inv => ({
        paymentId: inv.invoice_id,
        invoiceNumber: inv.invoice_number,
        studentId: inv.customer_id,
        description: inv.description || inv.reference_number || 'Admissions & Consulting Fees',
        amount: inv.total || 0,
        currency: inv.currency_code || 'INR',
        status: inv.status === 'paid' ? 'PAID' : (inv.status === 'overdue' ? 'OVERDUE' : 'PENDING'),
        paymentDate: inv.paid_date || null,
        dueDate: inv.due_date || null,
        paymentMethod: inv.payment_made ? 'Online Payment via Gateway' : 'Pending Payment',
        receiptUrl: inv.invoice_url || null,
        zohoBooksInvoiceId: inv.invoice_id
      }));

      const totalInvoiced = formattedInvoices.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
      const totalPaid = formattedInvoices.filter(i => i.status === 'PAID').reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
      const totalPending = totalInvoiced - totalPaid;

      return {
        configured: true,
        invoices: formattedInvoices,
        summary: {
          totalInvoiced,
          totalPaid,
          totalPending,
          currency: formattedInvoices[0]?.currency || 'INR'
        }
      };
    } catch (err) {
      console.error('[Zoho Books] getInvoices error:', err.message);
      return {
        configured: true,
        error: 'Financial records are temporarily unavailable.',
        invoices: [],
        summary: { totalInvoiced: 0, totalPaid: 0, totalPending: 0, currency: 'INR' }
      };
    }
  }

  async _request(path, options = {}) {
    const url = `${this.apiDomain}${path}${path.includes('?') ? '&' : '?'}organization_id=${this.getOrgId()}`;
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (process.env.ZOHO_BOOKS_AUTH_TOKEN) {
      headers['Authorization'] = `Zoho-authtoken ${process.env.ZOHO_BOOKS_AUTH_TOKEN}`;
      return fetch(url, { ...options, headers });
    }
    return zohoOAuth.authenticatedFetch(url, { ...options, headers });
  }

  /**
   * Finds the Books contact for a student by email, creating one only if
   * none exists. Never creates a duplicate — always searches first.
   */
  async findOrCreateContact(email, fullName) {
    if (!this.isConfigured()) throw new Error('Zoho Books is not configured on this server');

    const found = await this._request(`/contacts?email=${encodeURIComponent(email)}`);
    if (!found.ok) throw new Error(`Zoho Books contact lookup returned HTTP ${found.status}`);
    const foundData = await found.json();
    const existing = (foundData?.contacts || [])[0];
    if (existing) return existing.contact_id;

    const created = await this._request('/contacts', {
      method: 'POST',
      body: JSON.stringify({ contact_name: fullName || email, contact_type: 'customer',
        contact_persons: [{ email, is_primary_contact: true }] })
    });
    if (!created.ok) throw new Error(`Zoho Books contact creation returned HTTP ${created.status}`);
    const createdData = await created.json();
    if (!createdData?.contact?.contact_id) throw new Error('Zoho Books did not return a contact_id');
    return createdData.contact.contact_id;
  }

  /**
   * Creates a real invoice for one line item. Caller is the only source of
   * amount — this method takes a rate, never trusts anything from a browser.
   * referenceNumber should be a stable, idempotency-relevant value (e.g. the
   * service code) so the same fee is never invoiced twice for one student.
   */
  async createInvoice({ contactId, itemName, rate, referenceNumber }) {
    if (!this.isConfigured()) throw new Error('Zoho Books is not configured on this server');
    if (!(Number(rate) > 0)) throw new Error('Invoice rate must be a positive number');

    const res = await this._request('/invoices', {
      method: 'POST',
      body: JSON.stringify({
        customer_id: contactId,
        reference_number: referenceNumber,
        line_items: [{ name: itemName, rate: Number(rate), quantity: 1 }]
      })
    });
    if (!res.ok) throw new Error(`Zoho Books invoice creation returned HTTP ${res.status}`);
    const data = await res.json();
    if (!data?.invoice?.invoice_id) throw new Error('Zoho Books did not return an invoice_id');
    return {
      invoiceId: data.invoice.invoice_id,
      invoiceNumber: data.invoice.invoice_number,
      status: data.invoice.status,
      total: data.invoice.total,
      currency: data.invoice.currency_code
    };
  }
}

const zohoBooks = new ZohoBooksService();
module.exports = zohoBooks;
