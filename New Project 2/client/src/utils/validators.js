/**
 * Form Validation Utilities
 */

export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return re.test(email.trim());
}

export function isValidPhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  // Allows international formatting with leading + and min 7 digits
  const re = /^\+?[0-9\s-()]{7,20}$/;
  return re.test(phone.trim());
}

export function validateRequired(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}
