import React, { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle, Search } from 'lucide-react';

export default function FAQ() {
  const [searchQuery, setSearchQuery] = useState('');
  const [openIndex, setOpenIndex] = useState(0);

  const faqs = [
    {
      category: 'Admissions & Shortlisting',
      question: 'How does RichenQuest match opportunities to my profile?',
      answer: 'Every opportunity is first checked against five fields — tuition, living cost, application deadline, source URL and verification date. Only opportunities where all five are confirmed against an authoritative source are ranked for you. Your profile is then scored on financial fit, country, subject domain, English requirement and study level, and a counsellor reviews the result before it reaches you. The Match Score describes how well an opportunity fits you — it is not a probability of admission, scholarship or visa outcome, and where information is missing we score on fewer points rather than guess.'
    },
    {
      category: 'Admissions & Shortlisting',
      question: 'When should I begin applying for Autumn 2026/2027 intakes?',
      answer: 'We recommend starting 8 to 12 months prior to intake. This provides adequate lead time for multiple SOP drafts, transcript apostille/verification, scholarship applications, and visa interview scheduling.'
    },
    {
      category: 'Documents & WorkDrive',
      question: 'How are my documents reviewed and secured?',
      answer: 'Documents uploaded to your student portal are routed to a secure WorkDrive-backed repository. Dedicated admissions editors review your Statement of Purpose (SOP) and Recommendation Letters (LORs) with multi-pass editorial feedback before portal submission.'
    },
    {
      category: 'Counselor Consultations',
      question: 'How do video consultations with counselors work?',
      answer: 'Once registered, you can schedule 1-on-1 virtual sessions with your assigned specialist via our integrated booking system. Meeting links and automated calendar reminders are synchronized with your email and WhatsApp.'
    },
    {
      category: 'Visas & Finance',
      question: 'Does RichenQuest assist with student visa applications and CAS/I-20 issuance?',
      answer: 'Yes. We guide you through CAS/I-20 requests, bank statement solvency verification, tuition deposit processing via Zoho Books invoicing, health insurance, and embassy mock interview preparation.'
    },
    {
      category: 'Platform & Technology',
      question: 'How does RichenQuest handle my application tracking?',
      answer: 'The RichenQuest platform utilizes Zoho Catalyst and Zoho CRM architecture to ensure real-time tracking of milestones, document verification statuses, application portal progress, and payment receipts without manual delays.'
    }
  ];

  const filteredFaqs = faqs.filter(
    (f) =>
      f.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      {/* Header */}
      <div className="text-center space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
          Knowledge Base
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-display">
          Frequently Asked Questions
        </h1>
        <p className="text-sm text-slate-600">
          Find answers regarding university admissions, counselor sessions, document reviews, and visa processing.
        </p>
      </div>

      {/* Search Input */}
      <div className="relative max-w-lg mx-auto">
        <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search admissions questions..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm bg-white shadow-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      {/* FAQ Accordion */}
      <div className="space-y-3">
        {filteredFaqs.length === 0 ? (
          <p className="text-center py-8 text-xs text-slate-400 italic">No matching questions found.</p>
        ) : (
          filteredFaqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden transition-all"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? -1 : idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 hover:bg-slate-50/50 cursor-pointer"
                >
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block mb-1">
                      {faq.category}
                    </span>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">{faq.question}</h3>
                  </div>
                  <div className="p-1 rounded-md text-slate-400 shrink-0">
                    {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
