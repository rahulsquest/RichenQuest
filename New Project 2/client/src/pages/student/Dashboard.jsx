import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar,
  FileText,
  CreditCard,
  Building2,
  AlertCircle,
  ArrowRight,
  UploadCloud,
  GraduationCap
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ProgressBar, StatusBadge } from '../../components/StatusBadge';
import { CounselorCard } from '../../components/ApplicationTracker';
import { BookingCard } from '../../components/BookingCard';
import { Card } from '../../components/Card';
import Button from '../../components/Button';
import ProfileScoreCard from '../../components/ProfileScoreCard';
import caseService from '../../services/caseService';
import bookingService from '../../services/bookingService';
import documentService from '../../services/documentService';
import paymentService from '../../services/paymentService';
import { formatCurrency } from '../../utils/formatters';

export default function Dashboard() {
  const { student, counselor } = useAuth();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState(null);
  const [upcomingBooking, setUpcomingBooking] = useState(null);
  const [recentDocs, setRecentDocs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      if (!student?.studentId) return;
      try {
        setLoading(true);
        const [cData, bData, dData, pData] = await Promise.allSettled([
          student.caseId ? caseService.getCase(student.caseId) : Promise.reject('No case ID'),
          bookingService.getBookings(student.studentId),
          documentService.getDocuments(student.studentId),
          paymentService.getInvoices(student.studentId)
        ]);

        if (cData.status === 'fulfilled') setCaseData(cData.value?.case);
        if (bData.status === 'fulfilled') {
          const bookings = bData.value?.bookings || [];
          const upcoming = bookings.find(b => b.status === 'CONFIRMED');
          setUpcomingBooking(upcoming || bookings[0] || null);
        }
        if (dData.status === 'fulfilled') setRecentDocs(dData.value?.documents?.slice(0, 3) || []);
        if (pData.status === 'fulfilled') setInvoices(pData.value?.invoices?.slice(0, 2) || []);
      } finally {
        setLoading(false);
      }
    }

    if (student) {
      loadDashboard();
    }
  }, [student]);

  const nextAction = student?.nextAction || {
    title: 'Complete your academic profile',
    description: 'Provide your degree background and test scores to start shortlisting universities.',
    targetRoute: '/profile',
    priority: 'HIGH'
  };

  return (
    <div className="space-y-8">
      {/* 1. Welcome & Next Action Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-300">
                Student Case: {student?.caseId || 'CASE-2026'}
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1 font-display">
                Welcome, {student?.fullName?.split(' ')[0] || 'Student'}!
              </h1>
              <p className="text-xs text-indigo-200 mt-0.5">
                Targeting: {student?.targetDegree || 'Degree Evaluation'} {student?.targetCountries?.length ? `• ${student.targetCountries.join(', ')}` : ''}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="primary"
                onClick={() => navigate('/consultation')}
                className="bg-indigo-500 hover:bg-indigo-600 shadow-md text-xs"
                icon={Calendar}
              >
                Book Consultation
              </Button>
            </div>
          </div>

          {/* Primary NEXT ACTION CARD */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shrink-0 shadow-md">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 block">
                  Priority Next Action
                </span>
                <h4 className="text-sm sm:text-base font-bold text-white leading-snug">
                  {nextAction.title}
                </h4>
                <p className="text-xs text-indigo-100 mt-0.5 max-w-xl">
                  {nextAction.description}
                </p>
              </div>
            </div>

            <Button
              size="md"
              variant="secondary"
              onClick={() => navigate(nextAction.targetRoute || '/profile')}
              className="bg-white text-indigo-950 hover:bg-slate-100 font-bold shrink-0 text-xs py-2 px-4 shadow-sm cursor-pointer"
            >
              Complete Action <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Application Progress Bar */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <ProgressBar
          currentStep={student?.journeyStepIndex || 1}
          totalSteps={student?.totalJourneySteps || 10}
          label="Admissions Journey Roadmap"
        />
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-3">
          <span>
            Current Stage: <strong className="text-slate-800">{student?.journeyStage || 'Profile Onboarding'}</strong>
          </span>
          <Link to="/how-it-works" className="text-indigo-600 hover:underline font-semibold">
            View full 10-step roadmap →
          </Link>
        </div>
      </div>

      {/* 3. Code Kitchen Score */}
      <ProfileScoreCard />

      {/* 4. Main Grid: Counselor + Upcoming Consultation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Counselor Card */}
        <div className="lg:col-span-1">
          <CounselorCard counselor={counselor} />
        </div>

        {/* Upcoming Consultation & Applications */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upcoming Consultation */}
          <Card title="Upcoming 1-on-1 Consultation" action={
            <Link to="/bookings" className="text-xs font-semibold text-indigo-600 hover:underline">
              View All Bookings
            </Link>
          }>
            {upcomingBooking ? (
              <BookingCard booking={upcomingBooking} onReschedule={() => navigate('/bookings')} />
            ) : (
              <div className="text-center py-6 space-y-2">
                <p className="text-xs text-slate-500">No upcoming consultations scheduled.</p>
                <Button size="sm" variant="primary" onClick={() => navigate('/consultation')}>
                  Schedule Session with Counselor
                </Button>
              </div>
            )}
          </Card>

          {/* Quick Target Universities */}
          <Card title="Target Universities & Applications" action={
            <Link to="/applications" className="text-xs font-semibold text-indigo-600 hover:underline">
              Full Application Hub
            </Link>
          }>
            {(student?.targetUniversities || []).length > 0 ? (
              <div className="space-y-3">
                {student.targetUniversities.map((uni, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{uni.name}</h4>
                        <p className="text-[11px] text-slate-500">{uni.program}</p>
                      </div>
                    </div>
                    <StatusBadge status={uni.applicationStatus} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 space-y-2">
                <p className="text-xs text-slate-500">No universities shortlisted yet.</p>
                <Button size="sm" variant="secondary" onClick={() => navigate('/profile')}>
                  Set University Preferences
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* 4. Bottom Grid: Recent Documents & Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Document Vault Quick View */}
        <Card title="Recent Documents in Vault" action={
          <Link to="/documents" className="text-xs font-semibold text-indigo-600 hover:underline">
            Manage Documents
          </Link>
        }>
          {recentDocs.length > 0 ? (
            <div className="space-y-2.5">
              {recentDocs.map((doc) => (
                <div key={doc.documentId} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                    <div>
                      <h5 className="text-xs font-bold text-slate-900 line-clamp-1">{doc.title}</h5>
                      <span className="text-[10px] text-slate-400 font-mono">{doc.fileName}</span>
                    </div>
                  </div>
                  <StatusBadge status={doc.reviewStatus} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 space-y-2">
              <p className="text-xs text-slate-500">No documents uploaded yet.</p>
              <Button size="sm" variant="secondary" onClick={() => navigate('/documents')} icon={UploadCloud}>
                Upload Documents
              </Button>
            </div>
          )}
        </Card>

        {/* Invoices Quick View */}
        <Card title="Financials & Invoices" action={
          <Link to="/payments" className="text-xs font-semibold text-indigo-600 hover:underline">
            Payment Records
          </Link>
        }>
          {invoices.length > 0 ? (
            <div className="space-y-2.5">
              {invoices.map((inv) => (
                <div key={inv.paymentId} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <h5 className="text-xs font-bold text-slate-900 line-clamp-1">{inv.description}</h5>
                      <span className="text-[10px] text-slate-400 font-mono">{inv.invoiceNumber}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-extrabold text-slate-900 block">
                      {formatCurrency(inv.amount, inv.currency || 'INR')}
                    </span>
                    <StatusBadge status={inv.status} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-xs text-slate-500">No invoices issued.</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
