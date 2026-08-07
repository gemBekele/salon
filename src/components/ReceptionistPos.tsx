import React, { useState } from 'react';
import {
  Scissors,
  UserPlus,
  Clock,
  CheckCircle,
  Plus,
  Trash2,
  DollarSign,
  QrCode,
  Send,
  Sparkles,
  AlertCircle,
  Check,
  Search,
  UserCheck,
  Receipt,
  Layers,
  Calendar,
  MessageSquare,
  PlayCircle,
  PhoneCall,
} from 'lucide-react';
import {
  Company,
  Branch,
  BusinessUnit,
  Staff,
  Service,
  Customer,
  VisitSession,
  SessionServiceItem,
  PaymentMethod,
  InventoryItem,
  SmsLog,
} from '../types';
import { WeeklyScheduler } from './WeeklyScheduler';
import { PrintableInvoice } from './PrintableInvoice';

interface ReceptionistPosProps {
  company: Company;
  branch: Branch;
  businessUnit: BusinessUnit | null;
  staffList: Staff[];
  services: Service[];
  customers: Customer[];
  visitSessions: VisitSession[];
  inventoryItems: InventoryItem[];
  smsLogs?: SmsLog[];
  onCreateVisitSession: (session: VisitSession) => void;
  onCheckoutSession: (sessionId: string, paymentMethod: PaymentMethod, reference: string) => void;
  onAddCustomer: (customer: Customer) => void;
  onUpdateSessionStatus?: (sessionId: string, newStatus: any) => void;
  onUpdateSessionTimeOrStaff?: (sessionId: string, newStaffId: string, newTime: string) => void;
}

export const ReceptionistPos: React.FC<ReceptionistPosProps> = ({
  company,
  branch,
  businessUnit,
  staffList,
  services,
  customers,
  visitSessions,
  inventoryItems,
  smsLogs = [],
  onCreateVisitSession,
  onCheckoutSession,
  onAddCustomer,
  onUpdateSessionStatus,
  onUpdateSessionTimeOrStaff,
}) => {
  // Navigation Sub-tab
  const [subTab, setSubTab] = useState<'pos' | 'schedule' | 'sms'>('pos');
  // New Session State
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(customers[0] || null);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');

  // Selected Services Builder for Session
  const [selectedServiceItems, setSelectedServiceItems] = useState<
    { service: Service; assignedStaff: Staff }[]
  >([]);

  // Active Checkout Session Modal
  const [checkoutSession, setCheckoutSession] = useState<VisitSession | null>(null);
  const [invoiceToPrint, setInvoiceToPrint] = useState<VisitSession | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('telebirr');
  const [paymentReference, setPaymentReference] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);

  // Queue Board Search & Status Filter State
  const [queueSearchQuery, setQueueSearchQuery] = useState('');
  const [queueStatusFilter, setQueueStatusFilter] = useState<'all' | 'queued' | 'in_progress' | 'completed'>('all');

  const availableStaff = staffList.filter((s) => s.branchId === branch.id);
  const availableServices = services.filter((s) =>
    businessUnit ? s.businessUnitId === businessUnit.id : true
  );

  const branchSessions = visitSessions.filter((s) => s.branchId === branch.id);
  const queuedSessions = branchSessions.filter((s) => s.status === 'queued');
  const inProgressSessions = branchSessions.filter((s) => s.status === 'in_progress');
  const completedSessions = branchSessions.filter((s) => s.status === 'completed');

  const filteredSessions = branchSessions.filter((session) => {
    if (queueStatusFilter !== 'all' && session.status !== queueStatusFilter) {
      return false;
    }
    if (queueSearchQuery.trim() !== '') {
      const q = queueSearchQuery.toLowerCase().trim();
      const matchesQueue = session.queueNumber.toLowerCase().includes(q);
      const matchesName = session.customerName.toLowerCase().includes(q);
      const matchesPhone = session.customerPhone.toLowerCase().includes(q);
      const matchesService = session.services.some((srv) => srv.serviceName.toLowerCase().includes(q));
      return matchesQueue || matchesName || matchesPhone || matchesService;
    }
    return true;
  });

  // Calculations for current Session builder
  const rawSubtotalEtb = selectedServiceItems.reduce((acc, item) => acc + item.service.priceEtb, 0);
  const totalDurationMins = selectedServiceItems.reduce((acc, item) => acc + item.service.durationMinutes, 0);

  // Inventory usage preview for current session
  const inventoryDeductionsPreview = selectedServiceItems.flatMap((item) =>
    item.service.requiredInventory.map((req) => {
      const inv = inventoryItems.find((i) => i.id === req.inventoryItemId);
      return {
        name: inv?.name || 'Inventory Item',
        qty: req.quantityUsed,
        unit: inv?.unit || 'pcs',
      };
    })
  );

  // Handlers
  const handleAddServiceToBuilder = (service: Service) => {
    // Pick first available staff or default
    const matchingStaff = availableStaff.find(
      (s) => s.role === 'barber' || s.role === 'hairstylist' || s.role === 'masseuse' || s.role === 'esthetician'
    ) || availableStaff[0];

    if (!matchingStaff) return;

    setSelectedServiceItems((prev) => [
      ...prev,
      { service, assignedStaff: matchingStaff },
    ]);
  };

  const handleStaffChangeInBuilder = (index: number, staffId: string) => {
    const staff = availableStaff.find((s) => s.id === staffId);
    if (!staff) return;

    setSelectedServiceItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], assignedStaff: staff };
      return next;
    });
  };

  const handleRemoveServiceFromBuilder = (index: number) => {
    setSelectedServiceItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRegisterSession = () => {
    if (!selectedCustomer || selectedServiceItems.length === 0) return;

    const queueNum = `Q-${100 + filteredSessions.length + 1}`;

    const sessionServices: SessionServiceItem[] = selectedServiceItems.map((item, idx) => {
      const commissionAmount = Math.round(
        (item.service.priceEtb * item.assignedStaff.defaultCommissionPercentage) / 100
      );
      return {
        id: `vss_${Date.now()}_${idx}`,
        serviceId: item.service.id,
        serviceName: item.service.name,
        staffId: item.assignedStaff.id,
        staffName: item.assignedStaff.name,
        priceEtb: item.service.priceEtb,
        durationMinutes: item.service.durationMinutes,
        commissionEarnedEtb: commissionAmount,
        status: 'pending',
      };
    });

    const newSession: VisitSession = {
      id: `vst_${Date.now()}`,
      companyId: company.id,
      branchId: branch.id,
      businessUnitId: businessUnit?.id || availableServices[0]?.businessUnitId || '',
      queueNumber: queueNum,
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      customerPhone: selectedCustomer.phone,
      services: sessionServices,
      status: 'queued',
      subtotalEtb: rawSubtotalEtb,
      discountEtb: discountAmount,
      taxEtb: 0,
      netTotalEtb: Math.max(0, rawSubtotalEtb - discountAmount),
      isPaid: false,
      startedAt: new Date().toISOString(),
    };

    onCreateVisitSession(newSession);
    setSelectedServiceItems([]);
    setDiscountAmount(0);
  };

  const handleCreateNewCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName || !custPhone) return;

    const newCust: Customer = {
      id: `cust_${Date.now()}`,
      companyId: company.id,
      name: custName,
      phone: custPhone,
      totalVisits: 1,
      totalSpentEtb: 0,
      loyaltyPoints: 10,
      isVip: false,
      createdAt: new Date().toISOString().split('T')[0],
    };

    onAddCustomer(newCust);
    setSelectedCustomer(newCust);
    setShowNewCustomerModal(false);
    setCustName('');
    setCustPhone('');
  };

  const handleExecuteCheckout = () => {
    if (!checkoutSession) return;
    const ref = paymentReference || `${paymentMethod.toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`;
    onCheckoutSession(checkoutSession.id, paymentMethod, ref);
    setInvoiceToPrint(checkoutSession);
    setCheckoutSession(null);
    setPaymentReference('');
  };

  return (
    <div className="space-y-6">
      {/* POS Top Banner */}
      <div className="bg-[#5A5A40] border border-[#4a4a35] rounded-3xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#f5f5f0]/15 text-[#f5f5f0] border border-[#f5f5f0]/30 uppercase tracking-widest">
              Receptionist Walk-In POS & Live Queue
            </span>
            <span className="text-[#f5f5f0]/80 text-xs font-medium">{branch.name}</span>
          </div>
          <h2 className="text-2xl font-serif font-light mt-2 text-[#f5f5f0]">Fast Session Checkout & Multi-Service Dispatch</h2>
          <p className="text-[#f5f5f0]/80 text-xs mt-1 max-w-2xl font-sans">
            Touch-optimized check-in. Multi-service sessions automatically assign specialized staff, track inventory consumption, and trigger Telebirr/CBE SMS receipts.
          </p>
        </div>

        {/* Live Counters */}
        <div className="flex items-center space-x-3 text-xs">
          <div className="bg-[#f5f5f0]/10 px-4 py-2.5 rounded-2xl border border-[#f5f5f0]/20 text-center">
            <div className="text-[#f5f5f0] font-serif font-bold text-xl">{queuedSessions.length}</div>
            <div className="text-[#f5f5f0]/70 text-[10px] uppercase font-bold tracking-wider">Queued</div>
          </div>
          <div className="bg-[#f5f5f0]/10 px-4 py-2.5 rounded-2xl border border-[#f5f5f0]/20 text-center">
            <div className="text-[#f5f5f0] font-serif font-bold text-xl">{inProgressSessions.length}</div>
            <div className="text-[#f5f5f0]/70 text-[10px] uppercase font-bold tracking-wider">In Progress</div>
          </div>
          <div className="bg-[#f5f5f0]/10 px-4 py-2.5 rounded-2xl border border-[#f5f5f0]/20 text-center">
            <div className="text-[#f5f5f0] font-serif font-bold text-xl">{completedSessions.length}</div>
            <div className="text-[#f5f5f0]/70 text-[10px] uppercase font-bold tracking-wider">Completed</div>
          </div>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex items-center space-x-2 bg-white p-2 rounded-2xl border border-[#e5e5d1] text-xs font-bold shadow-sm">
        <button
          onClick={() => setSubTab('pos')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition cursor-pointer ${
            subTab === 'pos'
              ? 'bg-[#5A5A40] text-white shadow-sm'
              : 'text-[#737366] hover:text-[#2d2d2a] hover:bg-[#f5f5f0]'
          }`}
        >
          <Scissors className="w-4 h-4" />
          <span>Walk-In POS & Live Queue</span>
        </button>

        <button
          onClick={() => setSubTab('schedule')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition cursor-pointer ${
            subTab === 'schedule'
              ? 'bg-[#5A5A40] text-white shadow-sm'
              : 'text-[#737366] hover:text-[#2d2d2a] hover:bg-[#f5f5f0]'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Weekly Staff Scheduler (Drag & Drop)</span>
        </button>

        <button
          onClick={() => setSubTab('sms')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition cursor-pointer ${
            subTab === 'sms'
              ? 'bg-[#5A5A40] text-white shadow-sm'
              : 'text-[#737366] hover:text-[#2d2d2a] hover:bg-[#f5f5f0]'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>SMS Gateway & Template Preview ({smsLogs.length})</span>
        </button>
      </div>

      {subTab === 'schedule' && (
        <WeeklyScheduler
          staffList={staffList}
          visitSessions={visitSessions}
          onUpdateSessionTimeOrStaff={onUpdateSessionTimeOrStaff}
        />
      )}

      {subTab === 'sms' && (
        <div className="bg-white border border-[#e5e5d1] rounded-3xl p-6 space-y-6 shadow-sm font-sans">
          <div className="border-b border-[#e5e5d1] pb-4">
            <h3 className="text-lg font-serif font-bold text-[#2d2d2a] flex items-center space-x-2">
              <MessageSquare className="w-5 h-5 text-[#5A5A40]" />
              <span>Automated SMS Gateway & Notification Service</span>
            </h3>
            <p className="text-xs text-[#737366] mt-0.5">
              SMS notifications trigger automatically on session transitions (In Progress queue calls & Completed receipts).
            </p>
          </div>

          {/* Template Previews Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-[#f5f5f0] border border-[#e5e5d1] rounded-2xl p-4 space-y-2">
              <div className="text-xs font-bold text-[#5A5A40] uppercase tracking-wider flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>Template: Queue Turn Alert (In Progress)</span>
              </div>
              <div className="bg-white border border-[#e5e5d1] p-3 rounded-xl font-mono text-[11px] text-[#2d2d2a] shadow-inner">
                "{company.name}: Hello [Customer]! Queue #[QueueNo] is now IN PROGRESS. Station ready for [Services]."
              </div>
              <div className="text-[10px] text-emerald-700 font-bold">Auto-triggers when session status changes to 'in_progress'</div>
            </div>

            <div className="bg-[#f5f5f0] border border-[#e5e5d1] rounded-2xl p-4 space-y-2">
              <div className="text-xs font-bold text-[#5A5A40] uppercase tracking-wider flex items-center space-x-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>Template: Session Receipt & Feedback</span>
              </div>
              <div className="bg-white border border-[#e5e5d1] p-3 rounded-xl font-mono text-[11px] text-[#2d2d2a] shadow-inner">
                "{company.name}: Session #[QueueNo] COMPLETED. Total: [NetTotal] ETB. Thank you for visiting!"
              </div>
              <div className="text-[10px] text-emerald-700 font-bold">Auto-triggers when session checkout is finalized</div>
            </div>

            <div className="bg-[#f5f5f0] border border-[#e5e5d1] rounded-2xl p-4 space-y-2">
              <div className="text-xs font-bold text-[#5A5A40] uppercase tracking-wider flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                <span>Template: Appointment Confirmation</span>
              </div>
              <div className="bg-white border border-[#e5e5d1] p-3 rounded-xl font-mono text-[11px] text-[#2d2d2a] shadow-inner">
                "{company.name}: Appointment confirmed for [Date] at [Time]. Reply 1 to confirm."
              </div>
              <div className="text-[10px] text-amber-700 font-bold">Scheduled reminder protocol</div>
            </div>
          </div>

          {/* Sent Logs History */}
          <div className="space-y-3">
            <h4 className="font-serif font-bold text-sm text-[#2d2d2a]">Recent Dispatched SMS Logs</h4>
            <div className="overflow-x-auto rounded-2xl border border-[#e5e5d1]">
              <table className="w-full text-left text-xs text-[#2d2d2a]">
                <thead className="bg-[#f5f5f0] text-[#737366] uppercase text-[10px] font-bold tracking-wider">
                  <tr>
                    <th className="p-3">Recipient Phone</th>
                    <th className="p-3">Message Type</th>
                    <th className="p-3">Message Content</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Sent Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e5d1]">
                  {smsLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-[#737366] italic">
                        No SMS notification logs yet. Transition a session to 'in_progress' or 'completed' to view auto-dispatch logs!
                      </td>
                    </tr>
                  ) : (
                    smsLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-[#f5f5f0]/50">
                        <td className="p-3 font-mono font-bold text-[#2d2d2a]">{log.recipientPhone}</td>
                        <td className="p-3 font-semibold capitalize text-[#5A5A40]">{log.messageType.replace('_', ' ')}</td>
                        <td className="p-3 font-mono text-[11px] max-w-xs truncate text-[#737366]">{log.content}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase">
                            {log.status}
                          </span>
                        </td>
                        <td className="p-3 text-[10px] text-[#737366]">{new Date(log.sentAt).toLocaleTimeString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {subTab === 'pos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Fast Service Tile Selector & Session Builder (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Customer Selection Card */}
          <div className="bg-white border border-[#e5e5d1] rounded-3xl p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#2d2d2a] flex items-center space-x-1.5 uppercase tracking-wider">
                <UserCheck className="w-4 h-4 text-[#5A5A40]" />
                <span>Select Walk-In / VIP Customer</span>
              </label>

              <button
                onClick={() => setShowNewCustomerModal(true)}
                className="text-xs text-[#5A5A40] hover:text-[#4a4a35] font-bold flex items-center space-x-1 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Register Customer</span>
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <select
                value={selectedCustomer?.id || ''}
                onChange={(e) => {
                  const cust = customers.find((c) => c.id === e.target.value);
                  setSelectedCustomer(cust || null);
                }}
                className="w-full bg-[#f5f5f0] border border-[#e5e5d1] text-[#2d2d2a] rounded-xl px-3.5 py-2.5 text-xs font-medium outline-none focus:border-[#5A5A40]"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone}) {c.isVip ? '★ VIP' : ''} — {c.loyaltyPoints || 0} Points
                  </option>
                ))}
              </select>
            </div>

            {selectedCustomer && (
              <div className="flex items-center justify-between bg-[#f5f5f0] border border-[#e5e5d1] rounded-2xl p-3 text-xs">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-[#2d2d2a]">{selectedCustomer.name}</span>
                  {selectedCustomer.isVip && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                      VIP Customer
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-[11px] text-[#737366]">Total Visits: <span className="font-bold text-[#2d2d2a]">{selectedCustomer.totalVisits || 1}</span></div>
                  <div className="flex items-center space-x-1 bg-amber-50 text-amber-900 px-2.5 py-1 rounded-full border border-amber-200 font-bold text-xs">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>{selectedCustomer.loyaltyPoints || 0} Loyalty Points</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Service Touch Selector Tiles */}
          <div className="bg-white border border-[#e5e5d1] rounded-3xl p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#5A5A40] uppercase tracking-wider flex items-center space-x-1.5">
                <Scissors className="w-4 h-4 text-[#5A5A40]" />
                <span>Quick Service Touch Selector</span>
              </h3>
              <span className="text-[10px] text-[#737366] font-medium">Click tile to append to session</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {availableServices.map((srv) => (
                <button
                  key={srv.id}
                  onClick={() => handleAddServiceToBuilder(srv)}
                  className="bg-[#f5f5f0]/80 hover:bg-[#f5f5f0] border border-[#e5e5d1] hover:border-[#5A5A40] rounded-2xl p-3.5 text-left transition-all hover:scale-[1.01] cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="font-semibold text-[#2d2d2a] text-xs line-clamp-1">{srv.name}</div>
                    <div className="text-[10px] text-[#737366] mt-1 italic">{srv.category} • {srv.durationMinutes}m</div>
                  </div>
                  <div className="text-[#5A5A40] font-serif font-bold text-xs mt-3">
                    {srv.priceEtb.toLocaleString()} ETB
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Session Builder Summary Box */}
          <div className="bg-white border border-[#e5e5d1] rounded-3xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#e5e5d1] pb-3">
              <h3 className="text-xs font-bold text-[#2d2d2a] uppercase tracking-wider flex items-center space-x-1.5">
                <Receipt className="w-4 h-4 text-[#5A5A40]" />
                <span>Session Cart ({selectedServiceItems.length} Services)</span>
              </h3>
              <div className="text-xs text-[#737366]">
                Est Duration: <strong className="text-[#2d2d2a]">{totalDurationMins} mins</strong>
              </div>
            </div>

            {selectedServiceItems.length === 0 ? (
              <div className="py-8 text-center text-[#737366] text-xs italic">
                Click any service tile above to add services & assign staff members to this visit session.
              </div>
            ) : (
              <div className="space-y-3">
                {selectedServiceItems.map((item, idx) => (
                  <div key={idx} className="bg-[#f5f5f0] border border-[#e5e5d1] p-3.5 rounded-2xl flex items-center justify-between gap-3 text-xs">
                    <div className="flex-1">
                      <div className="font-semibold text-[#2d2d2a]">{item.service.name}</div>
                      <div className="text-[#737366] text-[11px] mt-0.5">Price: {item.service.priceEtb} ETB</div>
                    </div>

                    {/* Staff Selection Dropdown */}
                    <div className="flex items-center space-x-2">
                      <span className="text-[#737366] text-[10px] uppercase font-bold">Staff:</span>
                      <select
                        value={item.assignedStaff.id}
                        onChange={(e) => handleStaffChangeInBuilder(idx, e.target.value)}
                        className="bg-white border border-[#e5e5d1] text-[#2d2d2a] rounded-lg px-2.5 py-1 text-xs outline-none"
                      >
                        {availableStaff.map((st) => (
                          <option key={st.id} value={st.id}>
                            {st.name} ({st.role})
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={() => handleRemoveServiceFromBuilder(idx)}
                        className="text-[#737366] hover:text-rose-600 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Inventory Consumption Preview */}
                {inventoryDeductionsPreview.length > 0 && (
                  <div className="bg-[#f5f5f0] p-3 rounded-2xl border border-[#e5e5d1] text-[11px] text-[#737366] space-y-1.5">
                    <span className="text-[#5A5A40] font-bold uppercase text-[10px] tracking-wider">Auto Inventory Deduction Preview:</span>
                    <div className="flex flex-wrap gap-2">
                      {inventoryDeductionsPreview.map((inv, i) => (
                        <span key={i} className="bg-white px-2.5 py-0.5 rounded-full text-[#2d2d2a] border border-[#e5e5d1]">
                          {inv.name} (-{inv.qty} {inv.unit})
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Discount & Total */}
                <div className="border-t border-[#e5e5d1] pt-3 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="text-[#737366]">Discount (ETB):</span>
                    <input
                      type="number"
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(Number(e.target.value))}
                      className="w-20 bg-[#f5f5f0] border border-[#e5e5d1] text-[#2d2d2a] rounded-lg px-2 py-1 text-xs outline-none"
                    />
                  </div>

                  <div className="text-right">
                    <div className="text-[#737366] text-[10px] uppercase font-bold">Net Payable</div>
                    <div className="text-2xl font-serif font-bold text-[#5A5A40]">
                      {Math.max(0, rawSubtotalEtb - discountAmount).toLocaleString()} ETB
                    </div>
                  </div>
                </div>

                <button
                  id="register-session-btn"
                  onClick={handleRegisterSession}
                  className="w-full py-3.5 bg-[#5A5A40] hover:bg-[#4a4a35] text-white font-bold rounded-full text-xs transition-all cursor-pointer flex items-center justify-center space-x-2 shadow-md shadow-[#5A5A40]/20"
                >
                  <Send className="w-4 h-4" />
                  <span>Issue Queue Ticket & Dispatch Session</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Live Queue Board & Checkout Terminal (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white border border-[#e5e5d1] rounded-3xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#e5e5d1] pb-3">
              <h3 className="text-xs font-bold text-[#2d2d2a] uppercase tracking-wider flex items-center space-x-1.5">
                <Clock className="w-4 h-4 text-[#5A5A40]" />
                <span>Live Branch Queue Status Board</span>
              </h3>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">● Live Polling</span>
            </div>

            {/* Robust Queue Search & Status Filter Bar */}
            <div className="space-y-2 bg-[#f5f5f0] p-3 rounded-2xl border border-[#e5e5d1]">
              <div className="relative">
                <Search className="w-4 h-4 text-[#737366] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter by Queue #, Customer, or Phone..."
                  value={queueSearchQuery}
                  onChange={(e) => setQueueSearchQuery(e.target.value)}
                  className="w-full bg-white border border-[#e5e5d1] rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#2d2d2a] outline-none focus:border-[#5A5A40] placeholder-[#737366]/70"
                />
              </div>

              <div className="flex items-center justify-between text-[11px] pt-1">
                <div className="flex items-center space-x-1 overflow-x-auto">
                  {(['all', 'queued', 'in_progress', 'completed'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => setQueueStatusFilter(st)}
                      className={`px-2.5 py-1 rounded-lg transition capitalize whitespace-nowrap cursor-pointer text-[10px] ${
                        queueStatusFilter === st
                          ? 'bg-[#5A5A40] text-white font-bold shadow-sm'
                          : 'bg-white text-[#737366] hover:text-[#2d2d2a] border border-[#e5e5d1]'
                      }`}
                    >
                      {st === 'all' ? 'All Visits' : st.replace('_', ' ')}
                    </button>
                  ))}
                </div>
                {queueSearchQuery && (
                  <button
                    onClick={() => setQueueSearchQuery('')}
                    className="text-[10px] text-rose-600 hover:underline font-medium shrink-0 ml-1"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Queue Board List */}
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {filteredSessions.length === 0 ? (
                <div className="py-8 text-center text-[#737366] text-xs italic">No active sessions in queue.</div>
              ) : (
                filteredSessions.map((session) => {
                  return (
                    <div
                      key={session.id}
                      className={`p-4 rounded-2xl border transition-all text-xs space-y-2.5 ${
                        session.status === 'completed'
                          ? 'bg-[#f5f5f0]/50 border-[#e5e5d1] opacity-75'
                          : session.status === 'in_progress'
                          ? 'bg-[#f5f5f0] border-[#5A5A40]'
                          : 'bg-white border-[#e5e5d1]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-[#f5f5f0] border border-[#e5e5d1] rounded-xl flex items-center justify-center font-serif text-[#5A5A40] font-bold text-sm">
                            {session.queueNumber}
                          </div>
                          <div>
                            <div className="font-semibold text-[#2d2d2a] text-sm">{session.customerName}</div>
                            <div className="text-[10px] text-[#737366]">{session.customerPhone}</div>
                          </div>
                        </div>

                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            session.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : session.status === 'in_progress'
                              ? 'bg-[#5A5A40]/10 text-[#5A5A40] border border-[#5A5A40]/20'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {session.status.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Services breakdown */}
                      <div className="space-y-1 bg-[#f5f5f0] p-2.5 rounded-xl text-[11px]">
                        {session.services.map((srv, i) => (
                          <div key={i} className="flex justify-between text-[#2d2d2a]">
                            <span>• {srv.serviceName}</span>
                            <span className="text-[#5A5A40] font-medium">({srv.staffName})</span>
                          </div>
                        ))}
                      </div>

                      {/* Status Transition Action Bar */}
                      <div className="flex items-center space-x-2 pt-1 border-t border-[#e5e5d1]/60">
                        {session.status === 'queued' && onUpdateSessionStatus && (
                          <button
                            onClick={() => onUpdateSessionStatus(session.id, 'in_progress')}
                            className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-[10px] cursor-pointer shadow-sm flex items-center justify-center space-x-1"
                          >
                            <PlayCircle className="w-3.5 h-3.5" />
                            <span>Call Station & Start Service (In Progress)</span>
                          </button>
                        )}

                        {session.status === 'in_progress' && onUpdateSessionStatus && (
                          <button
                            onClick={() => onUpdateSessionStatus(session.id, 'completed')}
                            className="w-full py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-[10px] cursor-pointer shadow-sm flex items-center justify-center space-x-1"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Mark Service Completed (Triggers SMS)</span>
                          </button>
                        )}
                      </div>

                      {/* Price & Action */}
                      <div className="flex items-center justify-between pt-1 border-t border-[#e5e5d1]/60">
                        <div className="font-serif font-bold text-[#5A5A40] text-base">{session.netTotalEtb} ETB</div>

                        {!session.isPaid ? (
                          <button
                            onClick={() => setCheckoutSession(session)}
                            className="px-3.5 py-1.5 bg-[#5A5A40] hover:bg-[#4a4a35] text-white font-bold rounded-full text-[11px] cursor-pointer shadow-sm"
                          >
                            Collect Payment & Receipt
                          </button>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <span className="text-[11px] text-emerald-700 font-semibold flex items-center space-x-1">
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Paid ({session.paymentMethod})</span>
                            </span>
                            <button
                              onClick={() => setInvoiceToPrint(session)}
                              className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 border border-[#e5e5d1] text-[#2d2d2a] font-bold rounded-full text-[10px] flex items-center space-x-1 cursor-pointer transition-colors"
                            >
                              <Receipt className="w-3 h-3 text-[#5A5A40]" />
                              <span>Print Receipt</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* MODAL: REGISTER NEW CUSTOMER */}
      {showNewCustomerModal && (
        <div className="fixed inset-0 z-50 bg-[#2d2d2a]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#e5e5d1] rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-serif font-bold text-[#2d2d2a] flex items-center space-x-2">
              <UserPlus className="w-5 h-5 text-[#5A5A40]" />
              <span>Register New Customer</span>
            </h3>

            <form onSubmit={handleCreateNewCustomer} className="space-y-3 font-sans">
              <div>
                <label className="block text-xs font-semibold text-[#2d2d2a] mb-1">Customer Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bethlehem Assefa"
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  className="w-full bg-[#f5f5f0] border border-[#e5e5d1] text-[#2d2d2a] rounded-xl px-3.5 py-2 text-xs outline-none focus:border-[#5A5A40]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2d2d2a] mb-1">Phone Number (+251 format)</label>
                <input
                  type="text"
                  required
                  placeholder="+251 91 123 4567"
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value)}
                  className="w-full bg-[#f5f5f0] border border-[#e5e5d1] text-[#2d2d2a] rounded-xl px-3.5 py-2 text-xs outline-none focus:border-[#5A5A40]"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-[#e5e5d1]">
                <button
                  type="button"
                  onClick={() => setShowNewCustomerModal(false)}
                  className="px-4 py-2 bg-[#f5f5f0] text-[#737366] hover:bg-[#e5e5d1] rounded-full text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#5A5A40] hover:bg-[#4a4a35] text-white font-bold rounded-full text-xs"
                >
                  Register & Select
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CHECKOUT PAYMENT & SMS DISPATCH */}
      {checkoutSession && (
        <div className="fixed inset-0 z-50 bg-[#2d2d2a]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#e5e5d1] rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#e5e5d1] pb-3">
              <div>
                <h3 className="text-lg font-serif font-bold text-[#2d2d2a] flex items-center space-x-2">
                  <QrCode className="w-5 h-5 text-[#5A5A40]" />
                  <span>Collect Payment — {checkoutSession.queueNumber}</span>
                </h3>
                <p className="text-xs text-[#737366] mt-0.5">{checkoutSession.customerName}</p>
              </div>

              <button onClick={() => setCheckoutSession(null)} className="text-[#737366] hover:text-[#2d2d2a] text-lg font-bold">
                ✕
              </button>
            </div>

            <div className="bg-[#f5f5f0] p-3.5 rounded-2xl border border-[#e5e5d1] space-y-1.5 text-xs">
              <div className="flex justify-between text-[#2d2d2a]">
                <span>Subtotal:</span>
                <span>{checkoutSession.subtotalEtb} ETB</span>
              </div>
              <div className="flex justify-between text-[#2d2d2a]">
                <span>Discount:</span>
                <span>-{checkoutSession.discountEtb} ETB</span>
              </div>
              <div className="flex justify-between text-[#5A5A40] font-serif font-bold text-base pt-2 border-t border-[#e5e5d1]">
                <span>Net Payable:</span>
                <span>{checkoutSession.netTotalEtb} ETB</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#2d2d2a]">Payment Gateway / Method</label>
              <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                {[
                  { id: 'telebirr', label: 'Telebirr QR / Ref' },
                  { id: 'cbe_birr', label: 'CBE Birr' },
                  { id: 'cash', label: 'Cash In Hand' },
                  { id: 'card', label: 'POS Card Machine' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id as any)}
                    className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer ${
                      paymentMethod === m.id
                        ? 'bg-[#5A5A40] text-white border-[#5A5A40] shadow-sm'
                        : 'bg-[#f5f5f0] text-[#2d2d2a] border-[#e5e5d1]'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs text-[#2d2d2a] mb-1 font-semibold">Transaction Ref / Approval Code</label>
              <input
                type="text"
                placeholder="e.g. TB-99882211 or CBE-771122"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                className="w-full bg-[#f5f5f0] border border-[#e5e5d1] text-[#2d2d2a] rounded-xl px-3 py-2 text-xs font-mono"
              />
            </div>

            <div className="bg-[#5A5A40]/10 border border-[#5A5A40]/20 p-3 rounded-2xl text-[11px] text-[#5A5A40] flex items-start space-x-2">
              <Send className="w-4 h-4 shrink-0 mt-0.5 text-[#5A5A40]" />
              <span>
                Completing payment will auto-deduct inventory stock, generate staff commissions, and dispatch SMS receipt to {checkoutSession.customerPhone}.
              </span>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-[#e5e5d1]">
              <button
                type="button"
                onClick={() => setCheckoutSession(null)}
                className="px-4 py-2 bg-[#f5f5f0] text-[#737366] rounded-full text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteCheckout}
                className="px-5 py-2 bg-[#5A5A40] hover:bg-[#4a4a35] text-white font-bold rounded-full text-xs shadow-md shadow-[#5A5A40]/20"
              >
                Confirm Payment & Issue SMS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINTABLE INVOICE RECEIPT MODAL */}
      {invoiceToPrint && (
        <PrintableInvoice
          session={invoiceToPrint}
          company={company}
          branch={branch}
          customer={customers.find((c) => c.id === invoiceToPrint.customerId)}
          onClose={() => setInvoiceToPrint(null)}
        />
      )}
    </div>
  );
};
