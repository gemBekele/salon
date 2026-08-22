import React, { useMemo, useState } from 'react';
import {
  UserCheck,
  DollarSign,
  Scissors,
  CheckCircle,
  Send,
  Clock,
  Award,
  Wallet,
  Trash2,
  Receipt,
  UserPlus,
  PlayCircle,
  Users,
  Search,
  Check,
  LogOut,
  Star,
  Loader2,
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
import { usePolling } from '../lib/usePolling';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toSelectItems,
} from './ui/select';
import { PinPad } from './PinPad';
import { apiFetch, readApiError } from '../lib/api';
import { groupStaffQueue } from '../lib/queue';
import { cn } from '../lib/utils';

interface StaffPortalViewProps {
  company?: Company | null;
  branch?: Branch | null;
  staffList: Staff[];
  loggedInStaffId?: string;
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
  onUpdateServiceStatus?: (serviceId: string, status: 'in_progress' | 'completed') => Promise<void> | void;
  onRefresh?: () => void | Promise<void>;
  onLogout?: () => void;
}

export const StaffPortalView: React.FC<StaffPortalViewProps> = ({
  company,
  branch,
  staffList,
  loggedInStaffId,
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
  onUpdateServiceStatus,
  onRefresh,
  onLogout,
}) => {
  // Staff Selection
  const [selectedStaffId, setSelectedStaffId] = useState<string>(
    loggedInStaffId && staffList.some((s) => s.id === loggedInStaffId) ? loggedInStaffId : staffList[0]?.id || ''
  );
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

  // New Client Service Builder State
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('+251 ');
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [sessionNotes, setSessionNotes] = useState('');
  const [serviceCategory, setServiceCategory] = useState<string>('all');
  const [serviceQuery, setServiceQuery] = useState('');

  // Switch Employee Dialog
  const [showSwitchDialog, setShowSwitchDialog] = useState(false);
  const [switchStep, setSwitchStep] = useState<'pick' | 'pin'>('pick');
  const [switchTarget, setSwitchTarget] = useState<Staff | null>(null);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);

  const runPending = async (key: string, fn: () => Promise<void> | void) => {
    setPendingAction(key);
    try {
      await fn();
    } finally {
      setPendingAction(null);
    }
  };

  // Add Extra Service Modal to existing session
  const [extraServiceModalSession, setExtraServiceModalSession] = useState<VisitSession | null>(null);

  // Quick Checkout Modal for Staff
  const [checkoutSession, setCheckoutSession] = useState<VisitSession | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('telebirr');

  // Filtered Services for Active Staff (safe before the !activeStaff guard)
  const staffBranchId = activeStaff?.branchId || branch?.id;
  const availableServices = useMemo(
    () =>
      services.filter((s) =>
        activeStaff?.businessUnitId ? s.businessUnitId === activeStaff.businessUnitId : true
      ),
    [services, activeStaff?.businessUnitId]
  );

  const categories = useMemo(
    () => [...new Set(availableServices.map((s) => s.category))].sort(),
    [availableServices]
  );

  const visibleServices = useMemo(
    () =>
      availableServices.filter((s) => {
        if (serviceCategory !== 'all' && s.category !== serviceCategory) return false;
        const q = serviceQuery.trim().toLowerCase();
        if (q && !s.name.toLowerCase().includes(q)) return false;
        return true;
      }),
    [availableServices, serviceCategory, serviceQuery]
  );

  // Per-service queue for the active staff member, grouped by customer
  const staffQueue = activeStaff ? groupStaffQueue(activeStaff.id, visitSessions, customers) : [];
  const queuedSessions = staffQueue.filter((q) => q.available);
  const inProgressSessions = staffQueue.filter((q) => q.inProgress);

  // Ledger Calculations
  const staffCommissions = commissionLogs.filter((c) => c.staffId === activeStaff?.id);
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

  // Service toggle in builder
  const toggleServiceInBuilder = (srv: Service) => {
    setSelectedServices((prev) =>
      prev.some((s) => s.id === srv.id) ? prev.filter((s) => s.id !== srv.id) : [...prev, srv]
    );
  };

  // Create Client Session from Staff Workstation
  const handleCreateSession = async (startImmediately: boolean = false) => {
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

    setPendingAction('create');
    try {
      await onCreateVisitSession(newSession);
      setShowBuilder(false);
      setSelectedServices([]);
      setSessionNotes('');
      setSelectedCustomer(null);
    } finally {
      setPendingAction(null);
    }
  };

  // Register New Customer from Staff Station
  const handleCreateNewCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName || !custPhone || custPhone.trim().length <= 4 || !onAddCustomer) return;

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
    setCustPhone('+251 ');
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

  const handleCheckoutSession = async () => {
    if (!checkoutSession || !onCheckoutSession) return;
    const ref = `PAY-${Math.floor(100000 + Math.random() * 900000)}`;
    setPendingAction('pay');
    try {
      await onCheckoutSession(checkoutSession.id, paymentMethod, ref);
      setCheckoutSession(null);
    } finally {
      setPendingAction(null);
    }
  };

  // Switch Active Employee (requires the target employee's PIN)
  const openSwitchDialog = () => {
    setSwitchStep('pick');
    setSwitchTarget(null);
    setSwitchError(null);
    setShowSwitchDialog(true);
  };

  const handleSwitchPin = async (pin: string) => {
    if (!switchTarget) return;
    setSwitching(true);
    setSwitchError(null);
    try {
      const res = await apiFetch('/api/staff/verify-pin', {
        method: 'POST',
        body: JSON.stringify({ staffId: switchTarget.id, pin }),
      });
      if (!res.ok) {
        setSwitchError(await readApiError(res));
        return;
      }
      setSelectedStaffId(switchTarget.id);
      setShowSwitchDialog(false);
    } catch {
      setSwitchError('Unable to reach the server. Please try again.');
    } finally {
      setSwitching(false);
    }
  };

  const cartTotal = selectedServices.reduce((acc, s) => acc + s.priceEtb, 0);

  // Map each customer to their most recent queue ticket number so the client
  // picker can be driven by the queue number (tablet walk-ins may not have a name).
  const queueNumberByCustomer = useMemo(() => {
    const m: Record<string, string> = {};
    const sorted = [...visitSessions].sort((a, b) =>
      String(b.startedAt || b.createdAt || '').localeCompare(String(a.startedAt || a.createdAt || ''))
    );
    for (const s of sorted) {
      if (s.customerId && !m[s.customerId]) m[s.customerId] = s.queueNumber;
    }
    return m;
  }, [visitSessions]);
  const queueForCustomer = (c: Customer) => queueNumberByCustomer[c.id] || '';

  if (!activeStaff) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No staff members found. Ask the manager to add staff first.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 bg-card border border-border rounded-md p-4">
        <span className="text-lg font-semibold tracking-tight text-foreground">{activeStaff.name}</span>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Queue: <span className="font-semibold text-foreground">{queuedSessions.length + inProgressSessions.length}</span>
          </div>
          <Button variant="outline" size="sm" onClick={openSwitchDialog}>
            <UserCheck className="size-4" />
            Switch Employee
          </Button>
          {onLogout && (
            <Button variant="ghost" size="sm" onClick={onLogout}>
              <LogOut className="size-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'workstation' | 'ledger')}>
        <TabsList variant="line" className="h-9 w-full">
          <TabsTrigger value="workstation" className="gap-1.5">
            <Scissors className="size-4" />
            Workstation ({queuedSessions.length + inProgressSessions.length})
          </TabsTrigger>
          <TabsTrigger value="ledger" className="gap-1.5">
            <DollarSign className="size-4" />
            My Earnings ({totalEarnedCommissions.toLocaleString()} ETB)
          </TabsTrigger>
        </TabsList>

        {/* ============ TAB 1: WORKSTATION ============ */}
        <TabsContent value="workstation" className="mt-4 space-y-4">
            {/* -- New Service Entry: single-screen builder -- */}
            <Card>
              <CardContent className="p-3">
                {selectedCustomer || selectedServices.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-10 h-10 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold font-mono text-sm">
                          {(() => {
                            if (!selectedCustomer) return '?';
                            const q = queueForCustomer(selectedCustomer);
                            return q ? q.replace(/^Q-/i, '') : selectedCustomer.phone.replace(/\D/g, '').slice(-4);
                          })()}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {selectedCustomer ? selectedCustomer.name : 'No client selected'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {selectedServices.length} service{selectedServices.length === 1 ? '' : 's'} *{' '}
                            <span className="font-semibold text-primary">{cartTotal.toLocaleString()} ETB</span>
                            {selectedCustomer ? ` * ${selectedCustomer.phone}` : ''}
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setShowBuilder(true)}>Edit Selection</Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        className="h-12 font-semibold"
                        disabled={!selectedCustomer || selectedServices.length === 0 || pendingAction !== null}
                        onClick={() => handleCreateSession(false)}
                      >
                        {pendingAction === 'create' ? <Loader2 className="size-4 animate-spin" /> : null}
                        Add to Queue
                      </Button>
                      <Button
                        className="h-12 font-semibold gap-1.5"
                        disabled={!selectedCustomer || selectedServices.length === 0 || pendingAction !== null}
                        onClick={() => handleCreateSession(true)}
                      >
                        {pendingAction === 'create' ? <Loader2 className="size-4 animate-spin" /> : <PlayCircle className="size-4" />}
                        Start Now
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowBuilder(true)}
                    className="w-full h-16 rounded-md border-2 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 transition-colors flex flex-col items-center justify-center gap-0.5 cursor-pointer"
                  >
                    <span className="flex items-center gap-2 text-sm font-bold text-primary">
                      <UserPlus className="size-4" />
                      New Service for a Client
                    </span>
                    <span className="text-[11px] text-muted-foreground">Pick a client * tap services * Start Now</span>
                  </button>
                )}
              </CardContent>
            </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2 justify-between w-full pr-8">
                    <span className="flex items-center gap-2">
                      <Clock className="size-4 text-muted-foreground" />
                      My Queue
                    </span>
                    <Badge variant="secondary" className="text-sm">
                      {staffQueue.length} assigned
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {staffQueue.length === 0 ? (
                    <p className="py-10 text-center text-muted-foreground text-sm">
                      No services assigned to you yet.
                    </p>
                  ) : (
                    staffQueue.map((item) => {
                      return (
                        <div
                          key={item.session.id}
                          className={`rounded-md border p-2.5 space-y-2 ${
                            item.inProgress ? 'border-amber-300 bg-amber-500/5' :
                            item.available ? 'border-emerald-300 bg-emerald-500/5' : 'border-border opacity-70'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-base font-bold font-mono text-foreground">{item.session.queueNumber}</span>
                              <span className="text-xs font-mono text-muted-foreground">#{item.position}</span>
                              {item.isVip && <Star className="size-3.5 text-amber-500 fill-amber-500 shrink-0" />}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {item.inProgress ? (
                                <Badge variant="warning" className="text-[10px] uppercase">In Progress</Badge>
                              ) : item.available ? (
                                <Badge variant="success" className="text-[10px] uppercase">Ready</Badge>
                              ) : (
                                <span className="text-[10px] text-muted-foreground">busy elsewhere</span>
                              )}
                            </div>
                          </div>
                          <p className="font-semibold text-foreground text-sm">{item.session.customerName}</p>

                          <div className="space-y-1.5">
                            {item.services.map((svc) => {
                              const inProgress = svc.status === 'in_progress';
                              return (
                                <div key={svc.id} className="rounded-md border border-border bg-background p-2 space-y-1.5">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-sm font-semibold text-foreground truncate">{svc.serviceName}</span>
                                    <span className="text-[10px] font-semibold text-muted-foreground shrink-0">{svc.priceEtb} ETB</span>
                                  </div>
                                  {onUpdateServiceStatus && (
                                    <div className="flex items-center gap-2">
                                      {svc.status === 'pending' && (
                                        <Button
                                          size="sm"
                                          className="flex-1 gap-1.5"
                                          disabled={pendingAction !== null || !item.available}
                                          onClick={() => runPending(`start-${svc.id}`, () => onUpdateServiceStatus(svc.id, 'in_progress'))}
                                        >
                                          {pendingAction === `start-${svc.id}` ? (
                                            <Loader2 className="size-4 animate-spin" />
                                          ) : (
                                            <PlayCircle className="size-4" />
                                          )}
                                          {pendingAction === `start-${svc.id}` ? 'Starting...' : 'Start'}
                                        </Button>
                                      )}
                                      {inProgress && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="flex-1 gap-1.5"
                                          disabled={pendingAction !== null}
                                          onClick={() => runPending(`complete-${svc.id}`, () => onUpdateServiceStatus(svc.id, 'completed'))}
                                        >
                                          {pendingAction === `complete-${svc.id}` ? (
                                            <Loader2 className="size-4 animate-spin" />
                                          ) : (
                                            <CheckCircle className="size-4" />
                                          )}
                                          {pendingAction === `complete-${svc.id}` ? 'Completing...' : 'Complete'}
                                        </Button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            {/* -- Single-screen service builder dialog -- */}
            <Dialog open={showBuilder} onOpenChange={(o) => { if (!o) setShowBuilder(false); }}>
              <DialogContent className="sm:max-w-lg h-[min(94dvh,760px)] p-3 sm:p-4 gap-2 [display:flex] [flex-direction:column] overflow-hidden">
                <DialogHeader className="shrink-0">
                  <DialogTitle className="text-base flex items-center gap-2">
                    <Scissors className="size-4 text-primary" />
                    New Service Entry
                    <span className="text-xs font-normal text-muted-foreground">* for {activeStaff.name}</span>
                  </DialogTitle>
                </DialogHeader>

                {/* Client */}
                <div className="shrink-0">
                  {selectedCustomer ? (
                    <div className="rounded-md border border-primary bg-primary/5 px-3 py-2 flex items-center justify-between gap-2">
                      <div className="min-w-0 flex items-center gap-2">
                        <span className="w-8 h-8 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold font-mono text-xs">
                          {(() => {
                            const q = queueForCustomer(selectedCustomer);
                            return q ? q.replace(/^Q-/i, '') : selectedCustomer.phone.replace(/\D/g, '').slice(-4);
                          })()}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {selectedCustomer.name}{selectedCustomer.isVip ? ' VIP' : ''}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">{selectedCustomer.phone}</p>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => setSelectedCustomer(null)}>Change</Button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Select
                        onValueChange={(id) => {
                          const c = customers.find((x) => x.id === id);
                          if (c) setSelectedCustomer(c);
                        }}
                      >
                        <SelectTrigger className="w-full h-11 text-sm">
                          <SelectValue placeholder="Choose a client..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-60 min-w-[300px]">
                          {customers.map((c) => {
                            const q = queueForCustomer(c);
                            return (
                              <SelectItem key={c.id} value={c.id} className="py-1.5">
                                <div className="flex flex-col text-left">
                                  <span className={`font-semibold ${q ? 'font-mono' : ''}`}>{q || c.phone}</span>
                                  <span className="text-muted-foreground text-sm">
                                    {q ? `${c.name} * ${c.phone}${c.isVip ? ' VIP' : ''}` : `${c.name}${c.isVip ? ' * VIP VIP' : ''}`}
                                  </span>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <Button type="button" variant="ghost" size="sm" className="h-8 text-xs font-semibold text-primary" onClick={() => setShowNewCustomerModal(true)}>
                        <UserPlus className="size-3.5" />
                        Register New Client
                      </Button>
                    </div>
                  )}
                </div>

                {/* Search + category chips */}
                <div className="shrink-0 space-y-2">
                  <div className="relative">
                    <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      value={serviceQuery}
                      onChange={(e) => setServiceQuery(e.target.value)}
                      placeholder="Search services..."
                      className="pl-9 h-10"
                    />
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    <Button type="button" size="sm" variant={serviceCategory === 'all' ? 'default' : 'outline'} onClick={() => setServiceCategory('all')}>
                      All
                    </Button>
                    {categories.map((cat) => (
                      <Button key={cat} type="button" size="sm" variant={serviceCategory === cat ? 'default' : 'outline'} onClick={() => setServiceCategory(cat)}>
                        {cat}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Services fill the remaining height (invisible scrollbar fallback) */}
                <div className="no-scrollbar flex-1 min-h-0 overflow-y-auto">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 content-start pb-1">
                    {visibleServices.map((srv) => {
                      const selected = selectedServices.some((s) => s.id === srv.id);
                      return (
                        <button
                          key={srv.id}
                          type="button"
                          onClick={() => toggleServiceInBuilder(srv)}
                          className={cn(
                            'relative rounded-md border p-3 text-left transition-colors cursor-pointer min-h-[84px]',
                            selected
                              ? 'border-primary bg-primary/5 ring-1 ring-primary/40'
                              : 'border-border bg-background hover:border-primary/50 hover:bg-muted/40 active:scale-[0.98]'
                          )}
                        >
                          {selected && (
                            <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                              <Check className="size-3.5" />
                            </span>
                          )}
                          <p className="font-semibold text-foreground text-sm line-clamp-1 pr-5">{srv.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{srv.category} ? {srv.durationMinutes}m</p>
                          <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-border/60">
                            <span className="font-semibold text-foreground text-sm">{srv.priceEtb.toLocaleString()}</span>
                            <span className="text-xs font-semibold text-primary">
                              +{Math.round((srv.priceEtb * activeStaff.defaultCommissionPercentage) / 100)}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Sticky footer */}
                <div className="shrink-0 border-t border-border pt-2 space-y-2">
                  {selectedServices.length > 0 && (
                    <Input
                      value={sessionNotes}
                      onChange={(e) => setSessionNotes(e.target.value)}
                      placeholder="Optional notes..."
                      className="h-9 text-xs"
                    />
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="kpi-label">Total ({selectedServices.length})</p>
                      <p className="kpi-value leading-tight">{cartTotal.toLocaleString()} ETB</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-11 px-3 font-semibold"
                        disabled={!selectedCustomer || selectedServices.length === 0 || pendingAction !== null}
                        onClick={() => handleCreateSession(false)}
                      >
                        Add to Queue
                      </Button>
                      <Button
                        size="sm"
                        className="h-11 px-4 font-semibold gap-1.5"
                        disabled={!selectedCustomer || selectedServices.length === 0 || pendingAction !== null}
                        onClick={() => handleCreateSession(true)}
                      >
                        {pendingAction === 'create' ? <Loader2 className="size-4 animate-spin" /> : <PlayCircle className="size-4" />}
                        Start Now
                      </Button>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
        </TabsContent>

        {/* ============ TAB 2: EARNINGS ============ */}
        <TabsContent value="ledger" className="mt-4 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="kpi-label mb-1.5 flex items-center justify-between">
                  <span>Total Earned Commissions</span>
                  <Award className="size-3.5 text-muted-foreground" />
                </div>
                <p className="kpi-value">
                  {totalEarnedCommissions.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">ETB</span>
                </p>
                <p className="text-sm text-muted-foreground mt-1.5">From completed services</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="kpi-label mb-1.5 flex items-center justify-between">
                  <span>Unpaid Balance</span>
                  <Wallet className="size-3.5 text-muted-foreground" />
                </div>
                <p className="kpi-value">
                  {unpaidCommissions.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">ETB</span>
                </p>
                <p className="text-sm text-muted-foreground mt-1.5">Ready for payout request</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="kpi-label mb-1.5 flex items-center justify-between">
                  <span>Paid Commissions</span>
                  <CheckCircle className="size-3.5 text-muted-foreground" />
                </div>
                <p className="kpi-value">
                  {paidCommissions.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">ETB</span>
                </p>
                <p className="text-sm text-muted-foreground mt-1.5">Paid via Telebirr / CBE</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="section-title flex items-center gap-2">
                  <Wallet className="size-4" />
                  Commission Payout
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Balance: <strong className="text-foreground">{unpaidCommissions} ETB</strong> â€¢ Rate:{' '}
                  {activeStaff.defaultCommissionPercentage}%
                </p>
              </div>
              <Button
                disabled={unpaidCommissions === 0 || payoutRequested}
                onClick={handleRequestPayout}
                className="gap-1.5"
              >
                {payoutRequested ? <Check className="size-4" /> : <Send className="size-4" />}
                {payoutRequested
                  ? 'Request Submitted!'
                  : `Request Payout (${unpaidCommissions} ETB)`}
              </Button>
            </CardContent>
          </Card>

          <StaffPerformanceDashboard
            activeStaff={activeStaff}
            commissionLogs={commissionLogs}
            visitSessions={visitSessions}
            branches={branches}
            businessUnits={businessUnits}
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Service Commission History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Rule</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffCommissions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                        No commission logs found for {activeStaff.name}.
                      </TableCell>
                    </TableRow>
                  ) : (
                    staffCommissions.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-semibold">{log.serviceName}</TableCell>
                        <TableCell className="num text-right">{log.servicePriceEtb} ETB</TableCell>
                        <TableCell className="num text-right font-semibold">{log.commissionAmountEtb} ETB</TableCell>
                        <TableCell className="text-muted-foreground">{log.ruleApplied}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              log.payoutStatus === 'paid'
                                ? 'success'
                                : log.payoutStatus === 'payout_requested'
                                ? 'warning'
                                : 'neutral'
                            }
                            className="uppercase"
                          >
                            {log.payoutStatus.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{log.createdAt.split('T')[0]}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ========================================================= */}
      {/* MODAL: REGISTER NEW CUSTOMER */}
      {/* ========================================================= */}
      <Dialog open={showNewCustomerModal} onOpenChange={(o) => !o && setShowNewCustomerModal(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="size-4" />
              Register New Client
            </DialogTitle>
            <DialogDescription>
              Add a new client so you can start a service session for them.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateNewCustomer} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="newCustName">Client Full Name</Label>
              <Input
                id="newCustName"
                required
                placeholder="e.g. Bethlehem Assefa"
                value={custName}
                onChange={(e) => setCustName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newCustPhone">Phone Number (+251 format)</Label>
              <Input
                id="newCustPhone"
                required
                placeholder="+251 91 123 4567"
                value={custPhone}
                onChange={(e) => setCustPhone(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowNewCustomerModal(false)}>
                Cancel
              </Button>
              <Button type="submit">Register Client</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================= */}
      {/* MODAL: SWITCH ACTIVE EMPLOYEE (PIN protected) */}
      {/* ========================================================= */}
      <Dialog open={showSwitchDialog} onOpenChange={(o) => !o && setShowSwitchDialog(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="size-4" />
              {switchStep === 'pick' ? 'Switch Active Employee' : `Enter PIN â€” ${switchTarget?.name}`}
            </DialogTitle>
            <DialogDescription>
              {switchStep === 'pick'
                ? 'Select the employee who is now using this terminal. You will need their PIN.'
                : 'Enter the 4-digit PIN of the employee to activate their session.'}
            </DialogDescription>
          </DialogHeader>

          {switchStep === 'pick' ? (
            <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
              {staffList.map((st) => (
                <Button
                  key={st.id}
                  type="button"
                  variant={st.id === selectedStaffId ? 'secondary' : 'outline'}
                  className="h-auto flex-col items-start py-3 px-3 text-left"
                  onClick={() => {
                    setSwitchTarget(st);
                    setSwitchError(null);
                    setSwitchStep('pin');
                  }}
                >
                  <span className="text-sm font-semibold">{st.name}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {st.role} â€¢ {st.defaultCommissionPercentage}%
                  </span>
                </Button>
              ))}
            </div>
          ) : (
            <PinPad
              error={switchError}
              onComplete={handleSwitchPin}
              onErrorCleared={() => setSwitchError(null)}
              disabled={switching}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================= */}
      {/* MODAL: ADD EXTRA SERVICE TO ONGOING SESSION */}
      {/* ========================================================= */}
      <Dialog open={!!extraServiceModalSession} onOpenChange={(o) => !o && setExtraServiceModalSession(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Add Extra Service â€” {extraServiceModalSession?.customerName} ({extraServiceModalSession?.queueNumber})
            </DialogTitle>
            <DialogDescription>Select an additional service to append to this visit.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
            {availableServices.map((srv) => (
              <button
                key={srv.id}
                type="button"
                onClick={() => handleAddExtraServiceToSession(srv)}
                className="bg-background border border-border hover:border-primary hover:bg-primary/5 p-3 rounded-md text-left cursor-pointer transition-colors"
              >
                <p className="font-semibold text-foreground text-sm">{srv.name}</p>
                <p className="text-sm font-semibold text-foreground mt-1">{srv.priceEtb} ETB</p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================= */}
      {/* MODAL: QUICK CHECKOUT FOR STAFF */}
      {/* ========================================================= */}
      <Dialog open={!!checkoutSession} onOpenChange={(o) => !o && setCheckoutSession(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Collect Payment â€” {checkoutSession?.customerName} ({checkoutSession?.queueNumber})
            </DialogTitle>
          </DialogHeader>

          <div className="rounded-md bg-muted p-3.5 text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Net Amount Payable</span>
              <span className="font-semibold text-foreground text-lg">{checkoutSession?.netTotalEtb} ETB</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Select Payment Method</Label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ['telebirr', 'Telebirr SuperApp'],
                  ['cbe_birr', 'CBE Birr'],
                  ['cash', 'Cash'],
                  ['card', 'Card / POS'],
                ] as [PaymentMethod, string][]
              ).map(([value, label]) => (
                <Button
                  key={value}
                  type="button"
                  variant={paymentMethod === value ? 'default' : 'outline'}
                  onClick={() => setPaymentMethod(value)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutSession(null)}>
              Cancel
            </Button>
            <Button onClick={handleCheckoutSession} disabled={pendingAction !== null}>
              {pendingAction === 'pay' && <Loader2 className="size-4 animate-spin mr-2" />}
              {pendingAction === 'pay' ? 'Processing...' : 'Confirm Payment & Complete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
