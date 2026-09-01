import React from 'react';
import { consentGateActive, CONSENT_TEXT } from '../config/consent';

/**
 * Consent checkbox for any form that sends personal data to CRM.
 *
 * Renders nothing while the gate is inactive, so no form changes behaviour
 * until advocate-approved wording exists. When active it is required, and the
 * parent form must refuse to submit without it — the server refuses too, so a
 * bypassed checkbox still cannot create a record.
 *
 * The wording is never held here. It comes from config/consent.js, which is
 * the single place it gets filled in.
 */
export default function ConsentCheckbox({ checked, onChange, name = 'consentGiven' }) {
  if (!consentGateActive()) return null;

  return (
    <label className="flex items-start gap-2.5 text-xs text-slate-600 cursor-pointer">
      <input
        type="checkbox"
        name={name}
        checked={Boolean(checked)}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
        required
      />
      <span>{CONSENT_TEXT}</span>
    </label>
  );
}
