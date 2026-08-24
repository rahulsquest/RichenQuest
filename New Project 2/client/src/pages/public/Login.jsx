import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Compass, Lock, Mail, ArrowRight, KeyRound } from 'lucide-react';
import { Input } from '../../components/Input';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import authService from '../../services/authService';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      addToast('Please enter both your email address and password.', 'error');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      addToast('Signed in successfully.', 'success');
      navigate(from, { replace: true });
    } catch (err) {
      addToast(err.message || 'Invalid email address or password.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail) {
      addToast('Please enter your account email address.', 'error');
      return;
    }

    setForgotLoading(true);
    try {
      await authService.resetPassword(forgotEmail);
      addToast('If an account exists with this email, a password reset link has been dispatched.', 'info');
      setForgotModalOpen(false);
      setForgotEmail('');
    } catch (err) {
      addToast(err.message || 'Unable to process password reset request.', 'error');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
        <Link to="/" className="inline-flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-600/20">
            <Compass className="w-6 h-6" />
          </div>
        </Link>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-display">
          Student Portal Sign In
        </h2>
        <p className="text-xs text-slate-500">
          Access your admissions case roadmap, verified documents, and consultation bookings.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-2xl border border-slate-200 shadow-xl space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email Address"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              icon={Mail}
              required
            />

            <Input
              label="Password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              icon={Lock}
              required
            />

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center text-slate-600 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded text-indigo-600 focus:ring-indigo-500 mr-2" />
                Remember this device
              </label>
              <button
                type="button"
                onClick={() => setForgotModalOpen(true)}
                className="text-indigo-600 hover:underline font-medium cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>

            <Button
              type="submit"
              loading={loading}
              variant="primary"
              size="lg"
              className="w-full"
            >
              Sign In to Student Portal <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </form>

          <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-600">
            Don't have a student account yet?{' '}
            <Link to="/signup" className="font-bold text-indigo-600 hover:underline">
              Create an Account
            </Link>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <Modal
        isOpen={forgotModalOpen}
        onClose={() => setForgotModalOpen(false)}
        title="Reset Your Password"
      >
        <form onSubmit={handleForgotPassword} className="space-y-4">
          <p className="text-xs text-slate-500 leading-relaxed">
            Enter the email address associated with your RichenQuest student account. We will send you instructions to reset your password.
          </p>
          <Input
            label="Email Address"
            type="email"
            value={forgotEmail}
            onChange={(e) => setForgotEmail(e.target.value)}
            placeholder="you@example.com"
            icon={Mail}
            required
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setForgotModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={forgotLoading}
            >
              Send Reset Link
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
