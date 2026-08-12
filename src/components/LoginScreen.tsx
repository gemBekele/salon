import React, { useState } from 'react';
import { Scissors, Mail, Lock, Loader2, Sparkles, ShieldCheck, AlertCircle, Tv } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { AuthUser } from '../types';

interface LoginScreenProps {
  onLogin: (user: AuthUser) => void;
  onLaunchTv?: () => void;
  onReturnToWebsite?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onLaunchTv, onReturnToWebsite }) => {
  const [email, setEmail] = useState('admin@gechsalon.et');
  const [password, setPassword] = useState('Manager123!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Protected TV Launch State
  const [showTvPinPrompt, setShowTvPinPrompt] = useState(false);
  const [tvPin, setTvPin] = useState('');
  const [tvPinError, setTvPinError] = useState('');

  const handleTvPinSubmit = () => {
    if (tvPin.trim() === '7777' || tvPin.trim() === 'Manager123!' || tvPin.trim() === '1234') {
      if (onLaunchTv) onLaunchTv();
    } else {
      setTvPinError('Invalid TV PIN/Password. Default PIN is 7777.');
    }
  };

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
    <div className="min-h-screen bg-muted flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md">
        {onReturnToWebsite && (
          <div className="mb-4 text-center">
            <button
              onClick={onReturnToWebsite}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-full border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted shadow-sm transition-all"
            >
              <span>← Return to Public Barbershop Website</span>
            </button>
          </div>
        )}

        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary flex items-center justify-center text-primary-foreground shadow-lg border border-primary/80">
            <Scissors className="w-8 h-8" />
          </div>
          <h1 className="mt-4 text-2xl font-serif font-bold text-foreground">Gech Beauty Salon</h1>
          <p className="text-xs text-muted-foreground mt-1">Hawassa Salon Management System — Secure Sign In</p>
        </div>

        <div className="bg-card border border-border rounded-3xl p-7 shadow-sm space-y-5">
          <div className="flex items-center space-x-2 text-foreground bg-muted border border-border rounded-2xl px-3 py-2 text-xs">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Role-based access control is enabled. Use the demo accounts below.</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Email Address</label>
              <div className="relative">
                <MailIcon />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-muted border border-border text-foreground rounded-xl pl-10 pr-3 py-2.5 text-sm outline-none focus:border-primary"
                  placeholder="admin@salon.et"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-muted border border-border text-foreground rounded-xl pl-10 pr-3 py-2.5 text-sm outline-none focus:border-primary"
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
              className="w-full py-3 bg-primary hover:bg-primary/80 text-primary-foreground font-bold rounded-full text-sm shadow-md disabled:opacity-60 transition-all flex items-center justify-center space-x-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>{loading ? 'Signing in...' : 'Sign In'}</span>
            </button>
          </form>

          <div className="pt-3 border-t border-border space-y-3">
            {/* TV Launch Button with Password Protection */}
            {onLaunchTv && (
              <div className="bg-[#141417] text-primary-foreground p-3.5 rounded-2xl border border-[#26262b] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Tv className="w-4 h-4 text-ink-300 animate-pulse" />
                    <span className="text-xs font-bold font-serif text-primary-foreground">Lounge TV Display</span>
                  </div>
                  <span className="text-[9px] bg-ink-400/20 text-ink-300 border border-ink-400/30 px-2 py-0.5 rounded-full font-mono uppercase">
                    PIN Protected
                  </span>
                </div>
                <p className="text-[10px] text-slate-300">
                  Launch 100% Fullscreen Lounge Queue Board on Smart TVs. Password required for internet security.
                </p>

                {showTvPinPrompt ? (
                  <div className="space-y-2 pt-1">
                    <input
                      type="password"
                      placeholder="Enter TV Password or PIN (e.g. 7777)"
                      value={tvPin}
                      onChange={(e) => setTvPin(e.target.value)}
                      className="w-full bg-[#1f1f24] border border-primary/80 text-primary-foreground text-xs px-3 py-2 rounded-xl outline-none focus:border-ink-400 font-mono"
                    />
                    {tvPinError && <p className="text-[10px] text-rose-400">{tvPinError}</p>}
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={handleTvPinSubmit}
                        className="flex-1 py-1.5 bg-muted0 hover:bg-ink-600 text-slate-950 font-bold text-xs rounded-xl shadow transition-colors"
                      >
                        Unlock & Open TV
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowTvPinPrompt(false); setTvPinError(''); }}
                        className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs rounded-xl hover:bg-slate-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowTvPinPrompt(true)}
                    className="w-full py-2 bg-gradient-to-r from-ink-500 to-ink-600 hover:from-ink-600 hover:to-ink-700 text-slate-950 font-bold text-xs rounded-xl shadow transition-all flex items-center justify-center space-x-1.5"
                  >
                    <Tv className="w-3.5 h-3.5" />
                    <span>Open Lounge TV Board (PIN: 7777)</span>
                  </button>
                )}
              </div>
            )}

            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-2">Demo Accounts (Click to Fill)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
              <button type="button" onClick={() => fill('admin@gechsalon.et', 'Manager123!')} className="flex justify-between items-center bg-muted hover:bg-muted px-3 py-2 rounded-xl text-left border border-border transition-colors">
                <div>
                  <div className="text-foreground font-semibold">Salon Admin</div>
                  <div className="text-muted-foreground text-[10px] font-mono">admin@gechsalon.et</div>
                </div>
              </button>
              <button type="button" onClick={() => fill('liya@gechsalon.et', 'Staff123!')} className="flex justify-between items-center bg-muted hover:bg-muted px-3 py-2 rounded-xl text-left border border-border transition-colors">
                <div>
                  <div className="text-foreground font-semibold">Receptionist</div>
                  <div className="text-muted-foreground text-[10px] font-mono">liya@gechsalon.et</div>
                </div>
              </button>
              <button type="button" onClick={() => fill('bereket@gechsalon.et', 'Staff123!')} className="flex justify-between items-center bg-muted hover:bg-muted px-3 py-2 rounded-xl text-left border border-border transition-colors">
                <div>
                  <div className="text-foreground font-semibold">Staff Member</div>
                  <div className="text-muted-foreground text-[10px] font-mono">bereket@gechsalon.et</div>
                </div>
              </button>
              <button type="button" onClick={() => fill('admin@serenity.et', 'Admin123!')} className="flex justify-between items-center bg-muted hover:bg-muted px-3 py-2 rounded-xl text-left border border-border transition-colors">
                <div>
                  <div className="text-foreground font-semibold">Super Admin</div>
                  <div className="text-muted-foreground text-[10px] font-mono">admin@serenity.et</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-[10px] text-muted-foreground mt-6">
          Powered by XAMPP MySQL • React • Express — Designed & Built by <strong className="text-foreground">EngelsTech</strong>
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
    className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);