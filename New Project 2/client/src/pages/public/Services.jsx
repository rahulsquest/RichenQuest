import React from 'react';
import { Compass, GraduationCap, FileCheck2, Award, ShieldCheck, Plane, CheckCircle2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/Button';

export default function Services() {
  const navigate = useNavigate();

  const servicesList = [
    {
      icon: GraduationCap,
      title: 'University Shortlisting & Profile Audit',
      description: 'In-depth analysis of your academic transcripts, test scores (GRE/GMAT/IELTS), work experience, and financial budget to build an optimized list of Dream, Target, and Safe universities.',
      deliverables: [
        'Detailed eligibility & prerequisite evaluation',
        'Direct faculty portal deadline mapping',
        'Postgraduate & Undergraduate program matching'
      ]
    },
    {
      icon: FileCheck2,
      title: 'SOP, Resume & Recommendation Letter Review',
      description: 'Expert editorial assistance to craft compelling Statements of Purpose, Personal Statements, and CVs tailored to specific university admissions committee criteria.',
      deliverables: [
        'Multi-round structural and thematic editing',
        'Academic LOR guidance for professors/employers',
        'WorkDrive secure document storage'
      ]
    },
    {
      icon: Award,
      title: 'Scholarship Strategy & Financial Guidance',
      description: 'Systematic identification of merit-based scholarships, departmental bursaries, and external educational fellowships to significantly reduce your tuition burden.',
      deliverables: [
        'University-specific scholarship essay coaching',
        'Bank solvency & education loan guidance',
        'Tuition fee deposit & invoice reconciliation'
      ]
    },
    {
      icon: ShieldCheck,
      title: 'Student Visa Filing & Mock Interviews',
      description: 'Comprehensive visa petition preparation including CAS/I-20 requests, financial documentation audits, biometrics scheduling, and mock embassy interview drills.',
      deliverables: [
        'UK Student visa, US F-1, Canadian Study Permit expertise',
        'Financial affidavit & bank verification checklists',
        '1-on-1 counselor mock interview preparation'
      ]
    },
    {
      icon: Plane,
      title: 'Pre-Departure Briefing & Accommodations',
      description: 'Guidance on student accommodation bookings, international health insurance, flight bookings, foreign exchange, and campus arrival orientation.',
      deliverables: [
        'On-campus vs. private student housing options',
        'SIM card, banking, and transit guidance',
        'Pre-departure checklist & student peer network'
      ]
    }
  ];

  return (
    <div className="space-y-16 py-12">
      {/* Header */}
      <section className="max-w-4xl mx-auto px-4 text-center space-y-4">
        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
          Our Admissions Services
        </span>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight font-display">
          Complete Guidance Across Your University Journey
        </h1>
        <p className="text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
          Every service is structured to give you maximum clarity, dedicated counselor oversight, and systematic progress tracking.
        </p>
      </section>

      {/* Services Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {servicesList.map((svc, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl p-7 border border-slate-200 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold mb-4">
                  <svc.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{svc.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">{svc.description}</p>
                
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <span className="text-[11px] font-bold uppercase text-slate-400">Key Deliverables:</span>
                  {svc.deliverables.map((item, dIdx) => (
                    <div key={dIdx} className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full justify-between text-xs"
                  onClick={() => navigate('/inquiry')}
                >
                  <span>Check My Fit</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-4 text-center space-y-4">
        <div className="bg-indigo-900 text-white rounded-2xl p-8 sm:p-10 space-y-4 shadow-xl">
          <h3 className="text-2xl font-extrabold">Ready to Begin Your Admissions Journey?</h3>
          <p className="text-xs sm:text-sm text-indigo-200 max-w-lg mx-auto">
            Check your fit or book an appointment with our counselling team today.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" variant="primary" className="bg-indigo-500 hover:bg-indigo-600" onClick={() => navigate('/inquiry')}>
              Check My Fit
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
