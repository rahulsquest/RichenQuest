import React, { useState } from 'react';
import { Bell, CheckCheck, Filter, Clock } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { NotificationItem } from '../../components/NotificationItem';
import { EmptyState } from '../../components/FileUpload';
import Button from '../../components/Button';

export default function Notifications() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [filter, setFilter] = useState('ALL');

  const filtered = filter === 'ALL'
    ? notifications
    : filter === 'UNREAD'
    ? notifications.filter(n => !n.read)
    : notifications.filter(n => n.type.startsWith(filter));

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-600">
            Activity Center
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-display">
            Student Notifications & Alerts
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Updates on counselor reviews, consultation reminders, and university offer letters.
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            size="sm"
            variant="secondary"
            onClick={markAllAsRead}
            icon={CheckCheck}
          >
            Mark All as Read
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setFilter('ALL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            filter === 'ALL'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('UNREAD')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            filter === 'UNREAD'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Unread ({unreadCount})
        </button>
        <button
          onClick={() => setFilter('BOOKING')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            filter === 'BOOKING'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Consultations
        </button>
        <button
          onClick={() => setFilter('DOCUMENT')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            filter === 'DOCUMENT'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Documents
        </button>
        <button
          onClick={() => setFilter('PAYMENT')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            filter === 'PAYMENT'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Payments
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No Notifications Found"
            description="You are all caught up! No notifications match the selected filter."
          />
        ) : (
          filtered.map((n) => (
            <NotificationItem key={n.notificationId} notification={n} onMarkRead={markAsRead} />
          ))
        )}
      </div>
    </div>
  );
}
