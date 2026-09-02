/**
 * Zoho Catalyst Function: Leads
 * Handles student inquiry submissions, validation, Zoho CRM Lead creation/update, and Zoho Flow trigger.
 */

const CatalystDataStore = require('../shared/dataStore');
const { sendSuccess, sendError } = require('../shared/response');
const ZohoClient = require('../shared/zohoClient');
const consent = require('../shared/consent');

const leadsTable = CatalystDataStore.getTable('Leads');

async function handleLeads(req, res) {
  const method = req.method;
  const path = req.path || '';

  // POST /api/leads
  if (method === 'POST') {
    const { name, email, phone, country, university, program, studyInterest, message, consentGiven, source = 'Website Inquiry Form' } = req.body || {};

    if (!name || !email) {
      return sendError(res, 'VALIDATION_ERROR', 'Name and Email are mandatory for submitting an inquiry.', 400);
    }

    /*  Reject a malformed address here rather than letting Zoho reject the
     *  record later. A CRM rejection is caught and logged, so the student
     *  would still be told the inquiry was received while nothing reached a
     *  counsellor — a silent loss. Failing at the door is honest and lets the
     *  student correct a typo. Deliberately a shape check, not an RFC 5322
     *  implementation: over-strict email regexes reject real addresses. */
    const emailStr = String(email).trim();
    if (emailStr.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr)) {
      return sendError(res, 'VALIDATION_ERROR', 'Please enter a valid email address.', 400);
    }

    /*  A student's enquiry is the record itself, not a log line, so it is
     *  refused rather than trimmed.
     *
     *  Catalyst `text` silently truncates above 10,000 characters — proven by
     *  write/read/SHA-256 test, see CATALYST_TEXT_SAFE_MAX in dataStore.js.
     *  The request body allows 64 KB and nothing clamped `message` before it
     *  was stored, so a long enquiry would have been cut in half with the
     *  student told it was received. Truncating quietly would be the same
     *  false success this route already refuses to give.
     *
     *  So: reject, say the actual limit and their actual length, and let them
     *  shorten it. Nothing is written. */
    const messageStr = message ? String(message) : '';
    if (messageStr.length > CatalystDataStore.TEXT_SAFE_MAX) {
      return sendError(res, 'MESSAGE_TOO_LONG',
        `Your message is ${messageStr.length} characters. Please shorten it to ` +
        `${CatalystDataStore.TEXT_SAFE_MAX} characters or fewer, or email the full details to support@richenquest.com.`,
        400);
    }

    /*  Server-side consent enforcement. The forms block submission too, but a
     *  checkbox is a courtesy, not a control — this is the one that actually
     *  stops a record being created. Refusing here means nothing downstream
     *  (local store, CRM sync, Flow event) ever sees an unconsented lead.
     *  Inert while consent.isReady() is false, which it is until advocate
     *  wording exists, so today's behaviour is unchanged. */
    if (consent.isReady() && !consentGiven) {
      return sendError(res, 'CONSENT_REQUIRED',
        'Please review and accept the consent statement to submit an inquiry.', 400);
    }

    const normalizedEmail = email.toLowerCase().trim();
    const leadId = `LEAD_RQ_${new Date().getFullYear()}_${Math.floor(1000 + Math.random() * 9000)}`;

    const { record: newLead, durable: locallyDurable } = await leadsTable.insertDurable({
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
      createdAt: new Date().toISOString(),
      /*  Consent recorded with a server-generated timestamp and the approved
       *  policy version — never a client-supplied one, which would be as
       *  untrustworthy as a client-supplied score.
       *
       *  Leads field names differ from Contacts (Consent_Given /
       *  Consent_Timestamp / Consent_Policy_Version vs Consent_Given_On /
       *  Consent_Version), so recordFor names them correctly per module.
       *  These same values go to CRM below, into structured filterable
       *  fields — never Description or a note. */
      ...(consent.isReady() && consentGiven ? consent.recordFor('Leads') : {})
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

    /*  DURABILITY GATE.
     *
     *  This route used to answer, unconditionally, "A RichenQuest counselor
     *  will review your profile shortly." That is only true when the lead
     *  actually reached CRM, and it was sent even when nothing anywhere held
     *  the record.
     *
     *  A lead is durable if EITHER is true:
     *    - Zoho CRM accepted it. That is the counsellor's own system of
     *      record, so this is the strongest outcome and the only one that
     *      justifies promising a counsellor.
     *    - The Catalyst Data Store write succeeded. The record survives a
     *      restart and can be synced to CRM later.
     *
     *  In-memory is NOT durable. The process restarts on every deploy and on
     *  scale-down, and today no Data Store tables exist, so that is the live
     *  behaviour — not a hypothetical. If neither holds the lead, saying
     *  anything reassuring would be a lie, so the student is told plainly
     *  that it did not go through and is given a route that works.
     *
     *  The error log is a manual recovery aid, deliberately not counted as
     *  durability — a log is not storage. That is also why it carries the
     *  contact details: when a submission has failed, being able to reach the
     *  family back is worth the PII in an operational log. */
    const crmOk = ['SYNCED', 'CREATED', 'UPDATED'].includes(crmSyncResult?.status);
    const durable = crmOk || locallyDurable;

    if (!durable) {
      console.error('[leads] LEAD NOT DURABLE — no CRM record and no Data Store row:', JSON.stringify({
        leadId,
        name: name.trim(),
        email: normalizedEmail,
        phone: phone ? phone.trim() : '',
        country: country || null,
        program: program || null,
        crmStatus: crmSyncResult?.status || 'UNKNOWN',
        at: new Date().toISOString()
      }));
      return sendError(res, 'SUBMISSION_NOT_STORED',
        'We could not record your inquiry just now, so it has not reached our team. ' +
        'Please try again shortly, or email support@richenquest.com and we will pick it up from there.',
        503);
    }

    if (!crmOk) {
      console.error('[leads] stored but NOT SYNCED TO CRM — needs sync:', JSON.stringify({
        leadId,
        email: normalizedEmail,
        crmStatus: crmSyncResult?.status || 'UNKNOWN',
        at: new Date().toISOString()
      }));
    }

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
    }, crmOk
      ? 'Your study abroad inquiry has been submitted successfully. A RichenQuest counselor will review your profile shortly.'
      : 'Your study abroad inquiry has been received. Our team will contact you shortly.', 201);
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
