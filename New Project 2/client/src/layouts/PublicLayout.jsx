import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import { initializeSalesIQ } from '../integrations/salesiq';
import analyticsService from '../services/analyticsService';

export default function PublicLayout() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    initializeSalesIQ();
    analyticsService.pageView(location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-indigo-500 selection:text-white">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
