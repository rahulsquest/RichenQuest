import React, { useState } from 'react';
import { MessageSquare, Mail, Phone, Send, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Input, Select, Textarea } from '../../components/Input';
import Button from '../../components/Button';
import leadService from '../../services/leadService';
import env from '../../config/environment';

export default function Support() {
  const { student, counselor } = useAuth();
  const { addToast } = useToast();

  const [ticketSent, setTicketSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    category: 'Application Inquiries',
    message: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.subject || !formData.message) {
      addToast('Please enter a subject and message.', 'warning');
      return;
    }
    setLoading(true);
    try {
      const res = await leadService.submitInquiry({
        name: student?.fullName || 'Student',
        email: student?.email || env.supportEmail,
        phone: student?.phone || '',
        studyInterest: formData.category,
        message: `[Subject: ${formData.subject}] ${formData.message}`,
        source: 'Student Portal Support Desk'
      });
      setTicketSent(true);
      /*  Was: "dispatched to your admissions counselor" — a claim that a named
       *  human received it. No counsellor is assigned to any student today
       *  (the Counselors table is deliberately empty), so this was false for
       *  every student who saw it. */
      addToast(res?.message || 'Support request received.', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to dispatch inquiry.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-600">
          Help & Communication Desk
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-display">
          Student Support & Counselor Inquiries
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Reach out directly to the RichenQuest admissions office or submit a formal inquiry.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Direct Channels */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Direct Counselor Line</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Your assigned counselor: <strong className="text-slate-800">{counselor?.name || 'Admissions Desk'}</strong>
            </p>
            <div className="pt-2 space-y-2 text-xs text-slate-600">
              <p><strong>Email:</strong> {counselor?.email || env.supportEmail}</p>
              <p><strong>Phone:</strong> {counselor?.phone || env.supportPhone}</p>
            </div>
          </div>

          <div className="bg-emerald-900 text-white rounded-2xl p-6 space-y-3 shadow-md">
            <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs uppercase tracking-wider">
              <MessageSquare className="w-4 h-4" />
              <span>WhatsApp Instant Desk</span>
            </div>
            <p className="text-xs text-emerald-100 leading-relaxed">
              Chat directly with our student concierge team for rapid replies.
            </p>
            <a
              href={env.whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block w-full py-2 px-3 text-center rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
            >
              Open WhatsApp
            </a>
          </div>
        </div>

        {/* Ticket Form */}
        <div className="md:col-span-2 bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-xs">
          {ticketSent ? (
            <div className="text-center py-8 space-y-3">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-900">Inquiry Received!</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Your support message has been registered and assigned to your admissions counselor. You will receive a response via email shortly.
              </p>
              <Button size="sm" variant="secondary" onClick={() => setTicketSent(false)}>
                Submit Another Inquiry
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="text-base font-bold text-slate-900">Submit an Admissions Inquiry</h3>

              <Select
                label="Inquiry Category"
                name="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                options={[
                  'Application Inquiries',
                  'Document Verification & Review',
                  'Visa & CAS Processing',
                  'Tuition Deposit & Billing',
                  'Pre-Departure & Housing'
                ]}
                required
              />

              <Input
                label="Subject / Topic"
                name="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="e.g. Question regarding conditional offer degree certificate deadline"
                required
              />

              <Textarea
                label="Message Details"
                name="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Provide complete details so your counselor can evaluate your case..."
                rows={4}
                required
              />

              <Button
                type="submit"
                loading={loading}
                variant="primary"
                size="lg"
                className="w-full"
                icon={Send}
              >
                Send Inquiry to Admissions Desk
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
