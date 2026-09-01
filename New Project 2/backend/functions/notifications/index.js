/**
 * Zoho Catalyst Function: Notifications
 * Handles real-time student activity alerts, counselor messages, and system updates.
 */

const CatalystDataStore = require('../shared/dataStore');
const { sendSuccess, sendError } = require('../shared/response');

const notificationsTable = CatalystDataStore.getTable('Notifications');

/*  Every studentId here comes from the session (req.student), never from
 *  req.query. Confirmed by testing before this fix, on the same shape as
 *  the documents.js leak: req.query.studentId let one student read (and,
 *  worse, mark-all-read) another student's notifications, and omitting it
 *  entirely returned every student's notifications with no filter. */
async function handleNotifications(req, res) {
  const method = req.method;
  const path = req.path || '';
  const studentId = req.student?.student?.studentId;

  // GET /api/notifications
  if (method === 'GET') {
    const list = studentId
      ? notificationsTable.find(n => n.studentId === studentId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      : [];
    const unreadCount = list.filter(n => !n.isRead).length;

    return sendSuccess(res, {
      notifications: list,
      unreadCount
    }, 'Notifications retrieved.');
  }

  // PUT /api/notifications/read-all
  if (method === 'PUT' && path.includes('read-all')) {
    if (!studentId) {
      return sendError(res, 'BAD_REQUEST', 'Student ID is required.', 400);
    }
    const list = notificationsTable.find(n => n.studentId === studentId);
    list.forEach(n => {
      notificationsTable.update(item => item.notificationId === n.notificationId, { isRead: true });
    });
    return sendSuccess(res, { markedCount: list.length }, 'All notifications marked as read.');
  }

  // PUT /api/notifications/:id/read
  if (method === 'PUT' || method === 'PATCH') {
    const notificationId = req.params?.id || path.split('/')[1];
    const existing = notificationsTable.findOne(n => n.notificationId === notificationId);
    if (!existing) {
      return sendError(res, 'NOT_FOUND', 'Notification not found.', 404);
    }

    const updated = notificationsTable.update(n => n.notificationId === notificationId, { isRead: true });
    return sendSuccess(res, updated, 'Notification marked as read.');
  }

  return sendError(res, 'METHOD_NOT_ALLOWED', 'Method not allowed.', 405);
}

module.exports = handleNotifications;
