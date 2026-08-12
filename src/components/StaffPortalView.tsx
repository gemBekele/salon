import React, { useState } from 'react';
import {
  UserCheck,
  DollarSign,
  Scissors,
  CheckCircle,
  Send,
  Calendar,
  Clock,
  Award,
  Wallet,
  Sparkles,
  Plus,
  Trash2,
  Receipt,
  UserPlus,
  PlayCircle,
  Search,
  Check,
  ChevronRight,
  TrendingUp,
  Lock,
} from 'lucide-react';
import {
  Staff,
  CommissionLog,
  VisitSession,
  Branch,
  BusinessUnit,
  Company,
  Service,
  Customer,
  InventoryItem,
  SessionServiceItem,
  PaymentMethod,
} from '../types';
import { StaffPerformanceDashboard } from './StaffPerformanceDashboard';
import { CustomerSearchSelect } from './CustomerSearchSelect';
import { usePolling } from '../lib/usePolling';
import { Badge } from './ui/badge';

interface StaffPortalViewProps {
  company?: Company | null;
  branch?: Branch | null;
  staffList: Staff[];
  services?: Service[];
  customers?: Customer[];
  inventoryItems?: InventoryItem[];
  commissionLogs: CommissionLog[];
  visitSessions: VisitSession[];
  branches?: Branch[];
  businessUnits?: BusinessUnit[];
  onCreateVisitSession?: (session: VisitSession) => Promise<void> | void;
  onUpdateSessionStatus?: (sessionId: string, newStatus: 'queued' | 'in_progress' | 'completed' | 'cancelled') => Promise<void> | void;
  onAddCustomer?: (customer: Customer) => Promise<void> | void;
  onUpdateSessionServices?: (sessionId: string, service: SessionServiceItem) => Promise<void> | void;
  onCheckoutSession?: (sessionId: string, paymentMethod: PaymentMethod, reference: string) => Promise<void> | void;
  onRefresh?: () => void | Promise<void>;
}

export const StaffPortalView: React.FC<StaffPortalViewProps> = ({
  company,
  branch,
  staffList,
  services = [],
  customers = [],
  inventoryItems = [],
  commissionLogs,
  visitSessions,
  branches = [],
  businessUnits = [],
  onCreateVisitSession,
  onUpdateSessionStatus,
  onAddCustomer,
  onUpdateSessionServices,
  onCheckoutSession,
  onRefresh,
}) => {
  // Staff Selection
  const [selectedStaffId, setSelectedStaffId] = useState<string>(staffList[0]?.id || '');
  const activeStaff = staffList.find((s) => s.id === selectedStaffId) || staffList[0];

  // Active Tab: Workstation vs Ledger
  const [activeTab, setActiveTab] = useState<'workstation' | 'ledger'>('workstation');

  // Payout request status
  const [payoutRequested, setPayoutRequested] = useState(false);

  // Live refresh status
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  usePolling(() => {
    setLastUpdatedAt(new Date());
    return onRefresh?.();
  }, 15_000);

  // New Client Service Builder State (for Staff Workstation)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(customers[0] || null);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [sessionNotes, setSessionNotes] = useState('');

  // Add Extra Service Modal to existing session
  const [extraServiceModalSession, setExtraServiceModalSession] = useState<VisitSession | null>(null);

  // Quick Checkout Modal for Staff
  const [checkoutSession, setCheckoutSession] = useState<VisitSession | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('telebirr');

  // Filtered Services for Active Staff
  const staffBranchId = activeStaff.branchId || branch?.id;
  const availableServices = services.filter((s) =>
    activeStaff.businessUnitId ? s.businessUnitId === activeStaff.businessUnitId : true
  );

  // Filter Sessions assigned to this staff member or staff branch
  const staffSessions = visitSessions.filter((session) => {
    // Session contains a service assigned to active staff
    const assignedToStaff = session.services.some((svc) => svc.staffId === activeStaff.id);
    const matchesBranch = staffBranchId ? session.branchId === staffBranchId : true;
    return assignedToStaff || (session.status !== 'completed' && matchesBranch);
  });

  const queuedSessions = staffSessions.filter((s) => s.status === 'queued');
  const inProgressSessions = staffSessions.filter((s) => s.status === 'in_progress');
  const completedSessions = staffSessions.filter((s) => s.status === 'completed');

  // Ledger Calculations
  const staffCommissions = commissionLogs.filter((c) => c.staffId === activeStaff.id);
  const totalEarnedCommissions = staffCommissions.reduce((acc, c) => acc + c.commissionAmountEtb, 0);

  const unpaidCommissions = staffCommissions
    .filter((c) => c.payoutStatus === 'unpaid')
    .reduce((acc, c) => acc + c.commissionAmountEtb, 0);

  const paidCommissions = staffCommissions
    .filter((c) => c.payoutStatus === 'paid')
    .reduce((acc, c) => acc + c.commissionAmountEtb, 0);

  const handleRequestPayout = () => {
    setPayoutRequested(true);
    setTimeout(() => setPayoutRequested(false), 4000);
  };

  // Add Service to Builder
  const handleAddServiceToBuilder = (srv: Service) => {
    setSelectedServices((prev) => [...prev, srv]);
  };

  const handleRemoveServiceFromBuilder = (index: number) => {
    setSelectedServices((prev) => prev.filter((_, i) => i !== index));
  };

  // Create Client Session from Staff Workstation
  const handleCreateSession = (startImmediately: boolean = false) => {
    if (!selectedCustomer || selectedServices.length === 0 || !onCreateVisitSession) return;

    const queueNum = `Q-${100 + visitSessions.length + 1}`;
    const initialStatus = startImmediately ? 'in_progress' : 'queued';

    const sessionServices: SessionServiceItem[] = selectedServices.map((srv, idx) => {
      const commissionAmount = Math.round((srv.priceEtb * activeStaff.defaultCommissionPercentage) / 100);
      return {
        id: `vss_${Date.now()}_${idx}`,
        serviceId: srv.id,
        serviceName: srv.name,
        staffId: activeStaff.id,
        staffName: activeStaff.name,
        priceEtb: srv.priceEtb,
        durationMinutes: srv.durationMinutes,
        commissionEarnedEtb: commissionAmount,
        status: startImmediately ? 'in_progress' : 'pending',
      };
    });

    const subtotal = selectedServices.reduce((acc, s) => acc + s.priceEtb, 0);

    const newSession: VisitSession = {
      id: `vst_${Date.now()}`,
      companyId: company?.id || activeStaff.companyId,
      branchId: staffBranchId || branch?.id || '',
      businessUnitId: activeStaff.businessUnitId || '',
      queueNumber: queueNum,
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      customerPhone: selectedCustomer.phone,
      services: sessionServices,
      status: initialStatus,
      subtotalEtb: subtotal,
      discountEtb: 0,
      taxEtb: 0,
      netTotalEtb: subtotal,
      isPaid: false,
      startedAt: new Date().toISOString(),
      notes: sessionNotes || undefined,
    };

    onCreateVisitSession(newSession);
    setSelectedServices([]);
    setSessionNotes('');
  };

  // Register New Customer from Staff Station
  const handleCreateNewCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName || !custPhone || !onAddCustomer) return;

    const newCust: Customer = {
      id: `cust_${Date.now()}`,
      companyId: company?.id || activeStaff.companyId,
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

  // Append Extra Service to existing ongoing session
  const handleAddExtraServiceToSession = (srv: Service) => {
    if (!extraServiceModalSession || !onUpdateSessionServices) return;
    const commissionAmount = Math.round((srv.priceEtb * activeStaff.defaultCommissionPercentage) / 100);

    const newSvcItem: SessionServiceItem = {
      id: `vss_${Date.now()}`,
      serviceId: srv.id,
      serviceName: srv.name,
      staffId: activeStaff.id,
      staffName: activeStaff.name,
      priceEtb: srv.priceEtb,
      durationMinutes: srv.durationMinutes,
      commissionEarnedEtb: commissionAmount,
      status: 'in_progress',
    };

    onUpdateSessionServices(extraServiceModalSession.id, newSvcItem);
    setExtraServiceModalSession(null);
  };

  const handleCheckoutSession = () => {
    if (!checkoutSession || !onCheckoutSession) return;
    const ref = `PAY-${Math.floor(100000 + Math.random() * 900000)}`;
    onCheckoutSession(checkoutSession.id, paymentMethod, ref);
    setCheckoutSession(null);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Banner & Active Staff Persona Header */}
      <div className="bg-primary text-primary-foreground border border-primary/80 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-muted/15 text-primary-foreground border border-primary-foreground/30 uppercase tracking-widest">
              Staff Member Terminal
            </span>
            <span className="text-primary-foreground/80 text-xs font-semibold">{activeStaff.name} ({activeStaff.role})</span>
          </div>
          <h2 className="text-2xl font-serif font-light mt-1 text-primary-foreground">Client Workstation & Commission Tracker</h2>
          <p className="text-primary-foreground/80 text-xs mt-0.5 max-w-xl">
            Add client services, start sessions, track active station queue, calculate service commissions, and submit payout requests.
          </p>
        </div>

        {/* Staff Persona Switcher */}
        <div className="bg-muted p-3 rounded-2xl border border-border text-xs text-foreground">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold">Live</span>
            <span className="font-mono">{lastUpdatedAt ? lastUpdatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
          </div>
          <label className="block text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Switch Active Employee:</label>
          <select
            value={selectedStaffId}
            onChange={(e) => setSelectedStaffId(e.target.value)}
            className="bg-card text-foreground font-bold rounded-xl px-3 py-1.5 outline-none cursor-pointer text-xs border border-border"
          >
            {staffList.map((st) => (
              <option key={st.id} value={st.id}>
                {st.name} ({st.role}) — {st.defaultCommissionPercentage}% Rate
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex items-center space-x-2 bg-card p-2 rounded-2xl border border-border text-xs font-bold shadow-sm">
        <button
          onClick={() => setActiveTab('workstation')}
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl transition cursor-pointer ${
            activeTab === 'workstation'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <Scissors className="w-4 h-4" />
          <span>Client Workstation & Active Queue ({inProgressSessions.length + queuedSessions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('ledger')}
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl transition cursor-pointer ${
            activeTab === 'ledger'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Daily Earnings & Commission Ledger ({totalEarnedCommissions} ETB)</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: CLIENT WORKSTATION (Add Services & Active Station Queue) */}
      {/* ========================================================= */}
      {activeTab === 'workstation' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: Add Client Service Form (7 Cols) */}
          <div className="lg:col-span-7 space-y-5">
            {/* Customer Selection Card */}
            <div className="bg-card border border-border rounded-3xl p-5 shadow-sm">
              <CustomerSearchSelect
                customers={customers}
                selectedCustomer={selectedCustomer}
                onSelectCustomer={setSelectedCustomer}
                onOpenNewCustomerModal={() => setShowNewCustomerModal(true)}
                label="Select Client for Service"
              />
            </div>

            {/* Service Touch Tiles */}
            <div className="bg-card border border-border rounded-3xl p-5 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center space-x-1.5">
                  <Scissors className="w-4 h-4 text-foreground" />
                  <span>Add Services to Client Session</span>
                </h3>
                <span className="text-[10px] text-muted-foreground">Commission Rate: {activeStaff.defaultCommissionPercentage}%</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {availableServices.map((srv) => (
                  <button
                    key={srv.id}
                    onClick={() => handleAddServiceToBuilder(srv)}
                    className="bg-muted/80 hover:bg-muted border border-border hover:border-primary rounded-2xl p-3.5 text-left transition-all hover:scale-[1.01] cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="font-semibold text-foreground text-xs line-clamp-1">{srv.name}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 italic">{srv.category} • {srv.durationMinutes}m</div>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/60">
                      <span className="text-foreground font-serif font-bold text-xs">
                        {srv.priceEtb.toLocaleString()} ETB
                      </span>
                      <span className="text-foreground font-bold text-[10px]">
                        +{Math.round((srv.priceEtb * activeStaff.defaultCommissionPercentage) / 100)} ETB
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Client Services Cart */}
            <div className="bg-card border border-border rounded-3xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center space-x-1.5">
                  <Receipt className="w-4 h-4 text-foreground" />
                  <span>Selected Client Services ({selectedServices.length})</span>
                </h3>
                <div className="text-xs text-muted-foreground">
                  Assigned Staff: <strong className="text-foreground">{activeStaff.name}</strong>
                </div>
              </div>

              {selectedServices.length === 0 ? (
                <div className="py-6 text-center text-muted-foreground text-xs italic">
                  Click any service tile above to assign services for {selectedCustomer?.name || 'this client'}.
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedServices.map((srv, idx) => (
                    <div key={idx} className="bg-muted border border-border p-3.5 rounded-2xl flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-foreground">{srv.name}</div>
                        <div className="text-[11px] text-muted-foreground">
                          Price: {srv.priceEtb} ETB • Est. Commission: <strong className="text-foreground">{Math.round((srv.priceEtb * activeStaff.defaultCommissionPercentage) / 100)} ETB</strong>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemoveServiceFromBuilder(idx)}
                        className="text-muted-foreground hover:text-rose-600 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  <div className="pt-2">
                    <input
                      type="text"
                      placeholder="Optional notes (e.g. client prefers extra wash or low heat blowdry)..."
                      value={sessionNotes}
                      onChange={(e) => setSessionNotes(e.target.value)}
                      className="w-full bg-muted border border-border text-foreground rounded-xl px-3 py-2 text-xs outline-none focus:border-primary"
                    />
                  </div>

                  <div className="border-t border-border pt-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase font-bold">Total Service Cost</div>
                      <div className="text-2xl font-serif font-bold text-foreground">
                        {selectedServices.reduce((acc, s) => acc + s.priceEtb, 0).toLocaleString()} ETB
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 w-full sm:w-auto">
                      <button
                        onClick={() => handleCreateSession(false)}
                        className="flex-1 sm:flex-initial px-4 py-2.5 bg-muted hover:bg-muted/80 border border-border text-foreground font-bold rounded-full text-xs cursor-pointer"
                      >
                        Add to Queue
                      </button>
                      <button
                        onClick={() => handleCreateSession(true)}
                        className="flex-1 sm:flex-initial px-5 py-2.5 bg-primary hover:bg-primary/80 text-primary-foreground font-bold rounded-full text-xs cursor-pointer shadow-md flex items-center justify-center space-x-1.5"
                      >
                        <PlayCircle className="w-4 h-4" />
                        <span>Start Service Now</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Active Station Sessions & Workstation Queue (5 Cols) */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-card border border-border rounded-3xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center space-x-1.5">
                  <Clock className="w-4 h-4 text-foreground" />
                  <span>My Station Active Queue & Client List</span>
                </h3>
                <span className="text-[10px] text-muted-foreground font-semibold">{staffSessions.length} Visits</span>
              </div>

              {/* Station Queue List */}
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {staffSessions.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground text-xs italic">
                    No active sessions assigned to {activeStaff.name} right now. Use the panel on the left to add client services!
                  </div>
                ) : (
                  staffSessions.map((session) => {
                    const isMySession = session.services.some((s) => s.staffId === activeStaff.id);

                    return (
                      <div
                        key={session.id}
                        className={`p-4 rounded-2xl border transition-all text-xs space-y-3 ${
                          session.status === 'completed'
                            ? 'bg-muted/50 border-border'
                            : session.status === 'in_progress'
                            ? 'bg-muted/50 border-border'
                            : 'bg-card border-border'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-muted border border-border rounded-xl flex items-center justify-center font-serif text-foreground font-bold text-sm">
                              {session.queueNumber}
                            </div>
                            <div>
                              <div className="font-bold text-foreground text-sm">{session.customerName}</div>
                              <div className="text-[10px] text-muted-foreground">{session.customerPhone}</div>
                            </div>
                          </div>

                          <Badge variant={session.status === 'in_progress' ? 'default' : 'secondary'} className="uppercase">
                            {session.status.replace('_', ' ')}
                          </Badge>
                        </div>

                        {/* Services List */}
                        <div className="space-y-1.5 bg-card p-3 rounded-xl border border-border">
                          <div className="text-[10px] font-bold text-muted-foreground uppercase">Client Services:</div>
                          {session.services.map((srv, idx) => (
                            <div key={idx} className="flex justify-between items-center text-foreground">
                              <div>
                                <span className="font-semibold">{srv.serviceName}</span>
                                <span className="text-[10px] text-muted-foreground ml-1.5">({srv.staffName})</span>
                              </div>
                              <span className="font-bold text-foreground">{srv.priceEtb} ETB</span>
                            </div>
                          ))}
                        </div>

                        {/* Actions Bar */}
                        <div className="pt-2 border-t border-border space-y-2">
                          <div className="flex items-center justify-between">
                            <button
                              onClick={() => setExtraServiceModalSession(session)}
                              className="text-[11px] text-foreground hover:text-foreground font-bold flex items-center space-x-1 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>+ Add Service to Client</span>
                            </button>

                            <div className="font-serif font-bold text-foreground text-sm">
                              Total: {session.netTotalEtb} ETB
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            {(() => {
                              // Check if currently selected active staff is assigned to this session
                              const assignedStaffIds = session.services.map((s) => s.staffId).filter(Boolean);
                              const assignedStaffNames = session.services.map((s) => s.staffName).filter(Boolean);
                              const isAssignedToActiveStaff =
                                session.services.length === 0 ||
                                assignedStaffIds.includes(activeStaff.id) ||
                                assignedStaffNames.includes(activeStaff.name);

                              if (!isAssignedToActiveStaff) {
                                return (
                                  <div className="w-full py-2 bg-slate-100 border border-slate-300 text-slate-500 font-medium rounded-xl text-xs flex items-center justify-center space-x-1.5 cursor-not-allowed opacity-90 shadow-inner">
                                    <Lock className="w-3.5 h-3.5 text-slate-500" />
                                    <span>Assigned to {assignedStaffNames[0] || 'another staff'} (Locked)</span>
                                  </div>
                                );
                              }

                              return (
                                <>
                                  {session.status === 'queued' && onUpdateSessionStatus && (
                                    <button
                                      onClick={() => onUpdateSessionStatus(session.id, 'in_progress')}
                                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-primary-foreground font-bold rounded-xl text-xs cursor-pointer shadow-sm flex items-center justify-center space-x-1"
                                    >
                                      <PlayCircle className="w-4 h-4" />
                                      <span>Start Service Session</span>
                                    </button>
                                  )}

                                  {session.status === 'in_progress' && onUpdateSessionStatus && (
                                    <button
                                      onClick={() => onUpdateSessionStatus(session.id, 'completed')}
                                      className="w-full py-2 bg-primary hover:bg-primary/80 text-primary-foreground font-bold rounded-xl text-xs cursor-pointer shadow-sm flex items-center justify-center space-x-1"
                                    >
                                      <CheckCircle className="w-4 h-4" />
                                      <span>Mark Completed (Earn Commission)</span>
                                    </button>
                                  )}

                                  {session.status === 'completed' && !session.isPaid && onCheckoutSession && (
                                    <button
                                      onClick={() => setCheckoutSession(session)}
                                      className="w-full py-2 bg-primary hover:bg-primary/80 text-primary-foreground font-bold rounded-xl text-xs cursor-pointer shadow-sm flex items-center justify-center space-x-1"
                                    >
                                      <DollarSign className="w-4 h-4" />
                                      <span>Collect Payment</span>
                                    </button>
                                  )}
                                </>
                              );
                            })()}
                          </div>
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

      {/* ========================================================= */}
      {/* TAB 2: DAILY EARNINGS & COMMISSION LEDGER */}
      {/* ========================================================= */}
      {activeTab === 'ledger' && (
        <div className="space-y-6">
          {/* Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-card border border-border rounded-3xl p-5 shadow-sm">
              <div className="text-muted-foreground text-xs font-bold uppercase tracking-wider flex items-center justify-between">
                <span>Total Earned Commissions</span>
                <DollarSign className="w-4 h-4 text-foreground" />
              </div>
              <div className="text-2xl font-serif font-bold text-foreground mt-2">
                {totalEarnedCommissions.toLocaleString()} <span className="text-xs text-foreground font-sans font-normal">ETB</span>
              </div>
              <div className="text-xs text-foreground mt-2 font-medium">Auto-calculated from completed services</div>
            </div>

            <div className="bg-card border border-border rounded-3xl p-5 shadow-sm">
              <div className="text-muted-foreground text-xs font-bold uppercase tracking-wider flex items-center justify-between">
                <span>Unpaid Payout Balance</span>
                <Wallet className="w-4 h-4 text-foreground" />
              </div>
              <div className="text-2xl font-serif font-bold text-foreground mt-2">
                {unpaidCommissions.toLocaleString()} <span className="text-xs text-muted-foreground font-sans font-normal">ETB</span>
              </div>
              <div className="text-xs text-muted-foreground mt-2">Ready for withdrawal request</div>
            </div>

            <div className="bg-card border border-border rounded-3xl p-5 shadow-sm">
              <div className="text-muted-foreground text-xs font-bold uppercase tracking-wider flex items-center justify-between">
                <span>Paid Commissions</span>
                <CheckCircle className="w-4 h-4 text-foreground" />
              </div>
              <div className="text-2xl font-serif font-bold text-foreground mt-2">
                {paidCommissions.toLocaleString()} <span className="text-xs text-muted-foreground font-sans font-normal">ETB</span>
              </div>
              <div className="text-xs text-foreground mt-2 font-medium">Dispatched via Telebirr/CBE</div>
            </div>
          </div>

          {/* Payout Request Card */}
          <div className="bg-card border border-border rounded-3xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
            <div>
              <h3 className="text-base font-serif font-bold text-foreground flex items-center space-x-2">
                <Wallet className="w-4 h-4 text-foreground" />
                <span>Commission Payout Schedule</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Current balance: <strong className="text-foreground">{unpaidCommissions} ETB</strong>. Payout rate: <span className="text-foreground font-semibold">{activeStaff.defaultCommissionPercentage}% Standard Rate</span>.
              </p>
            </div>

            <button
              onClick={handleRequestPayout}
              disabled={unpaidCommissions === 0}
              className="px-5 py-2.5 bg-primary hover:bg-primary/80 text-primary-foreground font-bold rounded-full text-xs shadow-sm disabled:opacity-50 cursor-pointer flex items-center space-x-2"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Request Payout Transfer ({unpaidCommissions} ETB)</span>
            </button>
          </div>

          {payoutRequested && (
            <div className="bg-muted border border-border p-4 rounded-2xl text-xs text-foreground font-semibold flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-foreground" />
              <span>Payout request of {unpaidCommissions} ETB submitted to salon management!</span>
            </div>
          )}

          {/* Recharts Analytics Dashboard */}
          <StaffPerformanceDashboard
            activeStaff={activeStaff}
            commissionLogs={commissionLogs}
            visitSessions={visitSessions}
            branches={branches}
            businessUnits={businessUnits}
          />

          {/* Commission Breakdown Table */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
            <h3 className="text-lg font-serif font-bold text-foreground mb-3">Service Commission History</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-foreground">
                <thead className="bg-muted text-muted-foreground uppercase font-bold text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3 rounded-l-xl">Service Name</th>
                    <th className="px-4 py-3">Session Price</th>
                    <th className="px-4 py-3">Commission Earned</th>
                    <th className="px-4 py-3">Applied Rule</th>
                    <th className="px-4 py-3">Payout Status</th>
                    <th className="px-4 py-3 rounded-r-xl">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#efe8d9]">
                  {staffCommissions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                        No commission logs found for {activeStaff.name}.
                      </td>
                    </tr>
                  ) : (
                    staffCommissions.map((log) => (
                      <tr key={log.id} className="hover:bg-muted/60">
                        <td className="px-4 py-3 font-bold text-foreground">{log.serviceName}</td>
                        <td className="px-4 py-3 text-muted-foreground">{log.servicePriceEtb} ETB</td>
                        <td className="px-4 py-3 text-foreground font-bold">{log.commissionAmountEtb} ETB</td>
                        <td className="px-4 py-3 text-muted-foreground">{log.ruleApplied}</td>
                        <td className="px-4 py-3">
                          <Badge variant={log.payoutStatus === 'paid' ? 'default' : log.payoutStatus === 'payout_requested' ? 'secondary' : 'outline'} className="uppercase">
                            {log.payoutStatus.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{log.createdAt.split('T')[0]}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: REGISTER NEW CUSTOMER */}
      {/* ========================================================= */}
      {showNewCustomerModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-serif font-bold text-foreground flex items-center space-x-2">
              <UserPlus className="w-5 h-5 text-foreground" />
              <span>Register New Client</span>
            </h3>

            <form onSubmit={handleCreateNewCustomer} className="space-y-3 font-sans">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Client Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bethlehem Assefa"
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  className="w-full bg-muted border border-border text-foreground rounded-xl px-3.5 py-2 text-xs outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Phone Number (+251 format)</label>
                <input
                  type="text"
                  required
                  placeholder="+251 91 123 4567"
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value)}
                  className="w-full bg-muted border border-border text-foreground rounded-xl px-3.5 py-2 text-xs outline-none focus:border-primary"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowNewCustomerModal(false)}
                  className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-full text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary hover:bg-primary/80 text-primary-foreground rounded-full text-xs font-bold cursor-pointer shadow-sm"
                >
                  Register Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD EXTRA SERVICE TO ONGOING SESSION */}
      {/* ========================================================= */}
      {extraServiceModalSession && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-serif font-bold text-foreground">
                Add Extra Service for {extraServiceModalSession.customerName} ({extraServiceModalSession.queueNumber})
              </h3>
              <button
                onClick={() => setExtraServiceModalSession(null)}
                className="text-muted-foreground hover:text-foreground text-xs font-bold cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Select any additional service to append to this client's visit session:
            </p>

            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
              {availableServices.map((srv) => (
                <button
                  key={srv.id}
                  onClick={() => handleAddExtraServiceToSession(srv)}
                  className="bg-muted hover:bg-muted border border-border p-3 rounded-xl text-left cursor-pointer transition-colors"
                >
                  <div className="font-bold text-foreground text-xs">{srv.name}</div>
                  <div className="text-[10px] text-foreground font-semibold mt-1">{srv.priceEtb} ETB</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: QUICK CHECKOUT FOR STAFF */}
      {/* ========================================================= */}
      {checkoutSession && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-serif font-bold text-foreground">
              Collect Payment — {checkoutSession.customerName} ({checkoutSession.queueNumber})
            </h3>

            <div className="bg-muted p-4 rounded-2xl text-xs space-y-2 border border-border">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Net Amount Payable:</span>
                <span className="font-serif font-bold text-foreground text-lg">{checkoutSession.netTotalEtb} ETB</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">Select Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full bg-muted border border-border text-foreground rounded-xl px-3 py-2 text-xs outline-none"
              >
                <option value="telebirr">Telebirr SuperApp</option>
                <option value="cbe_birr">CBE Birr</option>
                <option value="cash">Cash</option>
                <option value="card">Card / POS</option>
              </select>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-border">
              <button
                onClick={() => setCheckoutSession(null)}
                className="px-4 py-2 bg-muted text-foreground rounded-full text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCheckoutSession}
                className="px-5 py-2 bg-primary hover:bg-primary/80 text-primary-foreground rounded-full text-xs font-bold cursor-pointer shadow-sm"
              >
                Confirm Payment & Complete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
