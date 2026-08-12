import React, { useState, useId } from 'react';
import { Customer, AuthUser } from '../types';
import { showToast } from './Toast';

interface CustomerLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunchStaffLogin: () => void;
  customers: Customer[];
  theme?: 'dark' | 'light';
}

export function CustomerLoginModal({
  isOpen,
  onClose,
  onLaunchStaffLogin,
  customers,
  theme = 'dark',
}: CustomerLoginModalProps) {
  const customerPhoneId = useId();
  const ticketPinId = useId();

  const [activeTab, setActiveTab] = useState<'customer' | 'staff'>('customer');
  const [phoneInput, setPhoneInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [loggedInCustomer, setLoggedInCustomer] = useState<Customer | null>(null);

  if (!isOpen) return null;

  const isDark = theme === 'dark';

  const handleCustomerLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const found = customers.find((c) => c.phone.includes(phoneInput.trim()));
    if (found) {
      setLoggedInCustomer(found);
      showToast('success', `Welcome back, ${found.name}!`);
    } else {
      showToast('info', 'Phone number registered in system, creating session profile...');
      setLoggedInCustomer({
        id: `cust_${Date.now()}`,
        companyId: 'cmp_gech_01',
        name: 'Gech Customer',
        phone: phoneInput,
        totalVisits: 1,
        totalSpentEtb: 400,
        loyaltyPoints: 40,
        isVip: false,
      });
    }
  };

  const modalBg = isDark ? 'bg-[#18181b] text-[#f3efe6] border-zinc-800' : 'bg-white text-zinc-900 border-zinc-200';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className={`relative w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden flex flex-col ${modalBg}`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${isDark ? 'border-zinc-800 bg-zinc-900/60' : 'border-zinc-200 bg-zinc-50'}`}>
          <h3 className="font-serif text-lg font-bold">Gech Barbershop — Access Portal</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-zinc-800/50 text-zinc-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher */}
        <div className={`flex border-b text-xs font-semibold ${isDark ? 'border-zinc-800 bg-zinc-900/30' : 'border-zinc-200 bg-zinc-100'}`}>
          <button
            onClick={() => setActiveTab('customer')}
            className={`flex-1 py-3 text-center transition-all ${
              activeTab === 'customer'
                ? 'border-b-2 border-ink-500 text-ink-400 font-bold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            👤 Customer Portal
          </button>
          <button
            onClick={() => setActiveTab('staff')}
            className={`flex-1 py-3 text-center transition-all ${
              activeTab === 'staff'
                ? 'border-b-2 border-ink-500 text-ink-400 font-bold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            ⚡ Staff & POS Login
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {activeTab === 'customer' ? (
            loggedInCustomer ? (
              <div className="space-y-4">
                <div className={`p-4 rounded-xl border ${isDark ? 'bg-zinc-900 border-ink-500/30' : 'bg-ink-50 border-ink-200'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-base font-serif">{loggedInCustomer.name}</h4>
                      <p className="text-xs text-zinc-400 font-mono">{loggedInCustomer.phone}</p>
                    </div>
                    {loggedInCustomer.isVip && (
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-ink-500 text-black">
                        ★ VIP Client
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-zinc-800 text-xs">
                    <div>
                      <span className="text-zinc-400">Total Visits:</span>
                      <p className="font-bold font-mono text-base">{loggedInCustomer.totalVisits}</p>
                    </div>
                    <div>
                      <span className="text-zinc-400">Loyalty Points:</span>
                      <p className="font-bold font-mono text-base text-ink-400">+{loggedInCustomer.loyaltyPoints} pts</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setLoggedInCustomer(null)}
                  className="w-full py-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
                >
                  Sign Out of Customer Account
                </button>
              </div>
            ) : (
              <form onSubmit={handleCustomerLogin} className="space-y-4">
                <p className="text-xs text-zinc-400">
                  Enter your phone number to check your appointment status, loyalty points balance, and visit history.
                </p>

                <div>
                  <label htmlFor={customerPhoneId} className="block text-xs font-semibold text-zinc-400 mb-1">Phone Number</label>
                  <input
                    id={customerPhoneId}
                    type="tel"
                    placeholder="+251 91 123 4567"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    required
                    className={`w-full px-4 py-3 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-ink-500 ${
                      isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-300 text-zinc-900'
                    }`}
                  />
                </div>

                <div>
                  <label htmlFor={ticketPinId} className="block text-xs font-semibold text-zinc-400 mb-1">Queue Ticket / PIN (Optional)</label>
                  <input
                    id={ticketPinId}
                    type="text"
                    placeholder="e.g. Q-104"
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-ink-500 ${
                      isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-300 text-zinc-900'
                    }`}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-ink-500 hover:bg-ink-400 text-black font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-ink-500/20"
                >
                  View My Appointments & Points
                </button>
              </form>
            )
          ) : (
            <div className="space-y-4 text-center py-2">
              <div className="w-12 h-12 rounded-xl bg-ink-500/20 text-ink-400 border border-ink-500/40 flex items-center justify-center text-xl mx-auto font-bold">
                🔑
              </div>

              <div className="space-y-1">
                <h4 className="font-serif font-bold text-base">Gech Salon ERP Core Management</h4>
                <p className="text-xs text-zinc-400">
                  Access Receptionist POS, Barber Staff Portal, TV Waiting Room Queue, or Tenant Executive Admin.
                </p>
              </div>

              <button
                onClick={() => {
                  onClose();
                  onLaunchStaffLogin();
                }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-ink-600 to-ink-500 hover:from-ink-500 hover:to-ink-400 text-black font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-ink-500/20"
              >
                Launch Staff & Admin Login Screen →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
