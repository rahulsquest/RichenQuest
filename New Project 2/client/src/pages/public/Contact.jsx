import React, { useState } from 'react';
import { Mail, Phone, MapPin, MessageSquare, Clock, Send, CheckCircle2 } from 'lucide-react';
import { Input, Textarea } from '../../components/Input';
import Button from '../../components/Button';
import { useToast } from '../../context/ToastContext';
import leadService from '../../services/leadService';
import env from '../../config/environment';
import ConsentCheckbox from '../../components/ConsentCheckbox';
import { consentGateActive } from '../../config/consent';

export default function Contact() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    country: '',
    message: '',
    consentGiven: false
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    /* Blocked before any network call; the server refuses too. */
    if (consentGateActive() && !formData.consentGiven) {
      addToast('Please review and accept the consent statement to continue.', 'warning');
      return;
    }
    setLoading(true);
    try {
      const res = await leadService.submitInquiry({
        ...formData,
        source: 'Contact Page Direct Message'
      });
      setSubmitted(true);
      /*  Was: "Message dispatched! Our admissions team will reach out within 24
       *  hours." Two unverifiable claims — that it was dispatched to anyone, and
       *  a 24-hour response commitment nothing enforces. The server's message
       *  reflects what actually happened. */
      addToast(res?.message || 'Message received.', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to send message', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
          Get in Touch
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-display">
          Connect with RichenQuest Admissions
        </h1>
        <p className="text-sm text-slate-600">
          Have a question regarding university eligibility, visas, or counselor appointments? Our advisory desk is ready to help.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Contact Info Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900">Headquarters</h3>
            <div className="space-y-3 text-xs text-slate-600">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <span>Boring Road, Patna, Bihar, India</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-indigo-600 shrink-0" />
                <a href={`mailto:${env.supportEmail}`} className="text-indigo-600 hover:underline">{env.supportEmail}</a>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>{env.supportPhone}</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Mon – Fri: 09:00 – 18:00 IST</span>
              </div>
            </div>
          </div>

          <div className="bg-emerald-900 text-white rounded-2xl p-6 space-y-3 shadow-md">
            <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
              <MessageSquare className="w-5 h-5" />
              <span>Instant WhatsApp Desk</span>
            </div>
            <p className="text-xs text-emerald-100 leading-relaxed">
              Connect directly with our international admissions coordinator via WhatsApp for urgent queries.
            </p>
            <a
              href={env.whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-full py-2.5 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors shadow-sm"
            >
              Open WhatsApp Chat
            </a>
          </div>
        </div>

        {/* Contact Form */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs">
          {submitted ? (
            <div className="text-center py-12 space-y-4">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Message Received!</h3>
              <p className="text-xs text-slate-600 max-w-sm mx-auto">
                Thank you for contacting RichenQuest. Your inquiry has been routed to our admissions team and an advisor will respond shortly.
              </p>
              <Button size="sm" variant="secondary" onClick={() => setSubmitted(false)}>
                Send Another Message
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="text-lg font-bold text-slate-900 mb-2">Send Us a Direct Message</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Your Full Name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Your Full Name"
                  required
                />
                <Input
                  label="Email Address"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@example.com"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Phone Number (with Country Code)"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+1 (555) 000-0000"
                  required
                />
                <Input
                  label="Country of Residence"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  placeholder="e.g. India, Nigeria, UAE"
                  required
                />
              </div>

              <Textarea
                label="How can we assist your university journey?"
                name="message"
                value={formData.message}
                onChange={handleChange}
                placeholder="Share your target degree, destination country, or any questions regarding scholarships..."
                rows={4}
                required
              />

              <ConsentCheckbox
                checked={formData.consentGiven}
                onChange={(v) => setFormData({ ...formData, consentGiven: v })}
              />

              <div className="pt-2">
                <Button type="submit" loading={loading} variant="primary" size="lg" className="w-full sm:w-auto">
                  Send Message <Send className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
