import React, { useState, useMemo } from 'react';
import {
  Scissors,
  UserPlus,
  Clock,
  CheckCircle,
  Trash2,
  QrCode,
  Send,
  Search,
  UserCheck,
  Receipt,
  PlayCircle,
  User,
  ArrowRight,
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
} from '../types';
import { PrintableInvoice } from './PrintableInvoice';
import { CustomerSearchSelect } from './CustomerSearchSelect';
import { usePolling } from '../lib/usePolling';
import { Badge } from './ui/badge';

interface ReceptionistPosProps {
  company: Company;
  branch: Branch;
  businessUnit: BusinessUnit | null;
  staffList: Staff[];
  services: Service[];
  customers: Customer[];
  visitSessions: VisitSession[];
  onCreateVisitSession: (session: VisitSession) => void;
  onCheckoutSession: (sessionId: string, paymentMethod: PaymentMethod, reference: string) => void;
  onAddCustomer: (customer: Customer) => void;
  onUpdateSessionStatus?: (sessionId: string, newStatus: any) => void;
  onRefresh?: () => void | Promise<void>;
}

export const ReceptionistPos: React.FC<ReceptionistPosProps> = ({
  company,
  branch,
  businessUnit,
  staffList,
  services,
  customers,
  visitSessions,
  onCreateVisitSession,
  onCheckoutSession,
  onAddCustomer,
  onUpdateSessionStatus,
  onRefresh,
}) => {
  const [subTab, setSubTab] = useState<'new_session' | 'queue' | 'clients'>('new_session');
  const [customerDirSearch, setCustomerDirSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(customers[0] || null);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  usePolling(() => {
    setLastUpdatedAt(new Date());
    return onRefresh?.();
  }, 10_000);

  const [selectedServiceItems, setSelectedServiceItems] = useState<
    { service: Service; assignedStaff: Staff }[]
  >([]);

  const [checkoutSession, setCheckoutSession] = useState<VisitSession | null>(null);
  const [invoiceToPrint, setInvoiceToPrint] = useState<VisitSession | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('telebirr');
  const [paymentReference, setPaymentReference] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);

  const [queueSearchQuery, setQueueSearchQuery] = useState('');
  const [queueStatusFilter, setQueueStatusFilter] = useState<'all' | 'queued' | 'in_progress' | 'completed'>('all');
  const [queueStaffFilter, setQueueStaffFilter] = useState<string>('all');

  const availableStaff = staffList.filter((s) => s.branchId === branch.id);
  const availableServices = services.filter((s) =>
    businessUnit ? s.businessUnitId === businessUnit.id : true
  );

  const branchSessions = visitSessions.filter((s) => s.branchId === branch.id);
  const queuedSessions = branchSessions.filter((s) => s.status === 'queued');
  const inProgressSessions = branchSessions.filter((s) => s.status === 'in_progress');
  const completedSessions = branchSessions.filter((s) => s.status === 'completed');

  const filteredSessions = branchSessions.filter((session) => {
    if (queueStatusFilter !== 'all' && session.status !== queueStatusFilter) return false;
    if (queueStaffFilter !== 'all') {
      const hasStaff = session.services.some((s) => s.staffId === queueStaffFilter);
      if (!hasStaff) return false;
    }
    if (queueSearchQuery.trim() !== '') {
      const q = queueSearchQuery.toLowerCase().trim();
      return (
        session.queueNumber.toLowerCase().includes(q) ||
        session.customerName.toLowerCase().includes(q) ||
        session.customerPhone.toLowerCase().includes(q) ||
        session.services.some((srv) => srv.serviceName.toLowerCase().includes(q) ||
          srv.staffName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Staff earnings summary
  const staffEarnings = useMemo(() => {
    const earningsMap = new Map<string, { name: string; sessions: number; revenue: number; commissions: number }>();
    const today = new Date().toISOString().split('T')[0];

    branchSessions.forEach((session) => {
      const sessionDate = session.startedAt?.split('T')[0];
      if (sessionDate !== today) return;
      if (session.status !== 'completed' && session.status !== 'in_progress') return;

      session.services.forEach((svc) => {
        const existing = earningsMap.get(svc.staffId) || { name: svc.staffName, sessions: 0, revenue: 0, commissions: 0 };
        existing.sessions += 1;
        existing.revenue += svc.priceEtb;
        existing.commissions += svc.commissionEarnedEtb;
        earningsMap.set(svc.staffId, existing);
      });
    });

    return Array.from(earningsMap.entries()).map(([id, data]) => ({ id, ...data }));
  }, [branchSessions]);

  const todayStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todaySessions = branchSessions.filter((s) => s.startedAt?.split('T')[0] === today);
    const totalRevenue = todaySessions.reduce((sum, s) => sum + (s.status === 'completed' ? s.netTotalEtb : 0), 0);
    const totalCommissions = todaySessions.reduce((sum, s) =>
      sum + s.services.reduce((ss, svc) => ss + svc.commissionEarnedEtb, 0), 0);
    const pendingPayments = todaySessions.filter((s) => s.status === 'completed' && !s.isPaid);
    const activeStaff = new Set(todaySessions.flatMap((s) => s.services.map((svc) => svc.staffId))).size;

    return {
      totalSessions: todaySessions.length,
      totalRevenue,
      totalCommissions,
      pendingPayments: pendingPayments.length,
      pendingAmount: pendingPayments.reduce((sum, s) => sum + s.netTotalEtb, 0),
      activeStaff,
      completedSessions: todaySessions.filter((s) => s.status === 'completed').length,
    };
  }, [branchSessions]);

  const rawSubtotalEtb = selectedServiceItems.reduce((acc, item) => acc + item.service.priceEtb, 0);
  const totalDurationMins = selectedServiceItems.reduce((acc, item) => acc + item.service.durationMinutes, 0);

  const handleAddServiceToBuilder = (service: Service) => {
    const matchingStaff = availableStaff.find(
      (s) => s.role === 'barber' || s.role === 'hairstylist' || s.role === 'masseuse' || s.role === 'esthetician'
    ) || availableStaff[0];
    if (!matchingStaff) return;
    setSelectedServiceItems((prev) => [...prev, { service, assignedStaff: matchingStaff }]);
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

  const nextQueueNumber = useMemo(() => {
    let max = 100;
    branchSessions.forEach((s) => {
      const m = s.queueNumber.match(/^Q-(\d+)$/);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    });
    return `Q-${max + 1}`;
  }, [branchSessions]);

  const handleRegisterSession = () => {
    if (!selectedCustomer || selectedServiceItems.length === 0) return;
    const queueNum = nextQueueNumber;
    const sessionServices: SessionServiceItem[] = selectedServiceItems.map((item, idx) => ({
      id: `vss_${Date.now()}_${idx}`,
      serviceId: item.service.id,
      serviceName: item.service.name,
      staffId: item.assignedStaff.id,
      staffName: item.assignedStaff.name,
      priceEtb: item.service.priceEtb,
      durationMinutes: item.service.durationMinutes,
      commissionEarnedEtb: Math.round((item.service.priceEtb * item.assignedStaff.defaultCommissionPercentage) / 100),
      status: 'pending',
    }));

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
    setSubTab('queue');
  };

  const handleCreateNewCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName || !custPhone) return;
    const newCust: Customer = {
      id: `cust_${Date.now()}`,
      companyId: company.id,
      name: custName,
      phone: custPhone,
      totalVisits: 0,
      totalSpentEtb: 0,
      loyaltyPoints: 0,
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
    setInvoiceToPrint({
      ...checkoutSession,
      isPaid: true,
      paymentMethod,
      paymentReference: ref,
      completedAt: new Date().toISOString(),
    });
    setCheckoutSession(null);
    setPaymentReference('');
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="bg-primary border border-primary/80 rounded-2xl px-4 py-3 text-primary-foreground shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-serif font-light text-primary-foreground">{branch.name}</h2>
          <span className="text-primary-foreground/60 text-xs">·</span>
          <span className="text-primary-foreground/80 text-xs">{branch.city}</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 bg-muted/10 px-3 py-1.5 rounded-xl border border-primary-foreground/20" title="Live sync">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-primary-foreground/70 font-medium">Live</span>
            <span className="font-mono text-primary-foreground/80">{lastUpdatedAt ? lastUpdatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
          </div>
          <div className="bg-muted/10 px-3 py-1.5 rounded-xl border border-primary-foreground/20 text-center">
            <span className="font-mono font-bold">{queuedSessions.length}</span>
            <span className="text-primary-foreground/60 ml-1">Queued</span>
          </div>
          <div className="bg-muted/10 px-3 py-1.5 rounded-xl border border-primary-foreground/20 text-center">
            <span className="font-mono font-bold">{inProgressSessions.length}</span>
            <span className="text-primary-foreground/60 ml-1">Active</span>
          </div>
          <div className="bg-muted/10 px-3 py-1.5 rounded-xl border border-primary-foreground/20 text-center">
            <span className="font-mono font-bold">{completedSessions.length}</span>
            <span className="text-primary-foreground/60 ml-1">Done</span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 bg-card p-1 rounded-xl border border-border shadow-sm overflow-x-auto">
        {[
          { id: 'new_session' as const, label: 'New Session', icon: Scissors },
          { id: 'queue' as const, label: 'Queue Board', icon: Clock },
          { id: 'clients' as const, label: 'Clients', icon: UserCheck },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex-1 justify-center ${
              subTab === tab.id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ═══════════ NEW SESSION DASHBOARD ═══════════ */}
      {subTab === 'new_session' && (
        <div className="space-y-4">
          {/* Customer Selection */}
          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
            <CustomerSearchSelect
              customers={customers}
              selectedCustomer={selectedCustomer}
              onSelectCustomer={setSelectedCustomer}
              onOpenNewCustomerModal={() => setShowNewCustomerModal(true)}
              label="Select Customer"
            />
          </div>

          {/* Service List */}
          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Scissors className="w-4 h-4" />
                <span>Services</span>
              </h3>
              <span className="text-[10px] text-muted-foreground">{availableServices.length} available</span>
            </div>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
                  <tr>
                    <th className="p-2.5">Service Name</th>
                    <th className="p-2.5">Category</th>
                    <th className="p-2.5 text-center">Duration</th>
                    <th className="p-2.5 text-right">Price</th>
                    <th className="p-2.5 text-right w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#efe8d9]">
                  {availableServices.map((srv) => (
                    <tr
                      key={srv.id}
                      onClick={() => handleAddServiceToBuilder(srv)}
                      className="hover:bg-primary/5 cursor-pointer transition-colors"
                    >
                      <td className="p-2.5 font-semibold text-foreground">{srv.name}</td>
                      <td className="p-2.5 text-muted-foreground">{srv.category}</td>
                      <td className="p-2.5 text-center text-muted-foreground">{srv.durationMinutes}m</td>
                      <td className="p-2.5 text-right font-bold text-foreground">{srv.priceEtb.toLocaleString()} ETB</td>
                      <td className="p-2.5 text-right">
                        <span className="px-2 py-0.5 bg-primary text-primary-foreground rounded-md text-[10px] font-bold">+ Add</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Session Cart */}
          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
            {selectedServiceItems.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-xs">
                Tap services above to add them here
              </div>
            ) : (
              <div className="space-y-2">
                {selectedServiceItems.map((item, idx) => (
                  <div key={idx} className="bg-muted border border-border p-3 rounded-xl flex items-center justify-between gap-2 text-xs">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-foreground truncate">{item.service.name}</div>
                      <div className="text-muted-foreground text-[10px]">{item.service.priceEtb} ETB</div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <select
                        value={item.assignedStaff.id}
                        onChange={(e) => handleStaffChangeInBuilder(idx, e.target.value)}
                        className="bg-card border border-border text-foreground rounded-lg px-2 py-1 text-[10px] outline-none max-w-[100px]"
                      >
                        {availableStaff.map((st) => (
                          <option key={st.id} value={st.id}>{st.name}</option>
                        ))}
                      </select>
                      <button onClick={() => handleRemoveServiceFromBuilder(idx)} className="text-muted-foreground hover:text-rose-600 p-0.5 cursor-pointer">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Discount & Total */}
                <div className="border-t border-border pt-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Discount:</span>
                    <input
                      type="number"
                      min={0}
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value) || 0))}
                      className="w-20 bg-muted border border-border text-foreground rounded-lg px-2 py-1 text-xs outline-none text-right"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-xs font-bold">Total</span>
                    <span className="text-xl font-serif font-bold text-foreground">
                      {Math.max(0, rawSubtotalEtb - discountAmount).toLocaleString()} ETB
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleRegisterSession}
                  className="w-full py-3 bg-primary hover:bg-primary/80 text-primary-foreground font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Issue Queue Ticket</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════ QUEUE BOARD DASHBOARD ═══════════ */}
      {subTab === 'queue' && (
        <div className="space-y-4">
          {/* Today's Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="bg-card border border-border rounded-xl p-3 shadow-sm">
              <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Today's Revenue</div>
              <div className="text-lg font-serif font-bold text-foreground mt-0.5">{todayStats.totalRevenue.toLocaleString()} <span className="text-xs font-sans">ETB</span></div>
            </div>
            <div className="bg-card border border-border rounded-xl p-3 shadow-sm">
              <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Sessions</div>
              <div className="text-lg font-serif font-bold text-foreground mt-0.5">{todayStats.completedSessions}<span className="text-xs text-muted-foreground font-sans"> / {todayStats.totalSessions}</span></div>
              <div className="text-[10px] text-muted-foreground">completed / total</div>
            </div>
            <div className="bg-card border border-border rounded-xl p-3 shadow-sm">
              <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Active Staff</div>
              <div className="text-lg font-serif font-bold text-foreground mt-0.5">{todayStats.activeStaff}</div>
              <div className="text-[10px] text-muted-foreground">working today</div>
            </div>
            <div className="bg-card border border-border rounded-xl p-3 shadow-sm">
              <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Pending</div>
              <div className="text-lg font-serif font-bold text-foreground mt-0.5">{todayStats.pendingPayments}</div>
              <div className="text-[10px] text-muted-foreground">{todayStats.pendingAmount.toLocaleString()} ETB unpaid</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Staff Earnings Sidebar */}
            <div className="lg:col-span-3 space-y-3">
              <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-foreground" />
                  Staff Earnings Today
                </h4>
                {staffEarnings.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground text-center py-4">No sessions today</p>
                ) : (
                  <div className="space-y-2">
                    {staffEarnings.map((staff) => (
                      <div
                        key={staff.id}
                        onClick={() => setQueueStaffFilter(queueStaffFilter === staff.id ? 'all' : staff.id)}
                        className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                          queueStaffFilter === staff.id
                            ? 'bg-primary border-primary text-primary-foreground'
                            : 'bg-muted border-border hover:border-primary'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-bold ${queueStaffFilter === staff.id ? 'text-primary-foreground' : 'text-foreground'}`}>
                            {staff.name}
                          </span>
                          <span className={`text-[10px] ${queueStaffFilter === staff.id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                            {staff.sessions} svc
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] ${queueStaffFilter === staff.id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                            Revenue:
                          </span>
                          <span className={`text-xs font-bold ${queueStaffFilter === staff.id ? 'text-ink-300' : 'text-foreground'}`}>
                            {staff.revenue.toLocaleString()} ETB
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] ${queueStaffFilter === staff.id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                            Commission:
                          </span>
                          <span className={`text-[10px] font-bold ${queueStaffFilter === staff.id ? 'text-ink-200' : 'text-foreground'}`}>
                            {staff.commissions.toLocaleString()} ETB
                          </span>
                        </div>
                      </div>
                    ))}

                    {/* Total */}
                    <div className="border-t border-border pt-2 mt-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-foreground">Total Revenue</span>
                        <span className="font-bold text-foreground">{staffEarnings.reduce((s, e) => s + e.revenue, 0).toLocaleString()} ETB</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-muted-foreground">Total Commissions</span>
                        <span className="font-bold text-foreground">{staffEarnings.reduce((s, e) => s + e.commissions, 0).toLocaleString()} ETB</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Main Queue Area */}
            <div className="lg:col-span-9 space-y-3">
              {/* Search & Filters */}
              <div className="bg-card border border-border rounded-2xl p-3 shadow-sm">
                <div className="flex flex-col sm:flex-row gap-2 mb-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search by queue, customer, phone, service, or staff..."
                      value={queueSearchQuery}
                      onChange={(e) => setQueueSearchQuery(e.target.value)}
                      className="w-full bg-muted border border-border rounded-xl pl-9 pr-3 py-2 text-xs outline-none focus:border-primary"
                    />
                  </div>
                  <select
                    value={queueStaffFilter}
                    onChange={(e) => setQueueStaffFilter(e.target.value)}
                    className="bg-muted border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-primary text-foreground"
                  >
                    <option value="all">All Staff</option>
                    {availableStaff.map((st) => (
                      <option key={st.id} value={st.id}>{st.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-1 overflow-x-auto">
                  {(['all', 'queued', 'in_progress', 'completed'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => setQueueStatusFilter(st)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold capitalize whitespace-nowrap cursor-pointer transition-all ${
                        queueStatusFilter === st
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:text-foreground border border-border'
                      }`}
                    >
                      {st === 'all' ? 'All' : st.replace('_', ' ')}
                    </button>
                  ))}
                  {(queueStaffFilter !== 'all' || queueStatusFilter !== 'all' || queueSearchQuery) && (
                    <button
                      onClick={() => { setQueueStaffFilter('all'); setQueueStatusFilter('all'); setQueueSearchQuery(''); }}
                      className="px-2 py-1.5 text-[10px] text-rose-600 hover:text-rose-700 font-bold cursor-pointer"
                    >
                      Clear all
                    </button>
                  )}
                </div>
              </div>

              {/* Queue Table */}
              {filteredSessions.length === 0 ? (
                <div className="bg-card border border-border rounded-2xl p-12 text-center shadow-sm">
                  <Clock className="w-10 h-10 text-primary-foreground/80 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No sessions found</p>
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden md:block bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
                        <tr>
                          <th className="p-3">Queue</th>
                          <th className="p-3">Customer</th>
                          <th className="p-3">Services</th>
                          <th className="p-3">Staff</th>
                          <th className="p-3 text-right">Amount</th>
                          <th className="p-3 text-right">Commission</th>
                          <th className="p-3">Status</th>
                          <th className="p-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#efe8d9]">
                        {filteredSessions.map((session) => {
                          const totalCommission = session.services.reduce((sum, s) => sum + s.commissionEarnedEtb, 0);
                          return (
                            <tr key={session.id} className={`hover:bg-muted/50 transition-colors ${
                              session.status === 'in_progress' ? 'bg-primary/5' : ''
                            }`}>
                              <td className="p-3 font-mono font-bold text-foreground">{session.queueNumber}</td>
                              <td className="p-3">
                                <div className="font-semibold text-foreground">{session.customerName}</div>
                                <div className="text-[10px] text-muted-foreground">{session.customerPhone}</div>
                              </td>
                              <td className="p-3 text-[10px] text-foreground max-w-[180px]">
                                {session.services.map((s, i) => (
                                  <div key={i} className="truncate">• {s.serviceName}</div>
                                ))}
                              </td>
                              <td className="p-3 text-[10px]">
                                {session.services.map((s, i) => (
                                  <div key={i} className="text-muted-foreground truncate">{s.staffName}</div>
                                ))}
                              </td>
                              <td className="p-3 text-right font-serif font-bold text-foreground">{session.netTotalEtb.toLocaleString()} ETB</td>
                              <td className="p-3 text-right text-[10px] text-foreground font-bold">{totalCommission.toLocaleString()} ETB</td>
                              <td className="p-3">
                                <Badge variant={session.status === 'in_progress' ? 'default' : 'secondary'} className="uppercase">
                                  {session.status.replace('_', ' ')}
                                </Badge>
                              </td>
                              <td className="p-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  {session.status === 'queued' && onUpdateSessionStatus && (
                                    <button onClick={() => onUpdateSessionStatus(session.id, 'in_progress')} className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-primary-foreground rounded-lg text-[10px] font-bold cursor-pointer">Start</button>
                                  )}
                                  {session.status === 'in_progress' && onUpdateSessionStatus && (
                                    <button onClick={() => onUpdateSessionStatus(session.id, 'completed')} className="px-2 py-1 bg-ink-600 hover:bg-ink-700 text-primary-foreground rounded-lg text-[10px] font-bold cursor-pointer">Complete</button>
                                  )}
                                  {!session.isPaid && session.status === 'completed' && (
                                    <button onClick={() => setCheckoutSession(session)} className="px-2 py-1 bg-primary hover:bg-primary/80 text-primary-foreground rounded-lg text-[10px] font-bold cursor-pointer">Pay</button>
                                  )}
                                  {session.isPaid && (
                                    <button onClick={() => setInvoiceToPrint(session)} className="px-2 py-1 bg-muted hover:bg-muted/80 border border-border text-foreground rounded-lg text-[10px] font-bold cursor-pointer">Receipt</button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden space-y-2">
                    {filteredSessions.map((session) => {
                      const totalCommission = session.services.reduce((sum, s) => sum + s.commissionEarnedEtb, 0);
                      return (
                        <div key={session.id} className={`bg-card border rounded-xl p-3 shadow-sm ${
                          session.status === 'in_progress' ? 'border-primary' : 'border-border'
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-foreground text-sm">{session.queueNumber}</span>
                              <span className="font-semibold text-foreground text-xs">{session.customerName}</span>
                            </div>
                            <Badge variant={session.status === 'in_progress' ? 'default' : 'secondary'} className="uppercase text-[9px]">
                              {session.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          <div className="text-[10px] text-muted-foreground mb-1">
                            {session.services.map((s) => s.serviceName).join(', ')}
                          </div>
                          <div className="text-[10px] text-foreground font-bold mb-2">
                            Staff: {session.services.map((s) => s.staffName).join(', ')}
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-serif font-bold text-foreground text-sm">{session.netTotalEtb.toLocaleString()} ETB</span>
                              <span className="text-[10px] text-foreground ml-2">{totalCommission.toLocaleString()} comm</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {session.status === 'queued' && onUpdateSessionStatus && (
                                <button onClick={() => onUpdateSessionStatus(session.id, 'in_progress')} className="px-2.5 py-1 bg-blue-600 text-primary-foreground rounded-lg text-[10px] font-bold cursor-pointer">Start</button>
                              )}
                              {session.status === 'in_progress' && onUpdateSessionStatus && (
                                <button onClick={() => onUpdateSessionStatus(session.id, 'completed')} className="px-2.5 py-1 bg-ink-600 text-primary-foreground rounded-lg text-[10px] font-bold cursor-pointer">Complete</button>
                              )}
                              {!session.isPaid && session.status === 'completed' && (
                                <button onClick={() => setCheckoutSession(session)} className="px-2.5 py-1 bg-primary text-primary-foreground rounded-lg text-[10px] font-bold cursor-pointer">Pay</button>
                              )}
                              {session.isPaid && (
                                <button onClick={() => setInvoiceToPrint(session)} className="px-2.5 py-1 bg-muted border border-border text-foreground rounded-lg text-[10px] font-bold cursor-pointer">Receipt</button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ CLIENTS DASHBOARD ═══════════ */}
      {subTab === 'clients' && (
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-serif font-bold text-foreground flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-foreground" />
              Client Directory
            </h3>
            <button
              onClick={() => setShowNewCustomerModal(true)}
              className="px-3 py-1.5 bg-primary hover:bg-primary/80 text-primary-foreground font-bold rounded-lg text-xs cursor-pointer flex items-center gap-1"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={customerDirSearch}
              onChange={(e) => setCustomerDirSearch(e.target.value)}
              className="w-full bg-muted border border-border rounded-xl pl-9 pr-3 py-2 text-xs outline-none focus:border-primary"
            />
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="p-3">Name</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Visits</th>
                  <th className="p-3">Points</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#efe8d9]">
                {customers
                  .filter((c) => {
                    if (!customerDirSearch.trim()) return true;
                    const q = customerDirSearch.toLowerCase();
                    return c.name.toLowerCase().includes(q) || c.phone.includes(q);
                  })
                  .map((c) => (
                    <tr key={c.id} className="hover:bg-muted/50">
                      <td className="p-3 font-bold text-foreground flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-foreground text-[10px] font-bold">
                          {c.name.charAt(0)}
                        </div>
                        {c.name}
                      </td>
                      <td className="p-3 font-mono text-foreground">{c.phone}</td>
                      <td className="p-3">
                        {c.isVip ? (
                          <Badge variant="secondary" className="uppercase">VIP</Badge>
                        ) : (
                          <span className="text-muted-foreground text-[10px]">Standard</span>
                        )}
                      </td>
                      <td className="p-3 text-foreground">{c.totalVisits || 1}</td>
                      <td className="p-3 text-foreground font-bold">{c.loyaltyPoints || 0}</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => { setSelectedCustomer(c); setSubTab('new_session'); }}
                          className="px-2.5 py-1 bg-primary hover:bg-primary/80 text-primary-foreground rounded-lg text-[10px] font-bold cursor-pointer"
                        >
                          Select
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-2">
            {customers
              .filter((c) => {
                if (!customerDirSearch.trim()) return true;
                const q = customerDirSearch.toLowerCase();
                return c.name.toLowerCase().includes(q) || c.phone.includes(q);
              })
              .map((c) => (
                <div key={c.id} className="bg-muted border border-border rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-foreground text-xs font-bold">
                      {c.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold text-foreground text-xs">{c.name}</div>
                      <div className="text-[10px] text-muted-foreground">{c.phone}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => { setSelectedCustomer(c); setSubTab('new_session'); }}
                    className="px-2.5 py-1 bg-primary text-primary-foreground rounded-lg text-[10px] font-bold cursor-pointer"
                  >
                    Select
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ═══════════ MODALS ═══════════ */}

      {/* Register New Customer */}
      {showNewCustomerModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <h3 className="text-base font-serif font-bold text-foreground flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-foreground" />
              New Client
            </h3>
            <form onSubmit={handleCreateNewCustomer} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Full Name</label>
                <input
                  type="text" required placeholder="e.g. Bethlehem Assefa"
                  value={custName} onChange={(e) => setCustName(e.target.value)}
                  className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Phone</label>
                <input
                  type="text" required placeholder="+251 91 123 4567"
                  value={custPhone} onChange={(e) => setCustPhone(e.target.value)}
                  className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-primary"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowNewCustomerModal(false)} className="px-3 py-1.5 bg-muted text-muted-foreground rounded-lg text-xs font-semibold">Cancel</button>
                <button type="submit" className="px-4 py-1.5 bg-primary hover:bg-primary/80 text-primary-foreground font-bold rounded-lg text-xs">Register</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Checkout Payment */}
      {checkoutSession && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-serif font-bold text-foreground">{checkoutSession.queueNumber}</h3>
                <p className="text-xs text-muted-foreground">{checkoutSession.customerName}</p>
              </div>
              <button onClick={() => setCheckoutSession(null)} className="text-muted-foreground hover:text-foreground text-lg font-bold">✕</button>
            </div>

            <div className="bg-muted p-3 rounded-xl space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{checkoutSession.subtotalEtb} ETB</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span>-{checkoutSession.discountEtb} ETB</span></div>
              <div className="flex justify-between font-serif font-bold text-base text-foreground pt-1 border-t border-border">
                <span>Total</span><span>{checkoutSession.netTotalEtb} ETB</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-bold">
              {[
                { id: 'telebirr', label: 'Telebirr' },
                { id: 'cbe_birr', label: 'CBE Birr' },
                { id: 'cash', label: 'Cash' },
                { id: 'card', label: 'Card' },
              ].map((m) => (
                <button
                  key={m.id} type="button" onClick={() => setPaymentMethod(m.id as any)}
                  className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                    paymentMethod === m.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-foreground border-border'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div>
              <input
                type="text" placeholder="Transaction ref (optional)"
                value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)}
                className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-xs font-mono outline-none"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setCheckoutSession(null)} className="flex-1 py-2 bg-muted text-muted-foreground rounded-xl text-xs font-semibold">Cancel</button>
              <button type="button" onClick={handleExecuteCheckout} className="flex-1 py-2 bg-primary hover:bg-primary/80 text-primary-foreground font-bold rounded-xl text-xs">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Print Invoice */}
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
