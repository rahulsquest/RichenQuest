import React from 'react';
import { Building2, Calendar, CheckCircle2, Clock, ExternalLink } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { formatDate } from '../utils/formatters';

export function ApplicationTracker({ universities = [] }) {
  if (!universities || universities.length === 0) {
    return (
      <div className="text-center py-6 text-slate-400 text-xs italic">
        No university applications logged yet.
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {universities.map((uni, idx) => (
        <div key={uni.universityId || idx} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm shrink-0 border border-slate-200">
              <Building2 className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">{uni.name}</h4>
              <p className="text-xs text-slate-500">{uni.program} • {uni.country}</p>
              {uni.submissionDeadline && (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Deadline: {formatDate(uni.submissionDeadline)}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2">
            <StatusBadge status={uni.applicationStatus} />
            <span className="text-[11px] font-mono text-slate-400">
              ID: {uni.universityId}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function CounselorCard({ counselor }) {
  if (!counselor) return null;

  return (
    <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -mr-10 -mt-10" />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <span className="px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-500/30 text-[11px] font-semibold uppercase tracking-wider">
            Assigned Counselor
          </span>
          <span className="text-amber-400 font-bold text-xs flex items-center gap-1">
            ★ {counselor.rating}
          </span>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-indigo-600 border-2 border-indigo-400/50 flex items-center justify-center font-bold text-xl text-white shadow-md">
            {counselor.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <h3 className="text-base font-bold text-white">{counselor.name}</h3>
            <p className="text-xs text-indigo-200">{counselor.title}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{counselor.office}</p>
          </div>
        </div>

        <div className="space-y-1.5 text-xs text-slate-300 mb-4 border-t border-slate-800 pt-3">
          <p><strong className="text-slate-200">Email:</strong> {counselor.email}</p>
          <p><strong className="text-slate-200">Direct Phone:</strong> {counselor.phone}</p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {counselor.specialization?.map((spec, idx) => (
            <span key={idx} className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
              {spec}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ApplicationTracker;
