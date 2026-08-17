import React, { useState, useRef, useEffect } from 'react';
import { Search, UserCheck, UserPlus, Phone, Sparkles, Check, X } from 'lucide-react';
import { Customer } from '../types';

interface CustomerSearchSelectProps {
  customers: Customer[];
  selectedCustomer: Customer | null;
  onSelectCustomer: (customer: Customer) => void;
  onOpenNewCustomerModal: () => void;
  label?: string;
}

export const CustomerSearchSelect: React.FC<CustomerSearchSelectProps> = ({
  customers,
  selectedCustomer,
  onSelectCustomer,
  onOpenNewCustomerModal,
  label = 'Select Walk-In / Registered Client',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCustomers = customers.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const nameMatch = c.name.toLowerCase().includes(q);
    const phoneMatch = c.phone.toLowerCase().includes(q) || c.phone.replace(/[\s+-]/g, '').includes(q.replace(/[\s+-]/g, ''));
    return nameMatch || phoneMatch;
  });

  return (
    <div className="space-y-3" ref={dropdownRef}>
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center space-x-1.5">
          <UserCheck className="w-3.5 h-3.5 text-muted-foreground" />
          <span>{label}</span>
        </label>

        <button
          type="button"
          onClick={onOpenNewCustomerModal}
          className="text-sm text-foreground hover:text-muted-foreground font-medium flex items-center space-x-1 cursor-pointer transition-colors"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>+ Register New Client</span>
        </button>
      </div>

      {/* Dual Search Input Box */}
      <div className="relative">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-muted-foreground absolute left-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Type Mobile Number (+251 / 09...) or Full Name to search registered clients..."
            value={searchQuery}
            onFocus={() => setIsOpen(true)}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsOpen(true);
            }}
            className="w-full h-8 bg-background border border-input text-foreground rounded-md pl-8 pr-9 text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dropdown Results List */}
        {isOpen && (
          <div className="absolute z-30 left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-sm max-h-64 overflow-y-auto divide-y divide-border">
            {filteredCustomers.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No registered client found matching "<span className="font-medium text-foreground">{searchQuery}</span>".
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenNewCustomerModal();
                  }}
                  className="block mx-auto mt-2 text-sm text-foreground font-medium hover:underline cursor-pointer"
                >
                  + Click to register new client now
                </button>
              </div>
            ) : (
              filteredCustomers.map((c) => {
                const isSelected = selectedCustomer?.id === c.id;

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      onSelectCustomer(c);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left p-3 flex items-center justify-between hover:bg-muted transition cursor-pointer text-sm ${
                      isSelected ? 'bg-primary/5 font-medium' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-md bg-muted border border-border flex items-center justify-center text-foreground font-semibold">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-foreground">{c.name}</span>
                          {c.isVip && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-foreground border border-border">
                              VIP
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center space-x-1 mt-0.5">
                          <Phone className="w-3 h-3 text-muted-foreground" />
                          <span className="font-mono">{c.phone}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border font-medium">
                        {c.loyaltyPoints || 0} Points
                      </span>
                      {isSelected && <Check className="w-4 h-4 text-foreground" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Selected Customer Profile Card */}
      {selectedCustomer && (
        <div className="flex items-center justify-between bg-card border border-border rounded-md p-3 text-sm">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
              {selectedCustomer.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-medium text-foreground text-sm">{selectedCustomer.name}</span>
                {selectedCustomer.isVip && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-foreground border border-border">
                    ★ VIP Client
                  </span>
                )}
              </div>
              <div className="text-[11px] text-muted-foreground font-mono mt-0.5 flex items-center space-x-1">
                <Phone className="w-3 h-3 text-muted-foreground" />
                <span>{selectedCustomer.phone}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-right hidden sm:block">
              <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Total Visits</div>
              <div className="font-semibold text-foreground">{selectedCustomer.totalVisits || 1}</div>
            </div>

            <div className="flex items-center space-x-1 bg-muted text-foreground px-3 py-1.5 rounded-full border border-border font-semibold text-sm">
              <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{selectedCustomer.loyaltyPoints || 0} Loyalty Pts</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};