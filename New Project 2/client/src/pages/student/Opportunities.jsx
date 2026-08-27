/**
 * Opportunities — renders matchOpportunities exactly as the engine returned it.
 *
 * THREE RULES THIS FILE EXISTS TO ENFORCE
 *   1. FIT and evidence confidence are never merged into one number. They answer
 *      different questions: how well this suits you, and how much of it we have
 *      actually verified. Averaging them would hide the second.
 *   2. No probability language. FIT is not an admission, visa or success chance,
 *      and nobody can honestly put a number on those.
 *   3. `not_rankable` is shown, not hidden. An empty result with no explanation
 *      is indistinguishable from a broken page.
 */
import { useEffect, useState } from 'react';
import { AlertCircle, ShieldCheck, Info, CalendarClock, Wallet, RefreshCw } from 'lucide-react';
import intelligenceService from '../../services/intelligenceService';

/* Two bars, never one. */
function ScoreBar({ label, value, meaning, tone }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="flex-1 min-w-[140px]">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
        <span className="text-sm font-bold text-slate-800 tabular-nums">{pct}<span className="text-slate-400 font-medium">/100</span></span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
      {meaning && <p className="text-[11px] text-slate-500 mt-1 leading-snug">{meaning}</p>}
    </div>
  );
}

function Field({ icon: Icon, label, value }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="flex items-start gap-2">
      {Icon && <Icon className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />}
      <div>
        <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">{label}</div>
        <div className="text-sm text-slate-700">{String(value)}</div>
      </div>
    </div>
  );
}

/* Eligibility is a state, never a color-coded pass/fail invented on the
 * frontend — these three labels are exactly the engine's own vocabulary
 * (eligibility_status), just with student-facing copy. */
const ELIGIBILITY_COPY = {
  ELIGIBLE: { label: 'Eligible', tone: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  NOT_ELIGIBLE: { label: 'Not eligible', tone: 'bg-red-100 text-red-800 border-red-200' },
  NOT_ELIGIBLE_YET: { label: 'Not eligible yet', tone: 'bg-amber-100 text-amber-800 border-amber-200' },
  UNKNOWN: { label: 'Not enough information', tone: 'bg-slate-100 text-slate-600 border-slate-200' }
};

function OpportunityCard({ o }) {
  /* why_it_matches, missing_requirements and student_strengths are the
   * engine's real field names (matchOpportunities.dg) — a prior version of
   * this component read why_this_matches/match_reasons/reasons, none of
   * which the engine ever sends, so this section silently rendered
   * nothing. student_strengths is literally this student's Code Kitchen
   * profile_strength_breakdown, attached row-by-row by the engine itself —
   * the intended bridge between the two systems, not a new one. */
  const reasons = o.why_it_matches || [];
  const missing = o.missing_requirements || [];
  const strengths = o.student_strengths || [];
  const unscored = o.unscored_dimensions || [];
  const elig = ELIGIBILITY_COPY[o.eligibility_status] || null;
  /* tuition/living cost/verification are nested under provenance, not
   * top-level fields. */
  const prov = o.provenance || {};

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <h3 className="font-bold text-slate-900 leading-tight">{o.opportunity}</h3>
          <p className="text-sm text-slate-500 mt-0.5">
            {[o.country, o.type].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {elig && (
            <span className={`rounded-full border text-xs font-bold px-2.5 py-1 ${elig.tone}`}>
              {elig.label}
            </span>
          )}
          {o.recommendation_rank != null && (
            <span className="rounded-full bg-slate-900 text-white text-xs font-bold px-2.5 py-1">
              #{o.recommendation_rank}
            </span>
          )}
        </div>
      </div>

      {/* Deliberately side by side and never combined. */}
      <div className="flex flex-wrap gap-5 mb-4">
        <ScoreBar label="Fit" value={o.match_score} meaning={o.score_meaning} tone="bg-blue-600" />
        <ScoreBar label="Evidence confidence" value={o.confidence} meaning={o.confidence_meaning} tone="bg-emerald-600" />
      </div>

      {o.rank_reason && (
        <p className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2 mb-4">
          <Info className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5 text-slate-400" />
          {o.rank_reason}
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
        <Field icon={Wallet} label="Tuition" value={prov.tuition_eur ? `€${prov.tuition_eur}/yr` : null} />
        <Field icon={Wallet} label="Living cost" value={prov.living_eur ? `€${prov.living_eur}/yr` : null} />
        <Field icon={CalendarClock} label="Deadline" value={o.deadline} />
        <Field label="Financial fit" value={o.financial_fit} />
        <Field label="Deadline status" value={o.deadline_status} />
        <Field label="Readiness" value={o.readiness_status} />
      </div>

      {reasons.length > 0 && (
        <div className="mb-3">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Why this matches you</h4>
          <ul className="space-y-1">
            {reasons.map((r, i) => (
              <li key={i} className="text-sm text-slate-700 flex gap-2">
                <span className="text-blue-600 mt-0.5">·</span><span>{String(r)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Missing requirements are why eligibility isn't ELIGIBLE — shown
       * next to it, never hidden behind a bare status label. */}
      {missing.length > 0 && (
        <div className="mb-3">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">What's missing for this one</h4>
          <ul className="space-y-1">
            {missing.map((m, i) => (
              <li key={i} className="text-sm text-slate-700 flex gap-2">
                <span className="text-amber-600 mt-0.5">·</span><span>{String(m)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {o.next_action && (
        <p className="text-sm text-slate-800 font-medium bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 mb-3">
          {o.next_action}
        </p>
      )}

      {/* This is the same breakdown Code Kitchen shows on the dashboard —
       * the engine attaches it per-opportunity so a student sees their own
       * profile strength in context, not as a second number. */}
      {strengths.length > 0 && (
        <details className="mb-3">
          <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Your Code Kitchen profile, in context
          </summary>
          <ul className="mt-1.5 space-y-0.5">
            {strengths.map((s, i) => <li key={i} className="text-sm text-slate-600">{String(s)}</li>)}
          </ul>
        </details>
      )}

      {/* Uncertainty is surfaced, never quietly dropped. */}
      {unscored.length > 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-amber-800 mb-1">What is not verified</h4>
          <ul className="space-y-0.5">
            {unscored.map((u, i) => <li key={i} className="text-sm text-amber-900">{String(u)}</li>)}
          </ul>
        </div>
      )}

      {(prov.verified_on || prov.source_url) && (
        <p className="text-[11px] text-slate-400 mt-3 flex items-center gap-1.5">
          <ShieldCheck className="w-3 h-3" />
          {prov.verified_on ? `Verified ${prov.verified_on}` : 'Verified'}
          {prov.source_url && <span className="truncate">· {prov.source_url}</span>}
        </p>
      )}
    </article>
  );
}

/* Not an error state. The student asked a fair question and deserves the
 * reason, not a spinner that resolves into nothing. */
function HonestRefusal({ data, onRequestReview }) {
  const excluded = data.not_rankable || [];
  const asked = data.requested_country || data.country_requested;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      {asked && <p className="text-lg font-bold text-slate-900 mb-2">You asked about {asked}.</p>}
      <p className="text-slate-700 mb-3">
        We currently don&rsquo;t have enough verified {asked ? `${asked} ` : ''}opportunities to
        recommend one responsibly.
      </p>
      <p className="text-slate-600 text-sm mb-5">
        Rather than showing you an unverified option, we&rsquo;re keeping the recommendation empty.
        An option we cannot stand behind is worse than none.
      </p>

      {excluded.length > 0 && (
        <div className="mb-5">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
            What we know, and what is missing
          </h4>
          <ul className="space-y-2">
            {excluded.slice(0, 8).map((e, i) => (
              <li key={i} className="text-sm border-l-2 border-slate-200 pl-3">
                <span className="font-semibold text-slate-800">{e.opportunity}</span>
                {e.country && <span className="text-slate-500"> · {e.country}</span>}
                <div className="text-slate-600">{e.why_excluded || (e.missing && `Missing: ${e.missing}`)}</div>
              </li>
            ))}
          </ul>
          {excluded.length > 8 && (
            <p className="text-xs text-slate-400 mt-2">and {excluded.length - 8} more</p>
          )}
        </div>
      )}

      <button
        onClick={onRequestReview}
        className="rounded-lg bg-slate-900 text-white text-sm font-semibold px-4 py-2.5 hover:bg-slate-800 transition"
      >
        Ask a counsellor to review this
      </button>
    </div>
  );
}

export default function Opportunities() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requested, setRequested] = useState(false);

  const load = async () => {
    setLoading(true); setError(null);
    try { setData(await intelligenceService.getOpportunities()); }
    catch (e) { setError(e.message || 'We could not load your opportunities right now.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const requestReview = async () => {
    try {
      await intelligenceService.createRequest('opportunity_review',
        'Requested from the opportunities screen.');
      setRequested(true);
    } catch { setError('We could not send that request. Please try again.'); }
  };

  if (loading) return <div className="p-6 text-slate-500">Loading your opportunities…</div>;

  if (error) return (
    <div className="p-6">
      <div className="rounded-xl border border-red-200 bg-red-50 p-5">
        <AlertCircle className="w-5 h-5 text-red-600 mb-2" />
        <p className="text-red-900 font-semibold mb-1">{error}</p>
        <button onClick={load} className="text-sm text-red-700 underline inline-flex items-center gap-1.5 mt-1">
          <RefreshCw className="w-3.5 h-3.5" /> Try again
        </button>
      </div>
    </div>
  );

  const ranked = (data && data.ranked) || [];

  return (
    <div className="space-y-6 p-1">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Opportunities for you</h1>
        {data && data.portfolio_health && (
          <p className="text-sm text-slate-500 mt-1">{data.portfolio_health}</p>
        )}
      </header>

      {requested && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-900">
          A counsellor has been asked to review this. We&rsquo;ll be in touch.
        </div>
      )}

      {ranked.length === 0
        ? <HonestRefusal data={data || {}} onRequestReview={requestReview} />
        : <div className="space-y-4">{ranked.map((o, i) => <OpportunityCard key={i} o={o} />)}</div>}

      {ranked.length > 0 && (data.not_rankable || []).length > 0 && (
        <details className="rounded-xl border border-slate-200 bg-white p-5">
          <summary className="cursor-pointer font-semibold text-slate-800 text-sm">
            {data.not_rankable.length} option{data.not_rankable.length === 1 ? '' : 's'} we could not rank &mdash; and why
          </summary>
          <ul className="space-y-2 mt-4">
            {data.not_rankable.map((e, i) => (
              <li key={i} className="text-sm border-l-2 border-slate-200 pl-3">
                <span className="font-semibold text-slate-800">{e.opportunity}</span>
                {e.country && <span className="text-slate-500"> · {e.country}</span>}
                <div className="text-slate-600">{e.why_excluded || (e.missing && `Missing: ${e.missing}`)}</div>
              </li>
            ))}
          </ul>
        </details>
      )}

      {data && data.ranking_factors && (
        <p className="text-xs text-slate-400 leading-relaxed">
          Ranked by: {data.ranking_factors}
        </p>
      )}
    </div>
  );
}
