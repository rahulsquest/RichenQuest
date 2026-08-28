import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Video, UserCheck } from 'lucide-react';
import { Input, Select, Textarea } from '../../components/Input';
import Button from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import bookingService from '../../services/bookingService';

export default function Consultation() {
  const { student, counselor } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    consultationType: 'Initial Profile Evaluation & University Shortlisting',
    date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
    timeSlot: '14:00 - 14:45 IST',
    notes: ''
  });

  const consultationOptions = [
    'Initial Profile Evaluation & University Shortlisting',
    'Statement of Purpose (SOP) & Essay Strategy',
    'Scholarship & Financial Aid Consultation',
    'Student Visa Guidance & Mock Interview',
    'Pre-Departure Briefing & Accommodations'
  ];

  const timeSlots = [
    '09:30 - 10:15 IST',
    '11:00 - 11:45 IST',
    '14:00 - 14:45 IST',
    '15:30 - 16:15 IST',
    '17:00 - 17:45 IST'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!student?.studentId) {
      addToast('Please complete your profile to book a consultation.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const res = await bookingService.createBooking({
        studentId: student.studentId,
        counselorId: counselor?.counselorId || null,
        ...formData
      });
      /* Report what the server actually did. This previously always said
       * "Consultation confirmed! Calendar invite & confirmation dispatched."
       * — but a booking is only CONFIRMED once Zoho Bookings confirms it, and
       * when that sync is unconfigured or fails the booking is saved as
       * PENDING_CONFIRMATION with no meeting link and no invite sent. The old
       * toast told the student an invite was in their inbox when none existed. */
      addToast(res?.message || 'Consultation request received.', 'success');
      navigate('/bookings');
    } catch (err) {
      addToast(err.message || 'No consultation availability is currently available.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-600">
          Admissions Advisory
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-display">
          Schedule 1-on-1 Counselor Consultation
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Select your consultation objective, date, and preferred video time slot.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Counselor Badge */}
        <div className="md:col-span-1 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Assigned Counselor</span>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm">
              {counselor?.name?.split(' ').map(n => n[0]).join('') || 'AC'}
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">{counselor?.name || 'Admissions Counselor'}</h4>
              <p className="text-xs text-slate-500">{counselor?.title || 'Admissions Specialist'}</p>
            </div>
          </div>
          <div className="text-xs text-slate-600 pt-2 border-t border-slate-100 space-y-1">
            <p><strong>Mode:</strong> Virtual Video Meeting</p>
            <p><strong>Duration:</strong> 45 Minutes</p>
          </div>
        </div>

        {/* Form */}
        <div className="md:col-span-2 bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-xs">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Select
              label="Consultation Topic / Objective"
              name="consultationType"
              value={formData.consultationType}
              onChange={(e) => setFormData({ ...formData, consultationType: e.target.value })}
              options={consultationOptions}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Preferred Date"
                name="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
              {/* These times are a request, not confirmed availability — nothing
                  here is checked against a counsellor's calendar, so the label
                  must not imply a free slot. The backend agrees: a booking stays
                  PENDING_CONFIRMATION until the provider actually confirms it. */}
              <Select
                label="Preferred Time Slot (IST)"
                name="timeSlot"
                value={formData.timeSlot}
                onChange={(e) => setFormData({ ...formData, timeSlot: e.target.value })}
                options={timeSlots}
                helperText="We'll confirm your slot before the session."
                required
              />
            </div>

            <Textarea
              label="Topics / Questions you want to focus on"
              name="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Share your goals, target universities, or questions regarding scholarships..."
              rows={3}
            />

            <Button
              type="submit"
              loading={loading}
              variant="primary"
              size="lg"
              className="w-full mt-2"
              icon={Calendar}
            >
              Confirm Consultation Session
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
