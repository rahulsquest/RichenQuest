import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Compass, UserCheck, Lock, Mail, Phone, Globe, ArrowRight } from 'lucide-react';
import { Input, Select } from '../../components/Input';
import Button from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { TARGET_COUNTRIES, DEGREE_LEVELS } from '../../constants/entities';

export default function Signup() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    countryOfCitizenship: 'India',
    targetDegree: 'Postgraduate (Master\'s / MSc / MA / MEng / MBA)'
  });
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email || !formData.password) {
      addToast('Please fill in all required fields.', 'warning');
      return;
    }
    if (formData.password.length < 8) {
      addToast('Password must be at least 8 characters long.', 'warning');
      return;
    }

    setLoading(true);
    try {
      await signup({
        ...formData,
        targetCountries: [formData.countryOfCitizenship === 'United Kingdom' ? 'Canada' : 'United Kingdom']
      });
      addToast('Account created successfully! Welcome to RichenQuest.', 'success');
      navigate('/dashboard');
    } catch (err) {
      addToast(err.message || 'Registration failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg text-center space-y-2">
        <Link to="/" className="inline-flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-md">
            <Compass className="w-6 h-6" />
          </div>
        </Link>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-display">
          Create Your Student Account
        </h2>
        <p className="text-xs text-slate-500">
          Get assigned to a dedicated counselor and begin your admissions journey.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-2xl border border-slate-200 shadow-xl space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full Name"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Your Full Name"
              icon={UserCheck}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Email Address"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="name@example.com"
                icon={Mail}
                required
              />

              <Input
                label="Phone / WhatsApp"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+1 (555) 000-0000"
                icon={Phone}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Country of Citizenship"
                name="countryOfCitizenship"
                value={formData.countryOfCitizenship}
                onChange={handleChange}
                options={TARGET_COUNTRIES}
                required
              />

              <Select
                label="Target Degree Level"
                name="targetDegree"
                value={formData.targetDegree}
                onChange={handleChange}
                options={DEGREE_LEVELS}
                required
              />
            </div>

            <Input
              label="Choose Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              icon={Lock}
              helperText="Minimum 8 characters"
              required
            />

            <Button
              type="submit"
              loading={loading}
              variant="primary"
              size="lg"
              className="w-full"
            >
              Create Account & Initialize Case <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </form>

          <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-600">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-indigo-600 hover:underline">
              Sign In Here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
