import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import PublicLayout from './layouts/PublicLayout';
import DashboardLayout from './layouts/DashboardLayout';

// Public Pages
import Home from './pages/public/Home';
import About from './pages/public/About';
import Services from './pages/public/Services';
import HowItWorks from './pages/public/HowItWorks';
import Contact from './pages/public/Contact';
import FAQ from './pages/public/FAQ';
import Login from './pages/public/Login';
import Signup from './pages/public/Signup';

// Student Protected Pages
import Dashboard from './pages/student/Dashboard';
import Profile from './pages/student/Profile';
import Inquiry from './pages/student/Inquiry';
import Consultation from './pages/student/Consultation';
import Bookings from './pages/student/Bookings';
import Documents from './pages/student/Documents';
import Applications from './pages/student/Applications';
import Opportunities from './pages/student/Opportunities';
import Roadmap from './pages/student/Roadmap';
import Report from './pages/student/Report';
import Payments from './pages/student/Payments';
import Notifications from './pages/student/Notifications';
import Support from './pages/student/Support';

// Status Pages
import { NotFound, Unauthorized, ErrorPage } from './pages/status/NotFound';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <Routes>
      {/* Public Pages */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/services" element={<Services />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        {/* Inquiry can also be accessed publicly */}
        <Route path="/inquiry" element={<Inquiry />} />
      </Route>

      {/* Student Portal (Protected Routes) */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/consultation" element={<Consultation />} />
        <Route path="/bookings" element={<Bookings />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/applications" element={<Applications />} />
          <Route path="/opportunities" element={<Opportunities />} />
          <Route path="/roadmap" element={<Roadmap />} />
          <Route path="/report" element={<Report />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/support" element={<Support />} />
      </Route>

      {/* Status & Error Routes */}
      <Route path="/404" element={<NotFound />} />
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="/error" element={<ErrorPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
