/**
 * Zoho SalesIQ Global Integration
 * Injects Zoho SalesIQ chat widget if widget code is provided in environment variables.
 * Never hardcodes dummy widgets or blocks UI rendering.
 */

import env from '../config/environment';

export function initializeSalesIQ() {
  const widgetCode = env.salesIqWidgetCode;

  if (!widgetCode) {
    if (env.isDevelopment) {
      console.log('[Zoho SalesIQ] Widget code not provided. Widget placeholder active.');
    }
    return;
  }

  // Prevent duplicate script injection
  if (document.getElementById('zsiqscript')) {
    return;
  }

  window.$zoho = window.$zoho || {};
  window.$zoho.salesiq = window.$zoho.salesiq || {
    widgetcode: widgetCode,
    values: {},
    ready: function () {
      console.log('[Zoho SalesIQ] Live chat widget initialized successfully.');
    }
  };

  const script = document.createElement('script');
  script.id = 'zsiqscript';
  script.type = 'text/javascript';
  script.defer = true;
  script.src = 'https://salesiq.zoho.com/widget';
  const firstScript = document.getElementsByTagName('script')[0];
  if (firstScript && firstScript.parentNode) {
    firstScript.parentNode.insertBefore(script, firstScript);
  } else {
    document.head.appendChild(script);
  }
}

export function openSalesIQChat() {
  if (window.$zoho && window.$zoho.salesiq && typeof window.$zoho.salesiq.floatwindow === 'object') {
    window.$zoho.salesiq.floatwindow.visible('show');
  } else {
    console.log('[Zoho SalesIQ] Chat triggered. (SalesIQ widget pending configuration)');
  }
}
