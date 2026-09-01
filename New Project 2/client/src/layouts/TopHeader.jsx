import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Menu, User, Sparkles, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { ZohoSyncBadge } from '../components/FileUpload';
import { internalPath } from '../utils/internalPath';

export default function TopHeader({ onOpenSidebar }) {
  const { student, user } = useAuth();
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between shadow-xs">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSidebar}
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 md:hidden"
          aria-label="Open Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Next Action Pill Prompt */}
        {student?.nextAction && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            <span className="font-bold text-amber-800">Next Action:</span>
            <span className="truncate max-w-xs">{student.nextAction.title}</span>
            <Link
              to={internalPath(student.nextAction.targetRoute, '/documents')}
              className="font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 ml-1"
            >
              Complete <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Zoho CRM Sync Indicator */}
        {/* <div className="hidden lg:block">
          <ZohoSyncBadge
            synced={Boolean(student?.zohoCrmSyncStatus?.synced)}
            crmId={student?.zohoCrmSyncStatus?.crmContactId}
            label="Zoho CRM"
          />
        </div> */}

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 relative cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-rose-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 py-3 z-50 animate-in zoom-in-95">
              <div className="flex items-center justify-between px-4 pb-2 border-b border-slate-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Student Alerts ({unreadCount} new)
                </h4>
                <Link
                  to="/notifications"
                  onClick={() => setDropdownOpen(false)}
                  className="text-xs font-semibold text-indigo-600 hover:underline"
                >
                  View All
                </Link>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                {notifications.length === 0 ? (
                  <p className="p-4 text-center text-xs text-slate-400">No notifications right now.</p>
                ) : (
                  notifications.slice(0, 4).map((n) => (
                    <div
                      key={n.notificationId}
                      className={`p-3.5 hover:bg-slate-50 transition-colors ${!n.isRead ? 'bg-indigo-50/30' : ''}`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <h5 className="text-xs font-bold text-slate-900">{n.title}</h5>
                        {!n.isRead && (
                          <button
                            onClick={() => markAsRead(n.notificationId)}
                            className="text-[10px] text-slate-400 hover:text-slate-600 underline"
                          >
                            Mark Read
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Mini Profile */}
        <Link
          to="/profile"
          className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
            {student?.fullName ? student.fullName.split(' ').map(n => n[0]).join('') : 'ST'}
          </div>
          <div className="hidden sm:block text-left">
            <span className="block text-xs font-bold text-slate-900 leading-tight">
              {student?.fullName || user?.fullName || 'Student'}
            </span>
            <span className="block text-[10px] text-slate-500 font-mono">
              {student?.studentId || 'ID Pending'}
            </span>
          </div>
        </Link>
      </div>
    </header>
  );
}
