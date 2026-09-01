import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Plus, Video, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { BookingCard } from '../../components/BookingCard';
import { Modal } from '../../components/Modal';
import { Input, Select } from '../../components/Input';
import Button from '../../components/Button';
import { EmptyState, LoadingState, ErrorState } from '../../components/FileUpload';
import bookingService from '../../services/bookingService';

export default function Bookings() {
  const { student } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleSlot, setRescheduleSlot] = useState('15:30 - 16:15 IST');
  const [processing, setProcessing] = useState(false);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const data = await bookingService.getBookings(student?.studentId);
      setBookings(data.bookings || []);
    } catch (err) {
      addToast('Failed to load bookings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [student]);

  const handleOpenReschedule = (b) => {
    setSelectedBooking(b);
    setRescheduleDate(b.date);
    setRescheduleSlot(b.timeSlot);
    setRescheduleModalOpen(true);
  };

  const handleConfirmReschedule = async () => {
    if (!rescheduleDate || !rescheduleSlot) {
      addToast('Please select a valid date and time slot', 'warning');
      return;
    }
    setProcessing(true);
    try {
      const res = await bookingService.rescheduleBooking(selectedBooking.bookingId, {
        date: rescheduleDate,
        timeSlot: rescheduleSlot
      });
      /*  Was: "Updated invite dispatched." No invite is sent — Flow is
       *  unconfigured — so that half was false. */
      addToast(res?.message || 'Consultation rescheduled.', 'success');
      setRescheduleModalOpen(false);
      fetchBookings();
    } catch (err) {
      addToast(err.message || 'Failed to reschedule booking', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = async (b) => {
    if (!window.confirm(`Are you sure you want to cancel your session for "${b.consultationType}"?`)) {
      return;
    }
    try {
      await bookingService.cancelBooking(b.bookingId);
      addToast('Booking cancelled.', 'info');
      fetchBookings();
    } catch (err) {
      addToast(err.message || 'Failed to cancel booking', 'error');
    }
  };

  /* A booking whose Zoho Bookings sync has not confirmed yet is still an
   * upcoming session the student is waiting on — it is not history. Filtering
   * on CONFIRMED alone filed every PENDING_CONFIRMATION request under "past",
   * which reads as though the request vanished. Only genuinely finished or
   * cancelled bookings belong in the second list. */
  const ACTIVE = new Set(['CONFIRMED', 'PENDING_CONFIRMATION']);
  const upcomingBookings = bookings.filter(b => ACTIVE.has(b.status));
  const pastBookings = bookings.filter(b => !ACTIVE.has(b.status));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-600">
            Consultation Hub
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-display">
            My Counselor Bookings
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your 1-on-1 virtual sessions with your admissions counselor.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => navigate('/consultation')}
          icon={Plus}
        >
          Book New Consultation
        </Button>
      </div>

      {loading ? (
        <LoadingState message="Fetching bookings from Zoho Bookings..." />
      ) : (
        <div className="space-y-8">
          {/* Upcoming Section */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span>Upcoming Consultations ({upcomingBookings.length})</span>
            </h3>

            {upcomingBookings.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="No Upcoming Consultations"
                description="You don't have any scheduled sessions right now. Book a 1-on-1 consultation to evaluate your applications."
                action={
                  <Button size="sm" variant="primary" onClick={() => navigate('/consultation')}>
                    Book Consultation
                  </Button>
                }
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {upcomingBookings.map((b) => (
                  <BookingCard
                    key={b.bookingId}
                    booking={b}
                    onReschedule={handleOpenReschedule}
                    onCancel={handleCancel}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Past / History Section */}
          {pastBookings.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-slate-500" />
                <span>Completed & Cancelled Sessions ({pastBookings.length})</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pastBookings.map((b) => (
                  <BookingCard key={b.bookingId} booking={b} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reschedule Modal */}
      <Modal
        isOpen={rescheduleModalOpen}
        onClose={() => setRescheduleModalOpen(false)}
        title="Reschedule Consultation"
        subtitle={`Session: ${selectedBooking?.consultationType}`}
      >
        <div className="space-y-4">
          <Input
            label="Select New Date"
            name="rescheduleDate"
            type="date"
            value={rescheduleDate}
            onChange={(e) => setRescheduleDate(e.target.value)}
            required
          />

          <Select
            label="Select New Time Slot"
            name="rescheduleSlot"
            value={rescheduleSlot}
            onChange={(e) => setRescheduleSlot(e.target.value)}
            options={[
              '09:30 - 10:15 IST',
              '11:00 - 11:45 IST',
              '14:00 - 14:45 IST',
              '15:30 - 16:15 IST',
              '17:00 - 17:45 IST'
            ]}
            required
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setRescheduleModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={processing}
              onClick={handleConfirmReschedule}
            >
              Update Schedule
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
