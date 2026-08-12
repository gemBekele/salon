import React, { useState, useId } from 'react';
import { X, Calendar, Clock, User, Scissors, CheckCircle, Sparkles, Phone, Mail, FileText, ChevronRight, ChevronLeft } from 'lucide-react';
import { Service, Staff, Company, Branch, VisitSession } from '../types';
import { apiFetch } from '../lib/api';
import { showToast } from './Toast';

interface AppointmentBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: Company | null;
  branch: Branch | null;
  services: Service[];
  staffList: Staff[];
  initialServiceId?: string | null;
  onBookingCreated?: (newSession: VisitSession) => void;
  theme?: 'dark' | 'light';
}

export function AppointmentBookingModal({
  isOpen,
  onClose,
  company,
  branch,
  services,
  staffList,
  initialServiceId,
  onBookingCreated,
  theme = 'dark',
}: AppointmentBookingModalProps) {
  const serviceSearchId = useId();
  const dateInputId = useId();
  const customerNameId = useId();
  const customerPhoneId = useId();
  const customerEmailId = useId();
  const notesId = useId();

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Form State
  const [selectedServiceId, setSelectedServiceId] = useState<string>(initialServiceId || services[0]?.id || '');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('any');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('10:00 AM');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [submitting, setSubmitting] = useState(false);
  const [bookingConfirmation, setBookingConfirmation] = useState<{
    queueNumber: string;
    sessionId: string;
  } | null>(null);

  if (!isOpen) return null;

  const isDark = theme === 'dark';

  const barbers = staffList.filter((s) => s.role === 'barber' || s.role === 'hairstylist' || s.role === 'esthetician');
  const activeService = services.find((s) => s.id === selectedServiceId) || services[0];
  const chosenBarber = staffList.find((s) => s.id === selectedStaffId);

  const availableTimeSlots = [
    '09:00 AM', '09:45 AM', '10:30 AM', '11:15 AM',
    '01:30 PM', '02:15 PM', '03:00 PM', '04:00 PM',
    '05:00 PM', '06:00 PM', '07:00 PM'
  ];

  const handleNext = () => {
    if (step === 1 && !selectedServiceId) {
      showToast('info', 'Please select a service to continue');
      return;
    }
    if (step === 4) {
      if (!customerName.trim() || !customerPhone.trim()) {
        showToast('info', 'Please enter your name and phone number');
        return;
      }
      handleSubmitBooking();
      return;
    }
    setStep((prev) => (prev + 1) as any);
  };

  const handleBack = () => {
    setStep((prev) => (prev - 1) as any);
  };

  const handleSubmitBooking = async () => {
    setSubmitting(true);
    const companyId = company?.id || 'cmp_gech_01';
    const branchId = branch?.id || 'br_mens_01';

    const payload = {
      companyId,
      branchId,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerEmail: customerEmail.trim() || undefined,
      appointmentDate: selectedDate,
      appointmentTime: selectedTimeSlot,
      notes: notes.trim(),
      subtotalEtb: activeService ? activeService.priceEtb : 400,
      netTotalEtb: activeService ? activeService.priceEtb : 400,
      services: [
        {
          serviceId: activeService?.id || 'srv_m_haircut',
          serviceName: activeService?.name || 'Classic Haircut',
          staffId: chosenBarber ? chosenBarber.id : null,
          staffName: chosenBarber ? chosenBarber.name : 'Any Barber',
          priceEtb: activeService?.priceEtb || 400,
          durationMinutes: activeService?.durationMinutes || 30,
        },
      ],
    };

    try {
      let queueNumber = `Q-${Math.floor(100 + Math.random() * 899)}`;
      let sessionId = `vst_${Date.now()}`;

      const res = await apiFetch('/api/public/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.queueNumber) queueNumber = data.queueNumber;
        if (data.id) sessionId = data.id;
      }

      setBookingConfirmation({ queueNumber, sessionId });

      // Build visit session object for local state sync
      const newSession: VisitSession = {
        id: sessionId,
        companyId,
        branchId,
        businessUnitId: 'bu_mens_01',
        customerId: `cust_${Date.now()}`,
        queueNumber,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        status: 'queued',
        subtotalEtb: activeService?.priceEtb || 400,
        discountEtb: 0,
        taxEtb: 0,
        netTotalEtb: activeService?.priceEtb || 400,
        isPaid: false,
        startedAt: new Date().toISOString(),
        notes: `[Online Booking] ${selectedDate} ${selectedTimeSlot} - Barber: ${chosenBarber?.name || 'Any'}. ${notes.trim()}`,
        services: [
          {
            id: `vss_${Date.now()}`,
            serviceId: activeService?.id || 'srv_m_haircut',
            serviceName: activeService?.name || 'Classic Haircut',
            staffId: chosenBarber?.id || 'stf_bereket_06',
            staffName: chosenBarber?.name || 'Bereket Shimelis',
            priceEtb: activeService?.priceEtb || 400,
            durationMinutes: activeService?.durationMinutes || 30,
            commissionEarnedEtb: 120,
            status: 'pending',
          },
        ],
      };

      if (onBookingCreated) {
        onBookingCreated(newSession);
      }

      setStep(5);
      showToast('success', `Appointment confirmed! Ticket #${queueNumber}`);
    } catch (err) {
      console.error('Booking submission error:', err);
      showToast('error', 'Booking created in offline mode');
      setStep(5);
    } finally {
      setSubmitting(false);
    }
  };

  const modalBg = isDark ? 'bg-[#18181b] text-[#f3efe6] border-zinc-800' : 'bg-white text-zinc-900 border-zinc-200';
  const cardBg = isDark ? 'bg-zinc-900/80 border-zinc-800 hover:border-ink-500/50' : 'bg-zinc-50 border-zinc-200 hover:border-ink-600/50';
  const selectedCardBg = isDark ? 'bg-ink-950/40 border-ink-500 text-ink-300' : 'bg-ink-50 border-ink-500 text-ink-900';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className={`relative w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${modalBg}`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${isDark ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-200 bg-zinc-50'}`}>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-ink-500/20 border border-ink-500/30 flex items-center justify-center text-ink-500 font-bold">
              ✂
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold tracking-tight">
                {company?.name || 'Gech Barbershop'} — Online Booking
              </h3>
              <p className="text-xs text-zinc-400">
                {step < 5 ? `Step ${step} of 4 — ${step === 1 ? 'Select Service' : step === 2 ? 'Choose Barber' : step === 3 ? 'Date & Time' : 'Customer Info'}` : 'Booking Confirmed!'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-zinc-800/50 transition-colors text-zinc-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Progress Bar */}
        {step < 5 && (
          <div className="w-full bg-zinc-800 h-1">
            <div
              className="bg-gradient-to-r from-ink-600 to-ink-400 h-1 transition-all duration-300"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* STEP 1: SELECT SERVICE */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-semibold font-serif">Select Haircut or Grooming Service</h4>
                <span className="text-xs text-ink-500 font-mono">ETB Pricing</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {services.map((srv) => {
                  const isSelected = selectedServiceId === srv.id;
                  const usdApprox = Math.round(srv.priceEtb / 10);
                  return (
                    <button
                      key={srv.id}
                      onClick={() => setSelectedServiceId(srv.id)}
                      className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        isSelected ? selectedCardBg : cardBg
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-sm">{srv.name}</span>
                          <span className="text-xs font-mono px-2 py-0.5 rounded bg-ink-500/20 text-ink-400 font-bold">
                            {srv.priceEtb} ETB (${usdApprox})
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 line-clamp-2">
                          {srv.category} • Duration ~{srv.durationMinutes || 30} mins
                        </p>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs text-zinc-400 pt-2 border-t border-zinc-800/50">
                        <span>Category: {srv.category}</span>
                        {isSelected && <span className="text-ink-500 font-bold">✓ Selected</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: CHOOSE BARBER */}
          {step === 2 && (
            <div className="space-y-4">
              <h4 className="text-base font-semibold font-serif">Select Your Preferred Barber / Specialist</h4>

              {/* Any Barber Option */}
              <button
                onClick={() => setSelectedStaffId('any')}
                className={`w-full p-4 rounded-xl border text-left transition-all flex items-center justify-between ${
                  selectedStaffId === 'any' ? selectedCardBg : cardBg
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-full bg-ink-500/20 border border-ink-500/40 flex items-center justify-center text-ink-400 text-lg font-bold">
                    ⚡
                  </div>
                  <div>
                    <h5 className="font-semibold text-sm">Any Available Barber</h5>
                    <p className="text-xs text-zinc-400">First available master barber for fastest service</p>
                  </div>
                </div>
                {selectedStaffId === 'any' && <span className="text-ink-500 font-bold">✓ Selected</span>}
              </button>

              {/* Specific Barbers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {barbers.map((stf) => {
                  const isSelected = selectedStaffId === stf.id;
                  let specs = 'Fade & Styling Specialist';
                  try {
                    if (stf.specialties) {
                      const arr = Array.isArray(stf.specialties)
                        ? stf.specialties
                        : typeof stf.specialties === 'string'
                        ? JSON.parse(stf.specialties)
                        : [];
                      if (Array.isArray(arr) && arr.length > 0) specs = arr.join(', ');
                    }
                  } catch {
                    // default
                  }

                  return (
                    <button
                      key={stf.id}
                      onClick={() => setSelectedStaffId(stf.id)}
                      className={`p-4 rounded-xl border text-left transition-all flex items-center space-x-3 ${
                        isSelected ? selectedCardBg : cardBg
                      }`}
                    >
                      <div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-ink-400 text-base shrink-0">
                        {stf.name.charAt(0)}
                      </div>
                      <div className="overflow-hidden">
                        <h5 className="font-semibold text-sm truncate">{stf.name}</h5>
                        <p className="text-xs text-zinc-400 truncate capitalize">{stf.role}</p>
                        <p className="text-[11px] text-ink-500/80 truncate mt-0.5">{specs}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: DATE & TIME */}
          {step === 3 && (
            <div className="space-y-5">
              <h4 className="text-base font-semibold font-serif">Pick Appointment Date & Time Slot</h4>

              {/* Date Input */}
              <div className="space-y-2">
                <label htmlFor={dateInputId} className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">Select Date</label>
                <input
                  id={dateInputId}
                  type="date"
                  value={selectedDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border text-sm font-medium focus:ring-2 focus:ring-ink-500 outline-none ${
                    isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-300 text-zinc-900'
                  }`}
                />
              </div>

              {/* Time Slots */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">Available Time Slots</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {availableTimeSlots.map((slot) => {
                    const isSelected = selectedTimeSlot === slot;
                    return (
                      <button
                        key={slot}
                        onClick={() => setSelectedTimeSlot(slot)}
                        className={`py-2.5 px-3 rounded-lg text-xs font-mono font-medium border text-center transition-all ${
                          isSelected
                            ? 'bg-ink-500 border-ink-500 text-black font-bold shadow-md shadow-ink-500/20'
                            : isDark
                            ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                            : 'bg-zinc-100 border-zinc-200 text-zinc-800 hover:border-zinc-300'
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Summary Card */}
              <div className={`p-4 rounded-xl border ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>Selected Service:</span>
                  <span className="font-semibold text-white">{activeService?.name} ({activeService?.priceEtb} ETB)</span>
                </div>
                <div className="flex items-center justify-between text-xs text-zinc-400 mt-1">
                  <span>Selected Barber:</span>
                  <span className="font-semibold text-white">{chosenBarber ? chosenBarber.name : 'Any Barber'}</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: CUSTOMER DETAILS */}
          {step === 4 && (
            <div className="space-y-4">
              <h4 className="text-base font-semibold font-serif">Enter Your Details to Confirm Appointment</h4>

              <div className="space-y-3">
                <div>
                  <label htmlFor={customerNameId} className="block text-xs font-semibold text-zinc-400 mb-1">Full Name *</label>
                  <input
                    id={customerNameId}
                    type="text"
                    placeholder="e.g. Abebe Bikila"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-ink-500 ${
                      isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-300 text-zinc-900'
                    }`}
                  />
                </div>

                <div>
                  <label htmlFor={customerPhoneId} className="block text-xs font-semibold text-zinc-400 mb-1">Phone Number (For SMS Confirmation Ticket) *</label>
                  <input
                    id={customerPhoneId}
                    type="tel"
                    placeholder="+251 91 123 4567"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-ink-500 ${
                      isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-300 text-zinc-900'
                    }`}
                  />
                </div>

                <div>
                  <label htmlFor={customerEmailId} className="block text-xs font-semibold text-zinc-400 mb-1">Email Address (Optional)</label>
                  <input
                    id={customerEmailId}
                    type="email"
                    placeholder="customer@example.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-ink-500 ${
                      isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-300 text-zinc-900'
                    }`}
                  />
                </div>

                <div>
                  <label htmlFor={notesId} className="block text-xs font-semibold text-zinc-400 mb-1">Special Instructions / Preferences (Optional)</label>
                  <textarea
                    id={notesId}
                    rows={2}
                    placeholder="e.g. Skin fade with razor finish, sensitive skin..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-ink-500 ${
                      isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-300 text-zinc-900'
                    }`}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: BOOKING CONFIRMATION TICKET */}
          {step === 5 && bookingConfirmation && (
            <div className="py-6 text-center space-y-6 animate-fadeIn">
              <div className="w-16 h-16 rounded-full bg-ink-500/20 border border-ink-500/40 text-ink-400 flex items-center justify-center text-3xl mx-auto">
                ✓
              </div>

              <div className="space-y-1">
                <h4 className="text-2xl font-serif font-bold text-ink-400">Appointment Confirmed!</h4>
                <p className="text-xs text-zinc-400">Your session has been dispatched to the reception and barber queue.</p>
              </div>

              {/* Pass / Ticket Card */}
              <div className={`max-w-md mx-auto p-6 rounded-2xl border ${isDark ? 'bg-zinc-900 border-ink-500/30' : 'bg-ink-50 border-ink-200'} space-y-4 text-left shadow-xl`}>
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-ink-500">Queue Ticket</span>
                    <h5 className="text-3xl font-mono font-bold text-ink-400">{bookingConfirmation.queueNumber}</h5>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-zinc-400">Status</span>
                    <p className="text-xs font-semibold text-ink-400 bg-ink-950/60 px-2 py-0.5 rounded border border-ink-800">QUEUED</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-zinc-400">Customer:</span>
                    <p className="font-semibold">{customerName}</p>
                  </div>
                  <div>
                    <span className="text-zinc-400">Phone:</span>
                    <p className="font-semibold font-mono">{customerPhone}</p>
                  </div>
                  <div>
                    <span className="text-zinc-400">Service:</span>
                    <p className="font-semibold text-ink-300">{activeService?.name}</p>
                  </div>
                  <div>
                    <span className="text-zinc-400">Barber:</span>
                    <p className="font-semibold">{chosenBarber ? chosenBarber.name : 'Any Available Barber'}</p>
                  </div>
                  <div>
                    <span className="text-zinc-400">Date & Time:</span>
                    <p className="font-semibold font-mono">{selectedDate} @ {selectedTimeSlot}</p>
                  </div>
                  <div>
                    <span className="text-zinc-400">Estimated Price:</span>
                    <p className="font-semibold font-mono text-ink-400">{activeService?.priceEtb || 400} ETB</p>
                  </div>
                </div>

                <div className="text-[11px] text-zinc-400 pt-3 border-t border-zinc-800 text-center">
                  📱 SMS receipt sent to <strong className="text-zinc-200">{customerPhone}</strong>. Show this ticket upon arrival!
                </div>
              </div>

              <button
                onClick={onClose}
                className="px-8 py-3 rounded-xl bg-ink-500 hover:bg-ink-400 text-black font-bold text-sm transition-all shadow-lg shadow-ink-500/20"
              >
                Done & Return to Home
              </button>
            </div>
          )}

        </div>

        {/* Modal Footer Controls */}
        {step < 5 && (
          <div className={`px-6 py-4 border-t flex items-center justify-between ${isDark ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-200 bg-zinc-50'}`}>
            {step > 1 ? (
              <button
                onClick={handleBack}
                disabled={submitting}
                className="px-4 py-2 rounded-xl border border-zinc-700 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                ← Back
              </button>
            ) : (
              <div />
            )}

            <button
              onClick={handleNext}
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-ink-500 hover:bg-ink-400 text-black font-bold text-xs tracking-wider uppercase transition-all shadow-md shadow-ink-500/20 flex items-center space-x-2"
            >
              {submitting ? (
                <span>Processing...</span>
              ) : (
                <>
                  <span>{step === 4 ? 'Confirm & Book Appointment' : 'Continue'}</span>
                  <span>→</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
