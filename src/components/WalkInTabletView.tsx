import React, { useEffect, useState } from 'react';
import {
  Ticket,
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Star,
  Home,
  Send,
  CheckCircle2,
  Check,
  Scissors,
  Sparkles,
  Delete,
  X,
  User,
  Clock,
} from 'lucide-react';
import { Company, Branch, Service, Staff } from '../types';
import { apiFetch } from '../lib/api';
import { showToast } from './Toast';

interface WalkInTabletViewProps {
  company: Company;
  branch: Branch;
  services: Service[];
  staffList: Staff[];
  onExitTvMode?: () => void;
}

type Phase = 'register' | 'ticket' | 'feedback';

interface TicketResult {
  id: string;
  queueNumber: string;
  customerId: string;
  customerName: string;
  status: string;
}

interface VisitEntry {
  id: string;
  queueNumber: string;
  customerName: string;
  customerPhone: string;
  status: string;
  startedAt: string;
  createdAt: string;
  services?: { id: string; serviceName: string; staffName: string }[];
}

function formatPhoneNumber(digits: string): string {
  const d = digits.replace(/\D/g, '').slice(0, 10);
  if (!d) return '+251';
  const head = d.slice(0, 2);
  const rest = d.slice(2);
  if (!rest) return `+251 ${head}`;
  if (rest.length <= 3) return `+251 ${head} ${rest}`;
  return `+251 ${head} ${rest.slice(0, 3)} ${rest.slice(3)}`;
}

function toCanonicalPhone(rawDigits: string): string {
  let d = rawDigits.replace(/\D/g, '');
  while (d.startsWith('00') || d.startsWith('0')) d = d.slice(1);
  if (d.startsWith('251') && d.length > 9) d = d.slice(3);
  if (d.length > 9) d = d.slice(0, 9);
  if (!d) return d;
  const head = d.slice(0, 2);
  const rest = d.slice(2);
  let out = `+251 ${head}`;
  if (rest.length > 0) out += ` ${rest.slice(0, 3)}`;
  if (rest.length > 3) out += ` ${rest.slice(3, 7)}`;
  return out;
}

interface PhoneKeypadProps {
  digits: string;
  onChange: (d: string) => void;
  compact?: boolean;
}

const PhoneKeypad: React.FC<PhoneKeypadProps> = ({ digits, onChange, compact }) => {
  const press = (k: string) => {
    if (k === 'back') { onChange(digits.slice(0, -1)); return; }
    if (k === 'clear') { onChange(''); return; }
    if (digits.replace(/\D/g, '').length >= 10) return;
    onChange(digits + k);
  };

  const keyCls = `flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 border border-white/10 text-white text-2xl font-semibold transition-colors ${
    compact ? 'h-12' : 'h-14'
  }`;

  return (
    <div className="grid grid-cols-3 gap-2.5 w-full max-w-sm mx-auto select-none">
      {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'back', '0', 'clear'].map((k) => (
        <button key={k} type="button" onClick={() => press(k)} className={keyCls} aria-label={k}>
          {k === 'back' ? (
            <Delete className={`${compact ? 'size-5' : 'size-6'}`} />
          ) : k === 'clear' ? (
            <span className="text-lg font-bold tracking-wide">C</span>
          ) : (
            k
          )}
        </button>
      ))}
    </div>
  );
};

export const WalkInTabletView: React.FC<WalkInTabletViewProps> = ({ company, branch, services, staffList, onExitTvMode }) => {
  const [phase, setPhase] = useState<Phase>('register');

  // Registration form
  const [regStep, setRegStep] = useState(1);
  const [digits, setDigits] = useState('');
  const [name, setName] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [staffId, setStaffId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [ticket, setTicket] = useState<TicketResult | null>(null);

  // Feedback form
  const [feedbackVisit, setFeedbackVisit] = useState<string>('current');
  const [feedbackDigits, setFeedbackDigits] = useState('');
  const [visits, setVisits] = useState<VisitEntry[]>([]);
  const [loadingVisits, setLoadingVisits] = useState(false);
  const [rating, setRating] = useState(0);
  const [complaint, setComplaint] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);

  // Catalog fetch: the kiosk is public, so it must load its own service/staff
  // list instead of relying on the auth-only db-state.
  const [catalogServices, setCatalogServices] = useState<Service[]>(services);
  const [catalogStaff, setCatalogStaff] = useState<Staff[]>(staffList);

  useEffect(() => {
    let cancelled = false;
    apiFetch(
      `/api/public/tablet/catalog?companyId=${encodeURIComponent(company.id)}&branchId=${encodeURIComponent(branch.id)}`
    )
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (Array.isArray(d?.services) && (d.services as unknown[]).length > 0) setCatalogServices(d.services);
        if (Array.isArray(d?.staff) && (d.staff as unknown[]).length > 0) setCatalogStaff(d.staff);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [company.id, branch.id]);

  const staffOptions = catalogStaff.filter(
    (s) => s.branchId === branch.id && !['reception', 'receptionist', 'manager'].includes(s.role)
  );

  const phoneDigits = digits.replace(/\D/g, '');
  const phoneValid = phoneDigits.length >= 9;

  const branchServices = catalogServices.filter((s) => !company || s.companyId === company.id);

  const hasStaff = Boolean(serviceId);
  const stepMeta = [
    { n: 1, label: 'Phone' },
    { n: 2, label: 'Name' },
    { n: 3, label: 'Service' },
    ...(hasStaff ? [{ n: 4, label: 'Staff' }] : []),
    { n: hasStaff ? 5 : 4, label: 'Review' },
  ];

  const handleGetTicket = async () => {
    if (!phoneValid) {
      showToast('info', 'Please enter your full phone number');
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiFetch('/api/public/tablet/walkins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: company.id,
          branchId: branch.id,
          customerPhone: toCanonicalPhone(phoneDigits),
          customerName: name.trim() || undefined,
          serviceId: serviceId || undefined,
          staffId: staffId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast('error', data?.error || 'Could not register walk-in');
        return;
      }
      setTicket(data as TicketResult);
      setFeedbackDigits(phoneDigits);
      setPhase('ticket');
    } catch {
      showToast('error', 'Could not reach the server');
    } finally {
      setSubmitting(false);
    }
  };

  const fetchVisits = async (digitsStr: string) => {
    const res = await apiFetch(
      `/api/public/tablet/visits?companyId=${encodeURIComponent(company.id)}&branchId=${encodeURIComponent(branch.id)}&phone=${encodeURIComponent(digitsStr)}`
    );
    const data = await res.json();
    return res.ok ? (data?.visits ?? []) : [];
  };

  useEffect(() => {
    if (feedbackVisit !== 'lookup') return;
    const d = feedbackDigits.replace(/\D/g, '');
    if (d.length < 9) {
      setVisits([]);
      setLoadingVisits(false);
      return;
    }
    let cancelled = false;
    setLoadingVisits(true);
    fetchVisits(toCanonicalPhone(d))
      .then((v) => { if (!cancelled) setVisits(v); })
      .catch(() => { if (!cancelled) setVisits([]); })
      .finally(() => { if (!cancelled) setLoadingVisits(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedbackVisit, feedbackDigits, company.id, branch.id]);

  const openFeedback = (scope: 'current' | 'lookup') => {
    setFeedbackVisit(scope);
    setRating(0);
    setComplaint('');
    setFeedbackSent(false);
    setVisits([]);
    setPhase('feedback');
  };

  const handleSubmitFeedback = async () => {
    if (rating < 1) {
      showToast('info', 'Please choose a star rating');
      return;
    }
    try {
      const isCurrentTicket = feedbackVisit === 'current';
      const linkedSessionId = isCurrentTicket ? (ticket?.id || undefined) : feedbackVisit;
      const res = await apiFetch('/api/public/tablet/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: company.id,
          branchId: branch.id,
          visitSessionId: linkedSessionId,
          customerId: isCurrentTicket ? ticket?.customerId : undefined,
          rating,
          complaint: complaint.trim() || undefined,
          isAnonymous: anonymous,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast('error', data?.error || 'Could not submit feedback');
        return;
      }
      setFeedbackSent(true);
      showToast('success', 'Thank you! Your feedback has been received.');
    } catch {
      showToast('error', 'Could not submit feedback');
    }
  };

  const resetAll = () => {
    setDigits('');
    setName('');
    setServiceId('');
    setStaffId('');
    setRegStep(1);
    setTicket(null);
    setRating(0);
    setComplaint('');
    setAnonymous(false);
    setFeedbackSent(false);
    setVisits([]);
    setPhase('register');
  };

  const StepBadge = ({ n, label, required }: { n: number; label: string; required?: boolean }) => (
    <div className="flex items-center gap-2.5 mb-5">
      <span className="w-8 h-8 rounded-full bg-emerald-500 text-black text-base font-bold flex items-center justify-center shrink-0">
        {n}
      </span>
      <span className="text-xl font-bold text-white">
        {label}
        {required && <span className="text-emerald-400 ml-1">*</span>}
      </span>
    </div>
  );

  const boxBase =
    'flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 px-3 py-4 text-center transition-colors min-h-20';

  const boxSelected = (active: boolean) =>
    active
      ? 'border-emerald-400 bg-emerald-400/15 text-white'
      : 'border-white/15 bg-white/5 hover:bg-white/10 text-white';

  const navBackCls =
    'h-14 px-6 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 font-semibold flex items-center justify-center gap-2 transition-colors';
  const navNextCls =
    'flex-1 h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-base flex items-center justify-center gap-2 transition-colors';

  return (
    <div className="min-h-screen bg-[#09090b] text-white font-sans select-none flex flex-col">
      {/* Floating exit (no full header) */}
      {onExitTvMode && (
        <button
          onClick={onExitTvMode}
          aria-label="Exit kiosk"
          className="fixed top-4 right-4 z-40 size-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white/70 hover:text-white flex items-center justify-center transition-colors"
        >
          <X className="size-5" />
        </button>
      )}

      <main className="flex-1 flex flex-col items-center px-4 py-8">
        {phase === 'register' && (
          <div className="w-full max-w-xl">
            {/* Welcome */}
            <div className="text-center mb-6">
              <h1 className="text-3xl font-extrabold tracking-tight mb-2">Welcome to {branch.name}</h1>
              <p className="text-white/60 text-base">Follow the steps to grab your queue ticket.</p>
            </div>

            {/* Step indicator */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {stepMeta.map((s) => {
                const current = regStep === s.n;
                const done = regStep > s.n;
                return (
                  <div key={s.n} className="flex items-center gap-2">
                    <span
                      className={`size-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        current
                          ? 'bg-emerald-500 text-black'
                          : done
                          ? 'bg-emerald-500/30 text-emerald-300'
                          : 'bg-white/10 text-white/60'
                      }`}
                    >
                      {done ? <Check className="size-4" /> : s.n}
                    </span>
                    <span className={`text-sm font-semibold ${current ? 'text-white' : 'text-white/50'}`}>{s.label}</span>
                    {s.n < stepMeta[stepMeta.length - 1].n && <ChevronRight className="size-4 text-white/25" />}
                  </div>
                );
              })}
            </div>

            <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
              {/* Step 1: Phone */}
              {regStep === 1 && (
                <div>
                  <StepBadge n={1} label="Your Phone Number" required />
                  <div
                    className={`w-full max-w-sm mx-auto mb-4 h-14 rounded-2xl border flex items-center justify-center text-2xl font-bold tracking-wide ${
                      phoneValid ? 'border-emerald-400/40 bg-emerald-400/5 text-emerald-300' : 'border-white/15 bg-black/40 text-white'
                    }`}
                  >
                    {formatPhoneNumber(phoneDigits)}
                  </div>
                  <PhoneKeypad digits={digits} onChange={setDigits} />
                  <p className="text-center text-xs text-white/40 mt-3">
                    We use this to find your past visits. No marketing, we promise.
                  </p>
                  <div className="flex mt-6">
                    <button
                      onClick={() => setRegStep(2)}
                      disabled={!phoneValid}
                      className={navNextCls}
                    >
                      Continue
                      <ArrowRight className="size-5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Name (optional) */}
              {regStep === 2 && (
                <div>
                  <StepBadge n={2} label="Your Name" />
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Optional — e.g. Abebe Kebede"
                    className="w-full h-14 px-4 rounded-2xl border border-white/15 bg-black/40 text-lg outline-none focus:border-emerald-400"
                  />
                  <p className="text-xs text-white/40 mt-3">
                    Not required — you can skip this if you'd like.
                  </p>
                  <div className="flex gap-3 mt-6">
                    <button onClick={() => setRegStep(1)} className={navBackCls}>
                      <ArrowLeft className="size-5" />
                      Back
                    </button>
                    <button onClick={() => setRegStep(3)} className={navNextCls}>
                      Continue
                      <ArrowRight className="size-5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Service */}
              {regStep === 3 && (
                <div>
                  <StepBadge n={3} label="Choose a Service" required={false} />
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
                    <button
                      type="button"
                      onClick={() => { setServiceId(''); setStaffId(''); }}
                      className={`${boxBase} ${boxSelected(!serviceId)}`}
                    >
                      <Sparkles className="size-5 text-white/60" />
                      <span className="text-sm font-semibold leading-tight">No service</span>
                      <span className="text-[11px] text-white/50">Decide at the counter</span>
                    </button>
                    {(branchServices.length > 0 ? branchServices : services).map((s) => {
                      const active = serviceId === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => { setServiceId(s.id); setStaffId(''); }}
                          className={`${boxBase} ${boxSelected(active)} relative`}
                        >
                          {active && (
                            <span className="absolute top-2 right-2 size-5 rounded-full bg-emerald-400 text-black flex items-center justify-center">
                              <CheckCircle2 className="size-4" />
                            </span>
                          )}
                          <Scissors className={`size-5 ${active ? 'text-emerald-300' : 'text-white/40'}`} />
                          <span className="text-sm font-semibold leading-tight line-clamp-2">{s.name}</span>
                          <span className="text-[11px] font-bold text-emerald-400">
                            {s.priceEtb} ETB
                            {s.durationMinutes > 0 && (
                              <span className="text-white/40 font-medium ml-1">
                                · <Clock className="size-3 inline -mt-0.5" /> {s.durationMinutes}m
                              </span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button onClick={() => setRegStep(2)} className={navBackCls}>
                      <ArrowLeft className="size-5" />
                      Back
                    </button>
                    <button onClick={() => setRegStep(4)} className={navNextCls}>
                      Continue
                      <ArrowRight className="size-5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Staff (only when a service is chosen) */}
              {regStep === 4 && serviceId && (
                <div>
                  <StepBadge n={4} label="Who Should Serve You?" />
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
                    <button
                      type="button"
                      onClick={() => setStaffId('')}
                      className={`${boxBase} ${boxSelected(!staffId)}`}
                    >
                      <Sparkles className="size-5 text-white/60" />
                      <span className="text-sm font-semibold leading-tight">Any staff</span>
                      <span className="text-[11px] text-white/50">First one free</span>
                    </button>
                    {staffOptions.map((st) => {
                      const active = staffId === st.id;
                      return (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => setStaffId(st.id)}
                          className={`${boxBase} ${boxSelected(active)} relative`}
                        >
                          {active && (
                            <span className="absolute top-2 right-2 size-5 rounded-full bg-emerald-400 text-black flex items-center justify-center">
                              <CheckCircle2 className="size-4" />
                            </span>
                          )}
                          <User className={`size-5 ${active ? 'text-emerald-300' : 'text-white/40'}`} />
                          <span className="text-sm font-semibold leading-tight line-clamp-2">{st.name}</span>
                          <span className="text-[11px] text-white/40 capitalize">{st.role}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button onClick={() => setRegStep(3)} className={navBackCls}>
                      <ArrowLeft className="size-5" />
                      Back
                    </button>
                    <button onClick={() => setRegStep(5)} className={navNextCls}>
                      Continue
                      <ArrowRight className="size-5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Review step (n=5 with service, n=4 without) */}
              {regStep === (hasStaff ? 5 : 4) && (
                <div>
                  <StepBadge n={stepMeta[stepMeta.length - 1].n} label="Review Your Details" />
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between rounded-2xl border border-white/15 bg-black/40 px-4 h-12">
                      <span className="text-sm text-white/50">Phone</span>
                      <span className="font-semibold">{formatPhoneNumber(phoneDigits)}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl border border-white/15 bg-black/40 px-4 h-12">
                      <span className="text-sm text-white/50">Name</span>
                      <span className="font-semibold truncate ml-4">{name.trim() || 'Guest'}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl border border-white/15 bg-black/40 px-4 h-12">
                      <span className="text-sm text-white/50">Service</span>
                      <span className="font-semibold truncate ml-4">
                        {serviceId
                          ? branchServices.find((s) => s.id === serviceId)?.name || services.find((s) => s.id === serviceId)?.name || 'Selected'
                          : 'No service — decide at counter'}
                      </span>
                    </div>
                    {serviceId && (
                      <div className="flex items-center justify-between rounded-2xl border border-white/15 bg-black/40 px-4 h-12">
                        <span className="text-sm text-white/50">Staff</span>
                        <span className="font-semibold truncate ml-4">
                          {staffId ? staffOptions.find((st) => st.id === staffId)?.name || 'Selected' : 'Any available staff'}
                        </span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleGetTicket}
                    disabled={submitting}
                    className="w-full h-16 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    {submitting ? (
                      <span className="inline-block w-5 h-5 border-2 border-black/40 border-t-black rounded-full animate-spin" />
                    ) : (
                      <>
                        <Ticket className="size-5" />
                        Get My Ticket
                      </>
                    )}
                  </button>

                  <button onClick={() => setRegStep(serviceId ? 4 : 3)} className={`${navBackCls} w-full mt-3`}>
                    <ArrowLeft className="size-5" />
                    Back
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {phase === 'ticket' && ticket && (
          <div className="w-full max-w-xl flex flex-col items-center text-center flex-1 justify-center">
            <div className="text-sm text-white/50 uppercase tracking-widest mb-3">Queue Ticket</div>
            <div className="w-64 h-64 rounded-3xl border-4 border-emerald-400 bg-[#0d1a12] flex flex-col items-center justify-center gap-1 shadow-2xl shadow-emerald-500/20">
              <span className="text-7xl font-black text-emerald-400 tracking-tight">{ticket.queueNumber}</span>
              <span className="text-xs text-white/50">{branch.name}</span>
            </div>
            <p className="mt-6 text-2xl font-bold">
              {ticket.customerName === 'Walk-in' ? 'Welcome!' : `Welcome, ${ticket.customerName}!`}
            </p>
            <p className="text-white/60 mt-1 mb-8 max-w-sm text-lg">
              {ticket.status === 'in_progress'
                ? 'Good news — your service can start right now!'
                : 'You are in the queue. A receptionist will call your ticket number.'}
            </p>

            <div className="grid grid-cols-2 gap-4 w-full">
              <button
                onClick={() => openFeedback('current')}
                className="h-16 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-lg font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Star className="size-6 text-amber-400" />
                Rate This Visit
              </button>
              <button
                onClick={resetAll}
                className="h-16 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-lg font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <ArrowRight className="size-6" />
                Next Customer
              </button>
            </div>
          </div>
        )}

        {phase === 'feedback' && (
          <div className="w-full max-w-xl flex flex-col items-center">
            {feedbackSent ? (
              <div className="text-center py-10 flex-1 flex flex-col items-center justify-center">
                <CheckCircle2 className="size-24 text-emerald-400 mx-auto mb-5" />
                <h2 className="text-3xl font-bold mb-2">Thank you!</h2>
                <p className="text-white/60 text-lg mb-8">Your feedback helps us serve you better.</p>
                <div className="grid grid-cols-2 gap-4 w-full max-w-md">
                  <button
                    onClick={resetAll}
                    className="h-14 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 font-semibold flex items-center justify-center gap-2"
                  >
                    <Home className="size-5" />
                    New Customer
                  </button>
                  <button
                    onClick={() => openFeedback('lookup')}
                    className="h-14 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 font-semibold flex items-center justify-center gap-2"
                  >
                    <Star className="size-5 text-amber-400" />
                    Rate Another
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button
                  onClick={() => (ticket ? setPhase('ticket') : setPhase('register'))}
                  className="self-start mb-4 text-white/60 hover:text-white flex items-center gap-2 text-sm"
                >
                  <ArrowLeft className="size-4" />
                  Back
                </button>

                <div className="w-full bg-white/5 border border-white/10 rounded-3xl p-6">
                  <h2 className="text-2xl font-bold mb-1">How was your visit?</h2>
                  <p className="text-white/60 mb-5">Tap a star to rate your experience.</p>

                  <div className="flex items-center justify-center gap-3 mb-6">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setRating(n)}
                        className={`transition-transform ${n <= rating ? 'scale-110' : 'scale-100'}`}
                        aria-label={`Rate ${n} star${n > 1 ? 's' : ''}`}
                      >
                        <Star className={`size-12 ${n <= rating ? 'text-amber-400 fill-amber-400' : 'text-white/25'}`} />
                      </button>
                    ))}
                  </div>

                  {(rating > 0 && rating < 4) && (
                    <div className="mb-5">
                      <label className="block text-sm font-semibold text-white/70 mb-1.5">
                        Tell us what went wrong (optional)
                      </label>
                      <textarea
                        value={complaint}
                        onChange={(e) => setComplaint(e.target.value)}
                        rows={3}
                        placeholder="Share any concern so we can make it right…"
                        className="w-full px-4 py-3 rounded-xl border border-white/15 bg-black/40 text-base"
                      />
                    </div>
                  )}

                  {rating >= 4 && (
                    <div className="mb-5">
                      <label className="block text-sm font-semibold text-white/70 mb-1.5">
                        Anything to add? (optional)
                      </label>
                      <textarea
                        value={complaint}
                        onChange={(e) => setComplaint(e.target.value)}
                        rows={2}
                        placeholder="Tell us what you loved…"
                        className="w-full px-4 py-3 rounded-xl border border-white/15 bg-black/40 text-base"
                      />
                    </div>
                  )}

                  {feedbackVisit === 'lookup' && (
                    <div className="mb-5 border-t border-white/10 pt-4">
                      <label className="block text-sm font-semibold text-white/70 mb-2">
                        Which visit? Enter the phone used at the salon.
                      </label>
                      <div className="max-w-sm mx-auto mb-3 h-12 rounded-xl border border-white/15 bg-black/40 flex items-center justify-center text-lg font-bold tracking-wide">
                        {formatPhoneNumber(feedbackDigits)}
                      </div>
                      <PhoneKeypad digits={feedbackDigits} onChange={setFeedbackDigits} compact />
                      {loadingVisits ? (
                        <p className="text-sm text-white/50 text-center mt-3">Looking up visits…</p>
                      ) : visits.length > 0 ? (
                        <div className="space-y-2 mt-3 max-h-56 overflow-y-auto">
                          {visits.map((v) => (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => setFeedbackVisit(v.id)}
                              className={`w-full h-12 px-4 rounded-xl border text-left flex items-center gap-3 transition-colors ${
                                feedbackVisit === v.id
                                  ? 'border-emerald-400 bg-emerald-400/10'
                                  : 'border-white/15 bg-black/40 hover:bg-white/5'
                              }`}
                            >
                              <span className="font-bold">{v.queueNumber}</span>
                              <span className="text-white/60 text-sm truncate">
                                {v.services?.length
                                  ? v.services.map((s) => s.serviceName).join(' + ')
                                  : v.customerName}
                              </span>
                              {feedbackVisit === v.id && <CheckCircle2 className="size-4 text-emerald-400 ml-auto" />}
                            </button>
                          ))}
                        </div>
                      ) : feedbackDigits.replace(/\D/g, '').length >= 9 ? (
                        <p className="text-sm text-white/50 text-center mt-3">No past visits found for this number.</p>
                      ) : null}
                    </div>
                  )}

                  <label className="flex items-center gap-3 mb-6 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={anonymous}
                      onChange={(e) => setAnonymous(e.target.checked)}
                      className="w-5 h-5"
                    />
                    <span className="text-white/70 text-sm">Submit anonymously</span>
                  </label>

                  <button
                    onClick={handleSubmitFeedback}
                    disabled={rating < 1}
                    className="w-full h-14 rounded-2xl bg-amber-400 hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-base flex items-center justify-center gap-2 transition-colors"
                  >
                    <Send className="size-5" />
                    Submit Feedback
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </main>

      <footer className="px-6 py-3 border-t border-white/10 flex items-center justify-center gap-2 text-xs text-white/30">
        <Scissors className="size-3.5" />
        {company.name} · {branch.name} · Self-service kiosk
      </footer>
    </div>
  );
};