/**
 * Consent gate — client mirror of backend/functions/shared/consent.js.
 * WAITING FOR LEGAL APPROVAL.
 *
 * Activation is deliberately two constants in two files and nothing else:
 *   1. TEXT    — the advocate-approved wording, verbatim. Never invented here.
 *   2. VERSION — the approved policy version string.
 * Then flip READY to true in both this file and the backend module. The
 * backend is the enforcing side; this file only decides what the form shows,
 * so the two must be flipped together or the form will submit something the
 * server refuses.
 *
 * Everything else — the checkbox, submit blocking, server-side validation,
 * timestamp and version capture — is already built and tested against a
 * temporarily-activated copy. Nothing below needs revisiting when the wording
 * arrives.
 */
export const CONSENT_READY = false;
export const CONSENT_VERSION = null;
export const CONSENT_TEXT = null;

/** True only when the gate is on AND wording actually exists to show. */
export function consentGateActive() {
  return CONSENT_READY && Boolean(CONSENT_VERSION) && Boolean(CONSENT_TEXT);
}

export default { CONSENT_READY, CONSENT_VERSION, CONSENT_TEXT, consentGateActive };
