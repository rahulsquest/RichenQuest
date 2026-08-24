import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Compass, LayoutDashboard, User, Send, Calendar, CalendarCheck, FileText, Building2, CreditCard, Bell, HelpCircle, LogOut, Sparkles, Map, ClipboardList } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

export default function Sidebar({ mobileOpen = false, onClose }) {
  const { logout, student } = useAuth();
  const { unreadCount } = useNotifications();

  const navigation = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Student Profile', path: '/profile', icon: User },
    { name: 'Opportunities', path: '/opportunities', icon: Compass },
    { name: 'My Roadmap', path: '/roadmap', icon: Map },
    { name: 'My Report', path: '/report', icon: ClipboardList },
    { name: 'Submit Inquiry', path: '/inquiry', icon: Send },
    { name: 'Book Consultation', path: '/consultation', icon: Calendar },
    { name: 'My Bookings', path: '/bookings', icon: CalendarCheck },
    { name: 'Document Vault', path: '/documents', icon: FileText },
    { name: 'Applications', path: '/applications', icon: Building2 },
    { name: 'Invoices & Payments', path: '/payments', icon: CreditCard },
    { name: 'Notifications', path: '/notifications', icon: Bell, badge: unreadCount },
    { name: 'Support & Help', path: '/support', icon: HelpCircle }
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed md:sticky top-0 inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col justify-between border-r border-slate-800 transition-transform duration-200 ease-in-out md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } h-screen overflow-y-auto`}
      >
        <div>
          {/* Logo Header */}
          <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800">
            <Link to="/dashboard" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">
                <Compass className="w-5 h-5" />
              </div>
              <span className="text-base font-extrabold text-white tracking-tight">
                RICHEN<span className="text-indigo-400">QUEST</span>
              </span>
            </Link>
          </div>

          {/* Student Case Info Badge */}
          {student && (
            <div className="p-4 mx-3 mt-4 rounded-xl bg-slate-800/80 border border-slate-700/60">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                  Student Case
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {student.caseId || 'CASE-2026'}
                </span>
              </div>
              <p className="text-xs font-bold text-white mt-1 truncate">{student.fullName}</p>
              <p className="text-[11px] text-slate-400 truncate">{student.targetDegree}</p>
            </div>
          )}

          {/* Navigation Items */}
          <nav className="p-3 space-y-1 mt-2">
            {navigation.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span>{item.name}</span>
                </div>
                {item.badge > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500 text-white">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Bottom Profile / Logout action */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
