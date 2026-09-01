import React from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCircle2, Calendar, FileText, CreditCard, ArrowRight } from 'lucide-react';
import { formatDateTime } from '../utils/formatters';
import { internalPath } from '../utils/internalPath';

export function NotificationItem({ notification, onMarkRead }) {
  if (!notification) return null;

  const getIcon = (type) => {
    switch (type) {
      case 'BOOKING_CONFIRMED':
      case 'BOOKING_REMINDER':
        return <Calendar className="w-4 h-4 text-indigo-600" />;
      case 'DOCUMENT_APPROVED':
      case 'DOCUMENT_REQUIRED':
      case 'DOCUMENT_UPLOADED':
        return <FileText className="w-4 h-4 text-amber-600" />;
      case 'PAYMENT_REMINDER':
      case 'PAYMENT_COMPLETED':
        return <CreditCard className="w-4 h-4 text-emerald-600" />;
      default:
        return <Bell className="w-4 h-4 text-indigo-600" />;
    }
  };

  return (
    <div
      className={`p-4 rounded-xl border transition-all flex items-start gap-3.5 ${
        notification.read
          ? 'bg-white border-slate-200/70 text-slate-600'
          : 'bg-indigo-50/40 border-indigo-200 text-slate-900 shadow-xs'
      }`}
    >
      <div className={`p-2 rounded-lg shrink-0 ${notification.read ? 'bg-slate-100' : 'bg-white shadow-xs'}`}>
        {getIcon(notification.type)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h4 className={`text-sm ${notification.read ? 'font-medium' : 'font-bold'} text-slate-900`}>
            {notification.title}
          </h4>
          <span className="text-[11px] text-slate-400 whitespace-nowrap">
            {formatDateTime(notification.createdAt)}
          </span>
        </div>

        <p className="text-xs text-slate-600 mt-1 leading-relaxed">{notification.message}</p>

        <div className="flex items-center gap-4 mt-2.5">
          {notification.actionUrl && (
            <Link
              to={internalPath(notification.actionUrl, '/dashboard')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              View Details <ArrowRight className="w-3 h-3" />
            </Link>
          )}
          {!notification.read && onMarkRead && (
            <button
              onClick={() => onMarkRead(notification.notificationId)}
              className="text-[11px] font-medium text-slate-500 hover:text-slate-700 underline cursor-pointer"
            >
              Mark as read
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default NotificationItem;
