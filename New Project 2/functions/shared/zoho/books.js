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
    this.apiDomain = process.env.ZOHO_BOOKS_API_DOMAIN || 'https://www.zohoapis.com/books/v3';
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
}

const zohoBooks = new ZohoBooksService();
module.exports = zohoBooks;
