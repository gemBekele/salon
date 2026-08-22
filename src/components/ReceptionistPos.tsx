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
  FileText,
  ChevronDown,
  ChevronUp,
  Package,
  ReceiptText,
  Wallet,
  Pencil,
  Minus,
  LogOut,
  Banknote,
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
import { apiFetch } from '../lib/api';
import { PrintableInvoice } from './PrintableInvoice';
import { PaymentCheckoutModal, PaymentTarget } from './PaymentCheckoutModal';
import { RetailTab } from './RetailTab';
import { groupStaffQueue, suggestStaff } from '../lib/queue';
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
  toSelectItems,
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
  const [custPhone, setCustPhone] = useState('+251 ');
  const [custEmail, setCustEmail] = useState('');
  const [custNotes, setCustNotes] = useState('');
  const [custIsVip, setCustIsVip] = useState(false);

  const [serviceCategory, setServiceCategory] = useState<string>('all');
  const [invoiceToPrint, setInvoiceToPrint] = useState<VisitSession | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [queueSearchQuery, setQueueSearchQuery] = useState('');
  const [queueStatusFilter, setQueueStatusFilter] = useState<string>('all');
  const [paidIds, setPaidIds] = useState<string[]>([]);
  const [payModal, setPayModal] = useState<VisitSession | null>(null);
  const [reassignFor, setReassignFor] = useState<VisitSession | null>(null);
  const [reassignStaffId, setReassignStaffId] = useState('');
  const [reassignMsg, setReassignMsg] = useState('');
  const [reassignBusy, setReassignBusy] = useState(false);
  const [viewTab, setViewTab] = useState<'sessions' | 'board' | 'analytics' | 'inventory' | 'expenses' | 'retail'>('sessions');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createStep, setCreateStep] = useState<1 | 2>(1);
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

  // Inventory record editing/deletion is manager/admin-only (server enforces mgmtOnly).
  // Reception may still restock/use stock via the adjust-stock endpoint.
  const canManageInventory = ['super_admin', 'owner', 'manager'].includes(currentUser?.role || '');

  // ---- Today's payment summary (cash / bank / discounts / outstanding) ----
  interface PaymentSummary {
    cashEtb: number;
    bankEtb: number;
    totalCollectedEtb: number;
    discountsEtb: number;
    outstandingVisitsEtb: number;
    outstandingVisitCount: number;
    outstandingRetailEtb: number;
    outstandingTotalEtb: number;
  }
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary | null>(null);
  useEffect(() => {
    if (!activeCompanyId) return;
    let cancelled = false;
    const params = new URLSearchParams({ companyId: activeCompanyId });
    if (branchId) params.set('branchId', branchId);
    apiFetch(`/api/reports/payment-summary?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (!cancelled && data) setPaymentSummary(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [activeCompanyId, branchId, lastUpdatedAt]);

  // ---- Daily Filtered Data ----
  const branchStaff = useMemo(
    () => staffList.filter((s) => (branchId ? s.branchId === branchId : true) && !['receptionist', 'reception'].includes(s.role)),
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

      // Completed sessions awaiting payment must always surface for "Collect Pay",
      // even if they were finished on a previous day and never got a completed_at.
      if (s.status === 'completed' && !s.isPaid) return true;

      // Show other completed or cancelled sessions if they match today or user toggled showAllDates
      return showAllDates || isToday(s.completedAt || s.startedAt || s.createdAt);
    });
  }, [visitSessions, company, activeCompanyId, branchId, showAllDates]);

  const filteredSessions = useMemo(() => {
    let list = todayBranchSessions;
    if (queueStatusFilter === 'pending') {
      list = list.filter((s) => s.status === 'completed' && !s.isPaid && !paidIds.includes(s.id));
    } else if (queueStatusFilter === 'done') {
      list = list.filter((s) => s.isPaid || paidIds.includes(s.id));
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
    const isPendingPaid = (s: VisitSession) => s.status === 'completed' && !s.isPaid && !paidIds.includes(s.id);
    return [...list].sort((a, b) => {
      const aPend = isPendingPaid(a) ? 1 : 0;
      const bPend = isPendingPaid(b) ? 1 : 0;
      if (aPend !== bPend) return bPend - aPend;
      const aTime = new Date(a.startedAt || a.createdAt || 0).getTime();
      const bTime = new Date(b.startedAt || b.createdAt || 0).getTime();
      return bTime - aTime;
    });
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
  const paidCount = todayBranchSessions.filter((s) => s.isPaid || paidIds.includes(s.id)).length;
  const cancelledCount = todayBranchSessions.filter((s) => s.status === 'cancelled').length;

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
      setShowCreateModal(false);
      setCreateStep(1);
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
    if (!custName || custPhone.trim().length <= 4) return;
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
      setCustName(''); setCustPhone('+251 '); setCustEmail(''); setCustNotes(''); setCustIsVip(false);
      setShowCreateModal(true);
      setCreateStep(1);
    } catch (err: any) {
      alert(err?.message || 'Failed to create customer');
    }
  };

  const handleReassign = async (session: VisitSession) => {
    if (!reassignStaffId) return;
    const staff = staffList.find((s) => s.id === reassignStaffId);
    setReassignBusy(true);
    setReassignMsg('');
    try {
      const res = await apiFetch('/api/visit-sessions/staff', {
        method: 'PATCH',
        body: JSON.stringify({
          id: session.id,
          staffId: staff?.id,
          staffName: staff?.name,
          companyId: session.companyId,
        }),
      });
      if (!res.ok) {
        setReassignMsg((await res.json().catch(() => ({})))?.error || 'Reassign failed on this session.');
      } else {
        setReassignFor(null);
        setReassignStaffId('');
        await onRefresh?.();
      }
    } catch {
      setReassignMsg('Reassign failed — try again.');
    } finally {
      setReassignBusy(false);
    }
  };

  const staffForService = (service: Service) => {
    return branchStaff.filter((s) => s.businessUnitId === service.businessUnitId);
  };

  const toPaymentTarget = (s: VisitSession): PaymentTarget => ({
    type: 'visit',
    id: s.id,
    customerName: s.customerName,
    customerPhone: s.customerPhone,
    ticketLabel: s.queueNumber,
    lines: s.services.map((sv) => ({ label: sv.serviceName, subtitle: sv.staffName, amountEtb: sv.priceEtb })),
    subtotalEtb: s.subtotalEtb,
    taxEtb: s.taxEtb ?? 0,
    discountEtb: s.discountEtb ?? 0,
  });

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
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-semibold tracking-tight text-foreground">Front Desk</h1>
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

          <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
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
            {onLogout && (
              <Button
                onClick={onLogout}
                variant="outline"
                className="gap-2 font-semibold text-sm text-destructive border-destructive/30 hover:bg-destructive/10"
                title="Sign out of the reception desk"
              >
                <LogOut className="size-4" />
                Sign Out{currentUser?.name && <span className="hidden md:inline">&nbsp;({currentUser.name})</span>}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Daily KPI Row — Clickable filters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px bg-border border border-border">
        {[
          { label: 'Waiting', value: queuedCount, status: 'queued', dot: 'bg-sky-500' },
          { label: 'Being Served', value: inProgressCount, status: 'in_progress', dot: 'bg-amber-500' },
          { label: 'Finished', value: completedToday, status: 'completed', dot: 'bg-emerald-500' },
          { label: 'Not Paid Yet', value: `${pendingCount} (${pendingUnpaidAmount} ETB)`, status: 'pending', dot: 'bg-rose-500' },
          { label: 'Money In Today', value: `${todayRevenue.toLocaleString()} ETB`, status: 'all', dot: 'bg-primary' },
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

      {/* FULL WIDTH Main Tabs */}
      <div className="w-full">
        <Tabs value={viewTab} onValueChange={(v) => setViewTab(v as 'sessions' | 'board' | 'analytics' | 'inventory' | 'expenses')} className="w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
            <TabsList variant="line" className="h-9">
              <TabsTrigger value="sessions" className="gap-1.5 text-[13px] font-medium"><Clock className="size-4" />Customers ({todayBranchSessions.length})</TabsTrigger>
              <TabsTrigger value="board" className="gap-1.5 text-[13px] font-medium"><LayoutDashboard className="size-4" />Staff Board</TabsTrigger>
              <TabsTrigger value="inventory" className="gap-1.5 text-[13px] font-medium"><Package className="size-4" />Stock {lowStockCount > 0 && <Badge variant="destructive" className="text-[9px] px-1.5">{lowStockCount}</Badge>}</TabsTrigger>
              <TabsTrigger value="retail" className="gap-1.5 text-[13px] font-medium"><ShoppingCart className="size-4" />Shop Sales</TabsTrigger>
              <TabsTrigger value="expenses" className="gap-1.5 text-[13px] font-medium"><ReceiptText className="size-4" />Money Out</TabsTrigger>
              <TabsTrigger value="analytics" className="gap-1.5 text-[13px] font-medium"><BarChart3 className="size-4" />Daily Report</TabsTrigger>
            </TabsList>

            <Button size="sm" onClick={() => { setShowCreateModal(true); setCreateStep(1); setCreationError(null); }} className="gap-1 text-sm font-medium">
              <Plus className="size-3.5" />
              Add Customer
            </Button>
          </div>

          {/* TAB 1: SESSIONS (FULL WIDTH) */}
          <TabsContent value="sessions" className="mt-4 space-y-4">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    placeholder="Search by client name, phone, queue number, service or staff..."
                    value={queueSearchQuery}
                    onChange={(e) => setQueueSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {([
                  { key: 'all', label: 'All', count: todayBranchSessions.length },
                  { key: 'queued', label: 'On Queue', count: queuedCount },
                  { key: 'in_progress', label: 'In Progress', count: inProgressCount },
                  { key: 'pending', label: 'Unpaid', count: pendingCount },
                  { key: 'done', label: 'Done', count: paidCount },
                  { key: 'cancelled', label: 'Cancelled', count: cancelledCount },
                ] as { key: string; label: string; count: number }[]).map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setQueueStatusFilter(f.key)}
                    aria-pressed={queueStatusFilter === f.key}
                    className={`px-4 py-2 rounded-full text-sm font-bold border-2 transition-colors cursor-pointer ${
                      queueStatusFilter === f.key
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : 'bg-card text-foreground border-border hover:border-primary/50 hover:bg-muted'
                    }`}
                  >
                    {f.label} <span className="opacity-80 font-semibold">({f.count})</span>
                  </button>
                ))}
                {queueSearchQuery && (
                  <button type="button" onClick={() => setQueueSearchQuery('')} className="px-3 py-2 rounded-full text-sm font-bold text-destructive bg-destructive/10 border-2 border-destructive/30 hover:bg-destructive/20 transition-colors cursor-pointer">
                    ✕ Clear Search
                  </button>
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] text-muted-foreground font-medium">{filteredSessions.length} session{filteredSessions.length === 1 ? '' : 's'} shown</p>
                <Button size="sm" variant="outline" onClick={() => { setQueueStatusFilter('all'); setQueueSearchQuery(''); }} className="text-sm">
                  Reset Filters
                </Button>
              </div>
            </div>

                {filteredSessions.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground space-y-2">
                    <Clock className="size-8 mx-auto opacity-40" />
                    <p className="text-sm font-semibold">No sessions recorded for today matching your criteria.</p>
                    <Button variant="outline" size="sm" onClick={() => { setShowCreateModal(true); setCreateStep(1); setCreationError(null); }}>
                    + Add First Customer
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
                                      <>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="text-xs h-9 px-3"
                                          onClick={() => {
                                            setReassignFor(reassignFor?.id === session.id ? null : session);
                                            setReassignStaffId('');
                                            setReassignMsg('');
                                          }}
                                        >
                                          <Users className="size-3.5 mr-1" />Reassign
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="text-xs h-9 px-3 text-destructive border-destructive/30 hover:bg-destructive/10"
                                          onClick={() => onCancelSession(session.id)}
                                        >
                                          <Trash2 className="size-3.5 mr-1" />Remove
                                        </Button>
                                      </>
                                    )}
                                    {session.status === 'completed' && !isPaidNow && (
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        className="text-xs h-9 font-medium px-3"
                                        onClick={() => setPayModal(session)}
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

                              {/* Inline Staff Reassign */}
                              {reassignFor?.id === session.id && (
                                <TableRow className="bg-muted/40">
                                  <TableCell colSpan={6} className="p-3">
                                    <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-3 rounded-md border border-primary/20">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-foreground">Reassign all pending services to:</span>
                                        <Select value={reassignStaffId} onValueChange={setReassignStaffId} items={toSelectItems(branchStaff.map((st) => ({ value: st.id, label: `${st.name} — ${st.role}` })))}>
                                          <SelectTrigger className="w-52 h-9 text-sm"><SelectValue placeholder="Select staff member" /></SelectTrigger>
                                          <SelectContent>
                                            {branchStaff.map((st) => (
                                              <SelectItem key={st.id} value={st.id}>{st.name} — {st.role}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      {reassignMsg && (
                                        <span className="text-xs text-destructive font-medium">{reassignMsg}</span>
                                      )}
                                      <div className="flex items-center gap-2">
                                        <Button
                                          size="sm"
                                          className="h-9 text-xs font-medium px-3"
                                          disabled={!reassignStaffId || reassignBusy}
                                          onClick={() => handleReassign(session)}
                                        >
                                          {reassignBusy ? 'Saving…' : 'Confirm Reassign'}
                                        </Button>
                                        <Button size="sm" variant="ghost" className="h-9 text-xs px-3" onClick={() => setReassignFor(null)}>
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
                const queue = groupStaffQueue(staff.id, todayBranchSessions, customers);
                const serving = queue.find((q) => q.inProgress);

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
                          <p className="text-[11px] text-muted-foreground">#{serving.session.queueNumber}</p>
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
                              key={q.session.id}
                              className={`rounded-md border px-3 py-2 text-sm ${
                                q.inProgress ? 'border-amber-300 bg-amber-500/5' :
                                q.available ? 'border-emerald-300 bg-emerald-500/5' : 'border-border opacity-70'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-lg font-bold font-mono text-foreground">{q.session.queueNumber}</span>
                                  {q.isVip && <Star className="size-3.5 text-amber-500 fill-amber-500 shrink-0" />}
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
                              <p className="font-semibold text-foreground text-sm">{q.session.customerName}</p>
                              {q.services.length > 0 && (
                                <p className="text-[11px] text-muted-foreground font-medium truncate">
                                  {q.services.map((s) => s.serviceName).join(' + ')}
                                </p>
                              )}
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

          {/* TAB: RETAIL SALES */}
          <TabsContent value="retail" className="mt-4">
            <RetailTab
              companyId={activeCompanyId}
              branchId={branchId || activeCompanyId || ''}
              inventoryItems={branchInventory}
              onRefresh={onRefresh}
            />
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
                    {canManageInventory && (
                      <Button size="sm" onClick={openAddInventory} className="gap-1.5 text-sm font-medium">
                        <Plus className="size-3.5" /> Add Item
                      </Button>
                    )}
                  </div>
                </div>

                {filteredInventory.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground space-y-2">
                    <Package className="size-8 mx-auto opacity-40" />
                    <p className="text-sm font-semibold">No inventory items found for this branch.</p>
                    {canManageInventory && <Button variant="outline" size="sm" onClick={openAddInventory}>+ Add First Item</Button>}
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
                                  {canManageInventory && (
                                    <>
                                      <Button size="icon" variant="ghost" className="size-8" title="Edit item" onClick={() => openEditInventory(item)}>
                                        <Pencil className="size-3.5" />
                                      </Button>
                                      <Button size="icon" variant="ghost" className="size-8 text-muted-foreground hover:text-destructive" title="Delete item" onClick={() => setConfirmDeleteItem(item)}>
                                        <Trash2 className="size-3.5" />
                                      </Button>
                                    </>
                                  )}
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
            {/* Payment Summary — Today */}
            <Card className="border-border bg-card overflow-hidden">
              <CardContent className="p-0">
                <div className="flex items-center gap-2 px-4 pt-3.5 pb-2">
                  <Banknote className="size-4 text-primary" />
                  <h3 className="text-sm font-bold tracking-tight text-foreground">Payment Summary — Today</h3>
                  {branch && <span className="text-[11px] font-semibold text-muted-foreground truncate">{branch.name}</span>}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px bg-border border-t border-border">
                  {[
                    { label: 'Cash', value: paymentSummary ? `${paymentSummary.cashEtb.toLocaleString()} ETB` : null, tone: 'text-emerald-600 dark:text-emerald-400' },
                    { label: 'Bank Transfer', value: paymentSummary ? `${paymentSummary.bankEtb.toLocaleString()} ETB` : null, tone: 'text-sky-600 dark:text-sky-400' },
                    { label: 'Discounts Given', value: paymentSummary ? `${paymentSummary.discountsEtb.toLocaleString()} ETB` : null, tone: 'text-amber-600 dark:text-amber-400' },
                    { label: 'Total Collected', value: paymentSummary ? `${paymentSummary.totalCollectedEtb.toLocaleString()} ETB` : null, tone: 'text-primary' },
                    { label: 'Still Owed (Credit)', value: paymentSummary ? `${paymentSummary.outstandingTotalEtb.toLocaleString()} ETB${paymentSummary.outstandingVisitCount > 0 ? ` (${paymentSummary.outstandingVisitCount})` : ''}` : null, tone: 'text-destructive' },
                  ].map(({ label, value, tone }) => (
                    <div key={label} className="bg-card px-3.5 py-3">
                      <p className="kpi-label mb-1.5">{label}</p>
                      <p className={`kpi-value text-lg tabular-nums ${paymentSummary ? tone : 'text-muted-foreground'}`}>{value ?? '—'}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-border ">
                <CardContent className="p-4 space-y-1">
                  <span className="kpi-label">Money In Today</span>
                  <p className="kpi-value">{todayRevenue.toLocaleString()} ETB</p>
                  <p className="text-[11px] text-muted-foreground">Everything customers paid today</p>
                </CardContent>
              </Card>

              <Card className="border-border ">
                <CardContent className="p-4 space-y-1">
                  <span className="kpi-label">Customers Finished Today</span>
                  <p className="kpi-value">{completedToday}</p>
                  <p className="text-[11px] text-muted-foreground">Visits completed and checked out</p>
                </CardContent>
              </Card>

              <Card className="border-border ">
                <CardContent className="p-4 space-y-1">
                  <span className="kpi-label">Not Paid Yet Today</span>
                  <p className="kpi-value text-destructive">{pendingUnpaidAmount.toLocaleString()} ETB</p>
                  <p className="text-[11px] text-muted-foreground">{pendingCount} finished visits still waiting for payment</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Hourly Sales Chart */}
              <Card className="lg:col-span-8 border-border ">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-foreground">Money In — Hour by Hour</h3>
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
                  <h3 className="text-sm font-medium text-foreground">How Customers Paid</h3>
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
                <h3 className="text-sm font-medium text-foreground">Who Did What Today</h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="">Staff Member</TableHead>
                        <TableHead className="">Role</TableHead>
                        <TableHead className="text-center">Services Done</TableHead>
                        <TableHead className="text-right">Money Brought In</TableHead>
                        <TableHead className="text-right">Their Cut (Commission)</TableHead>
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

      {/* Create Session Modal: Step 1 = details, Step 2 = summary confirmation */}
      <Dialog open={showCreateModal} onOpenChange={(o) => {
        if (!o && !isCreating) { setShowCreateModal(false); setCreateStep(1); setCreationError(null); }
      }}>
        <DialogContent className="sm:max-w-2xl w-[calc(100vw-1rem)] h-[min(94dvh,840px)] p-3 sm:p-4 gap-2 [display:flex] [flex-direction:column] overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2 text-base font-medium">
              <ShoppingCart className="size-5 text-primary" />
              {createStep === 1 ? 'New Customer Session' : 'Session Summary'}
            </DialogTitle>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className={`size-1.5 rounded-full ${createStep === 1 ? 'bg-primary' : 'bg-green-500'}`} />
              Step {createStep} of 2 {createStep === 2 && '— please confirm below'}
            </div>
          </DialogHeader>

          {creationError && (
            <div className="flex items-center gap-2 text-sm font-semibold text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">
              <AlertCircle className="size-4 shrink-0" />
              <span>{creationError}</span>
            </div>
          )}

          {createStep === 1 ? (
            <div className="flex-1 min-h-0 flex flex-col gap-3">
              {/* 1. Select Client */}
              <div className="shrink-0 space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">1. Who is the customer? *</Label>
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
                  <p className="text-xs text-amber-600 dark:text-amber-400 italic">No customer selected yet.</p>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setPickerMode('list'); setClientSearchQuery(''); setShowClientPicker(true); }}
                  className="w-full gap-2 text-[13px] font-medium border-primary/30 hover:bg-primary/10"
                >
                  <Users className="size-4 text-primary" />
                  {selectedCustomer ? 'Change Customer' : 'Choose Customer'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => { setPickerMode('new'); setClientSearchQuery(''); setShowClientPicker(true); }}
                  className="gap-1.5 text-[13px] font-medium border border-primary/40 hover:bg-primary/10 w-full"
                >
                  <UserPlus className="size-3.5 text-primary" />
                  + Register New Customer
                </Button>
              </div>

              {/* 2. Pick Services */}
              <div className="flex-1 min-h-0 flex flex-col gap-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">2. Which services? *</Label>
                <div className="flex shrink-0 gap-1 overflow-x-auto pb-1">
                  <Button size="xs" variant={serviceCategory === 'all' ? 'default' : 'outline'} onClick={() => setServiceCategory('all')} className="text-xs">
                    All
                  </Button>
                  {categories.map((cat) => (
                    <Button key={cat} size="xs" variant={serviceCategory === cat ? 'default' : 'outline'} onClick={() => setServiceCategory(cat)} className="text-xs">
                      {cat}
                    </Button>
                  ))}
                </div>

                <div className="no-scrollbar flex-1 min-h-0 overflow-y-auto">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 content-start">
                    {filteredServices.map((srv) => (
                      <button
                        key={srv.id}
                        type="button"
                        onClick={() => addServiceToBuilder(srv)}
                        className="bg-background border border-border hover:border-primary hover:bg-primary/5 p-3 rounded-md text-left cursor-pointer transition-colors active:scale-[0.98]"
                      >
                        <div className="font-semibold text-sm text-foreground truncate">{srv.name}</div>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-[10px] text-muted-foreground">{srv.durationMinutes}m</span>
                          <span className="font-semibold text-sm text-foreground">{srv.priceEtb} ETB</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {selectedServices.length > 0 && (
                  <div className="shrink-0 rounded-md border-2 border-primary/50 bg-primary/5 p-3 space-y-2 max-h-[28vh] overflow-y-auto no-scrollbar">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold uppercase tracking-wider text-foreground">Selected Services ({selectedServices.length})</Label>
                      <span className="text-sm font-bold text-primary">{cartTotal} ETB</span>
                    </div>
                    {selectedServices.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-2 rounded-lg border border-primary/30 bg-background px-3 py-2.5 text-sm shadow-sm">
                        <span className="font-bold text-foreground truncate max-w-[140px]">{item.serviceName}</span>
                        <div className="flex items-center gap-1.5 flex-1 justify-end">
                          <Select value={item.staffId} onValueChange={(v) => assignStaffToBuilder(idx, v)} items={toSelectItems(staffForService(availableServices.find((s) => s.id === item.serviceId) as Service).map((st) => ({ value: st.id, label: st.name })))}>
                            <SelectTrigger className="h-7 text-xs font-semibold py-0 px-2 w-[140px] border-primary/40">
                              <SelectValue placeholder="Staff" />
                            </SelectTrigger>
                            <SelectContent>
                              {staffForService(availableServices.find((s) => s.id === item.serviceId) as Service).map((st) => (
                                <SelectItem key={st.id} value={st.id} className="text-sm font-medium">{st.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <span className="w-16 text-right font-bold shrink-0">{item.priceEtb} ETB</span>
                          <button type="button" onClick={() => removeServiceFromBuilder(idx)} className="text-destructive hover:opacity-80 shrink-0">
                            <X className="size-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <DialogFooter className="sm:justify-between gap-2 shrink-0 -mx-3 -mb-3 px-4 pt-3 sm:-mx-4 sm:-mb-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Total: <span className="font-semibold text-foreground">{cartTotal} ETB</span>
                </p>
                <Button
                  variant="default"
                  size="sm"
                  disabled={!selectedCustomer || selectedServices.length === 0}
                  onClick={() => { setCreateStep(2); setCreationError(null); }}
                >
                  Continue to Summary →
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="flex-1 min-h-0 flex flex-col gap-3">
              <div className="shrink-0 rounded-xl border border-primary/40 bg-primary/5 p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Users className="size-4 text-primary shrink-0" />
                    <span className="text-sm font-bold text-foreground truncate">
                      {selectedCustomer?.name}
                      {selectedCustomer?.isVip && <Star className="size-3.5 text-amber-500 fill-amber-500 inline ml-1 -mt-0.5" />}
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-[11px] font-semibold shrink-0">{selectedCustomer?.loyaltyPoints || 0} Pts</Badge>
                </div>
                <p className="text-xs text-muted-foreground font-mono truncate">{selectedCustomer?.phone}</p>
              </div>

              <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-border overflow-hidden">
                <div className="shrink-0 bg-muted/60 px-4 py-2 flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-wider text-foreground">Services ({selectedServices.length})</Label>
                  <span className="text-sm font-bold text-primary">{cartTotal} ETB</span>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
                {selectedServices.map((item, idx) => (
                  <div key={idx} className={`flex items-center justify-between gap-2 px-4 py-3 text-sm ${idx % 2 ? 'bg-muted/30' : 'bg-background'}`}>
                    <div className="min-w-0">
                      <p className="font-bold text-foreground truncate">{item.serviceName}</p>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">{item.staffName || 'No staff'}</span> • {availableServices.find((s) => s.id === item.serviceId)?.durationMinutes ?? 0} min
                      </p>
                    </div>
                    <span className="font-bold shrink-0">{item.priceEtb} ETB</span>
                  </div>
                ))}
                </div>
              </div>

              <div className="shrink-0 flex items-center justify-between rounded-xl border-2 border-primary/40 bg-primary/5 px-4 py-3">
                <p className="text-sm font-bold text-foreground uppercase tracking-wide">Total Net</p>
                <p className="text-xl font-bold text-foreground">{cartTotal} ETB</p>
              </div>

              <DialogFooter className="gap-2 shrink-0 -mx-3 -mb-3 px-4 pt-3 sm:-mx-4 sm:-mb-4 border-t border-border">
                <Button variant="outline" size="sm" onClick={() => setCreateStep(1)} disabled={isCreating}>
                  ← Back
                </Button>
                <Button onClick={createSession} disabled={isCreating} className="gap-1.5 font-medium" size="lg">
                  <ShoppingCart className="size-4" />
                  {isCreating ? 'Creating...' : 'Confirm Queue'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Client Picker Modal: Search + Full-Width List + Inline New Client Form */}
      <Dialog open={showClientPicker} onOpenChange={(o) => !o && setShowClientPicker(false)}>
        <DialogContent className="sm:max-w-xl h-[min(90dvh,720px)] [display:flex] [flex-direction:column] overflow-hidden">
          <DialogHeader className="shrink-0">
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

          <div className="flex gap-2 shrink-0">
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
            <div className="flex-1 min-h-0 flex flex-col gap-2">
              <div className="relative shrink-0">
                <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  autoFocus
                  placeholder="Type mobile number or full name to search clients..."
                  value={clientSearchQuery}
                  onChange={(e) => setClientSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="no-scrollbar flex-1 min-h-0 overflow-y-auto space-y-1.5">
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
            <form onSubmit={handleCreateNewCustomer} className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-4 py-1">
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

      {/* Unified Payment Checkout Modal */}
      <PaymentCheckoutModal
        open={!!payModal}
        onOpenChange={(o) => !o && setPayModal(null)}
        target={payModal ? toPaymentTarget(payModal) : null}
        onSuccess={async () => {
          if (payModal && !paidIds.includes(payModal.id)) setPaidIds((prev) => [...prev, payModal.id]);
          await onRefresh?.();
        }}
      />
    </div>
  );
};
