import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, TrendingUp, AlertCircle, ArrowRight, Info } from 'lucide-react';
import { Card } from './Card';
import Button from './Button';
import intelligenceService from '../services/intelligenceService';

const DIMENSION_LABELS = {
  academics: 'Academics',
  skills: 'Skills',
  projects: 'Projects',
  achievements: 'Achievements',
  extracurriculars_and_languages: 'Extracurriculars & Languages'
};

function DimensionBar({ dimKey, dim }) {
  const label = DIMENSION_LABELS[dimKey] || dimKey;
  const pct = dim.max > 0 ? Math.round((dim.score / dim.max) * 100) : 0;
  const notProvided = dim.evaluation_state === 'NOT_PROVIDED';

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-slate-700">{label}</span>
        <span className={`text-xs font-bold ${notProvided ? 'text-slate-400' : 'text-slate-900'}`}>
          {dim.score}/{dim.max}
        </span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${
            notProvided ? 'bg-slate-300' : 'bg-gradient-to-r from-indigo-600 to-indigo-400'
          }`}
          style={{ width: `${notProvided ? 100 : pct}%`, opacity: notProvided ? 0.35 : 1 }}
        />
      </div>
      <p className="text-[11px] text-slate-500 mt-1">
        {notProvided ? 'Not enough information to evaluate this dimension yet.' : dim.evidence}
      </p>
    </div>
  );
}

export default function ProfileScoreCard() {
  const navigate = useNavigate();
  const [state, setState] = useState('loading'); // loading | ready | not_linked | unavailable
  const [score, setScore] = useState(null);

  useEffect(() => {
    let cancelled = false;
    intelligenceService.getProfileScore()
      .then(data => { if (!cancelled) { setScore(data); setState('ready'); } })
      .catch(err => {
        if (cancelled) return;
        if (err.code === 'PROFILE_NOT_LINKED') setState('not_linked');
        else setState('unavailable');
      });
    return () => { cancelled = true; };
  }, []);

  if (state === 'loading') {
    return (
      <Card padding="p-6">
        <div className="animate-pulse h-24 bg-slate-50 rounded-lg" />
      </Card>
    );
  }

  if (state === 'not_linked') {
    return (
      <Card title="Your Code Kitchen Score" padding="p-6">
        <div className="flex items-start gap-3 py-2">
          <Info className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-slate-800">Not calculated yet</p>
            <p className="text-xs text-slate-500 mt-1">
              Your account isn't linked to a student file yet. Complete your profile to get your
              Code Kitchen Score.
            </p>
            <Button size="sm" variant="primary" className="mt-3" onClick={() => navigate('/profile')}>
              Complete Your Profile
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  if (state === 'unavailable') {
    return (
      <Card title="Your Code Kitchen Score" padding="p-6">
        <div className="flex items-start gap-3 py-2">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-slate-800">Temporarily unavailable</p>
            <p className="text-xs text-slate-500 mt-1">
              We can't calculate your score right now. This is never shown as a low score —
              it means the calculation itself couldn't run. Please try again shortly.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const strengths = score.strengths || [];
  const gaps = score.gaps || [];
  const recommendations = score.recommendations || [];

  return (
    <Card padding="p-0">
      <div className="p-6 pb-5 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-600">
              <Sparkles className="w-3 h-3" /> Your Code Kitchen Score
            </span>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Based on the information currently available in your profile
            </p>
          </div>
        </div>
        <div className="flex items-end gap-4 mt-3">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-extrabold text-slate-900 font-display">{score.profile_strength}</span>
            <span className="text-lg font-semibold text-slate-400">/ 100</span>
          </div>
          <div className="pb-1">
            <span className="text-xs text-slate-500">Profile Completeness</span>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="w-24 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${score.profile_completeness}%` }} />
              </div>
              <span className="text-xs font-bold text-slate-700">{score.profile_completeness}%</span>
            </div>
          </div>
        </div>
        <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
          {score.profile_strength_meaning}
        </p>
      </div>

      <div className="p-6 space-y-4">
        {Object.entries(score.dimensions).map(([key, dim]) => (
          <DimensionBar key={key} dimKey={key} dim={dim} />
        ))}
      </div>

      {(strengths.length > 0 || gaps.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-6 pb-6">
          {strengths.length > 0 && (
            <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-4">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-emerald-700">
                <TrendingUp className="w-3.5 h-3.5" /> What's helping your profile
              </span>
              <ul className="mt-2 space-y-1">
                {strengths.map(s => (
                  <li key={s.dimension} className="text-xs text-emerald-900">
                    {DIMENSION_LABELS[s.dimension] || s.dimension}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {gaps.length > 0 && (
            <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-4">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-amber-700">
                <AlertCircle className="w-3.5 h-3.5" /> What you should improve
              </span>
              <ul className="mt-2 space-y-1">
                {gaps.map(g => (
                  <li key={g.dimension} className="text-xs text-amber-900">
                    {DIMENSION_LABELS[g.dimension] || g.dimension}
                    {g.state === 'NOT_PROVIDED' && (
                      <span className="text-amber-600"> — not enough information yet</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {recommendations.length > 0 && (
        <div className="px-6 pb-6">
          <Button
            size="sm"
            variant="primary"
            className="w-full sm:w-auto"
            onClick={() => navigate('/profile')}
          >
            Improve My Profile <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </Card>
  );
}
