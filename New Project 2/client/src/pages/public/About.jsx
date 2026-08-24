import React from 'react';
import { Compass, ShieldCheck, Globe, Users, Award, CheckCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/Button';

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

      {/* Global Presence */}
      <section className="bg-slate-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2">
              Global Network
            </h2>
            <p className="text-2xl sm:text-3xl font-extrabold text-white">
              Supporting University Placements Worldwide
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700 space-y-2">
              <h4 className="text-base font-bold text-white">United Kingdom</h4>
              <p className="text-xs text-slate-400">London Advisory Hub</p>
              <p className="text-xs text-slate-300 pt-2">Russell Group, Post-Study Work Visa (PSW), and Tier 4 CAS processing.</p>
            </div>
            <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700 space-y-2">
              <h4 className="text-base font-bold text-white">North America</h4>
              <p className="text-xs text-slate-400">US & Canada Applications</p>
              <p className="text-xs text-slate-300 pt-2">STEM OPT programs, F-1 Visa preparation, and Canadian Study Permits.</p>
            </div>
            <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700 space-y-2">
              <h4 className="text-base font-bold text-white">European Union</h4>
              <p className="text-xs text-slate-400">Germany, Ireland & Netherlands</p>
              <p className="text-xs text-slate-300 pt-2">English-taught Master's degrees and low-tuition public universities.</p>
            </div>
            <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700 space-y-2">
              <h4 className="text-base font-bold text-white">Australia & NZ</h4>
              <p className="text-xs text-slate-400">Group of Eight Placements</p>
              <p className="text-xs text-slate-300 pt-2">Fast-track admission assessments and Subclass 500 Visa support.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-4 text-center space-y-4">
        <h3 className="text-2xl font-extrabold text-slate-900">Speak Directly with a Senior Counselor</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Submit your profile details or request an initial consultation session to explore your global study options.
        </p>
        <div className="pt-2">
          <Button size="lg" variant="primary" onClick={() => navigate('/inquiry')}>
            Start Your Inquiry <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </section>
    </div>
  );
}
