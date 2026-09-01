/**
 * Consent gate — WAITING FOR LEGAL APPROVAL.
 *
 * Inert by design: READY is false, so isReady() is false, so nothing below
 * changes signup, CRM writes, or any other behavior until all three of the
 * following actually happen (see FOUNDER-ACTIONS.md, item B1):
 *
 *   1. The advocate approves exact consent wording and a policy version.
 *   2. TEXT is replaced with that wording, verbatim — never invented here.
 *   3. VERSION is set to the approved policy version string, and READY
 *      is flipped to true.
 *
 * The CRM already has consent fields on BOTH modules, and they do not share
 * names — verified live 2026-09-01:
 *
 *   Contacts : Consent_Given_On (datetime) · Consent_Version (text)
 *   Leads    : Consent_Given (boolean) · Consent_Timestamp (datetime)
 *              · Consent_Policy_Version (text) · Parent_Consent (boolean)
 *
 * So nothing needed creating — writing Consent_Given_On to a Lead would have
 * silently failed on a field that does not exist there, and creating it would
 * have duplicated Consent_Timestamp. recordFor() picks the right names per
 * module rather than assuming one shape fits both.
 */
const READY = false;
const VERSION = null;
const TEXT = null;

function isReady() {
  return READY && Boolean(VERSION) && Boolean(TEXT);
}

/* Server-generated only — a client-supplied timestamp or version would be
 * exactly as untrustworthy as a client-supplied score.
 *
 * Structured, filterable CRM fields only. Consent never goes into Description
 * or a note: an audit trail that cannot be queried is not an audit trail. */
function recordFor(module) {
  const at = new Date().toISOString();
  if (module === 'Leads') {
    return {
      Consent_Given: true,
      Consent_Timestamp: at,
      Consent_Policy_Version: VERSION
    };
  }
  return { Consent_Given_On: at, Consent_Version: VERSION };
}

/* Contacts shape, kept for the signup path that already calls it. */
function record() {
  return recordFor('Contacts');
}

module.exports = { isReady, record, recordFor, VERSION, TEXT };
