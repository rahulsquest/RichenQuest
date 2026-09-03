/**
 * Payments — real Zoho Books, never fabricated financial state.
 *
 * THREE RULES THIS FILE ENFORCES
 *   1. The browser is never trusted for money. Amount, currency, tax and
 *      discount come from functions/shared/pricing.js on the server. Any such
 *      field in the request body is ignored, not merely validated.
 *   2. An invoice existing is not a payment. Status is read from the live Books
 *      invoice and mapped to an explicit state; nothing is inferred optimistically.
 *   3. Invoice creation is idempotent, anchored on the invoice id stored against
 *      the student's CRM record — not on an in-memory table, which would forget
 *      every restart and double-invoice a family after a browser refresh.
 */
const { sendSuccess, sendError } = require('../shared/response');
const session = require('../shared/session');
const pricing = require('../shared/pricing');
const zohoBooks = require('../shared/zoho/books');
const CatalystDataStore = require('../shared/dataStore');
const usersTable = CatalystDataStore.getTable('Users');

/* The lifecycle the product recognises. Anything Books reports that is not
 * mapped here is surfaced as UNKNOWN rather than guessed into a good state. */
const STATE = {
  NOT_INVOICED: 'NOT_INVOICED', INVOICE_DRAFT: 'INVOICE_DRAFT',
  INVOICE_SENT: 'INVOICE_SENT', PARTIALLY_PAID: 'PARTIALLY_PAID',
  PAID: 'PAID', OVERDUE: 'OVERDUE', CANCELLED: 'CANCELLED', UNKNOWN: 'UNKNOWN'
};

/* Books status -> our state. Deliberately explicit: "sent" is NOT "paid", and
 * "viewed" only means the customer opened it. */
function mapBooksStatus(s) {
  switch (String(s || '').toLowerCase()) {
    case 'draft':          return STATE.INVOICE_DRAFT;
    case 'sent':
    case 'viewed':
    case 'unpaid':         return STATE.INVOICE_SENT;
    case 'partially_paid': return STATE.PARTIALLY_PAID;
    case 'paid':           return STATE.PAID;
    case 'overdue':        return STATE.OVERDUE;
    case 'void':
    case 'cancelled':      return STATE.CANCELLED;
    default:               return STATE.UNKNOWN;
  }
}

/* Identity comes from the signed session only. No caller-supplied studentId is
 * read anywhere in this file. */
function identify(req) {
  const s = session.fromRequest(req);
  if (!s) return null;
  const users = CatalystDataStore.getTable('Users');
  const user = users.findOne(u => u.userId === s.userId ||
    (u.email || '').toLowerCase() === (s.email || '').toLowerCase());
  return user ? { user, leadId: user.leadId || null } : null;
}

function fail(res, e) {
  const cid = Math.random().toString(36).slice(2, 8);
  console.error(`[payments:${cid}]`, e && (e.code || e.name), e && e.message);
  return sendError(res, 'SERVICE_ERROR',
    'We could not load your billing information right now. Please try again.', 502);
}

module.exports = async function handlePayments(req, res) {
  const path = (req.url || '/').split('?')[0].replace(/\/+$/, '') || '/';
  const method = req.method;

  const me = identify(req);
  if (!me) return sendError(res, 'UNAUTHORIZED', 'Please sign in to continue.', 401);

  try {
    /* GET /  — this student's invoices, real Books state only. */
    if (method === 'GET' && (path === '/' || path === '/payments')) {
      const email = me.user.email;
      const result = await zohoBooks.getInvoices(email).catch(() => null);

      if (!result || !result.configured) {
        return sendSuccess(res, {
          configured: false, status: STATE.NOT_INVOICED, invoices: [],
          note: 'Billing is not configured yet. No invoice exists for this account.'
        });
      }
      const invoices = (result.invoices || []).map(inv => ({
        invoiceId: inv.zohoBooksInvoiceId || inv.paymentId,
        invoiceNumber: inv.invoiceNumber,
        date: inv.date, dueDate: inv.dueDate,
        currency: inv.currency || pricing.CURRENCY,
        amount: inv.total, paidAmount: inv.paidAmount,
        outstanding: inv.balance,
        status: mapBooksStatus(inv.status)
      }));
      return sendSuccess(res, {
        configured: true,
        status: invoices.length ? invoices[0].status : STATE.NOT_INVOICED,
        invoices
      });
    }

    /* GET /services — what may be invoiced. UNSET prices are reported as such. */
    if (method === 'GET' && path === '/services') {
      return sendSuccess(res, { currency: pricing.CURRENCY, services: pricing.listServices() });
    }

    /* POST /invoice — refuses while price is UNSET. Amount/currency/discount in
     * the body are ignored entirely; they are never read. */
    if (method === 'POST' && path === '/invoice') {
      const { service_code } = req.body || {};
      const svc = pricing.getService(service_code);
      if (!svc) return sendError(res, 'UNKNOWN_SERVICE', 'That service is not recognised.', 400);

      if (!pricing.isPriceSet(service_code)) {
        return sendError(res, 'PRICE_NOT_CONFIGURED',
          'This service cannot be invoiced yet because its price has not been published.',
          409, { service: service_code, price: null });
      }
      if (!me.leadId) {
        return sendError(res, 'PROFILE_NOT_LINKED',
          'Your account is not yet linked to a student file.', 409);
      }
      /* Idempotency: an invoice id already recorded against this student and
       * service means the invoice exists. Return it rather than creating a
       * second one — a refresh or double-click must never bill twice. This
       * check, and the write after creation below, both go through the same
       * persisted field on the Users record — not a separate in-memory
       * table that would forget it on restart. */
      const existing = (me.user.invoices || {})[service_code];
      if (existing) {
        return sendSuccess(res, { idempotent: true, invoiceId: existing,
          note: 'An invoice already exists for this service.' });
      }

      /*  A failed invoice attempt is recorded too.
       *
       *  The IntegrationEvent below was written only after success, so an
       *  invoice that failed to create left no durable trace at all — the
       *  student saw an error and nobody could later find out that Books had
       *  rejected it, or why. Money-adjacent failures are the last place that
       *  should be true. */
      let contactId, created;
      try {
        contactId = await zohoBooks.findOrCreateContact(me.user.email, me.user.fullName);
        created = await zohoBooks.createInvoice({
          contactId,
          itemName: svc.name,
          rate: svc.price,
          referenceNumber: `${me.user.userId}:${service_code}`
        });
      } catch (e) {
        CatalystDataStore.getTable('IntegrationEvents').insert({
          event: 'BOOKS_INVOICE_ERROR',
          eventTimestamp: new Date().toISOString(),
          direction: 'OUTBOUND_FAILED',
          userId: me.user.userId,
          service: service_code
        });
        throw e;
      }

      usersTable.update(u => u.userId === me.user.userId, {
        invoices: { ...(me.user.invoices || {}), [service_code]: created.invoiceId }
      });
      CatalystDataStore.getTable('IntegrationEvents').insert({
        event: 'BOOKS_INVOICE_CREATED', userId: me.user.userId,
        service: service_code, invoiceId: created.invoiceId
      });

      return sendSuccess(res, {
        idempotent: false, invoiceId: created.invoiceId,
        invoiceNumber: created.invoiceNumber, status: mapBooksStatus(created.status),
        amount: created.total, currency: created.currency
      }, 'Invoice created.', 201);
    }

    return sendError(res, 'NOT_FOUND', 'That resource does not exist.', 404);
  } catch (e) {
    return fail(res, e);
  }
};
