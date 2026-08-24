/**
 * Report — renders studentReport.
 *
 * The engine returns `report_lines` as an ORDERED ARRAY, not a joined string,
 * and `counsellor_review` alongside it. Only the student-facing lines are
 * rendered here: counsellor_review is internal and must not reach this screen.
 *
 * `approved` gates release. An unapproved report is not shown as if it were
 * final, because a family acting on an unreviewed recommendation is exactly
 * what the approval step exists to prevent.
 */
import { useEffect, useState } from 'react';
import { AlertCircle, RefreshCw, FileText } from 'lucide-react';
import intelligenceService from '../../services/intelligenceService';

export default function Report() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true); setError(null);
    try { setData(await intelligenceService.getReport()); }
    catch (e) { setError(e.message || 'We could not load your report right now.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  if (loading) return <div className="p-6 text-slate-500">Loading your report…</div>;
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

  const lines = (data && data.report_lines) || [];

  return (
    <div className="space-y-6 p-1">
      <header className="flex items-start gap-3">
        <FileText className="w-6 h-6 text-slate-400 mt-1" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Your report</h1>
          {data && data.generated_at && (
            <p className="text-sm text-slate-500 mt-0.5">Generated {data.generated_at}</p>
          )}
        </div>
      </header>

      {data && data.approved === false && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
          <p className="text-sm text-amber-900">
            <strong>A counsellor has not yet reviewed this report.</strong> You can read it, but
            please wait for the review before acting on it — we would rather you saw it early than
            not at all.
          </p>
        </div>
      )}

      {lines.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-slate-700">Your report is not ready yet. It is written once there is
          enough verified information in your profile to say something useful.</p>
        </div>
      ) : (
        <article className="rounded-xl border border-slate-200 bg-white p-6 space-y-2">
          {lines.map((l, i) => {
            const t = String(l);
            if (!t.trim()) return <div key={i} className="h-2" />;
            const heading = /^[A-Z][A-Z —\-]{4,}$/.test(t.trim());
            return heading
              ? <h2 key={i} className="text-[11px] font-bold uppercase tracking-wider text-slate-500 pt-3">{t}</h2>
              : <p key={i} className="text-slate-700 leading-relaxed">{t}</p>;
          })}
        </article>
      )}
    </div>
  );
}
