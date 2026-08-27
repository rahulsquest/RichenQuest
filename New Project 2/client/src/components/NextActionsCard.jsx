import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Card } from './Card';
import intelligenceService from '../services/intelligenceService';

/**
 * Shows the "now" band from studentRoadmap verbatim — no second roadmap
 * algorithm here. If the roadmap is empty (no verified opportunity to
 * anchor to yet), this card says so rather than inventing a task list.
 */
export default function NextActionsCard() {
  const navigate = useNavigate();
  const [state, setState] = useState('loading');
  const [items, setItems] = useState([]);

  useEffect(() => {
    let cancelled = false;
    intelligenceService.getRoadmap()
      .then(data => {
        if (cancelled) return;
        const now = (data && data.now) || [];
        setItems(now.slice(0, 3));
        setState(now.length ? 'ready' : 'empty');
      })
      .catch(() => { if (!cancelled) setState('unavailable'); });
    return () => { cancelled = true; };
  }, []);

  if (state === 'loading') {
    return <Card padding="p-6"><div className="animate-pulse h-16 bg-slate-50 rounded-lg" /></Card>;
  }
  return (
    <Card title="Next best actions" padding="p-6">
      {state === 'unavailable' ? (
        <p className="text-sm text-slate-500">
          Not available yet — this needs your profile linked to a student file first.
        </p>
      ) : state === 'empty' ? (
        <p className="text-sm text-slate-500">
          Your roadmap needs a verified opportunity with an open deadline before next actions
          appear here.
        </p>
      ) : (
        <ol className="space-y-2 list-decimal list-inside">
          {items.map((a, i) => (
            <li key={i} className="text-sm text-slate-700">
              <span className="font-medium text-slate-900">{a.action}</span>
            </li>
          ))}
        </ol>
      )}
      <button
        onClick={() => navigate('/roadmap')}
        className="mt-4 text-xs font-semibold text-indigo-600 hover:underline inline-flex items-center gap-1"
      >
        Open Roadmap <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </Card>
  );
}
