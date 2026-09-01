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

  /*  GET /api/bookings — scoped to the session, not the query string.
   *  Same bypass shape as documents.js and notifications.js, same fix:
   *  req.query.studentId is never trusted, and omitting it no longer
   *  returns every student's bookings. */
  if (method === 'GET') {
    const studentId = req.student?.student?.studentId;
    const list = studentId ? bookingsTable.find(b => b.studentId === studentId) : [];

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
    const { studentId, counselorId, consultationType, bookingDate, timeSlot, notes } = req.body || {};

    if (!studentId || !consultationType || !bookingDate || !timeSlot) {
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
      bookingDate,
      timeSlot,
      notes
    });

    /* Only a real Zoho Bookings appointment gets a meeting link. When the
     * upstream sync is unconfigured or fails, fabricating a meet.zoho.com URL
     * gave the student a link with no meeting behind it — the request is
     * still logged and flowed to a counselor below, but the response must
     * not claim a video link exists until one genuinely does. */
    const zohoConfirmed = zohoBookingResult?.status === 'BOOKED';
    const newBooking = bookingsTable.insert({
      bookingId: newBookingId,
      studentId,
      counselorId: counselor?.counselorId || null,
      counselorName: counselor?.name || 'Admissions Counselor',
      consultationType,
      bookingDate,
      timeSlot,
      meetingType: 'Virtual Video Consultation',
      meetingUrl: zohoConfirmed ? zohoBookingResult.appointmentUrl : null,
      status: zohoConfirmed ? 'CONFIRMED' : 'PENDING_CONFIRMATION',
      notes: notes || '',
      zohoBookingsId: zohoBookingResult?.zohoBookingsId || null
    });

    // Send in-app notification
    notificationsTable.insert({
      notificationId: `NTF_${Date.now()}`,
      studentId,
      type: zohoConfirmed ? 'BOOKING_CONFIRMED' : 'BOOKING_PENDING',
      title: zohoConfirmed ? 'Consultation Confirmed' : 'Consultation Requested',
      message: zohoConfirmed
        ? `Your session for "${consultationType}" with ${counselor?.name || 'Admissions Counselor'} is scheduled for ${bookingDate} at ${timeSlot}.`
        : `Your request for "${consultationType}" with ${counselor?.name || 'Admissions Counselor'} on ${bookingDate} at ${timeSlot} has been received. We'll confirm the meeting link shortly.`,
      isRead: false,
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
      bookingDate,
      timeSlot,
      meetingUrl: newBooking.meetingUrl
    });

    return sendSuccess(res, {
      booking: newBooking,
      zohoSync: zohoBookingResult
    }, zohoConfirmed
      ? 'Consultation scheduled successfully.'
      : 'Consultation request received. A counselor will confirm your meeting link shortly.', 201);
  }

  /*  PUT /api/bookings/:id (Reschedule) — allowlisted, not passed through.
   *  Same bug shape fixed in students.js: an unfiltered `req.body` let a
   *  caller rewrite counselorId, status, zohoBookingsId or meetingUrl on
   *  their own booking. Only what a reschedule actually needs to change is
   *  accepted; everything else (including bookingId/studentId, already
   *  covered by requireStudent's identity checks) is dropped. */
  if (method === 'PUT' || method === 'PATCH') {
    const existing = bookingsTable.findOne(b => b.bookingId === bookingId);
    if (!existing) {
      return sendError(res, 'NOT_FOUND', 'Booking not found.', 404);
    }

    const RESCHEDULE_FIELDS = ['bookingDate', 'timeSlot', 'notes'];
    const body = req.body || {};
    const updates = {};
    for (const f of RESCHEDULE_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(body, f)) updates[f] = body[f];
    }
    const updated = bookingsTable.update(b => b.bookingId === bookingId, updates);

    // Flow notification for reschedule
    ZohoClient.emitFlowEvent('BOOKING_RESCHEDULED', {
      bookingId,
      studentId: existing.studentId,
      bookingDate: updated.bookingDate,
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
