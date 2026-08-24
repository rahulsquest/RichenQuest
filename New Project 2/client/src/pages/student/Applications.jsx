import React from 'react';
import { Building2, Calendar, CheckCircle2, Clock, Award, ExternalLink, Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../../components/StatusBadge';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/FileUpload';
import Button from '../../components/Button';
import { formatDate } from '../../utils/formatters';
import { useNavigate } from 'react-router-dom';

export default function Applications() {
  const { student } = useAuth();
  const navigate = useNavigate();

  const universities = student?.targetUniversities || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-600">
            Case Admissions Hub
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-display">
            University Applications & Offer Letters
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track official portal submissions, conditional offers, and CAS issuance deadlines.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => navigate('/consultation')}
          icon={Plus}
        >
          Request University Addition
        </Button>
      </div>

      {/* Target Applications Grid */}
      {universities.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {universities.map((uni) => (
            <div
              key={uni.universityId}
              className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between hover:border-indigo-200 hover:shadow-md transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <StatusBadge status={uni.applicationStatus} />
                </div>

                <h3 className="text-base font-bold text-slate-900 leading-snug">{uni.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">{uni.program}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{uni.country}</p>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Portal Deadline:</span>
                    <span className="font-semibold text-slate-800">{formatDate(uni.submissionDeadline)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Application ID:</span>
                    <span className="font-mono text-slate-700">{uni.universityId}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-slate-100">
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full text-xs"
                  onClick={() => navigate('/documents')}
                >
                  View Dossier Documents
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Building2}
          title="No Universities Shortlisted"
          description="Your admissions counselor will evaluate your profile and shortlist target universities for your review."
          action={
            <Button size="sm" variant="primary" onClick={() => navigate('/consultation')}>
              Schedule Shortlisting Session
            </Button>
          }
        />
      )}

      {/* Application Milestones Roadmap */}
      <Card title="Admissions Cycle Milestones">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Phase 1: Profile & Shortlist</span>
            </div>
            <p className="text-[11px] text-emerald-700">Target universities finalized and approved by counselor.</p>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Phase 2: SOP & LOR Polish</span>
            </div>
            <p className="text-[11px] text-emerald-700">Statement of Purpose and reference letters vetted for submission.</p>
          </div>

          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
            <div className="flex items-center gap-2 text-amber-800 font-bold text-xs mb-1">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Phase 3: Portal Processing</span>
            </div>
            <p className="text-[11px] text-amber-700">Submissions under active review by university admissions committees.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
