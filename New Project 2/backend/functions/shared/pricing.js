/**
 * Server-side service catalogue.
 *
 * WHY PRICES ARE UNSET
 *   The connected Zoho Books organisation (60077090038) contains ZERO items and
 *   ZERO contacts — verified by live API call. There is no published price for
 *   any RichenQuest service anywhere in this repository or in Books. Inventing
 *   one would put a fabricated figure on a real invoice to a real family, so
 *   every entry below is deliberately UNSET and invoice creation is refused
 *   until a price is supplied.
 *
 *   Prices are server-side ONLY. The browser never supplies an amount, a
 *   currency, a tax rate or a discount — see functions/payments/index.js, which
 *   ignores any such field in the request body.
 */

const CURRENCY = 'INR';           // Books org currency, confirmed via API.

/** null price = UNSET. Fill from the real published price list, never a guess. */
const CATALOGUE = {
  admission_support:     { name: 'Admission Support',            price: null },
  visa_support:          { name: 'Visa Support',                 price: null },
  documentation_support: { name: 'Documentation Support',        price: null },
  scholarship_support:   { name: 'Scholarship Support',          price: null },
  full_service:          { name: 'Full Service Package',         price: null }
};

function getService(code) {
  return CATALOGUE[code] || null;
}

function isPriceSet(code) {
  const s = CATALOGUE[code];
  return Boolean(s && typeof s.price === 'number' && s.price > 0);
}

/** Everything a caller may see. Never exposes a null price as 0. */
function listServices() {
  return Object.entries(CATALOGUE).map(([code, s]) => ({
    code,
    name: s.name,
    currency: CURRENCY,
    price: isPriceSet(code) ? s.price : null,
    available_for_invoicing: isPriceSet(code)
  }));
}

module.exports = { CURRENCY, getService, isPriceSet, listServices };
