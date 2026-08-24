import React from 'react';
import { CreditCard, Download, Clock, CheckCircle2 } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { formatCurrency, formatDate } from '../utils/formatters';
import Button from './Button';

export function PaymentCard({ invoice, onPay }) {
  if (!invoice) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <span className="text-[11px] font-mono font-bold text-slate-400">
              {invoice.invoiceNumber}
            </span>
            <h4 className="text-sm font-bold text-slate-900 mt-0.5">
              {invoice.description}
            </h4>
          </div>
          <StatusBadge status={invoice.status} />
        </div>

        <div className="my-4">
          <div className="text-2xl font-extrabold text-slate-900">
            {formatCurrency(invoice.amount, invoice.currency)}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {invoice.status === 'PAID'
              ? `Paid on ${formatDate(invoice.paymentDate)} via ${invoice.paymentMethod}`
              : `Due by ${formatDate(invoice.dueDate)}`}
          </p>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
        <span className="text-[10px] font-mono text-slate-400">
          Zoho Books: {invoice.zohoBooksInvoiceId || 'Pending'}
        </span>
        <div>
          {invoice.status === 'PENDING' ? (
            <Button size="sm" variant="primary" onClick={() => onPay && onPay(invoice)}>
              Pay Now
            </Button>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
              <CheckCircle2 className="w-4 h-4" /> Paid & Reconciled
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default PaymentCard;
