import React, { useState, useEffect } from 'react';
import { CreditCard, Receipt, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { PaymentCard } from '../../components/PaymentCard';
import { Modal } from '../../components/Modal';
import { LoadingState, EmptyState, ErrorState } from '../../components/FileUpload';
import Button from '../../components/Button';
import { formatCurrency } from '../../utils/formatters';
import paymentService from '../../services/paymentService';

export default function Payments() {
  const { student } = useAuth();
  const { addToast } = useToast();

  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState({ totalInvoiced: 0, totalPaid: 0, totalPending: 0, currency: 'INR' });
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [payModalOpen, setPayModalOpen] = useState(false);

  const fetchPayments = async () => {
    if (!student?.studentId) return;
    try {
      setLoading(true);
      setErrorMessage(null);
      const data = await paymentService.getInvoices(student.studentId);
      setInvoices(data.invoices || []);
      if (data.summary) setSummary(data.summary);
      if (data.error) setErrorMessage(data.error);
    } catch (err) {
      setErrorMessage(err.message || 'Financial records are temporarily unavailable.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [student]);

  const handleOpenPay = (inv) => {
    if (inv.receiptUrl && inv.receiptUrl !== '#') {
      window.open(inv.receiptUrl, '_blank');
      return;
    }
    setSelectedInvoice(inv);
    setPayModalOpen(true);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-600">
          Financial Ledger
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-display">
          Invoices & Financial Records
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          View tuition fee deposits, admissions consulting invoices, and official receipts.
        </p>
      </div>

      {errorMessage && (
        <ErrorState
          title="Notice"
          message={errorMessage}
          onRetry={fetchPayments}
        />
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Invoiced</span>
          <div className="text-2xl font-extrabold text-slate-900">
            {formatCurrency(summary.totalInvoiced, summary.currency)}
          </div>
          <span className="text-[11px] text-slate-400">Total fees generated</span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-emerald-200 bg-emerald-50/20 shadow-xs space-y-1">
          <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Total Paid</span>
          <div className="text-2xl font-extrabold text-emerald-700">
            {formatCurrency(summary.totalPaid, summary.currency)}
          </div>
          <span className="text-[11px] text-emerald-600">Settled payments</span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-amber-200 bg-amber-50/20 shadow-xs space-y-1">
          <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Outstanding Balance</span>
          <div className="text-2xl font-extrabold text-amber-700">
            {formatCurrency(summary.totalPending, summary.currency)}
          </div>
          <span className="text-[11px] text-amber-600">Pending settlement</span>
        </div>
      </div>

      {/* Invoices List */}
      {loading ? (
        <LoadingState message="Loading invoices from financial ledger..." />
      ) : (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-slate-900">Invoices & Statements</h3>
          {invoices.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {invoices.map((inv) => (
                <PaymentCard key={inv.paymentId} invoice={inv} onPay={handleOpenPay} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={CreditCard}
              title="No invoices found"
              description="You do not have any pending or historical invoices on file."
            />
          )}
        </div>
      )}

      {/* Pay Details Modal */}
      <Modal
        isOpen={payModalOpen}
        onClose={() => setPayModalOpen(false)}
        title="Invoice Details"
        subtitle={`Invoice: ${selectedInvoice?.invoiceNumber}`}
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Service:</span>
              <strong className="text-slate-800 text-right max-w-xs">{selectedInvoice?.description}</strong>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Due Date:</span>
              <span className="text-slate-800 font-semibold">{selectedInvoice?.dueDate || 'Immediate'}</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-slate-200">
              <strong className="text-slate-900">Total Amount:</strong>
              <strong className="text-indigo-600 font-extrabold text-lg">
                {formatCurrency(selectedInvoice?.amount || 0, selectedInvoice?.currency || 'INR')}
              </strong>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0" />
            <span>To pay this invoice, please contact your counselor or pay via your invoice payment link.</span>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setPayModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
