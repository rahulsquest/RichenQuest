import React from 'react';
import { Compass, ShieldCheck, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/Button';
import { TARGET_COUNTRIES } from '../../constants/entities';

export default function About() {
  const navigate = useNavigate();

  return (
    <div className="space-y-16 py-12">
      {/* Header */}
      <section className="max-w-4xl mx-auto px-4 text-center space-y-4">
        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
          About RichenQuest
        </span>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight font-display">
          Guiding Global Scholars with Transparency & Precision
        </h1>
        <p className="text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
          RichenQuest is a modern international education platform designed to make overseas university admissions clear, predictable, and stress-free.
        </p>
      </section>

      {/* Mission & Vision Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-xs space-y-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Compass className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Our Core Mission</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              To eliminate the complexity of studying abroad by providing students with personalized counseling, rigorous academic document reviews, scholarship strategies, and real-time application tracking.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-xs space-y-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Our Credibility Standards</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              We operate with full transparency. No inflated promises or fake statistics. Every university shortlisting recommendation is backed by thorough eligibility audits and official faculty requirements.
            </p>
          </div>
        </div>
      </section>

      {/* Where We Operate */}
      <section className="bg-slate-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2">
              Where We Operate
            </h2>
            <p className="text-2xl sm:text-3xl font-extrabold text-white">
              India-Based, Globally Focused
            </p>
          </div>

          <div className="max-w-3xl mx-auto bg-slate-800/80 p-8 rounded-2xl border border-slate-700 text-center space-y-4">
            <p className="text-sm text-slate-300 leading-relaxed">
              RichenQuest is built and run from India. The platform supports applications across {TARGET_COUNTRIES.length} destination countries — from the United Kingdom and Europe to North America, Australia, and beyond — all coordinated through one India-based counselling desk.
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              We don't claim offices we don't have. Every conversation with our team happens directly with our India-based counsellors — by video call, phone, email, or WhatsApp.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-4 text-center space-y-4">
        <h3 className="text-2xl font-extrabold text-slate-900">Speak Directly with a Senior Counsellor</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Check your fit or request an initial consultation session to explore your global study options.
        </p>
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" variant="primary" onClick={() => navigate('/inquiry')}>
            Check My Fit <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
          <Button size="lg" variant="secondary" onClick={() => navigate('/contact')}>
            Talk to a Counsellor
          </Button>
        </div>
      </section>
    </div>
  );
}
