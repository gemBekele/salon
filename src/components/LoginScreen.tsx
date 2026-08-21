import React, { useEffect, useState } from 'react';
import {
  Scissors,
  Loader2,
  ShieldCheck,
  AlertCircle,
  Tv,
  Users,
  Mail,
  Lock,
  ArrowLeft,
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader } from './ui/card';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { PinPad } from './PinPad';
import { AuthUser, StaffLoginOption } from '../types';
import { cn } from '../lib/utils';
import { API_BASE } from '../lib/api';

interface LoginScreenProps {
  onLogin: (user: AuthUser, pin?: string) => void;
  onLaunchTv?: () => void;
  onReturnToWebsite?: () => void;
}

interface StaffLoginGroup {
  companyId: string;
  companyName: string;
  staff: StaffLoginOption[];
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onLaunchTv, onReturnToWebsite }) => {
  const [mode, setMode] = useState<'staff' | 'manager'>('staff');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<StaffLoginGroup[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState<StaffLoginOption | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const [showTvPinPrompt, setShowTvPinPrompt] = useState(false);
  const [tvPin, setTvPin] = useState('');
  const [tvPinError, setTvPinError] = useState('');

  useEffect(() => {
    fetch(API_BASE + '/api/auth/staff-login-options')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const list = data?.companies ?? [];
        setGroups(list.filter((g: StaffLoginGroup) => g.staff.length > 0));
      })
      .catch(() => setGroups([]))
      .then(() => setOptionsLoading(false));
  }, []);

  const handleTvPinSubmit = () => {
    if (tvPin.trim() === '7777' || tvPin.trim() === 'Manager123!' || tvPin.trim() === '1234') {
      if (onLaunchTv) onLaunchTv();
      setShowTvPinPrompt(false);
      setTvPin('');
    } else {
      setTvPinError('Invalid TV PIN. Default PIN is 7777.');
    }
  };

  const handleManagerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(API_BASE + '/api/auth/login', {
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
    } catch {
      setError('Unable to reach the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStaffPin = async (pin: string) => {
    if (!selectedStaff) return;
    setPinError(null);
    setLoading(true);
    try {
      const res = await fetch(API_BASE + '/api/auth/staff-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId: selectedStaff.id, pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPinError(data.error || 'Incorrect PIN');
        return;
      }
      localStorage.setItem('sserp_token', data.token);
      onLogin(data.user as AuthUser, pin);
    } catch {
      setPinError('Unable to reach the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const allStaff = groups.flatMap((g) => g.staff);

  return (
    <div className="min-h-screen flex bg-background font-sans selection:bg-primary selection:text-primary-foreground">
      {/* Login panel — centered */}
      <div className="flex-1 flex items-center justify-center p-6 bg-[#fafafa] dark:bg-[#09090b]">
        <div className="w-full max-w-md space-y-4">
          {onReturnToWebsite && (
            <div className="text-center">
              <Button type="button" variant="ghost" size="sm" onClick={onReturnToWebsite} className="text-muted-foreground hover:text-foreground font-semibold text-sm gap-1.5">
                <ArrowLeft className="size-3.5" />
                Register as a Customer (no login required)
              </Button>
            </div>
          )}

          {/* Brand */}
          <div className="text-center mb-2">
            <div className="w-14 h-14 mx-auto rounded-md bg-primary flex items-center justify-center text-primary-foreground">
              <Scissors className="w-7 h-7" />
            </div>
            <h1 className="mt-3 text-xl font-semibold tracking-tight text-foreground">Gech Beauty Salon</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Hawassa Salon ERP & POS</p>
          </div>

          <Card className="border-border bg-card rounded-md overflow-hidden">
            <CardHeader className="pb-3 bg-muted/30 border-b border-border">
              <Tabs
                value={mode}
                onValueChange={(v) => {
                  setMode(v as 'staff' | 'manager');
                  setError('');
                  setPinError(null);
                  setSelectedStaff(null);
                }}
              >
                <TabsList className="w-full p-1 bg-muted rounded-md">
                  <TabsTrigger value="staff" className="flex-1 gap-2 text-sm font-semibold rounded-md">
                    <Users className="size-4" />
                    Staff Quick PIN
                  </TabsTrigger>
                  <TabsTrigger value="manager" className="flex-1 gap-2 text-sm font-semibold rounded-md">
                    <ShieldCheck className="size-4" />
                    Manager / Admin
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>

            <CardContent className="pt-6 pb-6 px-6">
              {mode === 'manager' ? (
                <form onSubmit={handleManagerSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="kpi-label">Email Address</Label>
                    <div className="relative">
                      <Mail className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                      <Input
                        id="email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 text-sm"
                        placeholder="admin@gechsalon.et"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="kpi-label">Password</Label>
                    <div className="relative">
                      <Lock className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                      <Input
                        id="password"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 text-sm"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-sm font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3.5 py-2.5">
                      <AlertCircle className="size-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <Button type="submit" className="w-full font-semibold text-sm" disabled={loading}>
                    {loading && <Loader2 className="size-4 animate-spin mr-2" />}
                    {loading ? 'Authenticating...' : 'Sign In to Dashboard'}
                  </Button>

                  <div className="pt-3 space-y-2 border-t border-border">
                    <CardDescription className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Quick Demo Manager Credentials
                    </CardDescription>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        { label: 'Salon Admin', email: 'admin@gechsalon.et', pw: 'Manager123!' },
                        { label: 'Receptionist', email: 'liya@gechsalon.et', pw: 'Staff123!' },
                        { label: 'Super Admin', email: 'admin@serenity.et', pw: 'Admin123!' },
                        { label: 'Staff Member', email: 'bereket@gechsalon.et', pw: 'Staff123!' },
                      ].map((acc) => (
                        <Button
                          key={acc.email}
                          type="button"
                          variant="outline"
                          className="h-auto flex-col items-start py-2 px-3 text-left border-border hover:border-primary/50 hover:bg-primary/5 rounded-md transition-colors"
                          onClick={() => {
                            setEmail(acc.email);
                            setPassword(acc.pw);
                            setError('');
                          }}
                        >
                          <span className="text-sm font-semibold text-foreground">{acc.label}</span>
                          <span className="text-[10px] text-muted-foreground font-mono truncate w-full">{acc.email}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                </form>
              ) : selectedStaff ? (
                <div className="space-y-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground text-sm font-semibold"
                    onClick={() => {
                      setSelectedStaff(null);
                      setPinError(null);
                    }}
                  >
                    <ArrowLeft className="size-3.5 mr-1" />
                    Back to Staff List
                  </Button>

                  <div className="text-center py-2 space-y-2">
                    <div className="w-16 h-16 mx-auto rounded-full bg-muted text-foreground flex items-center justify-center border-2 border-border">
                      <span className="text-2xl font-semibold">{selectedStaff.name.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-lg">{selectedStaff.name}</p>
                      <p className="text-sm text-muted-foreground font-medium">{selectedStaff.branchName}</p>
                    </div>
                  </div>

                  <PinPad
                    error={pinError}
                    onComplete={handleStaffPin}
                    onErrorCleared={() => setPinError(null)}
                    disabled={loading}
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center space-y-1">
                    <h3 className="text-sm font-semibold text-foreground">Select Your Staff Name</h3>
                    <p className="text-sm text-muted-foreground">
                      {optionsLoading
                        ? 'Fetching active staff list...'
                        : allStaff.length === 0
                        ? 'No active staff registered.'
                        : 'Tap your profile to enter your 4-digit PIN'}
                    </p>
                  </div>

                  {optionsLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 space-y-2">
                      <Loader2 className="size-7 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground font-medium">Loading employee list...</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2.5 max-h-[340px] overflow-y-auto pr-1">
                      {allStaff.map((st) => (
                        <Button
                          key={st.id}
                          type="button"
                          variant="outline"
                          className={cn(
                            'flex items-center gap-3 rounded-md border-border bg-card px-3.5 py-3 text-left transition-colors cursor-pointer h-auto justify-start',
                            'hover:border-primary hover:bg-primary/5 active:scale-95'
                          )}
                          onClick={() => {
                            setSelectedStaff(st);
                            setPinError(null);
                          }}
                        >
                          <div className="w-10 h-10 shrink-0 rounded-md bg-muted text-foreground flex items-center justify-center font-semibold text-sm border border-border">
                            {st.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{st.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{st.branchName}</p>
                          </div>
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {onLaunchTv && (
            <div className="pt-1">
              {showTvPinPrompt ? (
                <Card className="border-border rounded-md">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Tv className="size-4 text-primary" />
                        Lounge Queue TV Unlock
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono">PIN: 7777</span>
                    </div>
                    <Input
                      type="password"
                      placeholder="Enter TV PIN (7777)"
                      value={tvPin}
                      onChange={(e) => setTvPin(e.target.value)}
                      className="font-mono text-center text-sm tracking-widest"
                    />
                    {tvPinError && <p className="text-sm text-destructive font-medium text-center">{tvPinError}</p>}
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1 font-semibold text-sm" onClick={handleTvPinSubmit}>
                        Launch TV Board
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setShowTvPinPrompt(false);
                          setTvPinError('');
                        }}
                        className="text-sm"
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full rounded-md border-border hover:border-primary/40 font-semibold text-sm gap-2"
                  onClick={() => setShowTvPinPrompt(true)}
                >
                  <Tv className="size-4 text-primary" />
                  Launch Lounge Queue TV Screen
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};