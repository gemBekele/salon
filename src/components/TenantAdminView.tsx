import React, { useState, useEffect } from 'react';
import {
  GitBranch,
  Scissors,
  Package,
  DollarSign,
  Plus,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Clock,
  Trash2,
  Edit2,
  ShieldCheck,
  Download,
  Repeat,
  RefreshCw,
  Activity,
  Search,
  Minus,
  X,
  Star,
} from 'lucide-react';
import {
  Company,
  Branch,
  BusinessUnit,
  Staff,
  Service,
  InventoryItem,
  CommissionLog,
  CommissionRule,
  ExpenseRecord,
  VisitSession,
  AuditLog,
  User,
  Feedback,
} from '../types';
import { ReportsDashboard } from './ReportsDashboard';
import { apiFetch } from '../lib/api';
import { ConfirmDialog } from './ConfirmDialog';
import { useAdminTab } from '../lib/adminNav';
import { revenueOn, activeQueue, unpaidCompleted, lowStockItems } from '../lib/kpi';
import { showToast } from './Toast';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, toSelectItems } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

interface TenantAdminViewProps {
  company: Company;
  branches: Branch[];
  businessUnits: BusinessUnit[];
  staffList: Staff[];
  services: Service[];
  inventoryItems: InventoryItem[];
  commissionLogs: CommissionLog[];
  commissionRules: CommissionRule[];
  expenses: ExpenseRecord[];
  visitSessions: VisitSession[];
  auditLogs?: AuditLog[];
  users?: User[];
  selectedBranch?: Branch;
  onAddBranch: (br: Branch) => void;
  onAddStaff: (stf: Staff) => void;
  onAddService: (srv: Service) => void;
  onAddInventoryItem: (inv: InventoryItem) => void;
  onUpdateInventoryStock: (invId: string, addedStock: number) => void;
  onSaveCommissionRule: (rule: CommissionRule) => void;
  onAddExpense?: (exp: ExpenseRecord) => void;
  onAddAuditLog?: (log: AuditLog) => void;
  onUpdateBranch?: (br: Branch) => void;
  onDeleteBranch?: (branchId: string) => void;
  onUpdateStaff?: (stf: Staff) => void;
  onDeleteStaff?: (staffId: string) => void;
  onUpdateService?: (srv: Service) => void;
  onDeleteService?: (serviceId: string) => void;
  onUpdateInventoryItem?: (inv: InventoryItem) => void;
  onDeleteInventoryItem?: (itemId: string) => void;
  onAddUser?: (user: User) => void;
  onUpdateUser?: (user: User & { password?: string }) => void;
  onRefresh?: () => Promise<void>;
}

export const TenantAdminView: React.FC<TenantAdminViewProps> = ({
  company,
  branches,
  businessUnits,
  staffList,
  services,
  inventoryItems,
  commissionLogs,
  commissionRules,
  expenses,
  visitSessions,
  auditLogs = [],
  users = [],
  selectedBranch,
  onAddBranch,
  onAddStaff,
  onAddService,
  onAddInventoryItem,
  onUpdateInventoryStock,
  onSaveCommissionRule,
  onAddExpense,
  onAddAuditLog,
  onUpdateBranch,
  onDeleteBranch,
  onUpdateStaff,
  onDeleteStaff,
  onUpdateService,
  onDeleteService,
  onUpdateInventoryItem,
  onDeleteInventoryItem,
  onAddUser,
  onUpdateUser,
  onRefresh,
}) => {
  const { adminTab, setAdminTab } = useAdminTab();

  // Branch Metric Selection State
  const [selectedMetricBranchId, setSelectedMetricBranchId] = useState<string>(
    selectedBranch?.id || branches[0]?.id || ''
  );

  // Keep the in-page metric branch in sync with the sidebar branch selector
  React.useEffect(() => {
    if (selectedBranch?.id) setSelectedMetricBranchId(selectedBranch.id);
  }, [selectedBranch?.id]);

  // Overview scope: company-wide by default, or "All Branches"
  const [overviewBranchId, setOverviewBranchId] = useState<string>(selectedBranch?.id || 'all');
  React.useEffect(() => {
    if (selectedBranch?.id) setOverviewBranchId(selectedBranch.id);
  }, [selectedBranch?.id]);

  // Staff scope: "All Branches" or a single branch (synced to the sidebar)
  const [staffScopeBranchId, setStaffScopeBranchId] = useState<string>(selectedBranch?.id || 'all');
  React.useEffect(() => {
    if (selectedBranch?.id) setStaffScopeBranchId(selectedBranch.id);
  }, [selectedBranch?.id]);

  // Expense Form State
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [expDescription, setExpDescription] = useState('');
  const [expCategory, setExpCategory] = useState<ExpenseRecord['category']>('rent');
  const [expAmount, setExpAmount] = useState(25000);
  const [expPaymentMethod, setExpPaymentMethod] = useState<ExpenseRecord['paymentMethod']>('cbe_birr');
  const [expRecordedBy, setExpRecordedBy] = useState('Tenant Admin');
  const [expIsRecurring, setExpIsRecurring] = useState(false);
  const [expRecurrenceFreq, setExpRecurrenceFreq] = useState<'weekly' | 'monthly' | 'quarterly'>('monthly');
  const [expNextDueDate, setExpNextDueDate] = useState('2026-09-01');
  const [expAutoTrigger, setExpAutoTrigger] = useState(true);

  // Security Audit Filters
  const [auditFilterType, setAuditFilterType] = useState<string>('all');
  const [auditSearchQuery, setAuditSearchQuery] = useState<string>('');

  // Reviews & Complaints
  const [feedbackItems, setFeedbackItems] = useState<Feedback[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setFeedbackLoading(true);
      try {
        const res = await apiFetch(`/api/feedback?companyId=${encodeURIComponent(company.id)}`);
        const data = await res.json();
        if (!cancelled) setFeedbackItems(res.ok ? (data?.feedback ?? []) : []);
      } catch {
        if (!cancelled) setFeedbackItems([]);
      } finally {
        if (!cancelled) setFeedbackLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [company.id]);

  // Modal States
  const [showAddBranchModal, setShowAddBranchModal] = useState(false);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [showAddInventoryModal, setShowAddInventoryModal] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);

  // Edit Modal States
  const [editingEntity, setEditingEntity] = useState<{ type: string; data: any } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ type: string; id: string; name: string } | null>(null);

  // Inventory Use (Deduction) State
  const [useStockItem, setUseStockItem] = useState<InventoryItem | null>(null);
  const [useStockQty, setUseStockQty] = useState(1);

  // Branch Form
  const [branchName, setBranchName] = useState('');
  const [branchCity, setBranchCity] = useState('Addis Ababa');
  const [branchAddress, setBranchAddress] = useState('');
  const [branchPhone, setBranchPhone] = useState('+251 ');
  const [branchExpenseLimit, setBranchExpenseLimit] = useState('0');

  // Staff Form
  const [staffName, setStaffName] = useState('');
  const [staffPhone, setStaffPhone] = useState('+251 ');
  const [staffRole, setStaffRole] = useState<any>('barber');
  const [staffCommission, setStaffCommission] = useState(30);
  const [staffBranchId, setStaffBranchId] = useState(branches[0]?.id || '');
  const [staffRuleEnabled, setStaffRuleEnabled] = useState(false);
  const [staffRuleType, setStaffRuleType] = useState<'percentage' | 'fixed_amount'>('percentage');
  const [staffRuleValue, setStaffRuleValue] = useState(30);
  const [staffRuleActive, setStaffRuleActive] = useState(true);

  // Service Form
  const [srvName, setSrvName] = useState('');
  const [srvCategory, setSrvCategory] = useState('Haircut');
  const [srvPrice, setSrvPrice] = useState(500);
  const [srvDuration, setSrvDuration] = useState(45);
  const [srvCommissionVal, setSrvCommissionVal] = useState(30);

  // Inventory Form
  const [invName, setInvName] = useState('');
  const [invSku, setInvSku] = useState('');
  const [invUnit, setInvUnit] = useState('ml');
  const [invStock, setInvStock] = useState(200);
  const [invReorder, setInvReorder] = useState(50);
  const [invCost, setInvCost] = useState(15);
  const [invBranchId, setInvBranchId] = useState(branches[0]?.id || '');

  const companyBranches = branches.filter((b) => b.companyId === company.id);
  const companyBusinessUnits = businessUnits.filter((bu) => bu.companyId === company.id);
  const companyStaff = staffList.filter((s) => s.companyId === company.id);
  const companyServices = services.filter((s) => s.companyId === company.id);
  const companyInventory = inventoryItems.filter((i) => i.companyId === company.id);
  const companyCommissions = commissionLogs.filter((c) => c.companyId === company.id);
  const companyExpenses = expenses.filter((e) => e.companyId === company.id);
  const companyUsers = users.filter((u) => u.companyId === company.id);

  const filteredAuditLogs = auditLogs.filter((log) => {
    if (log.companyId !== company.id) return false;
    if (auditFilterType !== 'all' && log.actionType !== auditFilterType) return false;
    if (auditSearchQuery) {
      const q = auditSearchQuery.toLowerCase();
      return (
        log.description.toLowerCase().includes(q) ||
        log.performedBy.toLowerCase().includes(q) ||
        (log.details && log.details.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Real-time Branch Metrics Calculation
  const activeBranchId = selectedMetricBranchId || selectedBranch?.id || companyBranches[0]?.id || '';
  const currentMetricBranch = companyBranches.find((b) => b.id === activeBranchId) || companyBranches[0];

  const branchUnitIds = companyBusinessUnits.filter((bu) => bu.branchId === activeBranchId).map((bu) => bu.id);
  const branchServices = companyServices.filter((s) => branchUnitIds.includes(s.businessUnitId));
  const branchInventory = companyInventory.filter((i) => i.branchId === activeBranchId);
  const branchExpenses = companyExpenses.filter((e) => e.branchId === activeBranchId);

  const totalCompletedRevenueEtb = visitSessions
    .filter((s) => s.companyId === company.id && s.status === 'completed' && s.branchId === activeBranchId)
    .reduce((acc, s) => acc + s.netTotalEtb, 0);

  const totalExpensesEtb = branchExpenses.reduce((acc, e) => acc + e.amountEtb, 0);
  const lowStockInventory = branchInventory.filter((i) => i.currentStock <= i.reorderLevel);

  const todayDateStr = new Date().toISOString().split('T')[0];
  const branchSessions = visitSessions.filter(
    (s) => s.companyId === company.id && s.branchId === activeBranchId
  );

  // 1. Real-time Revenue Today for selected branch
  const revenueTodayEtb = branchSessions
    .filter(
      (s) =>
        s.status === 'completed' &&
        ((s.completedAt && s.completedAt.startsWith(todayDateStr)) ||
          (s.startedAt && s.startedAt.startsWith(todayDateStr)))
    )
    .reduce((acc, s) => acc + s.netTotalEtb, 0);

  // 2. Real-time Active Visits for selected branch
  const queuedCount = branchSessions.filter((s) => s.status === 'queued').length;
  const inProgressCount = branchSessions.filter((s) => s.status === 'in_progress').length;
  const activeVisitsCount = queuedCount + inProgressCount;

  // 3. Real-time Staff Occupancy for selected branch
  const branchStaffMembers = companyStaff.filter((st) => st.branchId === activeBranchId);
  const busyBranchStaffCount = branchStaffMembers.filter(
    (st) =>
      st.status === 'busy' ||
      branchSessions.some(
        (s) =>
          s.status === 'in_progress' &&
          s.services.some((srv) => srv.staffId === st.id)
      )
  ).length;
  const totalBranchStaffCount = branchStaffMembers.length;
  const staffOccupancyPct =
    totalBranchStaffCount > 0 ? Math.round((busyBranchStaffCount / totalBranchStaffCount) * 100) : 0;

  // Overview derived data (company-wide or single branch)
  const overviewSessions = visitSessions.filter((s) => {
    if (s.companyId !== company.id) return false;
    if (overviewBranchId !== 'all' && s.branchId !== overviewBranchId) return false;
    return true;
  });
  const overviewInventory = companyInventory.filter((i) =>
    overviewBranchId === 'all' ? true : i.branchId === overviewBranchId
  );
  const overviewExpenses = companyExpenses.filter((e) =>
    overviewBranchId === 'all' ? true : e.branchId === overviewBranchId
  );
  const overviewLowStock = lowStockItems(overviewInventory);
  const overviewUnpaid = unpaidCompleted(overviewSessions);
  const overviewQueue = activeQueue(overviewSessions);
  const overviewRevenueToday = revenueOn(todayDateStr, overviewSessions);
  const overviewCompletedToday = overviewSessions.filter(
    (s) =>
      s.status === 'completed' &&
      ((s.completedAt && s.completedAt.startsWith(todayDateStr)) ||
        (s.startedAt && s.startedAt.startsWith(todayDateStr)))
  ).length;
  const overviewExpensesToday = overviewExpenses.filter((e) => e.date === todayDateStr)
    .reduce((acc, e) => acc + e.amountEtb, 0);
  const overviewNetToday = overviewRevenueToday - overviewExpensesToday;
  const overviewStaff = companyStaff.filter((st) =>
    overviewBranchId === 'all' ? true : st.branchId === overviewBranchId
  );
  const overviewStaffOnShift = overviewStaff.filter(
    (st) => st.status === 'available' || st.status === 'busy'
  ).length;
  const overviewLiveQueue = overviewSessions
    .filter((s) => s.status === 'queued' || s.status === 'in_progress')
    .slice(0, 5);
  const overviewBranchName =
    overviewBranchId === 'all'
      ? 'All Branches'
      : companyBranches.find((b) => b.id === overviewBranchId)?.name || '—';

  // Staff scope derived data (All Branches or single branch)
  const scopeStaff = companyStaff.filter((st) =>
    staffScopeBranchId === 'all' ? true : st.branchId === staffScopeBranchId
  );
  const scopeStaffOnShift = scopeStaff.filter(
    (st) => st.status === 'available' || st.status === 'busy'
  );
  const scopeVisits = visitSessions.filter((s) => {
    if (s.companyId !== company.id) return false;
    if (staffScopeBranchId !== 'all' && s.branchId !== staffScopeBranchId) return false;
    return true;
  });
  const scopeCommissions = companyCommissions.filter((c) =>
    staffScopeBranchId === 'all' ? true : c.branchId === staffScopeBranchId
  );
  const scopeCommissionTotal = scopeCommissions.reduce((acc, c) => acc + c.commissionAmountEtb, 0);
  const scopePendingPayouts = scopeCommissions
    .filter((c) => c.payoutStatus !== 'paid')
    .reduce((acc, c) => acc + c.commissionAmountEtb, 0);
  const payoutDueByStaffId = (() => {
    const map: Record<string, number> = {};
    scopeCommissions
      .filter((c) => c.payoutStatus !== 'paid')
      .forEach((c) => {
        map[c.staffId] = (map[c.staffId] || 0) + c.commissionAmountEtb;
      });
    return map;
  })();
  // Staff-initiated payout requests awaiting approval.
  const payoutRequestsByStaffId = (() => {
    const map: Record<string, { total: number; count: number; name: string }> = {};
    scopeCommissions
      .filter((c) => c.payoutStatus === 'payout_requested')
      .forEach((c) => {
        const entry = map[c.staffId] || { total: 0, count: 0, name: c.staffName };
        entry.total += c.commissionAmountEtb;
        entry.count += 1;
        map[c.staffId] = entry;
      });
    return map;
  })();
  const scopeInProgressByStaff = (() => {
    const map: Record<string, VisitSession> = {};
    scopeVisits
      .filter((s) => s.status === 'in_progress')
      .forEach((s) =>
        s.services
          .filter((sv) => sv.status === 'in_progress' || sv.status === 'pending')
          .forEach((sv) => {
            if (!map[sv.staffId]) map[sv.staffId] = s;
          })
      );
    return map;
  })();
  const scopeStaffBusy = scopeStaff.filter(
    (st) => st.status === 'busy' || !!scopeInProgressByStaff[st.id]
  );

  // Handlers for Recurring Expenses & Security Audit
  const handleCreateExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expDescription || !expAmount) return;

    const newExpenseRecord: ExpenseRecord = {
      id: `exp_${Date.now()}_${Math.random().toString().slice(-4)}`,
      companyId: company.id,
      branchId: activeBranchId,
      category: expCategory,
      amountEtb: Number(expAmount),
      description: expDescription,
      paymentMethod: expPaymentMethod,
      recordedBy: expRecordedBy || 'Tenant Admin',
      date: new Date().toISOString().split('T')[0],
      isRecurring: expIsRecurring,
      recurrenceFrequency: expIsRecurring ? expRecurrenceFreq : undefined,
      nextDueDate: expIsRecurring ? expNextDueDate : undefined,
      autoProcessTrigger: expIsRecurring ? expAutoTrigger : undefined,
    };

    if (onAddExpense) {
      onAddExpense(newExpenseRecord);
    }
    setShowAddExpenseModal(false);
    setExpDescription('');
    setExpAmount(25000);
  };

  const handleRunRecurringExpensesTrigger = () => {
    const recurringList = branchExpenses.filter((e) => e.isRecurring);
    let createdCount = 0;
    recurringList.forEach((rec) => {
      if (onAddExpense) {
        const nextDate = new Date();
        if (rec.recurrenceFrequency === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
        else if (rec.recurrenceFrequency === 'quarterly') nextDate.setDate(nextDate.getDate() + 90);
        else nextDate.setDate(nextDate.getDate() + 30);

        const autoRecord: ExpenseRecord = {
          id: `exp_trig_${Date.now()}_${Math.random().toString().slice(-4)}`,
          companyId: rec.companyId,
          branchId: rec.branchId,
          businessUnitId: rec.businessUnitId,
          category: rec.category,
          amountEtb: rec.amountEtb,
          description: `[Auto Trigger Cycle] ${rec.description}`,
          paymentMethod: rec.paymentMethod,
          recordedBy: 'Automated Billing Trigger',
          date: new Date().toISOString().split('T')[0],
          isRecurring: true,
          recurrenceFrequency: rec.recurrenceFrequency,
          nextDueDate: nextDate.toISOString().split('T')[0],
          autoProcessTrigger: true,
        };
        onAddExpense(autoRecord);
        createdCount++;
      }
    });

    if (onAddAuditLog) {
      onAddAuditLog({
        id: `aud_${Date.now()}_${Math.random().toString().slice(-4)}`,
        companyId: company.id,
        branchId: activeBranchId,
        actionType: 'expense_added',
        description: `Automated Recurring Expense Trigger executed: ${createdCount} schedule(s) processed.`,
        performedBy: 'System Billing Cycle Cron',
        timestamp: new Date().toISOString(),
        details: `Cycle check completed for ${recurringList.length} configured recurring entries.`,
        ipAddress: '127.0.0.1',
      });
    }

    showToast('success', `Automated Expense Cycle Check executed! Created ${createdCount} recurring expense ledger items.`);
  };

  const handleExportSecurityAuditCsv = async () => {
    const params = new URLSearchParams();
    if (auditFilterType !== 'all') params.set('actionType', auditFilterType);
    const res = await apiFetch(`/api/audit/export.csv?${params.toString()}`);
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `security_audit_${company.slug}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportPayrollCsv = async () => {
    const res = await apiFetch('/api/reports/export/commissions.csv');
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `payroll_commissions_${company.slug}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    if (onAddAuditLog) {
      onAddAuditLog({
        id: `aud_${Date.now()}_${Math.random().toString().slice(-4)}`,
        companyId: company.id,
        branchId: activeBranchId,
        actionType: 'commission_change',
        description: `Exported payroll commission CSV (${companyCommissions.length} records processed).`,
        performedBy: 'Tenant Admin',
        timestamp: new Date().toISOString(),
        details: 'Payroll CSV export generated for accountant processing.',
        ipAddress: '127.0.0.1',
      });
    }
  };

  // Payout confirmation: show full unpaid total, accept the amount being paid now
  const [payoutUpdatingId, setPayoutUpdatingId] = useState<string | null>(null);
  const [payoutTarget, setPayoutTarget] = useState<{ staffId: string; staffName: string } | null>(null);
  const [payoutAmount, setPayoutAmount] = useState<string>('');
  const [payoutNote, setPayoutNote] = useState<string>('');

  const unpaidCommissionsFor = (staffId: string) => {
    return scopeCommissions.filter((c) => c.staffId === staffId && c.payoutStatus !== 'paid');
  };

  const payoutTotalFor = (staffId: string) => {
    return unpaidCommissionsFor(staffId).reduce((acc, c) => acc + c.commissionAmountEtb, 0);
  };

  const handleBatchPayout = async () => {
    if (!payoutTarget) return;
    if (payoutUpdatingId) return;
    const accepted = Number(payoutAmount);
    if (!isFinite(accepted) || accepted <= 0) {
      showToast('error', 'Enter the amount accepted for this payout');
      return;
    }
    if (accepted > payoutTotalFor(payoutTarget.staffId)) {
      showToast('error', `Accepted amount can't exceed the ${payoutTotalFor(payoutTarget.staffId).toLocaleString()} ETB due`);
      return;
    }
    setPayoutUpdatingId(payoutTarget.staffId);
    try {
      const res = await apiFetch('/api/commission-logs/payout/batch', {
        method: 'PATCH',
        body: JSON.stringify({
          staffId: payoutTarget.staffId,
          companyId: company.id,
          amountAcceptedEtb: accepted,
          notes: payoutNote.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed to process payout');
      showToast('success', `Paid ${accepted.toLocaleString()} ETB to ${payoutTarget.staffName}`);
      setPayoutTarget(null);
      setPayoutAmount('');
      setPayoutNote('');
      await onRefresh?.();
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Failed to process payout');
    } finally {
      setPayoutUpdatingId(null);
    }
  };

  const [rejectingPayoutId, setRejectingPayoutId] = useState<string | null>(null);
  const handleRejectPayoutRequest = async (staffId: string, staffName: string) => {
    if (rejectingPayoutId) return;
    setRejectingPayoutId(staffId);
    try {
      const res = await apiFetch('/api/commission-logs/payout/request/reject', {
        method: 'POST',
        body: JSON.stringify({ companyId: company.id, staffId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to reject the request');
      }
      showToast('success', `Payout request from ${staffName} rejected — logs returned to unpaid`);
      await onRefresh?.();
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Failed to reject request');
    } finally {
      setRejectingPayoutId(null);
    }
  };

  // Handlers
  const handleCreateBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName) return;
    onAddBranch({
      id: `br_${Date.now()}`,
      companyId: company.id,
      name: branchName,
      city: branchCity,
      address: branchAddress || 'Center City',
      phone: branchPhone.trim().length > 4 ? branchPhone : '+251 11 000 0000',
      isMainBranch: false,
      status: 'active',
      dailyExpenseLimitEtb: Number(branchExpenseLimit) || 0,
    });
    setShowAddBranchModal(false);
    setBranchName('');
    setBranchExpenseLimit('0');
  };

  const handleCreateStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffName) return;
    const staffId = `stf_${Date.now()}`;
    const staffRecord: Staff = {
      id: staffId,
      companyId: company.id,
      branchId: staffBranchId,
      businessUnitId: companyBusinessUnits.find((u) => u.branchId === staffBranchId)?.id || companyBusinessUnits[0]?.id || '',
      name: staffName,
      phone: staffPhone.trim().length > 4 ? staffPhone : '+251 91 000 0000',
      email: `${staffName.toLowerCase().replace(/\s+/g, '')}@${company.slug}.et`,
      role: staffRole,
      specialties: ['General Salon Services'],
      defaultCommissionPercentage: staffCommission,
      status: 'available',
    };
    onAddStaff(staffRecord);
    if (staffRuleEnabled) {
      onSaveCommissionRule({
        id: `rule_staff_${Date.now()}`,
        companyId: company.id,
        targetType: 'staff',
        targetId: staffId,
        targetName: `${staffName} (${staffRole})`,
        type: staffRuleType,
        value: staffRuleValue,
        isActive: staffRuleActive,
        updatedAt: new Date().toISOString().split('T')[0],
      });
    }
    setShowAddStaffModal(false);
    setStaffName('');
    setStaffPhone('+251 ');
    setStaffRuleEnabled(false);
    setStaffRuleType('percentage');
    setStaffRuleValue(30);
    setStaffRuleActive(true);
  };

  const handleCreateService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!srvName) return;
    onAddService({
      id: `srv_${Date.now()}`,
      companyId: company.id,
      businessUnitId: companyBusinessUnits[0]?.id || '',
      name: srvName,
      category: srvCategory,
      priceEtb: srvPrice,
      durationMinutes: srvDuration,
      commissionType: 'percentage',
      commissionValue: srvCommissionVal,
      requiredInventory: [],
      isActive: true,
    });
    setShowAddServiceModal(false);
    setSrvName('');
  };

  const handleCreateInventory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invName) return;
    onAddInventoryItem({
      id: `inv_${Date.now()}`,
      companyId: company.id,
      branchId: invBranchId,
      businessUnitId: companyBusinessUnits[0]?.id || '',
      name: invName,
      sku: invSku || `SKU-${Date.now().toString().slice(-4)}`,
      unit: invUnit,
      currentStock: invStock,
      reorderLevel: invReorder,
      unitCostEtb: invCost,
      lastRestockedAt: new Date().toISOString().split('T')[0],
    });
    setShowAddInventoryModal(false);
    setInvName('');
  };

  return (
    <div className="space-y-6">
      {/* TAB 0: OVERVIEW (landing page for managers) */}
      {adminTab === 'overview' && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-md p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
              <div>
                <h3 className="section-title">Salon Overview</h3>
                <p className="text-sm text-muted-foreground">Today's business at a glance for <strong className="text-foreground">{overviewBranchName}</strong>.</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-muted-foreground">Scope:</span>
                <Select value={overviewBranchId} onValueChange={(v) => setOverviewBranchId(v)} items={{ all: 'All Branches', ...toSelectItems(companyBranches.map((b) => ({ value: b.id, label: `${b.name} (${b.city})` }))) }}>
                  <SelectTrigger className="h-8 w-auto rounded-md bg-background border border-input text-sm font-medium">
                    <SelectValue placeholder="Select branch..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Branches</SelectItem>
                    {companyBranches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name} ({b.city})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
              <div className="bg-muted/30 border border-border rounded-md p-4 space-y-1">
                <span className="kpi-label">Revenue Today</span>
                <div className="kpi-value">{overviewRevenueToday.toLocaleString()} <span className="text-sm font-medium text-muted-foreground">ETB</span></div>
                <div className="text-[11px] text-muted-foreground">Completed sales today</div>
              </div>
              <div className="bg-muted/30 border border-border rounded-md p-4 space-y-1">
                <span className="kpi-label">Completed Today</span>
                <div className="kpi-value">{overviewCompletedToday} <span className="text-sm font-medium text-muted-foreground">visits</span></div>
                <div className="text-[11px] text-muted-foreground">Finished sessions</div>
              </div>
              <div className="bg-muted/30 border border-border rounded-md p-4 space-y-1">
                <span className="kpi-label">Active Queue</span>
                <div className="kpi-value">{overviewQueue.queued + overviewQueue.inProgress}</div>
                <div className="text-[11px] text-muted-foreground">{overviewQueue.inProgress} in service · {overviewQueue.queued} waiting</div>
              </div>
              <div className="bg-muted/30 border border-border rounded-md p-4 space-y-1">
                <span className="kpi-label">Net Today</span>
                <div className="kpi-value">{overviewNetToday.toLocaleString()} <span className="text-sm font-medium text-muted-foreground">ETB</span></div>
                <div className="text-[11px] text-muted-foreground">After {overviewExpensesToday.toLocaleString()} ETB expenses</div>
              </div>
              <div className="bg-muted/30 border border-border rounded-md p-4 space-y-1">
                <span className="kpi-label">Unpaid Sessions</span>
                <div className="kpi-value text-destructive">{overviewUnpaid.length}</div>
                <div className="text-[11px] text-muted-foreground">Completed, payment pending</div>
              </div>
              <div className="bg-muted/30 border border-border rounded-md p-4 space-y-1">
                <span className="kpi-label">Low Stock Items</span>
                <div className="kpi-value text-amber-600">{overviewLowStock.length}</div>
                <div className="text-[11px] text-muted-foreground">{overviewStaffOnShift} staff on shift</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Unpaid sessions */}
            <div className="bg-card border border-border rounded-md p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="section-title">Needs Payment</h3>
                <Button size="sm" variant="outline" onClick={() => setAdminTab('financials')}>View Financials</Button>
              </div>
              {overviewUnpaid.length === 0 ? (
                <p className="text-sm text-muted-foreground">No unpaid completed sessions — great.</p>
              ) : (
                <div className="space-y-2">
                  {overviewUnpaid.slice(0, 5).map((s) => (
                    <div key={s.id} className="flex items-center justify-between text-sm p-3 bg-muted/40 border border-border rounded-md">
                      <div>
                        <span className="font-semibold text-foreground">{s.queueNumber}</span>
                        <span className="text-muted-foreground"> · {s.customerName}</span>
                        <span className="text-[11px] text-muted-foreground block">{s.branchId && (branches.find((b) => b.id === s.branchId)?.name || '')}</span>
                      </div>
                      <span className="font-mono font-semibold text-destructive num">{s.netTotalEtb.toLocaleString()} ETB</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Low stock */}
            <div className="bg-card border border-border rounded-md p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="section-title">Low Stock Alerts</h3>
                <Button size="sm" variant="outline" onClick={() => setAdminTab('inventory')}>Open Inventory</Button>
              </div>
              {overviewLowStock.length === 0 ? (
                <p className="text-sm text-muted-foreground">All inventory levels are healthy.</p>
              ) : (
                <div className="space-y-2">
                  {overviewLowStock.slice(0, 5).map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm p-3 bg-amber-50/60 border border-amber-200 rounded-md dark:bg-amber-950/30 dark:border-amber-900">
                      <div>
                        <span className="font-semibold text-foreground">{item.name}</span>
                        <span className="text-[11px] text-muted-foreground block">SKU {item.sku}</span>
                      </div>
                      <span className="font-mono font-semibold num text-amber-700 dark:text-amber-400">{item.currentStock} / reorder {item.reorderLevel}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Live queue preview */}
            <div className="lg:col-span-2 bg-card border border-border rounded-md p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="section-title">Live Queue</h3>
                <Button size="sm" variant="outline" onClick={() => setAdminTab('branches')}>Open POS Board</Button>
              </div>
              {overviewLiveQueue.length === 0 ? (
                <p className="text-sm text-muted-foreground">No sessions waiting or in service right now.</p>
              ) : (
                <div className="space-y-2">
                  {overviewLiveQueue.map((s) => (
                    <div key={s.id} className="flex items-center justify-between text-sm p-3 bg-muted/40 border border-border rounded-md">
                      <div>
                        <span className="font-semibold text-foreground">{s.queueNumber}</span>
                        <span className="text-muted-foreground"> · {s.customerName}</span>
                        <span className="text-[11px] text-muted-foreground block">{s.services.map((sv) => sv.serviceName).join(', ')}</span>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                        s.status === 'in_progress'
                          ? 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-900'
                          : 'bg-muted text-muted-foreground border-border'
                      }`}>
                        {s.status === 'in_progress' ? 'In Service' : 'Waiting'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick actions */}
            <div className="bg-card border border-border rounded-md p-5 space-y-3">
              <h3 className="section-title">Quick Actions</h3>
              <div className="grid grid-cols-1 gap-2">
                <Button variant="outline" className="justify-start gap-2 text-sm font-medium" onClick={() => setShowAddStaffModal(true)}>
                  <Plus className="size-4" /> Add Staff Member
                </Button>
                <Button variant="outline" className="justify-start gap-2 text-sm font-medium" onClick={() => setShowAddServiceModal(true)}>
                  <Plus className="size-4" /> Create New Service
                </Button>
                <Button variant="outline" className="justify-start gap-2 text-sm font-medium" onClick={() => setShowAddExpenseModal(true)}>
                  <Plus className="size-4" /> Record Expense
                </Button>
                <Button variant="outline" className="justify-start gap-2 text-sm font-medium" onClick={() => setShowAddInventoryModal(true)}>
                  <Plus className="size-4" /> Add Stock Item
                </Button>
                <Button variant="outline" className="justify-start gap-2 text-sm font-medium" onClick={() => setAdminTab('reports')}>
                  <TrendingUp className="size-4" /> View Reports & Analytics
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: BRANCHES & BUSINESS UNITS */}
      {adminTab === 'branches' && (
        <div className="space-y-6">
          {/* REAL-TIME BRANCH OPERATIONS */}
          <div className="bg-card border border-border rounded-md p-5 space-y-4 font-sans">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
          <div className="flex items-center space-x-2">
            <h3 className="section-title">Real-Time Branch Operations</h3>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-muted text-foreground border border-border">
              <span className="w-1.5 h-1.5 rounded-full bg-brass-600" />
              Live
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-muted-foreground">Selected Branch:</span>
            <Select
              value={activeBranchId}
              onValueChange={(v) => setSelectedMetricBranchId(v)}
              items={toSelectItems(companyBranches.map((b) => ({ value: b.id, label: `${b.name} (${b.city})` })))}
            >
              <SelectTrigger className="h-8 w-auto rounded-md bg-background border border-input text-sm font-medium">
                <SelectValue placeholder="Select branch..." />
              </SelectTrigger>
              <SelectContent>
                {companyBranches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name} ({b.city})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border border border-border rounded-md overflow-hidden">
          {/* Card 1: Revenue Today */}
          <div className="bg-muted/30 p-4 flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between">
              <span className="kpi-label">Revenue Today</span>
              <div className="w-7 h-7 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                <DollarSign className="size-3.5" />
              </div>
            </div>
            <div>
              <div className="kpi-value">
                {revenueTodayEtb.toLocaleString()} <span className="text-sm font-medium text-muted-foreground">ETB</span>
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">
                Completed revenue at {currentMetricBranch?.name}
              </div>
            </div>
          </div>

          {/* Card 2: Active Visits */}
          <div className="bg-muted/30 p-4 flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between">
              <span className="kpi-label">Active Visits</span>
              <div className="w-7 h-7 rounded-md bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-900">
                <Clock className="size-3.5" />
              </div>
            </div>
            <div>
              <div className="kpi-value">
                {activeVisitsCount} <span className="text-sm font-medium text-muted-foreground">Visits</span>
              </div>
              <div className="text-[11px] text-muted-foreground mt-1 flex items-center space-x-3">
                <span><strong className="text-foreground font-semibold num">{inProgressCount}</strong> In Service</span>
                <span><strong className="text-foreground font-semibold num">{queuedCount}</strong> Waiting</span>
              </div>
            </div>
          </div>

          {/* Card 3: Staff Occupancy */}
          <div className="bg-muted/30 p-4 flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between">
              <span className="kpi-label">Staff Occupancy</span>
              <div className="w-7 h-7 rounded-md bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900">
                <Activity className="size-3.5" />
              </div>
            </div>
            <div>
              <div className="kpi-value">{staffOccupancyPct}%</div>
              <div className="w-full bg-muted h-1 mt-2 overflow-hidden">
                <div
                  className="bg-primary h-1 transition-all duration-500"
                  style={{ width: `${Math.min(100, staffOccupancyPct)}%` }}
                />
              </div>
              <div className="text-[11px] text-muted-foreground mt-1.5 flex justify-between">
                <span><strong className="text-foreground font-semibold num">{busyBranchStaffCount}</strong> Busy</span>
                <span><strong className="text-foreground font-semibold num">{totalBranchStaffCount}</strong> Total Staff</span>
              </div>
            </div>
          </div>
        </div>
      </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="section-title">Company Branches & Business Units</h3>
              <p className="text-sm text-muted-foreground">
                A single company can operate multiple branches across cities, each with specialized units (e.g. Men's Salon + Moroccan Hammam).
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => setShowAddBranchModal(true)}
                className="flex items-center space-x-1.5 px-4 py-2 bg-primary hover:bg-primary/80 text-primary-foreground font-semibold text-sm rounded-md"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Branch</span>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {companyBranches.length === 0 ? (
              <div className="col-span-full py-12 text-center bg-muted/50 border border-dashed border-border rounded-md">
                <GitBranch className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm font-medium text-foreground">No branches yet</p>
                <p className="text-xs text-muted-foreground mt-1 mb-4">Add your first branch to start structuring operations.</p>
                <Button
                  onClick={() => setShowAddBranchModal(true)}
                  className="px-4 py-2 bg-primary hover:bg-primary/80 text-primary-foreground font-semibold text-sm rounded-md"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="ml-1.5">Add Branch</span>
                </Button>
              </div>
            ) : (
              companyBranches.map((branch) => {
                const branchStaffCount = companyStaff.filter((s) => s.branchId === branch.id).length;
                const branchServiceCount = companyServices.filter((s) =>
                  companyBusinessUnits.some((bu) => bu.branchId === branch.id && bu.id === s.businessUnitId)
                ).length;
                return (
                  <div key={branch.id} className="bg-card border border-border rounded-md p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 min-w-0">
                        <div className="w-9 h-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <GitBranch className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center space-x-2">
                            <h4 className="data-primary truncate">{branch.name}</h4>
                            {branch.isMainBranch && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold whitespace-nowrap dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900">
                                Main Flagship
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5 truncate">{branch.city} — {branch.address}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 shrink-0">
                        <Button
                          onClick={() => setEditingEntity({ type: 'branch', data: branch })}
                          className="p-1.5 rounded-md bg-primary text-white hover:bg-primary/80 transition-colors"
                          title="Edit Branch"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          onClick={() => setConfirmDelete({ type: 'branch', id: branch.id, name: branch.name })}
                          className="p-1.5 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors"
                          title="Deactivate Branch"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-px bg-border border border-border rounded-md overflow-hidden">
                      <div className="bg-muted/30 py-3 text-center">
                        <div className="text-lg font-semibold tabular-nums text-foreground">{branchStaffCount}</div>
                        <div className="text-[11px] text-muted-foreground">Staff Assigned</div>
                      </div>
                      <div className="bg-muted/30 py-3 text-center">
                        <div className="text-lg font-semibold tabular-nums text-foreground">{branchServiceCount}</div>
                        <div className="text-[11px] text-muted-foreground">Services</div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: STAFF */}
      {adminTab === 'staff' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h3 className="section-title">Staff</h3>
              <p className="text-sm text-muted-foreground">
                Manage team members, commission rates, and commission payouts in one place.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-muted-foreground">Scope:</span>
                <Select value={staffScopeBranchId} onValueChange={(v) => setStaffScopeBranchId(v)} items={{ all: 'All Branches', ...toSelectItems(companyBranches.map((b) => ({ value: b.id, label: `${b.name} (${b.city})` }))) }}>
                  <SelectTrigger className="h-8 w-auto rounded-md bg-background border border-input text-sm font-medium">
                    <SelectValue placeholder="Select branch..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Branches</SelectItem>
                    {companyBranches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name} ({b.city})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => setShowAddStaffModal(true)}
                className="flex items-center space-x-1.5 px-4 py-2 bg-primary hover:bg-primary/80 text-primary-foreground font-semibold text-sm rounded-md"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Staff Member</span>
              </Button>
            </div>
          </div>

          {/* Staff KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-muted/30 border border-border rounded-md p-4 space-y-1">
              <span className="kpi-label">Team Size</span>
              <div className="kpi-value">{scopeStaff.length}</div>
              <div className="text-[11px] text-muted-foreground">
                {scopeStaffOnShift.length} on shift · {scopeStaffBusy.length} busy
              </div>
            </div>
            <div className="bg-muted/30 border border-border rounded-md p-4 space-y-1">
              <span className="kpi-label">Occupancy</span>
              <div className="kpi-value">{scopeStaff.length > 0 ? Math.round((scopeStaffBusy.length / scopeStaff.length) * 100) : 0}%</div>
              <div className="text-[11px] text-muted-foreground">{scopeStaffBusy.length} of {scopeStaff.length} staff in service</div>
            </div>
            <div className="bg-muted/30 border border-border rounded-md p-4 space-y-1">
              <span className="kpi-label">Pending Payouts</span>
              <div className="kpi-value text-amber-600">{scopePendingPayouts.toLocaleString()} <span className="text-sm font-medium text-muted-foreground">ETB</span></div>
              <div className="text-[11px] text-muted-foreground">{scopeCommissions.filter((c) => c.payoutStatus !== 'paid').length} unpaid record(s)</div>
            </div>
          </div>

          {/* Payout requests awaiting approval */}
          {Object.entries(payoutRequestsByStaffId).length > 0 && (
            <div className="bg-amber-500/5 border border-amber-300 dark:border-amber-900 rounded-md p-4 space-y-2">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Clock className="size-4 text-amber-600" />
                Payout Requests ({Object.keys(payoutRequestsByStaffId).length})
              </h3>
              <div className="divide-y divide-border">
                {Object.entries(payoutRequestsByStaffId).map(([staffId, req]) => (
                  <div key={staffId} className="py-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-sm font-semibold text-foreground">{req.name}</span>
                      <span className="text-[11px] text-muted-foreground ml-2">{req.count} log(s)</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-bold tabular-nums text-amber-700 dark:text-amber-400">{req.total.toLocaleString()} ETB</span>
                      <Button
                        size="sm"
                        className="h-8 text-xs font-semibold"
                        onClick={() => {
                          setPayoutTarget({ staffId, staffName: req.name });
                          setPayoutAmount(String(req.total));
                        }}
                      >
                        <DollarSign className="size-3.5 mr-1" />Pay now
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs font-semibold"
                        disabled={rejectingPayoutId === staffId}
                        onClick={() => handleRejectPayoutRequest(staffId, req.name)}
                      >
                        {rejectingPayoutId === staffId ? '...' : 'Reject'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Staff Table */}
          <div className="overflow-x-auto bg-card border border-border rounded-md p-5 font-sans">
            <Table className="w-full text-left text-sm text-foreground">
              <TableHeader className="">
                <TableRow>
                  <TableHead className="">Staff Member</TableHead>
                  <TableHead className="">Role</TableHead>
                  {staffScopeBranchId === 'all' && <TableHead className="">Branch</TableHead>}
                  <TableHead className="">Commission Rate</TableHead>
                  <TableHead className="">Status</TableHead>
                  <TableHead className="text-right num">Pending Payout</TableHead>
                  <TableHead className="">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="">
                {scopeStaff.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={staffScopeBranchId === 'all' ? 7 : 6} className="py-12 text-center text-muted-foreground text-sm">
                      No staff members yet — add your team to start tracking commissions and shifts.
                    </TableCell>
                  </TableRow>
                ) : (
                  scopeStaff.map((staffMember) => {
                    const staffBr = companyBranches.find((b) => b.id === staffMember.branchId);
                    const serving = scopeInProgressByStaff[staffMember.id];
                    const payoutDue = payoutDueByStaffId[staffMember.id] || 0;
                    const statusColor =
                      staffMember.status === 'available'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900'
                        : staffMember.status === 'busy'
                        ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900'
                        : 'bg-muted text-muted-foreground border-border';
                    return (
                      <TableRow key={staffMember.id} className="hover:bg-muted/40">
                        <TableCell className="">
                          <div className="flex items-center space-x-3">
                            <img
                              src={staffMember.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'}
                              alt={staffMember.name}
                              className="w-9 h-9 rounded-full object-cover border border-border shrink-0"
                            />
                            <div>
                              <div className="font-medium text-foreground">{staffMember.name}</div>
                              <div className="text-[11px] text-muted-foreground">{staffMember.phone}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-foreground font-medium capitalize">{staffMember.role}</TableCell>
                        {staffScopeBranchId === 'all' && (
                          <TableCell className="text-muted-foreground">{staffBr?.name || staffMember.branchId}</TableCell>
                        )}
                        <TableCell className="">
                          <div>
                            <div className="text-foreground font-medium">{staffMember.defaultCommissionPercentage}%</div>
                            {commissionRules.find((r) => r.companyId === company.id && r.targetType === 'staff' && r.targetId === staffMember.id && r.isActive) && (
                              <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                                {(() => {
                                  const r = commissionRules.find((x) => x.targetType === 'staff' && x.targetId === staffMember.id && x.isActive);
                                  return r ? (r.type === 'percentage' ? `Rule: ${r.value}%` : `Rule: ${r.value.toLocaleString()} ETB`) : '';
                                })()}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold capitalize border ${statusColor}`}>
                            {staffMember.status}
                          </span>
                          {serving && (
                            <div className="text-[11px] text-amber-700 dark:text-amber-400 mt-1">
                              Serving: {serving.customerName}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {payoutDue > 0 ? (
                            <span className="inline-flex items-center gap-2">
                              <span className="font-mono font-semibold num text-amber-700 dark:text-amber-400">{payoutDue.toLocaleString()} ETB</span>
                              <Button
                                onClick={() => {
                                  setPayoutAmount(String(payoutDue));
                                  setPayoutNote('');
                                  setPayoutTarget({ staffId: staffMember.id, staffName: staffMember.name });
                                }}
                                className="px-2.5 py-1 h-auto rounded-md bg-emerald-600 text-white hover:bg-emerald-700 text-xs transition-colors"
                                title={`Pay pending commission (${payoutDue.toLocaleString()} ETB)`}
                              >
                                <DollarSign className="w-3.5 h-3.5" />
                                Pay
                              </Button>
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell className="">
                          <div className="flex items-center space-x-1.5">
                            <Button
                              onClick={() => setEditingEntity({ type: 'staff', data: staffMember })}
                              className="p-1.5 rounded-md bg-primary text-white hover:bg-primary/80 transition-colors"
                              title="Edit Staff & Commission Rules"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              onClick={() => setConfirmDelete({ type: 'staff', id: staffMember.id, name: staffMember.name })}
                              className="p-1.5 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors"
                              title="Deactivate Staff"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Payout Summary */}
          <div className="bg-card border border-border rounded-md p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="section-title">Payroll Overview</h4>
              <p className="text-sm text-muted-foreground">
                Use the payout button on each staff row to settle commissions in a single step — daily, weekly, or all accumulated.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={handleExportPayrollCsv}
                className="flex items-center space-x-1.5 px-4 py-2 bg-primary hover:bg-primary/80 text-primary-foreground text-sm font-medium rounded-md cursor-pointer transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Payroll CSV</span>
              </Button>
              <div className="text-sm text-foreground font-semibold num bg-muted px-3 h-8 flex items-center rounded-md border border-border">
                Total Earned: {scopeCommissionTotal.toLocaleString()} ETB
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SERVICES */}
      {adminTab === 'services' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="section-title">Service Pricing Catalog & Rules</h3>
              <p className="text-sm text-muted-foreground">
                Services configure default duration, price in ETB, staff commission calculation rules, and required inventory items.
              </p>
            </div>
            <Button
              onClick={() => setShowAddServiceModal(true)}
              className="flex items-center space-x-1.5 px-4 py-2 bg-primary hover:bg-primary/80 text-primary-foreground font-semibold text-sm rounded-md"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Service</span>
            </Button>
          </div>

          <div className="overflow-x-auto bg-card border border-border rounded-md p-5  font-sans">
            <Table className="w-full text-left text-sm text-foreground">
              <TableHeader className="">
                <TableRow>
                  <TableHead className="">Service Name</TableHead>
                  <TableHead className="">Category</TableHead>
                  <TableHead className="">Price (ETB)</TableHead>
                  <TableHead className="">Duration</TableHead>
                  <TableHead className="">Staff Commission</TableHead>
                  <TableHead className="">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="">
                {branchServices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center text-muted-foreground text-sm">
                      No services in the catalog yet — create your first service to start booking.
                    </TableCell>
                  </TableRow>
                ) : (
                  branchServices.map((srv) => {
                  return (
                    <TableRow key={srv.id} className="hover:bg-muted/40">
                      <TableCell className=" font-medium text-foreground flex items-center space-x-2">
                        <Scissors className="w-3.5 h-3.5 text-foreground" />
                        <span>{srv.name}</span>
                      </TableCell>
                      <TableCell className=" text-muted-foreground">{srv.category}</TableCell>
                      <TableCell className=" text-foreground font-medium">{srv.priceEtb.toLocaleString()} ETB</TableCell>
                      <TableCell className=" text-muted-foreground">{srv.durationMinutes} mins</TableCell>
                      <TableCell className=" text-foreground font-medium">{srv.commissionValue}% Rate</TableCell>
                      <TableCell className="">
                        <div className="flex items-center space-x-1">
                          <Button onClick={() => setEditingEntity({ type: 'service', data: srv })} className="p-1 rounded-md bg-primary text-white hover:bg-primary/80">
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button onClick={() => setConfirmDelete({ type: 'service', id: srv.id, name: srv.name })} className="p-1 rounded-md bg-red-600 text-white hover:bg-red-700">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* TAB 4: INVENTORY */}
      {adminTab === 'inventory' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="section-title">Branch Stock & Auto-Deduction Inventory</h3>
              <p className="text-sm text-muted-foreground">
                Stock decrements automatically upon completing visit sessions. Reorder alerts trigger when threshold is reached.
              </p>
            </div>
            <Button
              onClick={() => setShowAddInventoryModal(true)}
              className="flex items-center space-x-1.5 px-4 py-2 bg-primary hover:bg-primary/80 text-primary-foreground font-semibold text-sm rounded-md"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Stock Item</span>
            </Button>
          </div>

          {/* Low Stock Alert Banner */}
          {lowStockInventory.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3.5 dark:bg-amber-950/40 dark:border-amber-900">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 dark:bg-amber-900/60 dark:text-amber-400">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-sm text-amber-900 dark:text-amber-400">
                      {lowStockInventory.length} item{lowStockInventory.length > 1 ? 's' : ''} below reorder threshold
                    </h4>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {lowStockInventory.map((item) => (
                        <span
                          key={item.id}
                          className="px-2.5 py-0.5 bg-white border border-amber-200 rounded-md text-xs font-medium text-amber-900 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-300"
                        >
                          {item.name}: <span className="font-mono">{item.currentStock} {item.unit}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => lowStockInventory.forEach((i) => onUpdateInventoryStock(i.id, 50))}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-medium text-sm rounded-md cursor-pointer shrink-0"
                >
                  Restock All (+50)
                </Button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto bg-card border border-border rounded-md font-sans">
            <Table className="w-full text-left text-sm text-foreground">
              <TableHeader className="">
                <TableRow>
                  <TableHead className="px-4 py-3.5">Item & SKU</TableHead>
                  <TableHead className="px-4 py-3.5 text-center">Unit</TableHead>
                  <TableHead className="px-4 py-3.5 text-center">In Stock</TableHead>
                  <TableHead className="px-4 py-3.5 text-center">Reorder Level</TableHead>
                  <TableHead className="px-4 py-3.5 text-right">Unit Cost</TableHead>
                  <TableHead className="px-4 py-3.5 text-center">Status</TableHead>
                  <TableHead className="px-4 py-3.5 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="">
                {branchInventory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-14 text-center text-muted-foreground text-sm">
                      <Package className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm font-medium text-foreground">No stock items yet</p>
                      <p className="text-xs text-muted-foreground mt-1 mb-4">Add consumables to enable auto-deduction on checkouts.</p>
                      <Button
                        onClick={() => setShowAddInventoryModal(true)}
                        className="px-4 py-2 bg-primary hover:bg-primary/80 text-primary-foreground font-semibold text-sm rounded-md"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span className="ml-1.5">Add Stock Item</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  branchInventory.map((item) => {
                    const isLow = item.currentStock <= item.reorderLevel;
                    const isOut = item.currentStock <= 0;
                    return (
                      <TableRow key={item.id} className={`hover:bg-muted/40 border-b border-border/50 ${isLow ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''}`}>
                        <TableCell className="px-4 py-3.5 font-medium text-foreground/90">
                          <div className="flex items-center space-x-2">
                            <Package className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span>{item.name}</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono mt-0.5">SKU: {item.sku}</div>
                        </TableCell>
                        <TableCell className="px-4 py-3.5 text-center font-mono text-muted-foreground">{item.unit}</TableCell>
                        <TableCell className="px-4 py-3.5 text-center">
                          <span className={`font-mono font-semibold text-sm ${isOut ? 'text-red-600' : isLow ? 'text-amber-600 dark:text-amber-400' : 'text-foreground/90'}`}>
                            {item.currentStock}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3.5 text-center font-mono text-muted-foreground">{item.reorderLevel}</TableCell>
                        <TableCell className="px-4 py-3.5 text-right font-mono text-muted-foreground">{item.unitCostEtb.toLocaleString()} ETB</TableCell>
                        <TableCell className="px-4 py-3.5 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                            isOut
                              ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900'
                              : isLow
                              ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900'
                          }`}>
                            {isOut ? (
                              <><AlertTriangle className="w-3 h-3" />Out of Stock</>
                            ) : isLow ? (
                              <><AlertTriangle className="w-3 h-3" />Low</>
                            ) : (
                              'In Stock'
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3.5">
                          <div className="flex items-center justify-end space-x-1.5">
                            <Button
                              onClick={() => onUpdateInventoryStock(item.id, 50)}
                              className="px-2.5 py-1.5 bg-muted hover:bg-muted text-foreground text-xs font-semibold rounded-md border border-border cursor-pointer"
                            >
                              + Restock 50
                            </Button>
                            <Button
                              onClick={() => { setUseStockItem(item); setUseStockQty(1); }}
                              className="px-2.5 py-1.5 bg-foreground text-background hover:bg-foreground/80 text-xs font-semibold rounded-md cursor-pointer"
                              title="Deduct stock used"
                            >
                              <Minus className="w-3 h-3" /> Use
                            </Button>
                            <Button
                              onClick={() => setEditingEntity({ type: 'inventory', data: item })}
                              className="p-1.5 rounded-md bg-primary text-white hover:bg-primary/80 transition-colors"
                              title="Edit Item"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              onClick={() => setConfirmDelete({ type: 'inventory', id: item.id, name: item.name })}
                              className="p-1.5 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors"
                              title="Deactivate Item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* TAB 7: REPORTS & ANALYTICS */}
      {adminTab === 'reports' && (
        <ReportsDashboard
          company={company}
          branches={branches}
          staffList={staffList}
          services={services}
          visitSessions={visitSessions}
          expenses={expenses}
        />
      )}
      {adminTab === 'financials' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border border border-border rounded-md overflow-hidden font-sans">
            <div className="bg-muted/30 p-5">
              <div className="flex items-center justify-between">
                <div className="kpi-label">Total Gross Sales</div>
                <div className="w-7 h-7 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                  <TrendingUp className="size-3.5" />
                </div>
              </div>
              <div className="kpi-value mt-1">
                {totalCompletedRevenueEtb.toLocaleString()} ETB
              </div>
            </div>

            <div className="bg-muted/30 p-5">
              <div className="flex items-center justify-between">
                <div className="kpi-label">Total Operating Expenses</div>
                <div className="w-7 h-7 rounded-md bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900">
                  <AlertTriangle className="size-3.5" />
                </div>
              </div>
              <div className="kpi-value mt-1">
                {totalExpensesEtb.toLocaleString()} ETB
              </div>
            </div>

            <div className="bg-muted/30 p-5">
              <div className="flex items-center justify-between">
                <div className="kpi-label">Net Profit (Sales - Expenses)</div>
                <div className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900">
                  <CheckCircle className="size-3.5" />
                </div>
              </div>
              <div className="kpi-value mt-1">
                {(totalCompletedRevenueEtb - totalExpensesEtb).toLocaleString()} ETB
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-md p-6  space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="section-title">Operating & Recurring Expense Ledger</h4>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={handleRunRecurringExpensesTrigger}
                  className="flex items-center space-x-1.5 px-3.5 py-2 bg-muted hover:bg-muted text-foreground border border-border text-sm font-semibold rounded-md cursor-pointer transition-colors"
                  title="Simulate automated creation trigger for recurring schedules"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Run Recurring Trigger Check</span>
                </Button>

                <Button
                  onClick={() => setShowAddExpenseModal(true)}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-primary hover:bg-primary/80 text-primary-foreground text-sm font-medium rounded-md cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Record Expense</span>
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto font-sans">
              <Table className="w-full text-left text-sm text-foreground">
                <TableHeader className="">
                  <TableRow className="border-b border-border">
                    <TableHead className="pb-3">Description</TableHead>
                    <TableHead className="pb-3">Category</TableHead>
                    <TableHead className="pb-3">Amount (ETB)</TableHead>
                    <TableHead className="pb-3">Payment Method</TableHead>
                    <TableHead className="pb-3">Recurrence Schedule</TableHead>
                    <TableHead className="pb-3">Recorded By</TableHead>
                    <TableHead className="pb-3">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="">
                  {branchExpenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-14 text-center text-muted-foreground text-sm">
                        No expenses recorded yet — record your first operating expense above.
                      </TableCell>
                    </TableRow>
                  ) : (
                    branchExpenses.map((exp) => (
                    <TableRow key={exp.id} className="hover:bg-muted/40 border-b border-border/50">
                      <TableCell className="px-3.5 py-3.5 font-medium text-foreground/90">
                        <div className="flex items-center space-x-1.5">
                          {exp.isRecurring && <Repeat className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
                          <span>{exp.description}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-3.5 py-3.5 uppercase text-[10px] text-muted-foreground/90 font-medium">{exp.category}</TableCell>
                      <TableCell className="px-3.5 py-3.5 text-muted-foreground font-semibold">{exp.amountEtb.toLocaleString()} ETB</TableCell>
                      <TableCell className="px-3.5 py-3.5 uppercase text-muted-foreground/90">{exp.paymentMethod}</TableCell>
                      <TableCell className="px-3.5 py-3.5">
                        {exp.isRecurring ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-full text-[10px] font-medium bg-muted text-muted-foreground border-border">
                            <Repeat className="w-3 h-3" />
                            <span className="capitalize">{exp.recurrenceFrequency} (Next: {exp.nextDueDate || 'Pending'})</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-[10px]">One-off</span>
                        )}
                      </TableCell>
                      <TableCell className="px-3.5 py-3.5 text-muted-foreground/90">{exp.recordedBy}</TableCell>
                      <TableCell className="px-3.5 py-3.5 text-muted-foreground/90">{exp.date}</TableCell>
                    </TableRow>
                  ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: SECURITY AUDIT */}
      {adminTab === 'audit' && (
        <div className="space-y-6 font-sans">
          <div className="bg-card border border-border rounded-md p-6  space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <h3 className="section-title">Security Audit Trail & Sensitive Action Log</h3>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Immutable security record capturing inventory adjustments, staff commission edits, payment overrides, and tenant system updates.
                </p>
              </div>

              <Button
                onClick={handleExportSecurityAuditCsv}
                className="flex items-center space-x-2 px-4 py-2.5 bg-primary hover:bg-primary/80 text-primary-foreground text-sm font-medium rounded-md cursor-pointer self-start md:self-auto"
              >
                <Download className="w-4 h-4" />
                <span>Export Audit CSV</span>
              </Button>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-border">
              <div className="flex flex-wrap items-center gap-1.5 text-sm">
                <span className="text-muted-foreground font-semibold mr-1">Action Type:</span>
                {[
                  { id: 'all', label: 'All Actions' },
                  { id: 'inventory_adjustment', label: 'Inventory' },
                  { id: 'commission_change', label: 'Commissions' },
                  { id: 'payment_edit', label: 'Payments' },
                  { id: 'expense_added', label: 'Expenses' },
                ].map((type) => (
                  <Button
                    key={type.id}
                    onClick={() => setAuditFilterType(type.id)}
                    className={`px-3 h-9 text-xs font-medium rounded-md cursor-pointer transition-colors ${
                      auditFilterType === type.id
                        ? 'bg-foreground text-background'
                        : 'bg-muted text-muted-foreground hover:bg-border'
                    }`}
                  >
                    {type.label}
                  </Button>
                ))}
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="text"
                  placeholder="Search logs by staff or keyword..."
                  value={auditSearchQuery}
                  onChange={(e) => setAuditSearchQuery(e.target.value)}
                  className="bg-muted border border-border text-foreground text-sm rounded-md pl-8 pr-3 py-1.5 outline-none focus:border-primary w-full sm:w-64"
                />
              </div>
            </div>

            {/* Audit Log Table */}
            <div className="overflow-x-auto bg-card rounded-md border border-border">
              <Table className="w-full text-left text-sm text-foreground">
                <TableHeader className="">
                  <TableRow>
                    <TableHead className="">Timestamp</TableHead>
                    <TableHead className="">Action Type</TableHead>
                    <TableHead className="">Description</TableHead>
                    <TableHead className="">Performed By</TableHead>
                    <TableHead className="">Details / Reference</TableHead>
                    <TableHead className="">IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="">
                  {filteredAuditLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-12 text-center text-muted-foreground text-sm">
                        No audit events match the current filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAuditLogs.map((log) => {
                      const getBadgeColor = (type: string) => {
                        switch (type) {
                          case 'inventory_adjustment':
                            return 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-400 dark:border-teal-900';
                          case 'commission_change':
                            return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900';
                          case 'payment_edit':
                            return 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-900';
                          case 'expense_added':
                            return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900';
                          default:
                            return 'bg-muted text-muted-foreground border-border';
                        }
                      };

                      return (
                        <TableRow key={log.id} className="hover:bg-muted/40">
                          <TableCell className=" text-muted-foreground font-mono whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString()}
                          </TableCell>
                          <TableCell className="">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium border uppercase tracking-wider ${getBadgeColor(
                                log.actionType
                              )}`}
                            >
                              {log.actionType.replace('_', ' ')}
                            </span>
                          </TableCell>
                          <TableCell className=" font-semibold text-foreground">{log.description}</TableCell>
                          <TableCell className=" text-foreground font-medium">{log.performedBy}</TableCell>
                          <TableCell className=" text-muted-foreground max-w-xs truncate">{log.details || '-'}</TableCell>
                          <TableCell className=" text-muted-foreground font-mono text-[10px]">
                            {log.ipAddress || '—'}
                          </TableCell>
                        </TableRow>
                      );
                    })
                    )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 9: USER MANAGEMENT */}
      {adminTab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="section-title">User Management</h3>
              <p className="text-sm text-muted-foreground">
                Manage system users, roles, and access permissions for this tenant.
              </p>
            </div>
            <Button
              onClick={() => setShowAddUserModal(true)}
              className="flex items-center space-x-1.5 px-4 py-2 bg-primary hover:bg-primary/80 text-primary-foreground font-semibold text-sm rounded-md"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add User</span>
            </Button>
          </div>

          <div className="overflow-x-auto bg-card border border-border rounded-md p-5  font-sans">
            <Table className="w-full text-left text-sm text-foreground">
              <TableHeader className="">
                <TableRow>
                  <TableHead className="">Name</TableHead>
                  <TableHead className="">Email</TableHead>
                  <TableHead className="">Role</TableHead>
                  <TableHead className="">Status</TableHead>
                  <TableHead className="">Last Login</TableHead>
                  <TableHead className="">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="">
                {companyUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center text-muted-foreground text-sm">
                      No users yet — invite your first user to collaborate.
                    </TableCell>
                  </TableRow>
                ) : (
                  companyUsers.map((usr) => (
                  <TableRow key={usr.id} className="hover:bg-muted/40">
                    <TableCell className=" font-medium text-foreground">{usr.name}</TableCell>
                    <TableCell className=" text-muted-foreground">{usr.email}</TableCell>
                    <TableCell className="">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                        usr.role === 'super_admin' ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900' :
                        usr.role === 'owner' ? 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-400 dark:border-violet-900' :
                        usr.role === 'manager' ? 'bg-primary/10 text-primary border-primary/20' :
                        usr.role === 'reception' ? 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-900' :
                        'bg-muted text-muted-foreground border-border'
                      }`}>
                        {usr.role === 'manager' ? 'Manager' : usr.role === 'owner' ? 'Owner' : usr.role === 'super_admin' ? 'Super Admin' : usr.role === 'reception' ? 'Receptionist' : usr.role}
                      </span>
                    </TableCell>
                    <TableCell className="">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                        usr.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900' : 'bg-red-50 text-red-800 border-red-200'
                      }`}>
                        {usr.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </TableCell>
                    <TableCell className=" text-muted-foreground">{usr.lastLoginAt ? new Date(usr.lastLoginAt).toLocaleDateString() : 'Never'}</TableCell>
                    <TableCell className="">
                      <Button
                        onClick={() => setEditingEntity({ type: 'user', data: usr })}
                        className="p-1.5 rounded-md bg-primary text-white hover:bg-primary/80 transition-colors"
                        title="Edit User"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* REVIEWS & COMPLAINTS */}
      {adminTab === 'feedback' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="section-title">Reviews & Complaints</h3>
              <p className="text-sm text-muted-foreground">
                Customer ratings and complaints captured from the walk-in tablet (per visit).
              </p>
            </div>
            <Button
              variant="outline"
              onClick={async () => {
                setFeedbackLoading(true);
                try {
                  const res = await apiFetch(`/api/feedback?companyId=${encodeURIComponent(company.id)}`);
                  const data = await res.json();
                  setFeedbackItems(res.ok ? (data?.feedback ?? []) : []);
                  showToast('success', 'Feedback refreshed');
                } catch {
                  showToast('error', 'Could not refresh feedback');
                } finally {
                  setFeedbackLoading(false);
                }
              }}
              className="flex items-center space-x-1.5 px-4 py-2 text-sm font-medium"
            >
              <RefreshCw className={feedbackLoading ? 'w-3.5 h-3.5 animate-spin' : 'w-3.5 h-3.5'} />
              <span>Refresh</span>
            </Button>
          </div>

          <div className="overflow-x-auto bg-card border border-border rounded-md p-5 font-sans">
            {feedbackItems.length === 0 ? (
              <p className="py-12 text-center text-muted-foreground text-sm">
                {feedbackLoading ? 'Loading reviews…' : 'No reviews yet — share the tablet link with customers to collect feedback.'}
              </p>
            ) : (
              <Table className="w-full text-left text-sm text-foreground">
                <TableHeader>
                  <TableRow>
                    <TableHead>Rating</TableHead>
                    <TableHead>Complaint / Comment</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Ticket</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feedbackItems.map((f) => {
                    const branchName = branches.find((b) => b.id === f.branchId)?.name || f.branchId;
                    const stars = Array.from({ length: 5 }, (_, i) => i + 1);
                    return (
                      <TableRow key={f.id} className="hover:bg-muted/40 align-top">
                        <TableCell>
                          <span className="flex items-center gap-0.5">
                            {stars.map((n) => (
                              <Star
                                key={n}
                                className={`size-4 ${n <= f.rating ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground/30'}`}
                              />
                            ))}
                          </span>
                          {!f.isAnonymous && f.rating < 4 && (
                            <span className="block mt-1 text-[10px] font-semibold text-red-600 dark:text-red-400">
                              Needs attention
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          {f.complaint ? (
                            <span className="text-foreground">{f.complaint}</span>
                          ) : (
                            <span className="text-muted-foreground italic">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {f.isAnonymous ? (
                            <span className="text-muted-foreground">Anonymous</span>
                          ) : (
                            <span>
                              {f.customerName || 'Walk-in'}
                              {f.customerPhone && (
                                <span className="block text-xs text-muted-foreground">{f.customerPhone}</span>
                              )}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-foreground">{f.queueNumber || '—'}</TableCell>
                        <TableCell className="text-muted-foreground">{branchName}</TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {f.createdAt ? new Date(f.createdAt).toLocaleDateString() : ''}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      )}

      {/* MODAL: ADD BRANCH */}
      {showAddBranchModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-md max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="section-title">Add New Branch</h3>
            <form onSubmit={handleCreateBranch} className="space-y-3 font-sans">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">Branch Name</label>
                <Input
                  type="text"
                  required
                  placeholder="e.g. Kazanchis Executive Branch"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  className="w-full bg-background border-input text-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">City</label>
                <Select
                  value={branchCity}
                  onValueChange={(v) => setBranchCity(v)}
                >
                  <SelectTrigger className="w-full bg-background border-input text-foreground">
                    <SelectValue placeholder="Select city" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Addis Ababa">Addis Ababa</SelectItem>
                    <SelectItem value="Hawassa">Hawassa</SelectItem>
                    <SelectItem value="Adama">Adama</SelectItem>
                    <SelectItem value="Bahir Dar">Bahir Dar</SelectItem>
                    <SelectItem value="Dire Dawa">Dire Dawa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">Daily Expense Limit (ETB)</label>
                <Input
                  type="number"
                  min="0"
                  placeholder="e.g. 2000 — daily cap for receptionist expenses (0 = unlimited)"
                  value={branchExpenseLimit}
                  onChange={(e) => setBranchExpenseLimit(e.target.value)}
                  className="w-full bg-background border-input text-foreground"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  onClick={() => setShowAddBranchModal(false)}
                  className="px-4 py-2 bg-muted text-muted-foreground font-semibold rounded-md"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="px-5 py-2 bg-primary hover:bg-primary/80 text-primary-foreground font-semibold rounded-md"
                >
                  Save Branch
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD STAFF */}
      {showAddStaffModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-md max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="section-title">Add Staff Member</h3>
            <form onSubmit={handleCreateStaff} className="space-y-3 font-sans">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">Full Name</label>
                <Input
                  type="text"
                  required
                  placeholder="e.g. Solomon Kassa"
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  className="w-full bg-background border-input text-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">Phone Number</label>
                <Input
                  type="text"
                  placeholder="+251 91 222 3333"
                  value={staffPhone}
                  onChange={(e) => setStaffPhone(e.target.value)}
                  className="w-full bg-background border-input text-foreground"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1">Role</label>
                  <Select
                    value={staffRole}
                    onValueChange={(v) => setStaffRole(v)}
                    items={{ barber: 'Barber', hairstylist: 'Hairstylist', masseuse: 'Masseuse', esthetician: 'Esthetician', reception: 'Receptionist' }}
                  >
                    <SelectTrigger className="w-full bg-background border-input text-foreground">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="barber">Barber</SelectItem>
                      <SelectItem value="hairstylist">Hairstylist</SelectItem>
                      <SelectItem value="masseuse">Masseuse</SelectItem>
                      <SelectItem value="esthetician">Esthetician</SelectItem>
                      <SelectItem value="reception">Receptionist</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1">Commission (%)</label>
                  <Input
                    type="number"
                    value={staffCommission}
                    onChange={(e) => setStaffCommission(Number(e.target.value))}
                    className="w-full bg-background border-input text-foreground"
                  />
                </div>
              </div>

              {/* Commission Rule */}
              <div className="border-t border-border pt-3 space-y-3">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={staffRuleEnabled}
                    onChange={(e) => setStaffRuleEnabled(e.target.checked)}
                    className="accent-primary"
                  />
                  <span className="text-sm font-semibold text-foreground">Custom commission rule</span>
                </label>
                {staffRuleEnabled && (
                  <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-semibold text-foreground mb-1">Rule Type</label>
                        <Select value={staffRuleType} onValueChange={(v) => setStaffRuleType(v as any)} items={{ percentage: 'Percentage (%)', fixed_amount: 'Fixed Amount (ETB)' }}>
                          <SelectTrigger className="w-full bg-background border-input text-foreground">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">Percentage (%)</SelectItem>
                            <SelectItem value="fixed_amount">Fixed Amount (ETB)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-foreground mb-1">
                          {staffRuleType === 'percentage' ? 'Rate (%)' : 'Amount (ETB)'}
                        </label>
                        <Input
                          type="number"
                          required
                          value={staffRuleValue}
                          onChange={(e) => setStaffRuleValue(Number(e.target.value))}
                          className="w-full bg-background border-input text-foreground"
                        />
                      </div>
                    </div>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={staffRuleActive}
                        onChange={(e) => setStaffRuleActive(e.target.checked)}
                        className="accent-primary"
                      />
                      <span className="text-sm text-muted-foreground">Rule active immediately</span>
                    </label>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  className="px-4 py-2 bg-muted text-muted-foreground font-semibold rounded-md"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="px-5 py-2 bg-primary hover:bg-primary/80 text-primary-foreground font-semibold rounded-md"
                >
                  Save Staff Member
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD SERVICE */}
      {showAddServiceModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-md max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="section-title">Create New Service</h3>
            <form onSubmit={handleCreateService} className="space-y-3 font-sans">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">Service Title</label>
                <Input
                  type="text"
                  required
                  placeholder="e.g. Hot Stone Full-Body Massage"
                  value={srvName}
                  onChange={(e) => setSrvName(e.target.value)}
                  className="w-full bg-background border-input text-foreground"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1">Price (ETB)</label>
                  <Input
                    type="number"
                    value={srvPrice}
                    onChange={(e) => setSrvPrice(Number(e.target.value))}
                    className="w-full bg-background border-input text-foreground"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1">Duration (Mins)</label>
                  <Input
                    type="number"
                    value={srvDuration}
                    onChange={(e) => setSrvDuration(Number(e.target.value))}
                    className="w-full bg-background border-input text-foreground"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  onClick={() => setShowAddServiceModal(false)}
                  className="px-4 py-2 bg-muted text-muted-foreground font-semibold rounded-md"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="px-5 py-2 bg-primary hover:bg-primary/80 text-primary-foreground font-semibold rounded-md"
                >
                  Publish Service
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD INVENTORY */}
      {showAddInventoryModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-md max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="section-title">Add Inventory Stock Item</h3>
            <form onSubmit={handleCreateInventory} className="space-y-3 font-sans">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">Item Name</label>
                <Input
                  type="text"
                  required
                  placeholder="e.g. Organic Eucalyptus Massage Oil"
                  value={invName}
                  onChange={(e) => setInvName(e.target.value)}
                  className="w-full bg-background border-input text-foreground"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1">Unit</label>
                  <Input
                    type="text"
                    placeholder="ml / pcs"
                    value={invUnit}
                    onChange={(e) => setInvUnit(e.target.value)}
                    className="w-full bg-background border-input text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1">Initial Stock</label>
                  <Input
                    type="number"
                    value={invStock}
                    onChange={(e) => setInvStock(Number(e.target.value))}
                    className="w-full bg-background border-input text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1">Reorder Level</label>
                  <Input
                    type="number"
                    value={invReorder}
                    onChange={(e) => setInvReorder(Number(e.target.value))}
                    className="w-full bg-background border-input text-foreground"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  onClick={() => setShowAddInventoryModal(false)}
                  className="px-4 py-2 bg-muted text-muted-foreground font-semibold rounded-md"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="px-5 py-2 bg-primary hover:bg-primary/80 text-primary-foreground font-semibold rounded-md"
                >
                  Save Stock Item
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: USE STOCK (DEDUCTION) */}
      {useStockItem && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-md max-w-sm w-full p-6 space-y-4 shadow-xl">
            <h3 className="section-title">Use Stock</h3>
            <p className="text-sm text-muted-foreground">
              Record stock consumed for <span className="font-medium text-foreground">{useStockItem.name}</span> (SKU: {useStockItem.sku}).
              Current stock: <span className="font-mono font-medium text-foreground">{useStockItem.currentStock} {useStockItem.unit}</span>
            </p>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-1">Quantity Used ({useStockItem.unit})</label>
              <Input
                type="number"
                min={1}
                max={useStockItem.currentStock}
                value={useStockQty}
                onChange={(e) => setUseStockQty(Number(e.target.value))}
                className="w-full bg-background border-input text-foreground font-mono"
              />
              {useStockQty > useStockItem.currentStock && (
                <p className="text-xs text-red-600 mt-1">Quantity exceeds current stock ({useStockItem.currentStock}).</p>
              )}
            </div>

            <div className="flex gap-2">
              {[1, 2, 5, 10].map((q) => (
                <Button
                  key={q}
                  type="button"
                  onClick={() => setUseStockQty(q)}
                  className={`flex-1 px-2 py-1.5 rounded-md text-xs font-semibold border ${
                    useStockQty === q ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground border-border'
                  }`}
                >
                  {q} {useStockItem.unit}
                </Button>
              ))}
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-border">
              <Button
                type="button"
                onClick={() => setUseStockItem(null)}
                className="px-4 py-2 bg-muted text-muted-foreground font-semibold rounded-md"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={useStockQty <= 0 || useStockQty > useStockItem.currentStock}
                onClick={() => {
                  onUpdateInventoryStock(useStockItem.id, -useStockQty);
                  setUseStockItem(null);
                  setUseStockQty(1);
                }}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-md"
              >
                <Minus className="w-3.5 h-3.5" />
                Deduct {useStockQty} {useStockItem.unit}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD EXPENSE WITH RECURRING SUPPORT */}
      {showAddExpenseModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-md max-w-lg w-full p-6 space-y-4 shadow-xl font-sans">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="section-title">Record Operating Expense</h3>
                <p className="text-sm text-muted-foreground">Support one-off expenses and automated recurring schedules.</p>
              </div>
              <Button
                onClick={() => setShowAddExpenseModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-medium"
              >
                ✕
              </Button>
            </div>

            <form onSubmit={handleCreateExpenseSubmit} className="space-y-3 text-sm">
              <div>
                <label className="block font-semibold text-foreground mb-1">Expense Description</label>
                <Input
                  type="text"
                  required
                  placeholder="e.g. Monthly Commercial Rent - Kazanchis Branch"
                  value={expDescription}
                  onChange={(e) => setExpDescription(e.target.value)}
                  className="w-full bg-background border-input text-foreground"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-foreground mb-1">Category</label>
                  <Select
                    value={expCategory}
                    onValueChange={(v) => setExpCategory(v as any)}
                    items={{ rent: 'Rent & Facility', utilities: 'Utilities & Electricity', salary: 'Staff Salaries & Advances', inventory_purchase: 'Inventory Supplies', marketing: 'Marketing & Ads', other: 'Other Overhead' }}
                  >
                    <SelectTrigger className="w-full bg-background border-input text-foreground">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rent">Rent & Facility</SelectItem>
                      <SelectItem value="utilities">Utilities & Electricity</SelectItem>
                      <SelectItem value="salary">Staff Salaries & Advances</SelectItem>
                      <SelectItem value="inventory_purchase">Inventory Supplies</SelectItem>
                      <SelectItem value="marketing">Marketing & Ads</SelectItem>
                      <SelectItem value="other">Other Overhead</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block font-semibold text-foreground mb-1">Amount (ETB)</label>
                  <Input
                    type="number"
                    required
                    value={expAmount}
                    onChange={(e) => setExpAmount(Number(e.target.value))}
                    className="w-full bg-background border-input text-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-foreground mb-1">Payment Method</label>
                  <Select
                    value={expPaymentMethod}
                    onValueChange={(v) => setExpPaymentMethod(v as any)}
                    items={{ cbe_birr: 'CBE Birr', telebirr: 'Telebirr', cash: 'Cash', card: 'Card / POS' }}
                  >
                    <SelectTrigger className="w-full bg-background border-input text-foreground">
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cbe_birr">CBE Birr</SelectItem>
                      <SelectItem value="telebirr">Telebirr</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card / POS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block font-semibold text-foreground mb-1">Recorded By</label>
                  <Input
                    type="text"
                    value={expRecordedBy}
                    onChange={(e) => setExpRecordedBy(e.target.value)}
                    className="w-full bg-background border-input text-foreground"
                  />
                </div>
              </div>

              {/* RECURRENCE TOGGLE */}
              <div className="p-3.5 bg-muted border border-border rounded-md space-y-2.5">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <Input
                    type="checkbox"
                    checked={expIsRecurring}
                    onChange={(e) => setExpIsRecurring(e.target.checked)}
                    className="w-4 h-4 accent-foreground"
                  />
                  <span className="font-semibold text-foreground">Set as Recurring Expense Schedule</span>
                </label>

                {expIsRecurring && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border">
                    <div>
                      <label className="block font-semibold text-foreground mb-1">Recurrence Frequency</label>
                      <Select
                        value={expRecurrenceFreq}
                        onValueChange={(v) => setExpRecurrenceFreq(v as any)}
                        items={{ weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly' }}
                      >
                        <SelectTrigger className="w-full bg-background border-input text-foreground">
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block font-semibold text-foreground mb-1">Next Due Date</label>
                      <Input
                        type="date"
                        value={expNextDueDate}
                        onChange={(e) => setExpNextDueDate(e.target.value)}
                        className="w-full"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  onClick={() => setShowAddExpenseModal(false)}
                  className="px-4 py-2 bg-muted text-muted-foreground font-semibold rounded-md"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="px-5 py-2 bg-primary hover:bg-primary/80 text-primary-foreground font-semibold rounded-md"
                >
                  Save Expense
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD USER */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-md max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="section-title">Add New User</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const target = e.target as HTMLFormElement;
              const fd = new FormData(target);
              onAddUser?.({
                id: `usr_${Date.now()}`,
                companyId: company.id,
                name: fd.get('name') as string,
                email: fd.get('email') as string,
                role: fd.get('role') as any,
                isActive: true,
                createdAt: new Date().toISOString(),
                password: fd.get('password') as string,
              } as any);
              setShowAddUserModal(false);
            }} className="space-y-3 font-sans">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">Full Name</label>
                <Input name="name" required className="w-full" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">Email</label>
                <Input name="email" type="email" required className="w-full" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">Password</label>
                <Input name="password" type="password" required className="w-full" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">Role</label>
                <select name="role" className="w-full">
                  <option value="owner">Owner</option>
                  <option value="manager">Manager</option>
                  <option value="reception">Receptionist</option>
                  <option value="staff">Staff</option>
                </select>
              </div>
              <div className="flex justify-end space-x-2 pt-3 border-t border-border">
                <Button type="button" onClick={() => setShowAddUserModal(false)} className="px-4 py-2 bg-muted text-muted-foreground font-semibold rounded-md">Cancel</Button>
                <Button type="submit" className="px-5 py-2 bg-primary hover:bg-primary/80 text-primary-foreground font-semibold rounded-md">Create User</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT ENTITY */}
      {editingEntity && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-md max-w-md w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="section-title">Edit {editingEntity.type.charAt(0).toUpperCase() + editingEntity.type.slice(1)}</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const target = e.target as HTMLFormElement;
              const fd = new FormData(target);
              const data = editingEntity.data;
              if (editingEntity.type === 'branch') {
                onUpdateBranch?.({ ...data, name: fd.get('name') as string, city: fd.get('city') as string, address: fd.get('address') as string, phone: fd.get('phone') as string, dailyExpenseLimitEtb: Number(fd.get('expenseLimit')) || 0 });
              } else if (editingEntity.type === 'staff') {
                const commission = Number(fd.get('commission')) || 0;
                const updatedStaff = { ...data, name: fd.get('name') as string, phone: fd.get('phone') as string, email: fd.get('email') as string, role: fd.get('role') as any, defaultCommissionPercentage: commission };
                onUpdateStaff?.(updatedStaff);
                const existingRule = commissionRules.find((r) => r.companyId === company.id && r.targetType === 'staff' && r.targetId === data.id);
                onSaveCommissionRule({
                  id: existingRule?.id || `rule_staff_${Date.now()}`,
                  companyId: company.id,
                  targetType: 'staff',
                  targetId: data.id,
                  targetName: `${fd.get('name')} (${fd.get('role')})`,
                  type: (fd.get('ruleType') as any) || 'percentage',
                  value: Number(fd.get('ruleValue')) || 0,
                  isActive: fd.get('ruleEnabled') === 'on' && fd.get('ruleActive') === 'on',
                  updatedAt: new Date().toISOString().split('T')[0],
                });
              } else if (editingEntity.type === 'service') {
                onUpdateService?.({ ...data, name: fd.get('name') as string, category: fd.get('category') as string, priceEtb: Number(fd.get('price')), durationMinutes: Number(fd.get('duration')) });
              } else if (editingEntity.type === 'inventory') {
                onUpdateInventoryItem?.({ ...data, name: fd.get('name') as string, sku: fd.get('sku') as string, unit: fd.get('unit') as string, currentStock: Number(fd.get('stock')), reorderLevel: Number(fd.get('reorder')), unitCostEtb: Number(fd.get('cost')) });
              } else if (editingEntity.type === 'user') {
                onUpdateUser?.({ ...data, name: fd.get('name') as string, email: fd.get('email') as string, role: fd.get('role') as any, password: fd.get('password') as string || undefined });
              }
              setEditingEntity(null);
            }} className="space-y-3 font-sans">
              {editingEntity.type === 'branch' && (<>
                <div><label className="block text-sm font-semibold text-foreground mb-1">Name</label><Input name="name" defaultValue={editingEntity.data.name} className="w-full" /></div>
                <div><label className="block text-sm font-semibold text-foreground mb-1">City</label><Input name="city" defaultValue={editingEntity.data.city} className="w-full" /></div>
                <div><label className="block text-sm font-semibold text-foreground mb-1">Address</label><Input name="address" defaultValue={editingEntity.data.address} className="w-full" /></div>
                <div><label className="block text-sm font-semibold text-foreground mb-1">Phone</label><Input name="phone" defaultValue={editingEntity.data.phone} className="w-full" /></div>
                <div><label className="block text-sm font-semibold text-foreground mb-1">Daily Expense Limit (ETB) — max receptionists can record per day</label><Input name="expenseLimit" type="number" min="0" defaultValue={editingEntity.data.dailyExpenseLimitEtb || 0} className="w-full" /></div>
              </>)}
              {editingEntity.type === 'staff' && (<>
                <div><label className="block text-sm font-semibold text-foreground mb-1">Name</label><Input name="name" defaultValue={editingEntity.data.name} className="w-full" /></div>
                <div><label className="block text-sm font-semibold text-foreground mb-1">Phone</label><Input name="phone" defaultValue={editingEntity.data.phone} className="w-full" /></div>
                <div><label className="block text-sm font-semibold text-foreground mb-1">Email</label><Input name="email" defaultValue={editingEntity.data.email} className="w-full" /></div>
                <div><label className="block text-sm font-semibold text-foreground mb-1">Role</label>
                  <select name="role" defaultValue={editingEntity.data.role} className="w-full">
                    <option value="barber">Barber</option><option value="hairstylist">Hairstylist</option><option value="masseuse">Masseuse</option><option value="esthetician">Esthetician</option><option value="reception">Receptionist</option><option value="manager">Manager</option>
                  </select>
                </div>
                <div><label className="block text-sm font-semibold text-foreground mb-1">Commission %</label><Input name="commission" type="number" defaultValue={editingEntity.data.defaultCommissionPercentage} className="w-full" /></div>
                <div className="border-t border-border pt-3 space-y-3">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" name="ruleEnabled" defaultChecked={!!commissionRules.find((r) => r.companyId === company.id && r.targetType === 'staff' && r.targetId === editingEntity.data.id)} className="accent-primary" />
                    <span className="text-sm font-semibold text-foreground">Custom commission rule</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-1">Rule Type</label>
                      <select name="ruleType" defaultValue={commissionRules.find((r) => r.companyId === company.id && r.targetType === 'staff' && r.targetId === editingEntity.data.id)?.type || 'percentage'} className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm">
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed_amount">Fixed Amount (ETB)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-1">Value</label>
                      <Input name="ruleValue" type="number" defaultValue={commissionRules.find((r) => r.companyId === company.id && r.targetType === 'staff' && r.targetId === editingEntity.data.id)?.value ?? 30} className="w-full" />
                    </div>
                  </div>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" name="ruleActive" defaultChecked={commissionRules.find((r) => r.companyId === company.id && r.targetType === 'staff' && r.targetId === editingEntity.data.id)?.isActive ?? true} className="accent-primary" />
                    <span className="text-sm text-muted-foreground">Rule active</span>
                  </label>
                </div>
              </>)}
              {editingEntity.type === 'service' && (<>
                <div><label className="block text-sm font-semibold text-foreground mb-1">Name</label><Input name="name" defaultValue={editingEntity.data.name} className="w-full" /></div>
                <div><label className="block text-sm font-semibold text-foreground mb-1">Category</label><Input name="category" defaultValue={editingEntity.data.category} className="w-full" /></div>
                <div><label className="block text-sm font-semibold text-foreground mb-1">Price (ETB)</label><Input name="price" type="number" defaultValue={editingEntity.data.priceEtb} className="w-full" /></div>
                <div><label className="block text-sm font-semibold text-foreground mb-1">Duration (mins)</label><Input name="duration" type="number" defaultValue={editingEntity.data.durationMinutes} className="w-full" /></div>
              </>)}
              {editingEntity.type === 'inventory' && (<>
                <div><label className="block text-sm font-semibold text-foreground mb-1">Name</label><Input name="name" defaultValue={editingEntity.data.name} className="w-full" /></div>
                <div><label className="block text-sm font-semibold text-foreground mb-1">SKU</label><Input name="sku" defaultValue={editingEntity.data.sku} className="w-full" /></div>
                <div><label className="block text-sm font-semibold text-foreground mb-1">Unit</label><Input name="unit" defaultValue={editingEntity.data.unit} className="w-full" /></div>
                <div><label className="block text-sm font-semibold text-foreground mb-1">Stock</label><Input name="stock" type="number" defaultValue={editingEntity.data.currentStock} className="w-full" /></div>
                <div><label className="block text-sm font-semibold text-foreground mb-1">Reorder Level</label><Input name="reorder" type="number" defaultValue={editingEntity.data.reorderLevel} className="w-full" /></div>
                <div><label className="block text-sm font-semibold text-foreground mb-1">Cost per unit (ETB)</label><Input name="cost" type="number" defaultValue={editingEntity.data.unitCostEtb} className="w-full" /></div>
              </>)}
              {editingEntity.type === 'user' && (<>
                <div><label className="block text-sm font-semibold text-foreground mb-1">Name</label><Input name="name" defaultValue={editingEntity.data.name} className="w-full" /></div>
                <div><label className="block text-sm font-semibold text-foreground mb-1">Email</label><Input name="email" defaultValue={editingEntity.data.email} className="w-full" /></div>
                <div><label className="block text-sm font-semibold text-foreground mb-1">Password (leave blank to keep)</label><Input name="password" type="password" className="w-full" /></div>
                <div><label className="block text-sm font-semibold text-foreground mb-1">Role</label>
                  <select name="role" defaultValue={editingEntity.data.role} className="w-full">
                    <option value="owner">Owner</option><option value="manager">Manager</option><option value="reception">Receptionist</option><option value="staff">Staff</option>
                  </select>
                </div>
              </>)}
              <div className="flex justify-end space-x-2 pt-3 border-t border-border">
                <Button type="button" onClick={() => setEditingEntity(null)} className="px-4 py-2 bg-muted text-muted-foreground font-semibold rounded-md">Cancel</Button>
                <Button type="submit" className="px-5 py-2 bg-primary hover:bg-primary/80 text-primary-foreground font-semibold rounded-md">Save Changes</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {payoutTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setPayoutTarget(null)}>
          <div className="bg-card rounded-md shadow-xl border border-border p-5 w-full max-w-sm animate-[scaleIn_0.15s_ease]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 rounded-md bg-emerald-50 dark:bg-emerald-950/40">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="text-base font-semibold text-foreground">Pay Pending Commission</h3>
              <button onClick={() => setPayoutTarget(null)} className="ml-auto p-1 hover:bg-muted rounded-md"><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>

            <div className="rounded-md border border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/30 text-[13px] p-3 mb-4">
              <div className="text-muted-foreground">Total unpaid for <strong className="text-foreground">{payoutTarget.staffName}</strong></div>
              <div className="text-xl font-bold num text-emerald-700 dark:text-emerald-400 mt-0.5">
                {payoutTotalFor(payoutTarget.staffId).toLocaleString()} ETB
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">{unpaidCommissionsFor(payoutTarget.staffId).length} unpaid record(s). Enter the amount accepted in this payout; anything not covered stays unpaid.</div>
            </div>

            <div className="space-y-3 mb-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Amount Accepted (ETB)</label>
                <Input
                  type="number"
                  min="0"
                  max={payoutTotalFor(payoutTarget.staffId)}
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  placeholder={payoutTotalFor(payoutTarget.staffId).toLocaleString()}
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Notes (optional)</label>
                <Input
                  value={payoutNote}
                  onChange={(e) => setPayoutNote(e.target.value)}
                  placeholder="e.g. weekly settlement, cash"
                  className="text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button onClick={() => setPayoutTarget(null)} variant="outline">Cancel</Button>
              <Button
                onClick={handleBatchPayout}
                disabled={payoutUpdatingId === payoutTarget.staffId}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {payoutUpdatingId === payoutTarget.staffId ? 'Processing…' : 'Confirm Payout'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title={`Deactivate ${confirmDelete?.type === 'branch' ? 'Branch' : confirmDelete?.type === 'staff' ? 'Staff Member' : confirmDelete?.type === 'service' ? 'Service' : 'Inventory Item'}`}
        message={`Are you sure you want to deactivate "${confirmDelete?.name}"? This can be reversed later.`}
        confirmLabel="Deactivate"
        danger
        onConfirm={() => {
          if (!confirmDelete) return;
          const { type, id } = confirmDelete;
          if (type === 'branch') onDeleteBranch?.(id);
          else if (type === 'staff') onDeleteStaff?.(id);
          else if (type === 'service') onDeleteService?.(id);
          else if (type === 'inventory') onDeleteInventoryItem?.(id);
          setConfirmDelete(null);
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
};
