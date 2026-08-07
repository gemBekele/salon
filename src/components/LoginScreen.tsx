import React, { useState } from 'react';
import { Scissors, Mail, Lock, Loader2, Sparkles, ShieldCheck, AlertCircle } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { AuthUser } from '../types';

interface LoginScreenProps {
  onLogin: (user: AuthUser) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('admin@glamourserenity.et');
  const [password, setPassword] = useState('Manager123!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }
      localStorage.setItem('sserp_token', data.token);
      onLogin(data.user as AuthUser);
    } catch (err) {
      setError('Unable to reach the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fill = (em: string, pw: string) => {
    setEmail(em);
    setPassword(pw);
    setError('');
  };

  return (
    <div className="min-h-screen bg-[#f5f5f0] flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#5A5A40] flex items-center justify-center text-white shadow-lg border border-[#4a4a35]">
            <Scissors className="w-8 h-8" />
          </div>
          <h1 className="mt-4 text-2xl font-serif font-bold text-[#2d2d2a]">Gech Beauty Salon</h1>
          <p className="text-xs text-[#737366] mt-1">Hawassa Salon Management System — Secure Sign In</p>
        </div>

        <div className="bg-white border border-[#e5e5d1] rounded-3xl p-7 shadow-sm space-y-5">
          <div className="flex items-center space-x-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-2xl px-3 py-2 text-xs">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Role-based access control is enabled. Use the demo accounts below.</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#2d2d2a] mb-1.5">Email Address</label>
              <div className="relative">
                <MailIcon />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#f5f5f0] border border-[#e5e5d1] text-[#2d2d2a] rounded-xl pl-10 pr-3 py-2.5 text-sm outline-none focus:border-[#5A5A40]"
                  placeholder="admin@salon.et"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2d2d2a] mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#737366] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#f5f5f0] border border-[#e5e5d1] text-[#2d2d2a] rounded-xl pl-10 pr-3 py-2.5 text-sm outline-none focus:border-[#5A5A40]"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center space-x-2 text-rose-700 bg-rose-50 border border-rose-200 rounded-2xl px-3 py-2 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#5A5A40] hover:bg-[#4a4a35] text-white font-bold rounded-full text-sm shadow-md disabled:opacity-60 transition-all flex items-center justify-center space-x-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>{loading ? 'Signing in...' : 'Sign In'}</span>
            </button>
          </form>

          <div className="pt-3 border-t border-[#e5e5d1]">
            <p className="text-[10px] uppercase tracking-widest text-[#737366] font-bold mb-2">Demo Accounts</p>
            <div className="space-y-1.5 text-[11px]">
              <button onClick={() => fill('admin@serenity.et', 'Admin123!')} className="w-full flex justify-between items-center bg-[#f5f5f0] hover:bg-[#e5e5d1] px-3 py-1.5 rounded-xl text-left">
                <span className="text-[#2d2d2a] font-medium">Super Admin</span>
                <span className="text-[#737366] font-mono">admin@serenity.et</span>
              </button>
              <button onClick={() => fill('admin@glamourserenity.et', 'Manager123!')} className="w-full flex justify-between items-center bg-[#f5f5f0] hover:bg-[#e5e5d1] px-3 py-1.5 rounded-xl text-left">
                <span className="text-[#2d2d2a] font-medium">Tenant Manager</span>
                <span className="text-[#737366] font-mono">admin@glamourserenity.et</span>
              </button>
              <button onClick={() => fill('sara@glamourserenity.et', 'Staff123!')} className="w-full flex justify-between items-center bg-[#f5f5f0] hover:bg-[#e5e5d1] px-3 py-1.5 rounded-xl text-left">
                <span className="text-[#2d2d2a] font-medium">Receptionist</span>
                <span className="text-[#737366] font-mono">sara@glamourserenity.et</span>
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-[10px] text-[#737366] mt-6">
          Powered by XAMPP MySQL • React • Express — ETB currency default
        </p>
      </div>
    </div>
  );
};

const MailIcon = () => (
  <MailSvg />
);

const MailSvg = () => (
  <svg
    className="w-4 h-4 text-[#737366] absolute left-3 top-1/2 -translate-y-1/2"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);