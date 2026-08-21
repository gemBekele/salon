import React, { useState, useId } from 'react';
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
  const [customerPhone, setCustomerPhone] = useState<string>('+251 ');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [submitting, setSubmitting] = useState(false);
  const [bookingConfirmation, setBookingConfirmation] = useState<{
    queueNumber: string;
    sessionId: string;
  } | null>(null);

  if (!isOpen) return null;

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
      if (!customerName.trim() || customerPhone.trim().length <= 4) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fadeIn">
      <div className="relative w-full max-w-2xl rounded-md border border-border bg-card text-foreground shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-md bg-muted border border-border flex items-center justify-center text-foreground text-base">
              ✂
            </div>
            <div>
              <h3 className="text-lg font-semibold tracking-tight">
                {company?.name || 'Gech Barbershop'} — Online Booking
              </h3>
              <p className="text-sm text-muted-foreground">
                {step < 5 ? `Step ${step} of 4 — ${step === 1 ? 'Select Service' : step === 2 ? 'Choose Barber' : step === 3 ? 'Date & Time' : 'Customer Info'}` : 'Booking Confirmed!'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>

        {/* Progress Bar */}
        {step < 5 && (
          <div className="w-full bg-muted h-0.5">
            <div
              className="bg-primary h-0.5 transition-all duration-300"
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
                <h4 className="text-base font-semibold">Select Haircut or Grooming Service</h4>
                <span className="text-sm text-muted-foreground font-mono">ETB Pricing</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {services.map((srv) => {
                  const isSelected = selectedServiceId === srv.id;
                  const usdApprox = Math.round(srv.priceEtb / 10);
                  return (
                    <button
                      key={srv.id}
                      onClick={() => setSelectedServiceId(srv.id)}
                      className={`p-4 rounded-md border text-left transition-colors flex flex-col justify-between ${
                        isSelected ? 'border-primary bg-primary/5' : 'bg-card border-border hover:border-primary/60 hover:bg-primary/5'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-sm">{srv.name}</span>
                          <span className="text-sm font-mono px-2 py-0.5 rounded-md bg-muted text-foreground font-medium border border-border">
                            {srv.priceEtb} ETB (${usdApprox})
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {srv.category} • Duration ~{srv.durationMinutes || 30} mins
                        </p>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground pt-2 border-t border-border">
                        <span>Category: {srv.category}</span>
                        {isSelected && <span className="text-primary font-medium">✓ Selected</span>}
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
              <h4 className="text-base font-semibold">Select Your Preferred Barber / Specialist</h4>

              {/* Any Barber Option */}
              <button
                onClick={() => setSelectedStaffId('any')}
                className={`w-full p-4 rounded-md border text-left transition-colors flex items-center justify-between ${
                  selectedStaffId === 'any' ? 'border-primary bg-primary/5' : 'bg-card border-border hover:border-primary/60 hover:bg-primary/5'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-md bg-muted border border-border flex items-center justify-center text-foreground text-lg font-medium">
                    ⚡
                  </div>
                  <div>
                    <h5 className="font-semibold text-sm">Any Available Barber</h5>
                    <p className="text-sm text-muted-foreground">First available master barber for fastest service</p>
                  </div>
                </div>
                {selectedStaffId === 'any' && <span className="text-primary font-medium">✓ Selected</span>}
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
                      className={`p-4 rounded-md border text-left transition-all flex items-center space-x-3 ${
                        isSelected ? 'border-primary bg-primary/5' : 'bg-card border-border hover:border-primary/60 hover:bg-primary/5'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-md bg-muted border border-border flex items-center justify-center font-semibold text-foreground text-base shrink-0">
                        {stf.name.charAt(0)}
                      </div>
                      <div className="overflow-hidden">
                        <h5 className="font-semibold text-sm truncate">{stf.name}</h5>
                        <p className="text-sm text-muted-foreground truncate capitalize">{stf.role}</p>
                        <p className="text-[11px] text-muted-foreground/80 truncate mt-0.5">{specs}</p>
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
              <h4 className="text-base font-semibold">Pick Appointment Date & Time Slot</h4>

              {/* Date Input */}
              <div className="space-y-2">
                <label htmlFor={dateInputId} className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Select Date</label>
                <input
                  id={dateInputId}
                  type="date"
                  value={selectedDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full h-8 rounded-md border border-input bg-background px-2.5 text-sm font-medium focus:border-primary focus:ring-2 focus:ring-primary/30 outline-none"
                />
              </div>

              {/* Time Slots */}
              <div className="space-y-2">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Available Time Slots</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {availableTimeSlots.map((slot) => {
                    const isSelected = selectedTimeSlot === slot;
                    return (
                      <button
                        key={slot}
                        onClick={() => setSelectedTimeSlot(slot)}
                        className={`rounded-md text-sm font-mono font-medium border text-center transition-colors ${
                          isSelected
                            ? 'h-8 bg-primary border-primary text-primary-foreground font-semibold'
                            : 'h-8 bg-card border-border text-foreground hover:border-primary/60 hover:bg-primary/5'
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Summary Card */}
              <div className="p-4 rounded-md border border-border bg-muted/50">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Selected Service:</span>
                  <span className="font-semibold text-foreground">{activeService?.name} ({activeService?.priceEtb} ETB)</span>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground mt-1">
                  <span>Selected Barber:</span>
                  <span className="font-semibold text-foreground">{chosenBarber ? chosenBarber.name : 'Any Barber'}</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: CUSTOMER DETAILS */}
          {step === 4 && (
            <div className="space-y-4">
              <h4 className="text-base font-semibold">Enter Your Details to Confirm Appointment</h4>

              <div className="space-y-3">
                <div>
                  <label htmlFor={customerNameId} className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Full Name *</label>
                  <input
                    id={customerNameId}
                    type="text"
                    placeholder="e.g. Abebe Bikila"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full h-8 rounded-md border border-input bg-background px-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
                  />
                </div>

                <div>
                  <label htmlFor={customerPhoneId} className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Phone Number (For SMS Confirmation Ticket) *</label>
                  <input
                    id={customerPhoneId}
                    type="tel"
                    placeholder="+251 91 123 4567"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full h-8 rounded-md border border-input bg-background px-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
                  />
                </div>

                <div>
                  <label htmlFor={customerEmailId} className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Email Address (Optional)</label>
                  <input
                    id={customerEmailId}
                    type="email"
                    placeholder="customer@example.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full h-8 rounded-md border border-input bg-background px-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
                  />
                </div>

                <div>
                  <label htmlFor={notesId} className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Special Instructions / Preferences (Optional)</label>
                  <textarea
                    id={notesId}
                    rows={2}
                    placeholder="e.g. Skin fade with razor finish, sensitive skin..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-2.5 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: BOOKING CONFIRMATION TICKET */}
          {step === 5 && bookingConfirmation && (
            <div className="py-6 text-center space-y-6 animate-fadeIn">
              <div className="w-14 h-14 rounded-full bg-muted border border-border text-foreground flex items-center justify-center text-2xl mx-auto">
                ✓
              </div>

              <div className="space-y-1">
                <h4 className="text-xl font-semibold text-foreground">Appointment Confirmed!</h4>
                <p className="text-sm text-muted-foreground">Your session has been dispatched to the reception and barber queue.</p>
              </div>

              {/* Pass / Ticket Card */}
              <div className="max-w-md mx-auto p-6 rounded-md border border-border bg-card space-y-4 text-left">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div>
                    <span className="text-[10px] uppercase font-semibold tracking-widest text-muted-foreground">Queue Ticket</span>
                    <h5 className="text-3xl font-mono font-semibold text-foreground">{bookingConfirmation.queueNumber}</h5>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground">Status</span>
                    <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-300 dark:border-emerald-900 px-2 py-0.5 rounded-md">QUEUED</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Customer:</span>
                    <p className="font-semibold">{customerName}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Phone:</span>
                    <p className="font-semibold font-mono">{customerPhone}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Service:</span>
                    <p className="font-semibold text-foreground">{activeService?.name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Barber:</span>
                    <p className="font-semibold">{chosenBarber ? chosenBarber.name : 'Any Available Barber'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Date & Time:</span>
                    <p className="font-semibold font-mono">{selectedDate} @ {selectedTimeSlot}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Estimated Price:</span>
                    <p className="font-semibold font-mono text-foreground">{activeService?.priceEtb || 400} ETB</p>
                  </div>
                </div>

                <div className="text-[11px] text-muted-foreground pt-3 border-t border-border text-center">
                  📱 SMS receipt sent to <strong className="text-foreground">{customerPhone}</strong>. Show this ticket upon arrival!
                </div>
              </div>

              <button
                onClick={onClose}
                className="h-8 px-6 rounded-md bg-primary hover:bg-primary/85 text-primary-foreground font-medium text-[13px] transition-colors"
              >
                Done & Return to Home
              </button>
            </div>
          )}

        </div>

        {/* Modal Footer Controls */}
        {step < 5 && (
          <div className="px-6 py-3 border-t border-border bg-muted/50 flex items-center justify-between">
            {step > 1 ? (
              <button
                onClick={handleBack}
                disabled={submitting}
                className="h-8 px-4 rounded-md border border-border text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                ← Back
              </button>
            ) : (
              <div />
            )}

            <button
              onClick={handleNext}
              disabled={submitting}
              className="h-8 px-5 rounded-md bg-primary hover:bg-primary/85 text-primary-foreground font-medium text-[13px] transition-colors flex items-center space-x-2"
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