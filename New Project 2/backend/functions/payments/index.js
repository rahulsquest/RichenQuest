/**
 * Zoho Catalyst Function: Payments
 * Handles student invoices, payment receipts, and Zoho Books financial integration.
 */

const CatalystDataStore = require('../shared/dataStore');
const { sendSuccess, sendError } = require('../shared/response');
const ZohoClient = require('../shared/zohoClient');

const paymentsTable = CatalystDataStore.getTable('Payments');
const studentsTable = CatalystDataStore.getTable('Students');

async function handlePayments(req, res) {
  const method = req.method;

  // GET /api/payments
  if (method === 'GET') {
    const studentId = req.query?.studentId;
    let customerEmail = null;
    if (studentId) {
      const student = studentsTable.findOne(s => s.studentId === studentId);
      customerEmail = student?.email || null;
    }

    // 1. Check if Zoho Books is configured
    const booksResult = await ZohoClient.getBooksInvoices(customerEmail);

    if (booksResult.configured && booksResult.invoices?.length > 0) {
      return sendSuccess(res, {
        invoices: booksResult.invoices,
        summary: booksResult.summary,
        zohoBooksSync: { configured: true, status: 'CONNECTED' }
      }, 'Financial records retrieved from Zoho Books.');
    }

    // 2. Otherwise return local payments for student or clean empty summary
    const localList = studentId ? paymentsTable.find(p => p.studentId === studentId) : paymentsTable.find();

    const totalInvoiced = localList.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const totalPaid = localList.filter(item => item.status === 'PAID').reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const totalPending = totalInvoiced - totalPaid;

    return sendSuccess(res, {
      invoices: localList,
      summary: {
        totalInvoiced,
        totalPaid,
        totalPending,
        currency: 'INR'
      },
      zohoBooksSync: ZohoClient.getIntegrationStatus().zohoBooks,
      error: booksResult.error || null
    }, 'Invoices & financial records retrieved.');
  }

  return sendError(res, 'METHOD_NOT_ALLOWED', 'Method not allowed.', 405);
}

module.exports = handlePayments;
