import React from 'react';
import { Calendar, Clock, Video, UserCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { formatDate } from '../utils/formatters';
import Button from './Button';

export function BookingCard({ booking, onReschedule, onCancel }) {
  if (!booking) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs hover:border-slate-300 transition-all">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
            {booking.bookingId}
          </span>
          <h4 className="text-base font-bold text-slate-900 mt-0.5">
            {booking.consultationType}
          </h4>
        </div>
        <StatusBadge status={booking.status} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-3 border-y border-slate-100 text-xs text-slate-600 mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
          <span><strong className="text-slate-800">Date:</strong> {formatDate(booking.date)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
          <span><strong className="text-slate-800">Time:</strong> {booking.timeSlot}</span>
        </div>
        <div className="flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-indigo-600 shrink-0" />
          <span><strong className="text-slate-800">Counselor:</strong> {booking.counselorName}</span>
        </div>
        <div className="flex items-center gap-2">
          <Video className="w-4 h-4 text-indigo-600 shrink-0" />
          <span><strong className="text-slate-800">Mode:</strong> {booking.meetingType}</span>
        </div>
      </div>

      {booking.notes && (
        <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg mb-4 italic">
          "{booking.notes}"
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] text-slate-400 font-mono">
          Zoho Bookings ID: {booking.zohoBookingsId || 'Pending'}
        </span>
        <div className="flex items-center gap-2">
          {booking.status === 'CONFIRMED' && booking.meetingUrl && (
            <a
              href={booking.meetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
            >
              <Video className="w-3.5 h-3.5" />
              Join Zoho Meeting
            </a>
          )}
          {booking.status === 'CONFIRMED' && onReschedule && (
            <Button size="sm" variant="secondary" onClick={() => onReschedule(booking)}>
              Reschedule
            </Button>
          )}
          {booking.status === 'CONFIRMED' && onCancel && (
            <Button size="sm" variant="ghost" className="text-rose-600 hover:bg-rose-50" onClick={() => onCancel(booking)}>
              Cancel
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default BookingCard;
