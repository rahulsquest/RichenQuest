/**
 * Formatting Utilities for Dates, Currency, and Status Badges
 */

export function formatDate(dateString) {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(date);
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString) {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  } catch {
    return dateString;
  }
}

export function formatCurrency(amount, currency = 'INR') {
  if (typeof amount !== 'number') return `${amount} ${currency}`;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2
  }).format(amount);
}

export function getStatusTheme(status) {
  switch ((status || '').toUpperCase()) {
    case 'VERIFIED':
    case 'APPROVED':
    case 'PAID':
    case 'CONFIRMED':
    case 'COMPLETED':
    case 'CONNECTED':
    case 'SYNCED':
      return {
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        badge: 'bg-emerald-500',
        label: status
      };
    case 'UNDER_REVIEW':
    case 'IN_PROGRESS':
    case 'PENDING':
    case 'SUBMITTED':
    case 'CONDITIONAL OFFER':
      return {
        bg: 'bg-amber-50 text-amber-700 border-amber-200',
        badge: 'bg-amber-500',
        label: status
      };
    case 'REJECTED':
    case 'CANCELLED':
    case 'FAILED':
      return {
        bg: 'bg-rose-50 text-rose-700 border-rose-200',
        badge: 'bg-rose-500',
        label: status
      };
    case 'INTEGRATION_PENDING':
    case 'PENDING_WORKDRIVE_SYNC':
      return {
        bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        badge: 'bg-indigo-500',
        label: 'Integration Pending'
      };
    default:
      return {
        bg: 'bg-slate-100 text-slate-700 border-slate-200',
        badge: 'bg-slate-400',
        label: status || 'Pending'
      };
  }
}
