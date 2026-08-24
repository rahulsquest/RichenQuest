import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, Mail, Phone, MapPin, MessageSquare, Shield, CheckCircle } from 'lucide-react';
import env from '../config/environment';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 text-sm mt-auto border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Col 1: Brand & Mission */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold">
                <Compass className="w-5 h-5" />
              </div>
              <span className="text-xl font-extrabold text-white tracking-tight">
                RICHEN<span className="text-indigo-400">QUEST</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              RichenQuest empowers ambitious students with end-to-end guidance for premier university admissions, scholarship strategies, and visa processing across the UK, Europe, North America, and Australia.
            </p>
            <div className="flex items-center gap-2 pt-2 text-xs text-slate-300">
              <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Zoho Catalyst Protected Architecture</span>
            </div>
          </div>

          {/* Col 2: Navigation */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-4">
              Explore
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li><Link to="/about" className="hover:text-white transition-colors">About RichenQuest</Link></li>
              <li><Link to="/services" className="hover:text-white transition-colors">Admissions Services</Link></li>
              <li><Link to="/how-it-works" className="hover:text-white transition-colors">How It Works</Link></li>
              <li><Link to="/faq" className="hover:text-white transition-colors">Frequently Asked Questions</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">Global Offices</Link></li>
            </ul>
          </div>

          {/* Col 3: Student Hub */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-4">
              Student Hub
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li><Link to="/inquiry" className="hover:text-white transition-colors">Submit Study Inquiry</Link></li>
              <li><Link to="/login" className="hover:text-white transition-colors">Student Portal Login</Link></li>
              <li><Link to="/signup" className="hover:text-white transition-colors">Create Student Account</Link></li>
              <li><Link to="/consultation" className="hover:text-white transition-colors">Book 1-on-1 Consultation</Link></li>
              <li><Link to="/support" className="hover:text-white transition-colors">Help & Verification Support</Link></li>
            </ul>
          </div>

          {/* Col 4: Contact info */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-4">
              Contact Us
            </h4>
            <ul className="space-y-3 text-xs text-slate-400">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <span>124 City Road, London, EC1V 2NX, United Kingdom</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-indigo-400 shrink-0" />
                <a href={`mailto:${env.supportEmail}`} className="hover:text-white">{env.supportEmail}</a>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>{env.supportPhone}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <MessageSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                <a href={env.whatsappLink} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline font-semibold">
                  WhatsApp Support
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} RichenQuest Education Ltd. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span>Powered by Zoho Ecosystem</span>
            <span>•</span>
            <span>Catalyst Serverless</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
