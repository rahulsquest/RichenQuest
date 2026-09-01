import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Send, CheckCircle2, Globe, Building2, BookOpen, User, Phone, Mail } from 'lucide-react';
import { Input, Select, Textarea } from '../../components/Input';
import Button from '../../components/Button';
import { Card } from '../../components/Card';
import { useToast } from '../../context/ToastContext';
import leadService from '../../services/leadService';
import { TARGET_COUNTRIES, DEGREE_LEVELS } from '../../constants/entities';
import ConsentCheckbox from '../../components/ConsentCheckbox';
import { consentGateActive } from '../../config/consent';

export default function Inquiry() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [leadResult, setLeadResult] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    country: searchParams.get('country') || 'United Kingdom',
    program: searchParams.get('degree') || 'Postgraduate (Master\'s / MSc / MA / MEng / MBA)',
    university: '',
    studyInterest: 'Computer Science / STEM',
    message: '',
    consentGiven: false
  });

  useEffect(() => {
    if (searchParams.get('country')) {
      setFormData(prev => ({ ...prev, country: searchParams.get('country') }));
    }
    if (searchParams.get('degree')) {
      setFormData(prev => ({ ...prev, program: searchParams.get('degree') }));
    }
  }, [searchParams]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      addToast('Name and Email are required', 'warning');
      return;
    }
    /* Blocked before any network call. The server refuses too, so a
     * bypassed checkbox still cannot create a record. */
    if (consentGateActive() && !formData.consentGiven) {
      addToast('Please review and accept the consent statement to continue.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const response = await leadService.submitInquiry({
        ...formData,
        source: 'Website Study Abroad Inquiry Form'
      });
      setLeadResult(response?.data);
      setSubmitted(true);
      addToast('Inquiry recorded and queued for Zoho CRM counselor assignment!', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to submit inquiry', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-4">
      <div className="text-center space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
          Admissions Lead Capture
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-display">
          Study Abroad Inquiry & Evaluation
        </h1>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Submit your academic preferences to generate a Zoho CRM Lead and initiate your personalized counselor assignment.
        </p>
      </div>

      {submitted ? (
        <Card className="text-center py-10 space-y-6">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div>
            <span className="text-xs font-mono font-bold text-indigo-600 uppercase">
              Lead ID: {leadResult?.lead?.leadId || 'LEAD-2026'}
            </span>
            <h3 className="text-xl font-bold text-slate-900 mt-1">Inquiry Dispatched Successfully!</h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto mt-2 leading-relaxed">
              Your inquiry has entered the RichenQuest admissions pipeline. A senior counselor specializing in {formData.country} will review your preferences.
            </p>
          </div>

          <div className="max-w-sm mx-auto p-4 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Target Country:</span>
              <strong className="text-slate-800">{formData.country}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Degree Level:</span>
              <strong className="text-slate-800">{formData.program}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Automation Trigger:</span>
              <span className="text-emerald-600 font-bold">Zoho Flow Dispatched</span>
            </div>
          </div>

          <div className="flex justify-center gap-3 pt-2">
            <Button variant="primary" onClick={() => navigate('/consultation')}>
              Book Consultation Session
            </Button>
            <Button variant="secondary" onClick={() => setSubmitted(false)}>
              Submit Another Inquiry
            </Button>
          </div>
        </Card>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xl space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Your Full Name"
              icon={User}
              required
            />
            <Input
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="name@example.com"
              icon={Mail}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Phone Number / WhatsApp"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+1 (555) 000-0000"
              icon={Phone}
              required
            />
            <Select
              label="Target Study Destination"
              name="country"
              value={formData.country}
              onChange={handleChange}
              options={TARGET_COUNTRIES}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Intended Study Level"
              name="program"
              value={formData.program}
              onChange={handleChange}
              options={DEGREE_LEVELS}
              required
            />
            <Input
              label="Specific Major / Academic Field"
              name="studyInterest"
              value={formData.studyInterest}
              onChange={handleChange}
              placeholder="e.g. Data Science, International Business, LLM"
              required
            />
          </div>

          <Input
            label="Preferred Target University (if any)"
            name="university"
            value={formData.university}
            onChange={handleChange}
            placeholder="e.g. Imperial College London, University of Toronto"
          />

          <Textarea
            label="Questions / Scholarship Goals"
            name="message"
            value={formData.message}
            onChange={handleChange}
            placeholder="Tell us about your current GPA, GRE/IELTS score status, budget, or preferred intake..."
            rows={3}
          />

          <ConsentCheckbox
            checked={formData.consentGiven}
            onChange={(v) => setFormData({ ...formData, consentGiven: v })}
          />

          <Button
            type="submit"
            loading={loading}
            variant="primary"
            size="lg"
            className="w-full"
            icon={Send}
          >
            Submit Inquiry to Admissions Pipeline
          </Button>
        </form>
      )}
    </div>
  );
}
