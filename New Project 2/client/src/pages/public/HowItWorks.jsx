import React from 'react';
import { Compass, CheckCircle2, ArrowRight, Sparkles, Send, UserCheck, Calendar, FileText, Building2, CreditCard, Award, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/Button';
import { JOURNEY_STEPS } from '../../constants/entities';

export default function HowItWorks() {
  const navigate = useNavigate();

  const roadmapDetails = [
    {
      step: '1',
      title: 'Inquiry & Profile Audit',
      description: 'You submit your target study preferences, academic grades, and preferred countries. Our system logs your lead in Zoho CRM and assigns an admissions counselor.',
      icon: Send
    },
    {
      step: '2',
      title: 'Student Case Registration',
      description: 'Create your secure RichenQuest student account. Your student dossier and personal dashboard are initialized with an active case ID.',
      icon: UserCheck
    },
    {
      step: '3',
      title: '1-on-1 Strategy Consultation',
      description: 'Book a video session via integrated Zoho Bookings. Discuss degree objectives, scholarship availability, and target deadlines with your dedicated counselor.',
      icon: Calendar
    },
    {
      step: '4',
      title: 'University Shortlisting',
      description: 'Receive a curated shortlist categorized by Dream, Target, and Safe institutions based on historical acceptance data and prerequisite matching.',
      icon: Building2
    },
    {
      step: '5',
      title: 'Document Preparation & Review',
      description: 'Upload your transcripts, draft SOPs, and recommendation letters to the WorkDrive-ready document vault. Counselors provide rigorous multi-pass feedback.',
      icon: FileText
    },
    {
      step: '6',
      title: 'Portal Submissions & Tracking',
      description: 'Official applications are dispatched to target university portals. Real-time status updates and correspondence are logged in your dashboard.',
      icon: CheckCircle2
    },
    {
      step: '7',
      title: 'Offer Letter Evaluation & Decision',
      description: 'When conditional and unconditional offers arrive, your counselor evaluates tuition fee deposits, CAS conditions, and scholarship awards.',
      icon: Award
    },
    {
      step: '8',
      title: 'Tuition Invoices & Financial Guidance',
      description: 'Manage application fees and tuition deposits through Zoho Books invoicing with transparent receipts and financial tracking.',
      icon: CreditCard
    },
    {
      step: '9',
      title: 'Student Visa Filing & CAS Request',
      description: 'Complete petition preparation for your UK Student visa, US F-1, or other destination-specific visa, including bank solvency checks and mock embassy interview sessions.',
      icon: ShieldCheck
    },
    {
      step: '10',
      title: 'Pre-Departure Briefing & Campus Arrival',
      description: 'Housing assistance, airport transit orientation, student peer groups, and pre-departure briefings ensure a seamless transition to university life.',
      icon: Compass
    }
  ];

  return (
    <div className="space-y-16 py-12">
      {/* Header */}
      <section className="max-w-4xl mx-auto px-4 text-center space-y-4">
        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
          From Uncertainty to a Clear Next Step
        </span>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight font-display">
          How Your Admissions Journey Works
        </h1>
        <p className="text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
          RichenQuest combines profile intelligence, opportunity matching, and verification with real counsellor guidance — broken down into 10 structured, tracked steps.
        </p>
      </section>

      {/* Roadmap List */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="space-y-6">
          {roadmapDetails.map((item, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start gap-5 hover:border-indigo-300 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-extrabold text-lg shrink-0 shadow-md shadow-indigo-600/20">
                {item.step}
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <item.icon className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-4 text-center">
        <div className="bg-slate-900 text-white rounded-2xl p-8 sm:p-10 space-y-4">
          <h3 className="text-2xl font-extrabold">Ready to Begin Step 1?</h3>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
            Check your fit to trigger your profile audit and counsellor assignment.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" variant="primary" onClick={() => navigate('/inquiry')}>
              Check My Fit <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
            <Button size="lg" variant="secondary" onClick={() => navigate('/contact')}>
              Talk to a Counsellor
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
