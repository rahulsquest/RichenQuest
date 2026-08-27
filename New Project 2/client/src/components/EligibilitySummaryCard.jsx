import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, HelpCircle, XCircle, ArrowRight } from 'lucide-react';
import { Card } from './Card';
import intelligenceService from '../services/intelligenceService';

/**
 * Aggregates eligibility_status across the student's own ranked
 * opportunities. This performs NO eligibility computation of its own —
 * every status comes from matchOpportunities (see Opportunities.jsx for
 * the same field names). This card only counts what the engine already
 * decided; it never assigns eligibility based on Code Kitchen score.
 */
export default function EligibilitySummaryCard() {
  const navigate = useNavigate();
  const [state, setState] = useState('loading');
  const [counts, setCounts] = useState(null);

  useEffect(() => {
    let cancelled = false;
    intelligenceService.getOpportunities()
      .then(data => {
        if (cancelled) return;
        const ranked = (data && data.ranked) || [];
        if (!ranked.length) { setState('empty'); return; }
        const tally = { ELIGIBLE: 0, NOT_ELIGIBLE_YET: 0, NOT_ELIGIBLE: 0, UNKNOWN: 0 };
        ranked.forEach(o => {
          const k = o.eligibility_status;
          if (k && k in tally) tally[k] += 1; else tally.UNKNOWN += 1;
        });
        setCounts(tally);
        setState('ready');
      })
      .catch(() => { if (!cancelled) setState('unavailable'); });
    return () => { cancelled = true; };
  }, []);

  if (state === 'loading') {
    return <Card padding="p-6"><div className="animate-pulse h-16 bg-slate-50 rounded-lg" /></Card>;
  }
  if (state === 'unavailable') {
    return (
      <Card title="Eligibility" padding="p-6">
        <p className="text-sm text-slate-500">
          Not available yet — this needs your profile linked to a student file first.
        </p>
      </Card>
    );
  }
  if (state === 'empty') {
    return (
      <Card title="Eligibility" padding="p-6">
        <p className="text-sm text-slate-500">
          No opportunities have been evaluated for eligibility yet.
        </p>
      </Card>
    );
  }

  const rows = [
    { key: 'ELIGIBLE', label: 'eligible', Icon: CheckCircle2, tone: 'text-emerald-600' },
    { key: 'NOT_ELIGIBLE_YET', label: 'need more information or profile progress', Icon: HelpCircle, tone: 'text-amber-600' },
    { key: 'NOT_ELIGIBLE', label: 'currently not eligible', Icon: XCircle, tone: 'text-red-600' },
    { key: 'UNKNOWN', label: 'not enough information to evaluate', Icon: HelpCircle, tone: 'text-slate-400' }
  ].filter(r => counts[r.key] > 0);

  return (
    <Card title="Eligibility" padding="p-6">
      <ul className="space-y-2.5">
        {rows.map(r => (
          <li key={r.key} className="flex items-center gap-2.5">
            <r.Icon className={`w-4 h-4 shrink-0 ${r.tone}`} />
            <span className="text-sm text-slate-700">
              <strong className="text-slate-900">{counts[r.key]}</strong> {r.label}
            </span>
          </li>
        ))}
      </ul>
      <button
        onClick={() => navigate('/opportunities')}
        className="mt-4 text-xs font-semibold text-indigo-600 hover:underline inline-flex items-center gap-1"
      >
        View opportunities <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </Card>
  );
}
