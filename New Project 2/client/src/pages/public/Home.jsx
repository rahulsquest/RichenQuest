import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Compass,
  ArrowRight,
  GraduationCap,
  FileCheck2,
  CalendarCheck,
  ShieldCheck,
  Building2,
  CheckCircle2,
  Sparkles,
  Search,
  Globe,
  Award,
  Users,
  Clock
} from 'lucide-react';
import Button from '../../components/Button';
import { TARGET_COUNTRIES, DEGREE_LEVELS, JOURNEY_STEPS } from '../../constants/entities';
import env from '../../config/environment';

export default function Home() {
  const navigate = useNavigate();
  const [selectedCountry, setSelectedCountry] = useState('United Kingdom');
  const [selectedDegree, setSelectedDegree] = useState('Postgraduate (Master\'s / MSc / MA / MEng / MBA)');

  const handleFinderSubmit = (e) => {
    e.preventDefault();
    navigate(`/inquiry?country=${encodeURIComponent(selectedCountry)}&degree=${encodeURIComponent(selectedDegree)}`);
  };

  return (
    <div className="space-y-20 pb-20">
      {/* 1. Hero Section */}
      <section className="relative pt-12 pb-20 overflow-hidden bg-gradient-to-b from-indigo-900 via-slate-900 to-slate-900 text-white">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#818cf8_1px,transparent_1px)] [background-size:24px_24px]" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Empowering International Scholars Across 20+ Countries
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight font-display">
              We make the complicated student journey <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-amber-300">easier.</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto font-light">
              From university shortlisting and SOP reviews to Tier 4 visa filing and 1-on-1 counseling, RichenQuest guides your entire admissions roadmap with full transparency.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <Button
                size="lg"
                variant="primary"
                onClick={() => navigate('/inquiry')}
                className="bg-indigo-500 hover:bg-indigo-600 shadow-lg shadow-indigo-500/25"
              >
                Submit Study Inquiry <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
              <Button
                size="lg"
                // variant="secondary"
                onClick={() => navigate('/how-it-works')}
                className="bg-slate-700 text-white border-slate-700 hover:bg-slate-700"
              >
                Explore How It Works
              </Button>
            </div>
          </div>

          {/* Program Finder Widget */}
          <div className="mt-14 max-w-4xl mx-auto bg-white rounded-2xl p-6 sm:p-8 text-slate-900 shadow-2xl border border-slate-100">
            <div className="flex items-center gap-2 mb-4">
              <Search className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-bold text-slate-900">Start Your Global University Match</h3>
            </div>

            <form onSubmit={handleFinderSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Target Destination
                </label>
                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  {TARGET_COUNTRIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Study Level
                </label>
                <select
                  value={selectedDegree}
                  onChange={(e) => setSelectedDegree(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  {DEGREE_LEVELS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <Button type="submit" variant="primary" className="w-full py-2.5">
                  Match Programs
                </Button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* 2. Value Propositions */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-2">
            Why Students Choose RichenQuest
          </h2>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            End-to-End Admissions Architecture
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-2xl p-7 border border-slate-200 shadow-xs hover:border-indigo-200 hover:shadow-md transition-all space-y-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <GraduationCap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Dedicated Counselor Assignment</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Direct access to senior admissions specialists who curate shortlisted universities matching your academic profile and career aspirations.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-7 border border-slate-200 shadow-xs hover:border-indigo-200 hover:shadow-md transition-all space-y-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Document Review & WorkDrive Vault</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Every Statement of Purpose (SOP), transcript, and recommendation letter is thoroughly reviewed and stored in your secure document vault.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-7 border border-slate-200 shadow-xs hover:border-indigo-200 hover:shadow-md transition-all space-y-3">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Live Consultation Scheduling</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Schedule 1-on-1 video sessions with your counselor directly via integrated Zoho Bookings with automated WhatsApp and email reminders.
            </p>
          </div>
        </div>
      </section>

      {/* 3. The 10-Step Student Journey */}
      <section className="bg-slate-900 text-white py-18">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2">
              Transparent Milestone Roadmap
            </h2>
            <p className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              The 10-Step Student Journey
            </p>
            <p className="text-xs text-slate-400 mt-2">
              Every stage is tracked and synchronized in your personal student dashboard.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {JOURNEY_STEPS.map((step) => (
              <div
                key={step.index}
                className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 hover:border-indigo-500/50 transition-all flex flex-col justify-between"
              >
                <div>
                  <span className="text-[10px] font-extrabold font-mono text-indigo-400 uppercase">
                    Step {step.index + 1}
                  </span>
                  <h4 className="text-xs font-bold text-white mt-1 leading-snug">
                    {step.label}
                  </h4>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Tracked</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Lead Capture CTA */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-indigo-700 to-indigo-900 rounded-3xl p-8 sm:p-12 text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 max-w-xl">
            <span className="px-3 py-1 rounded-full bg-indigo-500/30 text-indigo-200 text-xs font-semibold uppercase tracking-wider">
              Ready for 2026 / 2027 Intakes
            </span>
            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Begin Your University Application Today
            </h3>
            <p className="text-xs sm:text-sm text-indigo-100 leading-relaxed font-light">
              Submit your academic background and target destinations to connect with your dedicated admissions counselor.
            </p>
          </div>
          <div className="shrink-0">
            <Button
              size="lg"
              variant="secondary"
              onClick={() => navigate('/inquiry')}
              className="bg-white text-indigo-900 hover:bg-slate-50 font-bold px-8 py-3.5 shadow-xl"
            >
              Get Started Now
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
