import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, ArrowLeft } from 'lucide-react';
import Button from '../../components/Button';

export function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 py-16">
      <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
        <Compass className="w-8 h-8" />
      </div>
      <span className="text-xs font-mono font-bold text-indigo-600 uppercase tracking-wider">
        Error 404
      </span>
      <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mt-1 font-display">
        Page Not Found
      </h1>
      <p className="text-xs sm:text-sm text-slate-500 max-w-sm mt-2 leading-relaxed">
        The page you are looking for might have been moved, removed, or is temporarily unavailable.
      </p>
      <div className="mt-6">
        <Link to="/">
          <Button variant="primary" icon={ArrowLeft}>
            Back to RichenQuest Home
          </Button>
        </Link>
      </div>
    </div>
  );
}

export function Unauthorized() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 py-16">
      <span className="text-xs font-mono font-bold text-rose-600 uppercase tracking-wider">
        Access Denied (403)
      </span>
      <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mt-1 font-display">
        Unauthorized Access
      </h1>
      <p className="text-xs sm:text-sm text-slate-500 max-w-sm mt-2 leading-relaxed">
        You do not have permission to view this resource. Please log in with an authorized student account.
      </p>
      <div className="mt-6 flex gap-3">
        <Link to="/login">
          <Button variant="primary">Sign In</Button>
        </Link>
        <Link to="/">
          <Button variant="secondary">Back to Home</Button>
        </Link>
      </div>
    </div>
  );
}

export function ErrorPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 py-16">
      <span className="text-xs font-mono font-bold text-amber-600 uppercase tracking-wider">
        System Notice
      </span>
      <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mt-1 font-display">
        Temporary System Error
      </h1>
      <p className="text-xs sm:text-sm text-slate-500 max-w-sm mt-2 leading-relaxed">
        We're temporarily unable to load this information. Please try refreshing or check back in a few minutes.
      </p>
      <div className="mt-6">
        <Button variant="primary" onClick={() => window.location.reload()}>
          Refresh Application
        </Button>
      </div>
    </div>
  );
}

export default NotFound;
