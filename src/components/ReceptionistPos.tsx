import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  UserPlus,
  Clock,
  Scissors,
  Receipt,
  Users,
  ShoppingCart,
  X,
  Printer,
  DollarSign,
  LayoutDashboard,
  Star,
  Trash2,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  Plus,
  Sparkles,
  Phone,
  Mail,
  FileText,
  ChevronDown,
  ChevronUp,
  Package,
  ReceiptText,
  Wallet,
  Pencil,
  Minus,
  LogOut,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Customer,
  Service,
  Staff,
  VisitSession,
  Company,
  Branch,
  CommissionLog,
  InventoryItem,
  ExpenseRecord,
  SessionServiceItem,
  PaymentMethod,
  BusinessUnit,
} from '../types';
import { usePolling } from '../lib/usePolling';
import { PrintableInvoice } from './PrintableInvoice';
import { getStaffQueue, suggestStaff } from '../lib/queue';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

interface ReceptionistPosProps {
  company?: Company;
  branch?: Branch;
  staffList: Staff[];
  services: Service[];
  customers: Customer[];
  inventoryItems?: InventoryItem[];
  expenses?: ExpenseRecord[];
  visitSessions: VisitSession[];
  commissionLogs?: CommissionLog[];
  onCreateVisitSession: (session: VisitSession) => Promise<void> | void;
  onUpdateSessionStatus?: (sessionId: string, newStatus: 'queued' | 'in_progress' | 'completed' | 'cancelled') => Promise<void> | void;
  onAddCustomer: (customer: Customer) => Promise<void> | void;
  onUpdateSessionServices?: (sessionId: string, service: SessionServiceItem) => Promise<void> | void;
  onCheckoutSession: (sessionId: string, paymentMethod: PaymentMethod, reference: string) => Promise<void> | void;
  onCancelSession: (sessionId: string, reason?: string) => Promise<void> | void;
  onRemoveSessionService?: (sessionId: string, serviceId: string) => Promise<void> | void;
  onRefresh?: () => void | Promise<void>;
  onAddInventoryItem?: (item: InventoryItem) => Promise<void> | void;
  onUpdateInventoryItem?: (item: InventoryItem) => Promise<void> | void;
  onDeleteInventoryItem?: (id: string) => Promise<void> | void;
  onUpdateInventoryStock?: (id: string, addedQty: number) => Promise<void> | void;
  onAddExpense?: (expense: ExpenseRecord) => Promise<void> | void;
  currentUser?: { name?: string; role: string; companyId: string | null };
  onLogout?: () => void;
}

const PIE_COLORS = ['#18181b', '#0d9488', '#3a3a41', '#115e59', '#6b6b75'];

const isToday = (dateStr?: string) => {
  if (!dateStr) return true;
  const normalized = dateStr.includes(' ') && !dateStr.includes('T') ? dateStr.replace(' ', 'T') : dateStr;
  const d = new Date(normalized);
  if (isNaN(d.getTime())) return true;
  const today = new Date();
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
};

export const ReceptionistPos: React.FC<ReceptionistPosProps> = ({
  company,
  branch,
  staffList,
  services,
  customers,
  visitSessions,
  onCreateVisitSession,
  onAddCustomer,
  onCheckoutSession,
  onCancelSession,
  onRefresh,
  inventoryItems = [],
  expenses = [],
  onAddInventoryItem,
  onUpdateInventoryItem,
  onDeleteInventoryItem,
  onUpdateInventoryStock,
  onAddExpense,
  currentUser,
  onLogout,
  businessUnit,
}) => {
  // ---- State ----
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedServices, setSelectedServices] = useState<SessionServiceItem[]>([]);
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [pickerMode, setPickerMode] = useState<'list' | 'new'>('list');
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custNotes, setCustNotes] = useState('');
  const [custIsVip, setCustIsVip] = useState(false);

  const [serviceCategory, setServiceCategory] = useState<string>('all');
  const [invoiceToPrint, setInvoiceToPrint] = useState<VisitSession | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [queueSearchQuery, setQueueSearchQuery] = useState('');
  const [queueStatusFilter, setQueueStatusFilter] = useState<string>('all');
  const [expandedPaymentId, setExpandedPaymentId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [paidIds, setPaidIds] = useState<string[]>([]);
  const [viewTab, setViewTab] = useState<'sessions' | 'board' | 'analytics' | 'inventory' | 'expenses'>('sessions');
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [creationError, setCreationError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showAllDates, setShowAllDates] = useState(false);

  // Inventory state
  const [inventorySearch, setInventorySearch] = useState('');
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustMode, setAdjustMode] = useState<'restock' | 'use'>('restock');
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [invEditing, setInvEditing] = useState<InventoryItem | null>(null);
  const [invName, setInvName] = useState('');
  const [invSku, setInvSku] = useState('');
  const [invUnit, setInvUnit] = useState('unit');
  const [invStock, setInvStock] = useState(0);
  const [invReorder, setInvReorder] = useState(5);
  const [invCost, setInvCost] = useState(0);
  const [confirmDeleteItem, setConfirmDeleteItem] = useState<InventoryItem | null>(null);

  // Expense state
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expCategory, setExpCategory] = useState<ExpenseRecord['category']>('other');
  const [expAmount, setExpAmount] = useState('');
  const [expDescription, setExpDescription] = useState('');
  const [expMethod, setExpMethod] = useState<PaymentMethod>('cash');
  const [expenseError, setExpenseError] = useState<string | null>(null);
  const [expenseSuccess, setExpenseSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (paidIds.length > 0 && visitSessions.some((s) => s.isPaid && paidIds.includes(s.id))) {
      setPaidIds([]);
    }
  }, [visitSessions]);

  usePolling(() => { setLastUpdatedAt(new Date()); return onRefresh?.(); }, 15_000);

  const branchId = branch?.id;
  const activeCompanyId = company?.id || 'cmp_gech_01';
  const fallbackBranchId = branch?.id || (staffList.length > 0 ? staffList[0].branchId : 'br_female_01');

  // ---- Daily Filtered Data ----
  const branchStaff = useMemo(
    () => staffList.filter((s) => (branchId ? s.branchId === branchId : true) && s.role !== 'receptionist'),
    [staffList, branchId]
  );

  const availableServices = useMemo(
    () => services.filter((s) => !company || s.companyId === company.id),
    [services, company]
  );

  const categories = useMemo(() => [...new Set(availableServices.map((s) => s.category))], [availableServices]);
  const filteredServices = serviceCategory === 'all' ? availableServices : availableServices.filter((s) => s.category === serviceCategory);

  // Filter visit sessions for the front desk
  const todayBranchSessions = useMemo(() => {
    return visitSessions.filter((s) => {
      const matchesCompany = !company || !s.companyId || s.companyId === activeCompanyId;
      const matchesBranch = !branchId || !s.branchId || s.branchId === branchId;
      if (!matchesCompany || !matchesBranch) return false;

      // Always show queued or in-progress clients in the active queue
      if (s.status === 'queued' || s.status === 'in_progress') return true;

      // Show completed or cancelled sessions if they match today or user toggled showAllDates
      return showAllDates || isToday(s.completedAt || s.startedAt || s.createdAt);
    });
  }, [visitSessions, company, activeCompanyId, branchId, showAllDates]);

  const filteredSessions = useMemo(() => {
    let list = todayBranchSessions;
    if (queueStatusFilter === 'pending') {
      list = list.filter((s) => s.status === 'completed' && !s.isPaid && !paidIds.includes(s.id));
    } else if (queueStatusFilter !== 'all') {
      list = list.filter((s) => s.status === queueStatusFilter);
    }
    if (queueSearchQuery.trim()) {
      const q = queueSearchQuery.toLowerCase();
      list = list.filter((s) =>
        s.customerName.toLowerCase().includes(q) ||
        s.customerPhone.includes(q) ||
        s.queueNumber.toLowerCase().includes(q) ||
        s.services.some((svc) => svc.serviceName.toLowerCase().includes(q) || svc.staffName.toLowerCase().includes(q))
      );
    }
    return list;
  }, [todayBranchSessions, queueStatusFilter, queueSearchQuery, paidIds]);

  const filteredPickerCustomers = useMemo(() => {
    const q = clientSearchQuery.trim().toLowerCase().replace(/\s+/g, '');
    if (!q) return [...customers].sort((a, b) => (b.isVip ? 1 : 0) - (a.isVip ? 1 : 0));
    const list = customers.filter((c) => {
      const nameMatch = c.name.toLowerCase().includes(q);
      const phoneMatch = c.phone.replace(/\s+/g, '').includes(q);
      return nameMatch || phoneMatch;
    });
    return list;
  }, [customers, clientSearchQuery]);

  // Today's Key Metrics
  const queuedCount = todayBranchSessions.filter((s) => s.status === 'queued').length;
  const inProgressCount = todayBranchSessions.filter((s) => s.status === 'in_progress').length;
  const completedToday = todayBranchSessions.filter((s) => s.status === 'completed').length;
  const pendingPaymentSessions = todayBranchSessions.filter((s) => s.status === 'completed' && !s.isPaid && !paidIds.includes(s.id));
  const pendingCount = pendingPaymentSessions.length;
  const pendingUnpaidAmount = pendingPaymentSessions.reduce((acc, s) => acc + s.netTotalEtb, 0);

  const todayRevenue = useMemo(() => {
    return todayBranchSessions
      .filter((s) => s.isPaid || paidIds.includes(s.id))
      .reduce((acc, s) => acc + s.netTotalEtb, 0);
  }, [todayBranchSessions, paidIds]);

  // ---- Inventory Data ----
  const branchInventory = useMemo(() => {
    return inventoryItems.filter((i) => {
      const matchesCompany = !company || !i.companyId || i.companyId === activeCompanyId;
      const matchesBranch = !branchId || !i.branchId || i.branchId === branchId;
      return matchesCompany && matchesBranch;
    });
  }, [inventoryItems, company, activeCompanyId, branchId]);

  const filteredInventory = useMemo(() => {
    const q = inventorySearch.trim().toLowerCase();
    if (!q) return branchInventory;
    return branchInventory.filter((i) =>
      i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q)
    );
  }, [branchInventory, inventorySearch]);

  const lowStockCount = branchInventory.filter((i) => i.currentStock <= i.reorderLevel).length;

  // ---- Expense Data ----
  const todayExpenses = useMemo(() => {
    return expenses
      .filter((e) => {
        const matchesCompany = !company || !e.companyId || e.companyId === activeCompanyId;
        const matchesBranch = !branchId || !e.branchId || e.branchId === branchId;
        return matchesCompany && matchesBranch && isToday(e.date);
      })
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [expenses, company, activeCompanyId, branchId]);

  const todayExpenseTotal = todayExpenses.reduce((acc, e) => acc + e.amountEtb, 0);
  const expenseLimit = Number(branch?.dailyExpenseLimitEtb || 0);
  const expenseRemaining = expenseLimit > 0 ? Math.max(0, expenseLimit - todayExpenseTotal) : null;
  const expensePct = expenseLimit > 0 ? Math.min(100, Math.round((todayExpenseTotal / expenseLimit) * 100)) : 0;
  const expenseAtLimit = expenseLimit > 0 && todayExpenseTotal >= expenseLimit;

  const handleAddInventorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invName) return;
    const item: InventoryItem = {
      id: `inv_${Date.now()}`,
      companyId: activeCompanyId,
      branchId: branchId || fallbackBranchId,
      businessUnitId: businessUnit?.id || null,
      name: invName,
      sku: invSku || `SKU-${Date.now().toString().slice(-6)}`,
      unit: invUnit,
      currentStock: invStock,
      reorderLevel: invReorder,
      unitCostEtb: invCost,
      lastRestockedAt: new Date().toISOString().slice(0, 10),
    };
    try {
      await onAddInventoryItem?.(item);
      onRefresh?.();
      setShowInventoryModal(false);
      setInvEditing(null);
      setInvName(''); setInvSku(''); setInvUnit('unit'); setInvStock(0); setInvReorder(5); setInvCost(0);
    } catch {
      // handled by parent
    }
  };

  const handleUpdateInventorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invEditing) return;
    try {
      await onUpdateInventoryItem?.({
        ...invEditing,
        name: invName,
        sku: invSku,
        unit: invUnit,
        currentStock: invStock,
        reorderLevel: invReorder,
        unitCostEtb: invCost,
      });
      onRefresh?.();
      setShowInventoryModal(false);
      setInvEditing(null);
    } catch {
      // handled by parent
    }
  };

  const openAddInventory = () => {
    setInvEditing(null);
    setInvName(''); setInvSku(''); setInvUnit('unit'); setInvStock(0); setInvReorder(5); setInvCost(0);
    setShowInventoryModal(true);
  };

  const openEditInventory = (item: InventoryItem) => {
    setInvEditing(item);
    setInvName(item.name); setInvSku(item.sku); setInvUnit(item.unit);
    setInvStock(item.currentStock); setInvReorder(item.reorderLevel); setInvCost(item.unitCostEtb);
    setShowInventoryModal(true);
  };

  const handleAdjustStock = async () => {
    if (!adjustItem || adjustQty === 0) return;
    try {
      await onUpdateInventoryStock?.(adjustItem.id, adjustMode === 'use' ? -adjustQty : adjustQty);
      onRefresh?.();
      setAdjustItem(null);
      setAdjustQty(0);
      setAdjustMode('restock');
    } catch {
      // handled by parent
    }
  };

  const handleRecordExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setExpenseError(null);
    setExpenseSuccess(null);
    const amount = Number(expAmount);
    if (!expDescription || !amount || amount <= 0) {
      setExpenseError('Please enter a valid amount and description.');
      return;
    }
    if (expenseLimit > 0 && amount > expenseRemaining!) {
      setExpenseError(`Amount exceeds the daily expense limit. Only ${expenseRemaining} ETB remaining today (limit ${expenseLimit} ETB).`);
      return;
    }
    const record: ExpenseRecord = {
      id: `exp_${Date.now()}`,
      companyId: activeCompanyId,
      branchId: branchId || fallbackBranchId,
      businessUnitId: businessUnit?.id || null,
      category: expCategory,
      amountEtb: amount,
      description: expDescription,
      paymentMethod: expMethod,
      recordedBy: currentUser?.name || 'Reception Desk',
      date: new Date().toISOString().slice(0, 10),
    };
    try {
      await onAddExpense?.(record);
      onRefresh?.();
      setShowExpenseModal(false);
      setExpAmount(''); setExpDescription('');
      setExpenseSuccess('Expense recorded successfully.');
      setTimeout(() => setExpenseSuccess(null), 4000);
    } catch (err: any) {
      setExpenseError(err?.message || 'Failed to record expense. The daily limit may be exceeded.');
    }
  };

  // ---- Handlers ----
  const addServiceToBuilder = (service: Service) => {
    setCreationError(null);
    const suggestion = suggestStaff(branchStaff, service.businessUnitId, todayBranchSessions, customers);
    const staff = suggestion
      ? branchStaff.find((s) => s.id === suggestion.id)
      : branchStaff.find((s) => s.businessUnitId === service.businessUnitId);
    const commission = Math.round((service.priceEtb * (staff?.defaultCommissionPercentage || 30)) / 100);
    const item: SessionServiceItem = {
      id: `vss_${Date.now()}`, serviceId: service.id, serviceName: service.name,
      staffId: staff?.id || '', staffName: staff?.name || 'Unassigned', priceEtb: service.priceEtb,
      durationMinutes: service.durationMinutes, commissionEarnedEtb: commission, status: 'pending',
    };
    setSelectedServices((prev) => [...prev, item]);
  };

  const removeServiceFromBuilder = (index: number) => setSelectedServices((prev) => prev.filter((_, i) => i !== index));

  const assignStaffToBuilder = (index: number, staffId: string) => {
    const staff = staffList.find((s) => s.id === staffId);
    if (!staff) return;
    setSelectedServices((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              staffId: staff.id,
              staffName: staff.name,
              commissionEarnedEtb: Math.round((item.priceEtb * staff.defaultCommissionPercentage) / 100),
            }
          : item
      )
    );
  };

  const createSession = async () => {
    setCreationError(null);
    if (!selectedCustomer) {
      setCreationError('Please select or register a client first.');
      return;
    }
    if (selectedServices.length === 0) {
      setCreationError('Please add at least one service to the session.');
      return;
    }
    if (selectedServices.some((s) => !s.staffId)) {
      setCreationError('Assign a staff member to every service before confirming the queue.');
      return;
    }

    setIsCreating(true);
    try {
      const queueNumber = `Q-${100 + (todayBranchSessions.length + 1)}`;
      const subtotal = selectedServices.reduce((acc, s) => acc + s.priceEtb, 0);
      const firstService = availableServices.find((s) => s.id === selectedServices[0]?.serviceId);
      const newSession: VisitSession = {
        id: `vst_${Date.now()}`,
        companyId: company?.id || selectedCustomer.companyId || activeCompanyId,
        branchId: fallbackBranchId,
        businessUnitId: firstService?.businessUnitId || 'bu_mens_hair',
        queueNumber,
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        customerPhone: selectedCustomer.phone,
        services: selectedServices,
        status: 'queued',
        subtotalEtb: subtotal,
        discountEtb: 0,
        taxEtb: 0,
        netTotalEtb: subtotal,
        isPaid: false,
        startedAt: new Date().toISOString(),
      };
      await onCreateVisitSession(newSession);
      setSelectedServices([]);
      setSelectedCustomer(null);
      setIsBuilderOpen(false);
      onRefresh?.();
    } catch (err: any) {
      setCreationError(err?.message || 'Failed to create session. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const cartTotal = selectedServices.reduce((acc, s) => acc + s.priceEtb, 0);

  const handleCreateNewCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName || !custPhone) return;
    const newCust: Customer = {
      id: `cust_${Date.now()}`,
      companyId: activeCompanyId,
      name: custName,
      phone: custPhone,
      email: custEmail || undefined,
      totalVisits: 1,
      totalSpentEtb: 0,
      loyaltyPoints: 10,
      isVip: custIsVip,
      notes: custNotes || undefined,
      createdAt: new Date().toISOString().split('T')[0],
    };
    try {
      await onAddCustomer(newCust);
      setSelectedCustomer(newCust);
      setShowClientPicker(false);
      setPickerMode('list');
      setClientSearchQuery('');
      setCustName(''); setCustPhone(''); setCustEmail(''); setCustNotes(''); setCustIsVip(false);
      setIsBuilderOpen(true);
    } catch (err: any) {
      alert(err?.message || 'Failed to create customer');
    }
  };

  const handleCheckout = async (sessionId: string) => {
    setPaidIds((prev) => [...prev, sessionId]);
    setExpandedPaymentId(null);
    try {
      await onCheckoutSession(sessionId, paymentMethod, paymentReference);
      onRefresh?.();
    } catch {
      // handled by parent
    } finally {
      setPaymentReference('');
    }
  };

  const staffForService = (service: Service) => {
    return branchStaff.filter((s) => s.businessUnitId === service.businessUnitId);
  };

  // ---- Daily Analytics Computations ----
  const paymentMethodPieData = useMemo(() => {
    const map: Record<string, number> = { cash: 0, telebirr: 0, cbe_birr: 0, card: 0 };
    todayBranchSessions.forEach((s) => {
      if (s.isPaid || paidIds.includes(s.id)) {
        const pm = s.paymentMethod || 'cash';
        map[pm] = (map[pm] || 0) + s.netTotalEtb;
      }
    });
    return [
      { name: 'Cash', value: map.cash },
      { name: 'Telebirr', value: map.telebirr },
      { name: 'CBE Birr', value: map.cbe_birr },
      { name: 'Card / POS', value: map.card },
    ].filter((item) => item.value > 0);
  }, [todayBranchSessions, paidIds]);

  const hourlyRevenueData = useMemo(() => {
    const hoursMap: Record<string, number> = {};
    for (let h = 8; h <= 20; h++) {
      const key = `${h.toString().padStart(2, '0')}:00`;
      hoursMap[key] = 0;
    }
    todayBranchSessions.forEach((s) => {
      if (s.isPaid || paidIds.includes(s.id)) {
        const date = new Date(s.completedAt || s.startedAt || Date.now());
        const hour = date.getHours();
        const key = `${hour.toString().padStart(2, '0')}:00`;
        if (hoursMap[key] !== undefined) {
          hoursMap[key] += s.netTotalEtb;
        } else {
          hoursMap[key] = s.netTotalEtb;
        }
      }
    });
    return Object.keys(hoursMap).map((h) => ({ hour: h, revenue: hoursMap[h] }));
  }, [todayBranchSessions, paidIds]);

  const todayStaffPerformance = useMemo(() => {
    const map: Record<string, { name: string; role: string; count: number; revenue: number; commission: number }> = {};
    todayBranchSessions.forEach((s) => {
      s.services.forEach((srv) => {
        if (!map[srv.staffId]) {
          const stf = staffList.find((st) => st.id === srv.staffId);
          map[srv.staffId] = {
            name: srv.staffName || stf?.name || 'Staff',
            role: stf?.role || 'Provider',
            count: 0,
            revenue: 0,
            commission: 0,
          };
        }
        if (srv.status === 'completed' || s.status === 'completed') {
          map[srv.staffId].count += 1;
          map[srv.staffId].revenue += srv.priceEtb;
          map[srv.staffId].commission += srv.commissionEarnedEtb;
        }
      });
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [todayBranchSessions, staffList]);

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <Card className="border-border bg-card  overflow-hidden">
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-semibold text-lg">
              <Scissors className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold tracking-tight text-foreground">Receptionist Front Desk Kiosk</h1>
                <Badge variant="outline" className="text-[10px] font-mono border-border text-muted-foreground">
                  Today's View
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-2">
                <span>{branch?.name || company?.name || 'Central Salon Branch'}</span>
                <span>•</span>
                <span>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="xs"
              variant={showAllDates ? 'secondary' : 'outline'}
              onClick={() => setShowAllDates(!showAllDates)}
              className="text-xs font-semibold"
            >
              {showAllDates ? 'Showing All Dates' : 'Showing Today Only'}
            </Button>
            <Badge variant="secondary" className="text-sm px-3 py-1 font-mono">
              Live {lastUpdatedAt ? lastUpdatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Syncing...'}
            </Badge>
            <Button
              onClick={() => { setIsBuilderOpen(!isBuilderOpen); setCreationError(null); }}
              className="gap-2  font-semibold text-sm"
              variant={isBuilderOpen ? 'secondary' : 'default'}
            >
              {isBuilderOpen ? <ChevronUp className="size-4" /> : <Plus className="size-4" />}
              {isBuilderOpen ? 'Hide Builder' : '+ New Client Session'}
            </Button>
            {onLogout && (
              <Button
                onClick={onLogout}
                variant="outline"
                className="gap-2 font-semibold text-sm text-destructive border-destructive/30 hover:bg-destructive/10"
                title="Sign out of the reception desk"
              >
                <LogOut className="size-4" />
                {currentUser?.name ? `Sign Out (${currentUser.name})` : 'Sign Out'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Daily KPI Row — Clickable filters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px bg-border border border-border">
        {[
          { label: 'Queue Today', value: queuedCount, status: 'queued', dot: 'bg-sky-500' },
          { label: 'In Progress', value: inProgressCount, status: 'in_progress', dot: 'bg-amber-500' },
          { label: 'Done Today', value: completedToday, status: 'completed', dot: 'bg-emerald-500' },
          { label: 'Unpaid Today', value: `${pendingCount} (${pendingUnpaidAmount} ETB)`, status: 'pending', dot: 'bg-rose-500' },
          { label: 'Today Sales', value: `${todayRevenue.toLocaleString()} ETB`, status: 'all', dot: 'bg-primary' },
        ].map(({ label, value, status, dot }) => (
          <button
            key={status}
            type="button"
            onClick={() => {
              if (status !== 'all') {
                setQueueStatusFilter(queueStatusFilter === status ? 'all' : status);
                setViewTab('sessions');
              }
            }}
            aria-pressed={queueStatusFilter === status}
            className={`bg-card px-3.5 py-3 text-left transition-colors cursor-pointer hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary ${
              queueStatusFilter === status && status !== 'all' ? 'bg-muted ring-1 ring-inset ring-primary/30' : ''
            }`}
          >
            <p className="kpi-label mb-1.5 flex items-center gap-1.5">
              <span className={`size-1.5 rounded-full ${dot}`} />
              {label}
            </p>
            <p className="kpi-value text-xl">{value}</p>
          </button>
        ))}
      </div>

      {/* Top Collapsible Session Builder Panel */}
      {isBuilderOpen && (
        <Card className="border-primary/40 bg-card animate-in fade-in-50 duration-200">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="size-5 text-primary" />
                <h2 className="text-base font-medium text-foreground">Create New Session</h2>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => { setPickerMode('new'); setClientSearchQuery(''); setShowClientPicker(true); }} className="gap-1.5 text-[13px] font-medium border-primary/40 hover:bg-primary/10">
                  <UserPlus className="size-3.5 text-primary" />
                  + Register New Client
                </Button>
                <Button variant="ghost" size="icon" className="size-8" onClick={() => setIsBuilderOpen(false)}>
                  <X className="size-4" />
                </Button>
              </div>
            </div>

            {creationError && (
              <div className="flex items-center gap-2 text-sm font-semibold text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">
                <AlertCircle className="size-4 shrink-0" />
                <span>{creationError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Client Selection */}
              <div className="lg:col-span-4 space-y-2">
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">1. Select Client *</Label>

                {selectedCustomer ? (
                  <div className="rounded-md border border-primary/30 bg-primary/10 p-3 flex items-center justify-between gap-2 text-sm">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-foreground truncate">{selectedCustomer.name}</span>
                        {selectedCustomer.isVip && <Star className="size-3 text-amber-500 fill-amber-500 shrink-0" />}
                      </div>
                      <p className="text-[10px] text-muted-foreground font-mono truncate">{selectedCustomer.phone}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge variant="secondary" className="text-[10px] font-medium">{selectedCustomer.loyaltyPoints || 0} Pts</Badge>
                      <Button size="icon" variant="ghost" className="size-7" onClick={() => setSelectedCustomer(null)} title="Change client">
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium italic">
                    ← No client selected yet.
                  </p>
                )}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setPickerMode('list'); setClientSearchQuery(''); setShowClientPicker(true); }}
                  className="w-full gap-2 text-[13px] font-medium border-primary/30 hover:bg-primary/10"
                >
                  <Users className="size-4 text-primary" />
                  {selectedCustomer ? '⇄ Change Client' : 'Choose Client'}
                </Button>
              </div>

              {/* Service Selection */}
              <div className="lg:col-span-5 space-y-2">
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">2. Pick Services *</Label>
                <div className="flex gap-1 overflow-x-auto pb-1">
                  <Button size="xs" variant={serviceCategory === 'all' ? 'default' : 'outline'} onClick={() => setServiceCategory('all')} className="text-xs">
                    All
                  </Button>
                  {categories.map((cat) => (
                    <Button key={cat} size="xs" variant={serviceCategory === cat ? 'default' : 'outline'} onClick={() => setServiceCategory(cat)} className="text-xs">
                      {cat}
                    </Button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2 max-h-[180px] overflow-y-auto pr-1">
                  {filteredServices.map((srv) => (
                    <button
                      key={srv.id}
                      type="button"
                      onClick={() => addServiceToBuilder(srv)}
                      className="bg-background border border-border hover:border-primary hover:bg-primary/5 p-2 rounded-md text-left cursor-pointer transition-colors"
                    >
                      <div className="font-semibold text-sm text-foreground truncate">{srv.name}</div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-muted-foreground">{srv.durationMinutes}m</span>
                        <span className="font-medium text-sm text-foreground">{srv.priceEtb} ETB</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Selected Cart & Staff Assignment */}
              <div className="lg:col-span-3 space-y-2 border-t lg:border-t-0 lg:border-l lg:pl-4 pt-3 lg:pt-0">
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">3. Session Summary</Label>
                {selectedServices.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center italic">No services selected yet. Click services on the left.</p>
                ) : (
                  <div className="space-y-2">
                    <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                      {selectedServices.map((item, idx) => (
                        <div key={idx} className="rounded-md border border-border p-2 space-y-1 text-sm bg-muted/30">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-foreground truncate max-w-[140px]">{item.serviceName}</span>
                            <button type="button" onClick={() => removeServiceFromBuilder(idx)} className="text-destructive hover:opacity-80">
                              <X className="size-3.5" />
                            </button>
                          </div>
                          <div className="flex items-center justify-between gap-1">
                            <Select value={item.staffId} onValueChange={(v) => assignStaffToBuilder(idx, v)}>
                              <SelectTrigger className="h-6 text-[10px] py-0 px-2 flex-1">
                                <SelectValue placeholder="Staff" />
                              </SelectTrigger>
                              <SelectContent>
                                {staffForService(availableServices.find((s) => s.id === item.serviceId) as Service).map((st) => (
                                  <SelectItem key={st.id} value={st.id} className="text-sm">{st.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <span className="font-medium text-sm shrink-0">{item.priceEtb} ETB</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-t pt-2 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase font-medium">Total Net</p>
                        <p className="text-sm font-semibold text-foreground">{cartTotal} ETB</p>
                      </div>
                      <Button onClick={createSession} disabled={isCreating} className="gap-1.5 font-medium" size="sm">
                        <ShoppingCart className="size-4" />
                        {isCreating ? 'Creating...' : 'Confirm Queue'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* FULL WIDTH Main Tabs */}
      <div className="w-full">
        <Tabs value={viewTab} onValueChange={(v) => setViewTab(v as 'sessions' | 'board' | 'analytics' | 'inventory' | 'expenses')} className="w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
            <TabsList variant="line" className="h-9">
              <TabsTrigger value="sessions" className="gap-1.5 text-[13px] font-medium"><Clock className="size-4" />Today's Sessions ({todayBranchSessions.length})</TabsTrigger>
              <TabsTrigger value="board" className="gap-1.5 text-[13px] font-medium"><LayoutDashboard className="size-4" />Staff Queue Board</TabsTrigger>
              <TabsTrigger value="inventory" className="gap-1.5 text-[13px] font-medium"><Package className="size-4" />Inventory {lowStockCount > 0 && <Badge variant="destructive" className="text-[9px] px-1.5">{lowStockCount}</Badge>}</TabsTrigger>
              <TabsTrigger value="expenses" className="gap-1.5 text-[13px] font-medium"><ReceiptText className="size-4" />Expenses</TabsTrigger>
              <TabsTrigger value="analytics" className="gap-1.5 text-[13px] font-medium"><BarChart3 className="size-4" />Daily Analytics</TabsTrigger>
            </TabsList>

            {!isBuilderOpen && (
              <Button size="sm" onClick={() => setIsBuilderOpen(true)} className="gap-1 text-sm font-medium">
                <Plus className="size-3.5" />
                Add Session
              </Button>
            )}
          </div>

          {/* TAB 1: SESSIONS (FULL WIDTH) */}
          <TabsContent value="sessions" className="mt-4 space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="relative flex-1 w-full">
                    <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      placeholder="Search by client name, phone, queue number, service or staff..."
                      value={queueSearchQuery}
                      onChange={(e) => setQueueSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant={queueStatusFilter === 'pending' ? 'destructive' : 'outline'}
                      onClick={() => setQueueStatusFilter(queueStatusFilter === 'pending' ? 'all' : 'pending')}
                      className="gap-1.5 text-sm font-medium"
                    >
                      <DollarSign className="size-3.5" />
                      Unpaid Only ({pendingCount})
                    </Button>
                    {(queueStatusFilter !== 'all' || queueSearchQuery) && (
                      <Button size="sm" variant="ghost" onClick={() => { setQueueStatusFilter('all'); setQueueSearchQuery(''); }} className="text-sm">
                        Clear Filters
                      </Button>
                    )}
                  </div>
                </div>

                {filteredSessions.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground space-y-2">
                    <Clock className="size-8 mx-auto opacity-40" />
                    <p className="text-sm font-semibold">No sessions recorded for today matching your criteria.</p>
                    <Button variant="outline" size="sm" onClick={() => setIsBuilderOpen(true)}>
                      + Create First Today Session
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-md border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="px-4 py-3.5">Client Name & Phone</TableHead>
                          <TableHead className="px-4 py-3.5">Service(s) & Staff Assigned</TableHead>
                          <TableHead className="text-right px-4 py-3.5">Net Total</TableHead>
                          <TableHead className="w-24 px-4 py-3.5">Status</TableHead>
                          <TableHead className="w-24 px-4 py-3.5">Payment</TableHead>
                          <TableHead className="text-right w-36 px-4 py-3.5">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredSessions.map((session) => {
                          const isExpanded = expandedPaymentId === session.id;
                          const servicesText = session.services.map((s) => s.serviceName).join(', ');
                          const staffText = [...new Set(session.services.map((s) => s.staffName))].join(', ');
                          const isActive = session.status === 'queued' || session.status === 'in_progress';
                          const isPaidNow = session.isPaid || paidIds.includes(session.id);

                          return (
                            <React.Fragment key={session.id}>
                              <TableRow className={session.status === 'in_progress' ? 'bg-amber-500/5' : ''}>
                                <TableCell className="px-4 py-3.5">
                                  <div className="flex items-center gap-1.5">
                                    {customers.find((c) => c.id === session.customerId)?.isVip && (
                                      <Star className="size-3.5 text-amber-500 fill-amber-500 shrink-0" />
                                    )}
                                    <span className="font-medium text-sm text-foreground/90">{session.customerName}</span>
                                  </div>
                                  <div className="text-xs text-muted-foreground font-mono">{session.customerPhone}</div>
                                </TableCell>
                                <TableCell className="px-4 py-3.5 text-sm">
                                  <div className="font-medium text-foreground/90">{servicesText}</div>
                                  <div className="text-xs text-muted-foreground">Staff: {staffText}</div>
                                </TableCell>
                                <TableCell className="text-right px-4 py-3.5 font-medium text-sm text-foreground/90">
                                  {session.netTotalEtb.toLocaleString()} ETB
                                </TableCell>
                                <TableCell className="px-4 py-3.5">
                                  <Badge
                                    variant={
                                      session.status === 'in_progress' ? 'default' :
                                      session.status === 'completed' ? 'secondary' : 'outline'
                                    }
                                    className="text-[10px] uppercase font-medium"
                                  >
                                    {session.status.replace('_', ' ')}
                                  </Badge>
                                </TableCell>
                                <TableCell className="px-4 py-3.5">
                                  {isPaidNow ? (
                                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300">
                                      Paid ({session.paymentMethod || 'cash'})
                                    </Badge>
                                  ) : (
                                    <Badge variant="destructive" className="text-[10px]">Unpaid</Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-right px-4 py-3.5">
                                  <div className="flex items-center justify-end gap-1">
                                    {isActive && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-xs h-9 px-3 text-destructive border-destructive/30 hover:bg-destructive/10"
                                        onClick={() => onCancelSession(session.id)}
                                      >
                                        <Trash2 className="size-3.5 mr-1" />Remove
                                      </Button>
                                    )}
                                    {session.status === 'completed' && !isPaidNow && (
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        className="text-xs h-9 font-medium px-3"
                                        onClick={() => {
                                          setExpandedPaymentId(isExpanded ? null : session.id);
                                          setPaymentMethod('cash');
                                          setPaymentReference('');
                                        }}
                                      >
                                        <DollarSign className="size-3.5 mr-0.5" />Collect Pay
                                      </Button>
                                    )}
                                    {isPaidNow && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-xs h-9 px-3 font-semibold"
                                        onClick={() => setInvoiceToPrint(session)}
                                      >
                                        <Printer className="size-3.5 mr-1" />Receipt
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>

                              {/* Inline Payment Collection Dropdown */}
                              {isExpanded && (
                                <TableRow className="bg-muted/40">
                                  <TableCell colSpan={6} className="p-3">
                                    <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-3 rounded-md border border-primary/20 ">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-foreground">Select Payment Method:</span>
                                        <div className="flex gap-1">
                                          {([
                                            { id: 'cash' as PaymentMethod, label: 'Cash' },
                                            { id: 'telebirr' as PaymentMethod, label: 'Telebirr' },
                                            { id: 'cbe_birr' as PaymentMethod, label: 'CBE Birr' },
                                            { id: 'card' as PaymentMethod, label: 'Card' },
                                          ]).map((m) => (
                                            <Button
                                              key={m.id}
                                              size="sm"
                                              variant={paymentMethod === m.id ? 'default' : 'outline'}
                                              onClick={() => setPaymentMethod(m.id)}
                                              className="text-xs h-9 font-medium px-3"
                                            >
                                              {m.label}
                                            </Button>
                                          ))}
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2">
                                        <Input
                                          placeholder="Transaction Ref #"
                                          value={paymentReference}
                                          onChange={(e) => setPaymentReference(e.target.value)}
                                          className="h-9 w-40 text-sm"
                                        />
                                        <span className="font-semibold text-sm text-foreground">{session.netTotalEtb.toLocaleString()} ETB</span>
                                        <Button size="sm" className="h-9 text-xs font-medium px-3" onClick={() => handleCheckout(session.id)}>
                                          Confirm Payment
                                        </Button>
                                        <Button size="sm" variant="ghost" className="h-9 text-xs px-3" onClick={() => setExpandedPaymentId(null)}>
                                          Cancel
                                        </Button>
                                      </div>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
</React.Fragment>
                           );
                         })}
                       </TableBody>
                     </Table>
                   </div>
                 )}
          </TabsContent>

          {/* TAB 2: STAFF BOARD (FULL WIDTH) */}
          <TabsContent value="board" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {branchStaff.map((staff) => {
                const queue = getStaffQueue(staff.id, todayBranchSessions, customers);
                const serving = queue.find((q) => q.service.status === 'in_progress');

                return (
                  <Card key={staff.id} className="border-border  hover:border-primary/40 transition-all">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between border-b pb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-md bg-primary/10 text-primary flex items-center justify-center font-medium text-sm border border-primary/20">
                            {staff.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-sm text-foreground">{staff.name}</p>
                            <p className="text-[10px] text-muted-foreground capitalize">{staff.role}</p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-[11px] font-mono">
                          {queue.length} in queue
                        </Badge>
                      </div>

                      {serving ? (
                        <div className="rounded-md bg-amber-500/10 border border-amber-300 p-2.5 text-sm">
                          <p className="text-[10px] font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wider">Now Serving</p>
                          <p className="font-semibold text-foreground">{serving.session.customerName}</p>
                          <p className="text-[11px] text-muted-foreground">{serving.service.serviceName}</p>
                        </div>
                      ) : (
                        <div className="rounded-md bg-emerald-500/10 border border-emerald-300 p-2 text-sm text-center text-emerald-700 dark:text-emerald-400 font-medium">
                          Available for next client
                        </div>
                      )}

                      <div className="space-y-1.5 max-h-60 overflow-y-auto">
                        {queue.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4 italic">No pending client queue</p>
                        ) : (
                          queue.map((q) => (
                            <div
                              key={q.service.id}
                              className={`flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm ${
                                q.service.status === 'in_progress' ? 'border-amber-300 bg-amber-500/5 font-semibold' :
                                q.available ? 'border-emerald-300 bg-emerald-500/5' : 'border-border opacity-70'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-[10px] font-mono font-medium text-muted-foreground w-4">#{q.position}</span>
                                {q.isVip && <Star className="size-3 text-amber-500 fill-amber-500 shrink-0" />}
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">{q.session.customerName}</p>
                                  <p className="text-[10px] text-muted-foreground truncate">{q.service.serviceName}</p>
                                </div>
                              </div>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-6 text-muted-foreground hover:text-destructive shrink-0"
                                onClick={() => onCancelSession(q.session.id)}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* TAB: INVENTORY (FULL WIDTH) */}
          <TabsContent value="inventory" className="mt-4 space-y-4">
            {lowStockCount > 0 && (
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-300 rounded-md p-3">
                <AlertCircle className="size-4 shrink-0" />
                <span>{lowStockCount} item{lowStockCount > 1 ? 's' : ''} at or below reorder level — consider restocking below.</span>
              </div>
            )}

            <Card className=" border-border">
              <CardContent className="p-4 space-y-3">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="relative flex-1 w-full">
                    <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      placeholder="Search inventory by name or SKU..."
                      value={inventorySearch}
                      onChange={(e) => setInventorySearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary" className="text-[11px] font-mono">{branchInventory.length} items</Badge>
                    <Button size="sm" onClick={openAddInventory} className="gap-1.5 text-sm font-medium">
                      <Plus className="size-3.5" /> Add Item
                    </Button>
                  </div>
                </div>

                {filteredInventory.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground space-y-2">
                    <Package className="size-8 mx-auto opacity-40" />
                    <p className="text-sm font-semibold">No inventory items found for this branch.</p>
                    <Button variant="outline" size="sm" onClick={openAddInventory}>+ Add First Item</Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-md border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="">Item & SKU</TableHead>
                          <TableHead className="text-center">Unit</TableHead>
                          <TableHead className="text-center">In Stock</TableHead>
                          <TableHead className="text-center">Reorder Level</TableHead>
                          <TableHead className="text-right">Unit Cost</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                          <TableHead className="text-right w-44">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredInventory.map((item) => {
                          const isLow = item.currentStock <= item.reorderLevel;
                          const isOut = item.currentStock <= 0;
                          return (
                            <TableRow key={item.id} className={isLow ? 'bg-amber-500/5' : ''}>
                              <TableCell>
                                <p className="font-medium text-sm text-foreground">{item.name}</p>
                                <p className="text-[10px] text-muted-foreground font-mono">{item.sku}</p>
                              </TableCell>
                              <TableCell className="text-center font-mono text-sm">{item.unit}</TableCell>
                              <TableCell className="text-center">
                                <span className={`font-mono font-semibold text-sm ${isOut ? 'text-destructive' : isLow ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>
                                  {item.currentStock}
                                </span>
                              </TableCell>
                              <TableCell className="text-center font-mono text-sm text-muted-foreground">{item.reorderLevel}</TableCell>
                              <TableCell className="text-right font-mono font-medium text-sm">{item.unitCostEtb.toLocaleString()} ETB</TableCell>
                              <TableCell className="text-center">
                                <Badge variant={isOut ? 'destructive' : isLow ? 'secondary' : 'outline'} className="text-[10px]">
                                  {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center justify-end gap-1">
                                  <Button size="sm" variant="outline" className="h-9 gap-1 text-xs font-medium" onClick={() => { setAdjustItem(item); setAdjustQty(0); setAdjustMode('restock'); }}>
                                    <Plus className="size-3" /> Restock
                                  </Button>
                                  <Button size="sm" variant="outline" className="h-9 gap-1 text-xs font-medium text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => { setAdjustItem(item); setAdjustQty(1); setAdjustMode('use'); }} disabled={item.currentStock <= 0}>
                                    <Minus className="size-3" /> Use
                                  </Button>
                                  <Button size="icon" variant="ghost" className="size-8" title="Edit item" onClick={() => openEditInventory(item)}>
                                    <Pencil className="size-3.5" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="size-8 text-muted-foreground hover:text-destructive" title="Delete item" onClick={() => setConfirmDeleteItem(item)}>
                                    <Trash2 className="size-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: EXPENSES (FULL WIDTH) */}
          <TabsContent value="expenses" className="mt-4 space-y-4">
            {expenseSuccess && (
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-300 rounded-md p-3">
                <CheckCircle2 className="size-4 shrink-0" />
                <span>{expenseSuccess}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Card className="border-border ">
                <CardContent className="p-4 space-y-1">
                  <span className="kpi-label">Daily Expense Limit</span>
                  <p className="kpi-value">{expenseLimit > 0 ? `${expenseLimit.toLocaleString()} ETB` : 'No Limit Set'}</p>
                  <p className="text-[11px] text-muted-foreground">Set by salon admin in Branch settings</p>
                </CardContent>
              </Card>
              <Card className="border-border ">
                <CardContent className="p-4 space-y-1">
                  <span className="kpi-label">Spent Today</span>
                  <p className="kpi-value">{todayExpenseTotal.toLocaleString()} ETB</p>
                  <p className="text-[11px] text-muted-foreground">{todayExpenses.length} expense record{todayExpenses.length === 1 ? '' : 's'} today</p>
                </CardContent>
              </Card>
              <Card className="border-border ">
                <CardContent className="p-4 space-y-1">
                  <span className="kpi-label">Remaining Today</span>
                  <p className={`kpi-value ${expenseAtLimit ? 'text-destructive' : ''}`}>
                    {expenseRemaining === null ? '—' : `${expenseRemaining.toLocaleString()} ETB`}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{expenseAtLimit ? 'Daily limit reached — contact admin for more.' : expenseRemaining !== null && expensePct >= 80 ? 'Approaching the daily limit.' : 'Clear to record expenses.'}</p>
                </CardContent>
              </Card>
            </div>

            {expenseLimit > 0 && (
              <Card className="border-border ">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">Budget usage today</span>
                    <span className={`font-mono font-medium ${expenseAtLimit ? 'text-destructive' : 'text-foreground'}`}>{expensePct}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${expenseAtLimit ? 'bg-destructive' : expensePct >= 80 ? 'bg-amber-500' : 'bg-primary'}`}
                      style={{ width: `${expensePct}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="border-border ">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-medium text-foreground">Today's Expense Records</h3>
                    <p className="text-[11px] text-muted-foreground">Recorded at the front desk ({branch?.name || 'this branch'})</p>
                  </div>
                  <Button size="sm" onClick={() => { setExpenseError(null); setShowExpenseModal(true); }} className="gap-1.5 text-sm font-medium">
                    <Plus className="size-3.5" /> Record Expense
                  </Button>
                </div>

                {todayExpenses.length === 0 ? (
                  <div className="py-10 text-center text-muted-foreground space-y-2">
                    <ReceiptText className="size-8 mx-auto opacity-40" />
                    <p className="text-sm font-semibold">No expenses recorded today yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-md border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="">Description</TableHead>
                          <TableHead className="">Category</TableHead>
                          <TableHead className="text-center">Method</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="">Recorded By</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {todayExpenses.map((exp) => (
                          <TableRow key={exp.id}>
                            <TableCell className="font-semibold text-sm">{exp.description}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-[10px] capitalize">{exp.category.replace('_', ' ')}</Badge>
                            </TableCell>
                            <TableCell className="text-center text-sm capitalize font-mono">{exp.paymentMethod}</TableCell>
                            <TableCell className="text-right font-mono font-semibold text-sm text-destructive">{exp.amountEtb.toLocaleString()} ETB</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{exp.recordedBy || '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: DAILY ANALYTICS (FULL WIDTH) */}
          <TabsContent value="analytics" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-border ">
                <CardContent className="p-4 space-y-1">
                  <span className="kpi-label">Gross Daily Sales</span>
                  <p className="kpi-value">{todayRevenue.toLocaleString()} ETB</p>
                  <p className="text-[11px] text-muted-foreground">Collected from completed payments today</p>
                </CardContent>
              </Card>

              <Card className="border-border ">
                <CardContent className="p-4 space-y-1">
                  <span className="kpi-label">Completed Sessions Today</span>
                  <p className="kpi-value">{completedToday}</p>
                  <p className="text-[11px] text-muted-foreground">Total client visit checkouts completed</p>
                </CardContent>
              </Card>

              <Card className="border-border ">
                <CardContent className="p-4 space-y-1">
                  <span className="kpi-label">Unpaid Receivable Today</span>
                  <p className="kpi-value text-destructive">{pendingUnpaidAmount.toLocaleString()} ETB</p>
                  <p className="text-[11px] text-muted-foreground">{pendingCount} completed sessions awaiting payment</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Hourly Sales Chart */}
              <Card className="lg:col-span-8 border-border ">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-foreground">Hourly Sales Revenue Today (ETB)</h3>
                    <Badge variant="outline" className="text-[10px]">Today Only</Badge>
                  </div>
                  <div className="h-56 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={hourlyRevenueData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="hour" fontSize={10} tickLine={false} />
                        <YAxis fontSize={10} tickLine={false} />
                        <Tooltip formatter={(value: any) => [`${Number(value).toLocaleString()} ETB`, 'Revenue']} />
                        <Bar dataKey="revenue" fill="#18181b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Methods Distribution */}
              <Card className="lg:col-span-4 border-border ">
                <CardContent className="p-4 space-y-3">
                  <h3 className="text-sm font-medium text-foreground">Today's Payment Methods</h3>
                  {paymentMethodPieData.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-10">No payments recorded today yet</p>
                  ) : (
                    <div className="h-56 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={paymentMethodPieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={70}
                            paddingAngle={3}
                          >
                            {paymentMethodPieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(val: any) => [`${Number(val).toLocaleString()} ETB`, 'Amount']} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Today's Staff Performance Table */}
            <Card className="border-border ">
              <CardContent className="p-4 space-y-3">
                <h3 className="text-sm font-medium text-foreground">Today's Staff Performance & Commission</h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="">Staff Member</TableHead>
                        <TableHead className="">Role</TableHead>
                        <TableHead className="text-center">Services Rendered Today</TableHead>
                        <TableHead className="text-right">Revenue Generated Today</TableHead>
                        <TableHead className="text-right">Commission Accrued</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {todayStaffPerformance.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">
                            No staff activity recorded today yet
                          </TableCell>
                        </TableRow>
                      ) : (
                        todayStaffPerformance.map((st, i) => (
                          <TableRow key={i}>
                            <TableCell className="">{st.name}</TableCell>
                            <TableCell className="text-sm capitalize text-muted-foreground">{st.role}</TableCell>
                            <TableCell className="text-center font-mono font-medium text-sm">{st.count}</TableCell>
                            <TableCell className="text-right font-mono font-medium text-sm">{st.revenue.toLocaleString()} ETB</TableCell>
                            <TableCell className="text-right font-mono font-medium text-sm text-primary">{st.commission.toLocaleString()} ETB</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Adjust Stock Modal */}
      <Dialog open={!!adjustItem} onOpenChange={(o) => !o && setAdjustItem(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-medium">
              {adjustMode === 'use' ? <Minus className="size-5 text-destructive" /> : <Plus className="size-5 text-primary" />}
              {adjustMode === 'use' ? 'Use Stock:' : 'Restock:'} {adjustItem?.name}
            </DialogTitle>
            <DialogDescription className="text-sm">
              Current stock: <span className="font-mono font-medium text-foreground">{adjustItem?.currentStock} {adjustItem?.unit}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex gap-1.5">
              <Button type="button" size="sm" variant={adjustMode === 'restock' ? 'default' : 'outline'} className="flex-1 text-xs" onClick={() => { setAdjustMode('restock'); setAdjustQty(0); }}>
                <Plus className="size-3" /> Add Stock
              </Button>
              <Button type="button" size="sm" variant={adjustMode === 'use' ? 'destructive' : 'outline'} className="flex-1 text-xs" onClick={() => { setAdjustMode('use'); setAdjustQty(1); }} disabled={!adjustItem || adjustItem.currentStock <= 0}>
                <Minus className="size-3" /> Use Stock
              </Button>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                {adjustMode === 'use' ? 'Quantity Used' : 'Quantity to Add'}
              </Label>
              <Input
                type="number"
                min="1"
                max={adjustMode === 'use' ? adjustItem?.currentStock : undefined}
                value={adjustQty || ''}
                onChange={(e) => setAdjustQty(Number(e.target.value))}
                placeholder="e.g. 50"
                className="h-11 text-sm font-mono"
                autoFocus
              />
              {adjustMode === 'use' && adjustQty > (adjustItem?.currentStock || 0) && (
                <p className="text-xs text-destructive">Exceeds current stock ({adjustItem?.currentStock} {adjustItem?.unit}).</p>
              )}
            </div>
            <div className="flex gap-2">
              {[1, 2, 5, 10].map((q) => (
                <Button key={q} size="xs" variant={adjustQty === q ? 'default' : 'outline'} className="flex-1" onClick={() => setAdjustQty(q)}>
                  {adjustMode === 'use' ? q : `+${q}`}
                </Button>
              ))}
            </div>
            <DialogFooter className="pt-1">
              <Button type="button" variant="outline" onClick={() => setAdjustItem(null)} className="text-sm">Cancel</Button>
              <Button
                type="button"
                variant={adjustMode === 'use' ? 'destructive' : 'default'}
                onClick={handleAdjustStock}
                disabled={!adjustQty || adjustQty <= 0 || (adjustMode === 'use' && adjustQty > (adjustItem?.currentStock || 0))}
                className="text-sm font-medium gap-1.5"
              >
                {adjustMode === 'use' ? <Minus className="size-3.5" /> : <Plus className="size-3.5" />}
                {adjustMode === 'use' ? `Deduct ${adjustQty || ''} ${adjustItem?.unit || ''}` : 'Add to Stock'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Inventory Item Modal */}
      <Dialog open={showInventoryModal} onOpenChange={(o) => !o && setShowInventoryModal(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-medium">
              <Package className="size-5 text-primary" />
              {invEditing ? 'Edit Inventory Item' : 'Add Inventory Item'}
            </DialogTitle>
            <DialogDescription className="text-sm">
              Items managed here are stocked for {branch?.name || 'this branch'}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={invEditing ? handleUpdateInventorySubmit : handleAddInventorySubmit} className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="invName" className="text-sm font-medium">Item Name *</Label>
              <Input id="invName" required placeholder="e.g. Hair Clipper Oil" value={invName} onChange={(e) => setInvName(e.target.value)} className="" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="invSku" className="text-sm font-medium">SKU</Label>
                <Input id="invSku" placeholder="auto-generated" value={invSku} onChange={(e) => setInvSku(e.target.value)} className="font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="invUnit" className="text-sm font-medium">Unit</Label>
                <Input id="invUnit" placeholder="e.g. bottle, piece, pack" value={invUnit} onChange={(e) => setInvUnit(e.target.value)} className="" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="invStock" className="text-sm font-medium">Stock</Label>
                <Input id="invStock" type="number" min="0" value={invStock} onChange={(e) => setInvStock(Number(e.target.value))} className="font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="invReorder" className="text-sm font-medium">Reorder At</Label>
                <Input id="invReorder" type="number" min="0" value={invReorder} onChange={(e) => setInvReorder(Number(e.target.value))} className="font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="invCost" className="text-sm font-medium">Unit Cost (ETB)</Label>
                <Input id="invCost" type="number" min="0" value={invCost} onChange={(e) => setInvCost(Number(e.target.value))} className="font-mono" />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setShowInventoryModal(false)} className="text-sm">Cancel</Button>
              <Button type="submit" className="text-sm font-medium">{invEditing ? 'Save Changes' : 'Add Item'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Record Expense Modal */}
      <Dialog open={showExpenseModal} onOpenChange={(o) => !o && setShowExpenseModal(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-medium">
              <ReceiptText className="size-5 text-primary" />
              Record Expense
            </DialogTitle>
            <DialogDescription className="text-sm">
              {expenseLimit > 0
                ? `Daily limit ${expenseLimit.toLocaleString()} ETB — ${expenseRemaining?.toLocaleString()} ETB remaining today.`
                : 'No daily limit is currently set by the admin.'}
            </DialogDescription>
          </DialogHeader>

          {expenseError && (
            <div className="flex items-center gap-2 text-sm font-semibold text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">
              <AlertCircle className="size-4 shrink-0" />
              <span>{expenseError}</span>
            </div>
          )}

          <form onSubmit={handleRecordExpense} className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="expDesc" className="text-sm font-medium">Description *</Label>
              <Input id="expDesc" required placeholder="e.g. Bought towels and disinfectant" value={expDescription} onChange={(e) => setExpDescription(e.target.value)} className="" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="expCat" className="text-sm font-medium">Category *</Label>
                <select
                  id="expCat"
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value as ExpenseRecord['category'])}
                  className="w-full h-8 bg-muted border border-border text-foreground rounded-md px-3 text-sm font-medium outline-none focus:border-primary"
                >
                  <option value="inventory_purchase">Inventory Purchase</option>
                  <option value="utilities">Utilities</option>
                  <option value="rent">Rent</option>
                  <option value="salary">Salary Advance</option>
                  <option value="marketing">Marketing</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="expAmount" className="text-sm font-medium">Amount (ETB) *</Label>
                <Input id="expAmount" required type="number" min="1" placeholder="0" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} className="font-mono" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Payment Method</Label>
              <div className="flex gap-1.5 flex-wrap">
                {(['cash', 'telebirr', 'cbe_birr', 'card'] as PaymentMethod[]).map((m) => (
                  <Button
                    key={m}
                    type="button"
                    size="xs"
                    variant={expMethod === m ? 'default' : 'outline'}
                    className="text-xs capitalize"
                    onClick={() => setExpMethod(m)}
                  >
                    {m === 'cbe_birr' ? 'CBE Birr' : m === 'telebirr' ? 'Telebirr' : m}
                  </Button>
                ))}
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setShowExpenseModal(false)} className="text-sm">Cancel</Button>
              <Button type="submit" className="text-sm font-medium gap-1.5">
                <Wallet className="size-3.5" /> Save Expense
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Inventory Confirm */}
      <Dialog open={!!confirmDeleteItem} onOpenChange={(o) => !o && setConfirmDeleteItem(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-medium">Delete "{confirmDeleteItem?.name}"?</DialogTitle>
            <DialogDescription className="text-sm">
              This permanently removes the inventory item from {branch?.name || 'this branch'}. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmDeleteItem(null)} className="text-sm">Cancel</Button>
            <Button
              type="button"
              variant="destructive"
              className="text-sm font-medium gap-1.5"
              onClick={() => {
                if (confirmDeleteItem) onDeleteInventoryItem?.(confirmDeleteItem.id);
                onRefresh?.();
                setConfirmDeleteItem(null);
              }}
            >
              <Trash2 className="size-3.5" /> Delete Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Client Picker Modal: Search + Full-Width List + Inline New Client Form */}
      <Dialog open={showClientPicker} onOpenChange={(o) => !o && setShowClientPicker(false)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-medium">
              {pickerMode === 'list' ? <Users className="size-5 text-primary" /> : <UserPlus className="size-5 text-primary" />}
              {pickerMode === 'list' ? 'Select Client' : 'Register New Client'}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {pickerMode === 'list'
                ? 'Search registered clients and pick one for today\'s session.'
                : 'Add client details to instantly queue them for today\'s services.'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant={pickerMode === 'list' ? 'default' : 'outline'}
              onClick={() => setPickerMode('list')}
              className="gap-1.5 text-sm font-medium"
            >
              <Users className="size-3.5" /> Registered Clients ({customers.length})
            </Button>
            <Button
              size="sm"
              variant={pickerMode === 'new' ? 'default' : 'outline'}
              onClick={() => setPickerMode('new')}
              className="gap-1.5 text-sm font-medium"
            >
              <UserPlus className="size-3.5" /> + New Client
            </Button>
          </div>

          {pickerMode === 'list' ? (
            <div className="space-y-2">
              <div className="relative">
                <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  autoFocus
                  placeholder="Type mobile number or full name to search clients..."
                  value={clientSearchQuery}
                  onChange={(e) => setClientSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
                {filteredPickerCustomers.length === 0 ? (
                  <div className="py-10 text-center text-muted-foreground space-y-2">
                    <Users className="size-8 mx-auto opacity-40" />
                    <p className="text-sm font-semibold">No registered clients match "{clientSearchQuery}".</p>
                    <Button size="sm" variant="outline" className="text-sm font-medium gap-1.5" onClick={() => setPickerMode('new')}>
                      <UserPlus className="size-3.5" /> Register as New Client
                    </Button>
                  </div>
                ) : (
                  filteredPickerCustomers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setCreationError(null);
                        setSelectedCustomer(c);
                        setShowClientPicker(false);
                        setClientSearchQuery('');
                      }}
                      className={`w-full flex items-center gap-3 rounded-md border p-2.5 text-left transition-all cursor-pointer hover:border-primary/60 hover:bg-primary/5 ${
                        selectedCustomer?.id === c.id ? 'border-primary bg-primary/10' : 'border-border bg-card'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 text-primary font-medium flex items-center justify-center text-sm shrink-0">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-sm text-foreground truncate">{c.name}</span>
                          {c.isVip && <Star className="size-3 text-amber-500 fill-amber-500 shrink-0" />}
                        </div>
                        <p className="text-[10px] text-muted-foreground font-mono truncate">
                          {c.phone}{c.email ? ` • ${c.email}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant="secondary" className="text-[10px] font-mono">{c.totalVisits || 0} visits</Badge>
                        <Badge variant={c.isVip ? 'secondary' : 'outline'} className="text-[10px] font-mono">{c.loyaltyPoints || 0} Pts</Badge>
                        {selectedCustomer?.id === c.id && <CheckCircle2 className="size-4 text-primary shrink-0" />}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={handleCreateNewCustomer} className="space-y-4 py-1">
              <div className="space-y-1.5">
                <Label htmlFor="rcpName" className="text-sm font-medium">Full Name *</Label>
                <div className="relative">
                  <UserPlus className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    id="rcpName"
                    required
                    autoFocus
                    placeholder="e.g. Almaz Bekele"
                    value={custName}
                    onChange={(e) => setCustName(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rcpPhone" className="text-sm font-medium">Mobile Phone Number *</Label>
                <div className="relative">
                  <Phone className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    id="rcpPhone"
                    required
                    placeholder="+251 91 123 4567"
                    value={custPhone}
                    onChange={(e) => setCustPhone(e.target.value)}
                    className="pl-9 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rcpEmail" className="text-sm font-medium">Email Address (Optional)</Label>
                <div className="relative">
                  <Mail className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    id="rcpEmail"
                    type="email"
                    placeholder="client@gmail.com"
                    value={custEmail}
                    onChange={(e) => setCustEmail(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rcpNotes" className="text-sm font-medium">Preferences & Notes (Optional)</Label>
                <Input
                  id="rcpNotes"
                  placeholder="e.g. Preferred hair stylist, sensitive scalp..."
                  value={custNotes}
                  onChange={(e) => setCustNotes(e.target.value)}
                  className=""
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="custIsVip"
                  checked={custIsVip}
                  onChange={(e) => setCustIsVip(e.target.checked)}
                  className="rounded border-border size-4 accent-primary"
                />
                <Label htmlFor="custIsVip" className="text-sm font-medium cursor-pointer flex items-center gap-1">
                  <Star className="size-3.5 text-amber-500 fill-amber-500" /> Mark as VIP Priority Client
                </Label>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setPickerMode('list')} className="text-sm">
                  Back to List
                </Button>
                <Button type="submit" className="text-sm font-medium">
                  Register & Select Client
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Print Invoice Overlay */}
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
