import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import { initializeSalesIQ } from '../integrations/salesiq';
import analyticsService from '../services/analyticsService';

/* Single point of truth for per-route SEO. No head-management library is
 * installed; document.title / meta description are set directly since
 * every public route renders through this one layout. */
const PAGE_META = {
  '/': {
    title: 'RichenQuest — Global Education Mobility Intelligence',
    description: 'Understand your profile, discover matched study-abroad opportunities, and get every number verified before you rely on it — with real counsellor support at every step.'
  },
  '/services': {
    title: 'Services — RichenQuest',
    description: 'University shortlisting, SOP and recommendation letter review, scholarship strategy, visa filing support, and pre-departure guidance — RichenQuest\'s core admissions services.'
  },
  '/how-it-works': {
    title: 'How It Works — RichenQuest',
    description: 'The 10-step roadmap RichenQuest uses to combine profile intelligence, opportunity matching, and verification with real counsellor guidance, from first inquiry to pre-departure briefing.'
  },
  '/about': {
    title: 'About — RichenQuest',
    description: 'RichenQuest is an India-based, globally focused education mobility platform built to match students with verified study-abroad opportunities.'
  },
  '/faq': {
    title: 'FAQ — RichenQuest',
    description: 'Answers to common questions about admissions shortlisting, document review, counsellor consultations, and visa support on RichenQuest.'
  },
  '/contact': {
    title: 'Contact — RichenQuest',
    description: 'Get in touch with the RichenQuest admissions team by email, phone, or WhatsApp.'
  },
  '/login': {
    title: 'Student Login — RichenQuest',
    description: 'Sign in to your RichenQuest student portal to view your roadmap, documents, and consultations.'
  },
  '/signup': {
    title: 'Create Your Account — RichenQuest',
    description: 'Create a RichenQuest student account to build your profile and get matched with study-abroad opportunities.'
  },
  '/inquiry': {
    title: 'Check My Fit — RichenQuest',
    description: 'Tell us your target country, degree level, and academic background so RichenQuest can identify opportunities that fit your profile.'
  }
};

export default function PublicLayout() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    initializeSalesIQ();
    analyticsService.pageView(location.pathname);

    const meta = PAGE_META[location.pathname] || PAGE_META['/'];
    document.title = meta.title;

    let descTag = document.querySelector('meta[name="description"]');
    if (!descTag) {
      descTag = document.createElement('meta');
      descTag.setAttribute('name', 'description');
      document.head.appendChild(descTag);
    }
    descTag.setAttribute('content', meta.description);

    let canonicalTag = document.querySelector('link[rel="canonical"]');
    if (!canonicalTag) {
      canonicalTag = document.createElement('link');
      canonicalTag.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalTag);
    }
    canonicalTag.setAttribute('href', `https://www.richenquest.com${location.pathname}`);
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
