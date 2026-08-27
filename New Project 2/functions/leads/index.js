/**
 * Zoho Catalyst Function: Leads
 * Handles student inquiry submissions, validation, Zoho CRM Lead creation/update, and Zoho Flow trigger.
 */

const CatalystDataStore = require('../shared/dataStore');
const { sendSuccess, sendError } = require('../shared/response');
const ZohoClient = require('../shared/zohoClient');

const leadsTable = CatalystDataStore.getTable('Leads');

async function handleLeads(req, res) {
  const method = req.method;
  const path = req.path || '';

  // POST /api/leads
  if (method === 'POST') {
    const { name, email, phone, country, university, program, studyInterest, message, source = 'Website Inquiry Form' } = req.body || {};

    if (!name || !email) {
      return sendError(res, 'VALIDATION_ERROR', 'Name and Email are mandatory for submitting an inquiry.', 400);
    }

    const normalizedEmail = email.toLowerCase().trim();
    const leadId = `LEAD_RQ_${new Date().getFullYear()}_${Math.floor(1000 + Math.random() * 9000)}`;

    const newLead = leadsTable.insert({
      leadId,
      name: name.trim(),
      email: normalizedEmail,
      phone: phone ? phone.trim() : '',
      country: country || '',
      university: university || '',
      program: program || '',
      studyInterest: studyInterest || 'General Study Abroad',
      message: message || '',
      source,
      status: 'NEW_LEAD',
      createdAt: new Date().toISOString()
    });

    // 1. Sync to Zoho CRM Leads Module (with duplicate email search)
    const crmSyncResult = await ZohoClient.syncLeadToCrm(newLead);
    if (crmSyncResult?.crmLeadId) {
      leadsTable.update(l => l.leadId === leadId, {
        zohoCrmLeadId: crmSyncResult.crmLeadId,
        zohoCrmStatus: crmSyncResult.status
      });
    }

    // 2. Trigger Zoho Flow Automation Webhook
    const flowResult = await ZohoClient.emitFlowEvent('LEAD_CREATED', {
      leadId,
      name: name.trim(),
      email: normalizedEmail,
      phone: phone ? phone.trim() : '',
      country,
      university,
      program,
      studyInterest,
      message,
      source,
      zohoCrmLeadId: crmSyncResult?.crmLeadId || null
    });

    return sendSuccess(res, {
      lead: {
        leadId,
        name: name.trim(),
        email: normalizedEmail,
        phone: phone ? phone.trim() : '',
        country,
        program,
        status: 'NEW_LEAD'
      },
      zohoSync: {
        crm: crmSyncResult,
        flow: flowResult
      }
    }, 'Your study abroad inquiry has been submitted successfully. A RichenQuest counselor will review your profile shortly.', 201);
  }

  /*  GET is staff-only. POST above is the PUBLIC website contact form and must
   *  stay open, but the listing below calls leadsTable.find() with no filter,
   *  so any authenticated caller — not just staff — could previously read
   *  every lead's name/email/phone/message. Every session issued today has
   *  role 'student' (see auth/index.js); this checks role rather than just
   *  presence of a session, so it stays correct once a staff role exists. */
  if (method === 'GET') {
    const sess = require('../shared/session').fromRequest(req);
    if (!sess) {
      return sendError(res, 'UNAUTHORIZED', 'Please sign in to continue.', 401);
    }
    if (sess.role !== 'staff') {
      return sendError(res, 'FORBIDDEN', 'You do not have permission to view this.', 403);
    }
    const leadId = req.params?.id || path.replace('/', '');
    if (!leadId) {
      return sendSuccess(res, leadsTable.find(), 'Leads retrieved.');
    }
    const lead = leadsTable.findOne(l => l.leadId === leadId);
    if (!lead) {
      return sendError(res, 'NOT_FOUND', 'Lead not found.', 404);
    }
    return sendSuccess(res, lead, 'Lead retrieved successfully.');
  }

  return sendError(res, 'METHOD_NOT_ALLOWED', 'Method not allowed.', 405);
}

module.exports = handleLeads;
