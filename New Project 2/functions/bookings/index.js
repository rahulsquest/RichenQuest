/**
 * Zoho Catalyst Function: Bookings
 * Handles consultation scheduling, counselor availability via Zoho Bookings, rescheduling, and cancellation.
 */

const CatalystDataStore = require('../shared/dataStore');
const { sendSuccess, sendError } = require('../shared/response');
const ZohoClient = require('../shared/zohoClient');

const bookingsTable = CatalystDataStore.getTable('Bookings');
const counselorsTable = CatalystDataStore.getTable('Counselors');
const notificationsTable = CatalystDataStore.getTable('Notifications');
const studentsTable = CatalystDataStore.getTable('Students');

async function handleBookings(req, res) {
  const method = req.method;
  const bookingId = req.params?.id;

  // GET /api/bookings
  if (method === 'GET') {
    const studentId = req.query?.studentId;
    let list = [];
    if (studentId) {
      list = bookingsTable.find(b => b.studentId === studentId);
    } else {
      list = bookingsTable.find();
    }

    const counselors = counselorsTable.find();
    const today = new Date().toISOString().split('T')[0];
    const slotsResult = await ZohoClient.getBookingSlots(today);

    return sendSuccess(res, {
      bookings: list,
      counselors,
      availableSlots: slotsResult?.availableSlots || [],
      message: slotsResult?.message || (slotsResult?.availableSlots?.length === 0 ? 'No consultation availability is currently available.' : null),
      consultationTypes: [
        'Initial Profile Evaluation & University Shortlisting',
        'Statement of Purpose (SOP) & Essay Strategy',
        'Scholarship & Financial Aid Consultation',
        'Student Visa Guidance & Mock Interview',
        'Pre-Departure Briefing & Accommodations'
      ]
    }, 'Bookings retrieved successfully.');
  }

  // POST /api/bookings
  if (method === 'POST') {
    const { studentId, counselorId, consultationType, date, timeSlot, notes } = req.body || {};

    if (!studentId || !consultationType || !date || !timeSlot) {
      return sendError(res, 'VALIDATION_ERROR', 'Student ID, consultation type, date, and time slot are required.', 400);
    }

    const student = studentsTable.findOne(s => s.studentId === studentId);
    const counselor = counselorId ? counselorsTable.findOne(c => c.counselorId === counselorId) : counselorsTable.find()[0];
    const newBookingId = `BKG_RQ_${new Date().getFullYear()}_${Math.floor(1000 + Math.random() * 9000)}`;

    // Sync with Zoho Bookings API
    const zohoBookingResult = await ZohoClient.createZohoBooking({
      bookingId: newBookingId,
      studentId,
      studentName: student?.fullName || 'Student',
      studentEmail: student?.email || '',
      studentPhone: student?.phone || '',
      counselorId: counselor?.counselorId || null,
      date,
      timeSlot,
      notes
    });

    const newBooking = bookingsTable.insert({
      bookingId: newBookingId,
      studentId,
      counselorId: counselor?.counselorId || null,
      counselorName: counselor?.name || 'Admissions Counselor',
      consultationType,
      date,
      timeSlot,
      meetingType: 'Virtual Video Consultation',
      meetingUrl: zohoBookingResult?.appointmentUrl || `https://meet.zoho.com/richenquest/${newBookingId.toLowerCase()}`,
      status: 'CONFIRMED',
      notes: notes || '',
      zohoBookingsId: zohoBookingResult?.zohoBookingsId || null
    });

    // Send in-app notification
    notificationsTable.insert({
      notificationId: `NTF_${Date.now()}`,
      studentId,
      type: 'BOOKING_CONFIRMED',
      title: 'Consultation Confirmed',
      message: `Your session for "${consultationType}" with ${counselor?.name || 'Admissions Counselor'} is scheduled for ${date} at ${timeSlot}.`,
      read: false,
      createdAt: new Date().toISOString(),
      actionUrl: '/bookings'
    });

    // Emit Flow Event for calendar invite & WhatsApp notification
    await ZohoClient.emitFlowEvent('BOOKING_CREATED', {
      bookingId: newBookingId,
      studentId,
      studentName: student?.fullName,
      studentEmail: student?.email,
      counselorName: counselor?.name,
      counselorEmail: counselor?.email,
      consultationType,
      date,
      timeSlot,
      meetingUrl: newBooking.meetingUrl
    });

    return sendSuccess(res, {
      booking: newBooking,
      zohoSync: zohoBookingResult
    }, 'Consultation scheduled successfully.', 201);
  }

  // PUT /api/bookings/:id (Reschedule)
  if (method === 'PUT' || method === 'PATCH') {
    const existing = bookingsTable.findOne(b => b.bookingId === bookingId);
    if (!existing) {
      return sendError(res, 'NOT_FOUND', 'Booking not found.', 404);
    }

    const updates = req.body || {};
    const updated = bookingsTable.update(b => b.bookingId === bookingId, updates);

    // Flow notification for reschedule
    ZohoClient.emitFlowEvent('BOOKING_RESCHEDULED', {
      bookingId,
      studentId: existing.studentId,
      date: updated.date,
      timeSlot: updated.timeSlot
    });

    return sendSuccess(res, updated, 'Booking updated successfully.');
  }

  // DELETE /api/bookings/:id (Cancel)
  if (method === 'DELETE') {
    const existing = bookingsTable.findOne(b => b.bookingId === bookingId);
    if (!existing) {
      return sendError(res, 'NOT_FOUND', 'Booking not found.', 404);
    }

    bookingsTable.update(b => b.bookingId === bookingId, { status: 'CANCELLED' });

    ZohoClient.emitFlowEvent('BOOKING_CANCELLED', {
      bookingId,
      studentId: existing.studentId,
      consultationType: existing.consultationType
    });

    return sendSuccess(res, { bookingId, status: 'CANCELLED' }, 'Booking cancelled successfully.');
  }

  return sendError(res, 'METHOD_NOT_ALLOWED', 'Method not allowed.', 405);
}

module.exports = handleBookings;
