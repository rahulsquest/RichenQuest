import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Search,
  ArrowRight,
  CheckCircle2,
  UserCheck,
  Target,
  ShieldCheck,
  MapPin,
  Calendar,
  Link2,
  BadgeCheck
} from 'lucide-react';
import Button from '../../components/Button';
import { TARGET_COUNTRIES, DEGREE_LEVELS, JOURNEY_STEPS } from '../../constants/entities';

export default function Home() {
  const navigate = useNavigate();
  const [selectedCountry, setSelectedCountry] = useState('United Kingdom');
  const [selectedDegree, setSelectedDegree] = useState('Postgraduate (Master\'s / MSc / MA / MEng / MBA)');

  const handleFinderSubmit = (e) => {
    e.preventDefault();
    navigate(`/inquiry?country=${encodeURIComponent(selectedCountry)}&degree=${encodeURIComponent(selectedDegree)}`);
  };

  const verificationFields = ['Tuition', 'Living cost', 'Application deadline', 'Source URL', 'Verification date'];

  const matchDimensions = [
    { label: 'Financial Fit', earned: 30, available: 30 },
    { label: 'Country', earned: 20, available: 20 },
    { label: 'Domain', earned: 0, available: 20 },
    { label: 'English', earned: 15, available: 15 },
    { label: 'Level', earned: null, available: null }
  ];

  return (
    <div className="space-y-20 pb-20">
      {/* 1. Hero Section */}
      <section className="relative pt-12 pb-20 overflow-hidden bg-gradient-to-b from-indigo-900 via-slate-900 to-slate-900 text-white">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#818cf8_1px,transparent_1px)] [background-size:24px_24px]" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Global Education Mobility Intelligence
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight font-display">
              Your World. <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-amber-300">Matched to You.</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto font-light">
              We start with your profile — academics, budget, and goals — match it against real study-abroad opportunities, and verify the tuition, cost, and deadline details before they reach your shortlist. Then a real counsellor helps you act on it.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <Button
                size="lg"
                variant="primary"
                onClick={() => navigate('/inquiry')}
                className="bg-indigo-500 hover:bg-indigo-600 shadow-lg shadow-indigo-500/25"
              >
                Check My Fit <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
              <Button
                size="lg"
                onClick={() => navigate('/contact')}
                className="bg-slate-700 text-white border-slate-700 hover:bg-slate-700"
              >
                Talk to a Counsellor
              </Button>
            </div>
            <button
              onClick={() => navigate('/how-it-works')}
              className="text-xs font-semibold text-indigo-300 hover:text-indigo-200 underline underline-offset-4 cursor-pointer"
            >
              See how the process works
            </button>
          </div>

          {/* Program Finder Widget */}
          <div className="mt-14 max-w-4xl mx-auto bg-white rounded-2xl p-6 sm:p-8 text-slate-900 shadow-2xl border border-slate-100">
            <div className="flex items-center gap-2 mb-1.5">
              <Search className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-bold text-slate-900">Check Your Fit</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Tell us where and what you want to study — we'll show you what a fit could look like.
            </p>

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
                  Check My Fit
                </Button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* 2. Value Propositions: Understand / Match / Verify */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-2">
            How RichenQuest Works For You
          </h2>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Not a Form. Not a Guess.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-2xl p-7 border border-slate-200 shadow-xs hover:border-indigo-200 hover:shadow-md transition-all space-y-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <UserCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Understand</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              We start with your actual profile — academics, budget, timeline, and goals — not a generic intake form.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-7 border border-slate-200 shadow-xs hover:border-indigo-200 hover:shadow-md transition-all space-y-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Target className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Match</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Your profile is compared against real study-abroad opportunities to surface the ones that actually fit you.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-7 border border-slate-200 shadow-xs hover:border-indigo-200 hover:shadow-md transition-all space-y-3">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Verify</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Before a number reaches your shortlist, we check it against an authoritative source — so you plan on facts, not guesses.
            </p>
          </div>
        </div>
      </section>

      {/* 3. We Don't Guess. We Verify. */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-7 sm:p-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-7">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-2">
                Our Verification Gate
              </h2>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                We Don't Guess. We Verify.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-sm shrink-0">
              <BadgeCheck className="w-5 h-5" />
              Verified / Ready
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {verificationFields.map((field) => (
              <div key={field} className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-center space-y-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" />
                <span className="text-xs font-semibold text-slate-700 block leading-snug">{field}</span>
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-500 leading-relaxed mt-6">
            Every opportunity we recommend is checked against these five fields before it's shown to you. If any of them aren't confirmed yet, we say so — we don't publish a guess as a fact.
          </p>
        </div>
      </section>

      {/* 4. Match Score Preview (Example) */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-2">
            Example Match
          </h2>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            What a Match Actually Looks Like
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Illustrative example only — not a real student's result.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-7 sm:p-10 space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-5 space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Match Score</span>
              <p className="text-3xl font-extrabold text-indigo-900">76<span className="text-base text-indigo-400">/100</span></p>
              <p className="text-xs text-indigo-700 leading-relaxed">
                How well this opportunity fits your profile on the points that could be scored — financial fit, country, subject domain, English requirement, and study level. This is a fit score, not a probability of admission, scholarship, or visa outcome.
              </p>
            </div>
            <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-5 space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Evidence Confidence</span>
              <p className="text-3xl font-extrabold text-emerald-900">85<span className="text-base text-emerald-400">/100</span></p>
              <p className="text-xs text-emerald-700 leading-relaxed">
                How many of the 100 possible fit points had enough published data to be scored. When information is missing, we score honestly on fewer points — we never guess and call it a full score.
              </p>
            </div>
          </div>

          <div>
            <span className="text-[11px] font-bold uppercase text-slate-400">Score Breakdown</span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-2">
              {matchDimensions.map((d) => (
                <div key={d.label} className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-center">
                  <span className="text-[11px] font-semibold text-slate-500 block">{d.label}</span>
                  {d.earned === null ? (
                    <span className="text-[11px] font-bold text-slate-400 block mt-0.5 leading-snug">Not scored — data not published</span>
                  ) : (
                    <span className="text-sm font-extrabold text-slate-900">{d.earned}/{d.available}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 5. Example Opportunity Card */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-2">
            Example Opportunity View
          </h2>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            One Opportunity, Fully Broken Down
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden">
          <div className="bg-slate-900 text-white p-6 flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Example Opportunity</p>
              <h3 className="text-lg font-bold">MSc Data Science — Example University</h3>
              <div className="flex items-center gap-1.5 text-xs text-slate-300 mt-1">
                <MapPin className="w-3.5 h-3.5" /> Example Country
              </div>
            </div>
            <div className="flex gap-3">
              <div className="text-center px-3 py-2 rounded-lg bg-indigo-500/20 border border-indigo-400/30">
                <span className="block text-[10px] uppercase text-indigo-200">Match</span>
                <span className="block text-lg font-extrabold text-white">76</span>
              </div>
              <div className="text-center px-3 py-2 rounded-lg bg-emerald-500/20 border border-emerald-400/30">
                <span className="block text-[10px] uppercase text-emerald-200">Confidence</span>
                <span className="block text-lg font-extrabold text-white">85</span>
              </div>
            </div>
          </div>

          <div className="p-6 grid grid-cols-2 sm:grid-cols-3 gap-5 text-xs">
            <div>
              <span className="text-slate-400 font-semibold block mb-0.5">Tuition</span>
              <span className="text-slate-900 font-bold">€14,500 / yr</span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block mb-0.5">Living Cost</span>
              <span className="text-slate-900 font-bold">€9,200 / yr</span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block mb-0.5">Deadline</span>
              <span className="text-slate-900 font-bold flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-slate-400" /> 15 Jan</span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block mb-0.5">Eligibility</span>
              <span className="text-emerald-600 font-bold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Meets requirements</span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block mb-0.5">Verification Date</span>
              <span className="text-slate-900 font-bold">Checked this cycle</span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block mb-0.5">Source</span>
              <span className="text-slate-900 font-bold flex items-center gap-1"><Link2 className="w-3.5 h-3.5 text-slate-400" /> Official source on file</span>
            </div>
          </div>

          <div className="px-6 pb-5">
            <p className="text-[11px] text-slate-400 italic">
              Illustrative example. Not a real listing — your actual opportunities are shown after you check your fit.
            </p>
          </div>
        </div>
      </section>

      {/* 6. The 10-Step Student Journey */}
      <section className="bg-slate-900 text-white py-18">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2">
              From Uncertainty to a Clear Next Step
            </h2>
            <p className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              The 10-Step Student Journey
            </p>
            <p className="text-xs text-slate-400 mt-2 max-w-xl mx-auto">
              Profile intelligence, opportunity matching, and verification — combined with real counsellor guidance — across every stage, tracked in your personal dashboard.
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

      {/* 7. Closing CTA */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-indigo-700 to-indigo-900 rounded-3xl p-8 sm:p-12 text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 max-w-xl">
            <span className="px-3 py-1 rounded-full bg-indigo-500/30 text-indigo-200 text-xs font-semibold uppercase tracking-wider">
              Ready for 2026 / 2027 Intakes
            </span>
            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              See What Actually Fits You
            </h3>
            <p className="text-xs sm:text-sm text-indigo-100 leading-relaxed font-light">
              Share your academic background and target destinations — we'll match you against real opportunities and connect you with a dedicated counsellor.
            </p>
          </div>
          <div className="shrink-0 flex flex-col sm:flex-row gap-3">
            <Button
              size="lg"
              variant="secondary"
              onClick={() => navigate('/inquiry')}
              className="bg-white text-indigo-900 hover:bg-slate-50 font-bold px-8 py-3.5 shadow-xl"
            >
              Check My Fit
            </Button>
            <Button
              size="lg"
              onClick={() => navigate('/contact')}
              className="bg-indigo-800/60 text-white border-indigo-400/30 hover:bg-indigo-800 px-8 py-3.5"
            >
              Talk to a Counsellor
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
