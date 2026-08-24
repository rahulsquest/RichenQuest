/**
 * Roadmap — renders studentRoadmap. No second roadmap algorithm exists here;
 * the ordering, priorities and deadline anchoring all come from the engine.
 */
import { useEffect, useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import intelligenceService from '../../services/intelligenceService';

const BANDS = [
  ['now',           'Now'],
  ['next_30_days',  'Next 30 days'],
  ['next_3_months', 'Next 3 months'],
  ['next_6_months', 'Next 6 months']
];

const PRIORITY = {
  CRITICAL: 'bg-red-100 text-red-800 border-red-200',
  HIGH:     'bg-amber-100 text-amber-800 border-amber-200',
  NORMAL:   'bg-slate-100 text-slate-700 border-slate-200',
  LOW:      'bg-slate-100 text-slate-600 border-slate-200'
};

function Action({ a }) {
  const p = String(a.priority || 'NORMAL').toUpperCase();
  return (
    <li className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <h4 className="font-semibold text-slate-900 leading-snug">{a.action}</h4>
        <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${PRIORITY[p] || PRIORITY.NORMAL}`}>
          {p}
        </span>
      </div>
      {a.reason && <p className="text-sm text-slate-600">{a.reason}</p>}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-slate-500">
        {a.deadline && <span>Deadline: <strong className="text-slate-700">{a.deadline}</strong></span>}
        {a.effort && <span>Effort: {a.effort}</span>}
        {a.dependency && <span>Depends on: {a.dependency}</span>}
        {a.status && <span>Status: {a.status}</span>}
      </div>
    </li>
  );
}

export default function Roadmap() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true); setError(null);
    try { setData(await intelligenceService.getRoadmap()); }
    catch (e) { setError(e.message || 'We could not load your roadmap right now.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  if (loading) return <div className="p-6 text-slate-500">Loading your roadmap…</div>;
  if (error) return (
    <div className="p-6">
      <div className="rounded-xl border border-red-200 bg-red-50 p-5">
        <AlertCircle className="w-5 h-5 text-red-600 mb-2" />
        <p className="text-red-900 font-semibold mb-1">{error}</p>
        <button onClick={load} className="text-sm text-red-700 underline inline-flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Try again
        </button>
      </div>
    </div>
  );

  const empty = BANDS.every(([k]) => !((data && data[k]) || []).length);

  return (
    <div className="space-y-6 p-1">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Your roadmap</h1>
        {data && data.anchor_opportunity && (
          <p className="text-sm text-slate-500 mt-1">
            Anchored to {data.anchor_opportunity}
            {data.anchor_deadline ? ` · ${data.anchor_deadline}` : ''}
          </p>
        )}
      </header>

      {empty ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-slate-700 font-semibold mb-1">There are no actions on your roadmap yet.</p>
          <p className="text-sm text-slate-600">
            The roadmap is built from a verified opportunity and its deadline. Once one of your
            options is verified and still open, your next steps appear here.
          </p>
        </div>
      ) : BANDS.map(([key, label]) => {
        const items = (data && data[key]) || [];
        if (!items.length) return null;
        return (
          <section key={key}>
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">{label}</h2>
            <ul className="space-y-3">{items.map((a, i) => <Action key={i} a={a} />)}</ul>
          </section>
        );
      })}

      {data && data.timeline_basis && (
        <p className="text-xs text-slate-400">{data.timeline_basis}</p>
      )}
    </div>
  );
}
