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
 * Consent_Given_On and Consent_Version already exist as live fields on the
 * Contacts module in Zoho CRM (verified 2026-08-27) — this file is the only
 * piece that was missing: nothing in this codebase wrote them.
 */
const READY = false;
const VERSION = null;
const TEXT = null;

function isReady() {
  return READY && Boolean(VERSION) && Boolean(TEXT);
}

/* Server-generated only — a client-supplied timestamp or version would be
 * exactly as untrustworthy as a client-supplied score. */
function record() {
  return { Consent_Given_On: new Date().toISOString(), Consent_Version: VERSION };
}

module.exports = { isReady, record, VERSION, TEXT };
