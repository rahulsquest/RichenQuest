/**
 * Frontend Environment Configuration
 * Safe public variables only. Never expose backend secrets or OAuth credentials here.
 */

export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
  appEnv: import.meta.env.VITE_APP_ENV || 'development',
  isDevelopment: (import.meta.env.VITE_APP_ENV || 'development') === 'development',
  isProduction: import.meta.env.VITE_APP_ENV === 'production',
  salesIqWidgetCode: import.meta.env.VITE_SALESIQ_WIDGET_CODE || '',
  companyName: import.meta.env.VITE_COMPANY_NAME || 'RichenQuest',
  supportEmail: import.meta.env.VITE_SUPPORT_EMAIL || 'admissions@richenquest.com',
  supportPhone: import.meta.env.VITE_SUPPORT_PHONE || '+91 7631 207 948',
  whatsappNumber: import.meta.env.VITE_WHATSAPP_NUMBER || '+91 7631 207 948',
  whatsappLink: `https://wa.me/${(import.meta.env.VITE_WHATSAPP_NUMBER || '+91 7631 207 948').replace(/[^0-9]/g, '')}?text=${encodeURIComponent('Hello RichenQuest admissions team! I would like to inquire about university applications.')}`
};

export default env;
