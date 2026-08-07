import React, { useState } from 'react';
import {
  GitBranch,
  Layers,
  Users,
  Scissors,
  Package,
  DollarSign,
  BarChart3,
  Plus,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Tag,
  Clock,
  Building2,
  Trash2,
  Edit2,
  Calendar,
  ShieldCheck,
  Download,
  Repeat,
  RefreshCw,
  Activity,
  FileText,
  Search,
  Zap,
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
} from '../types';
import { ReportsDashboard } from './ReportsDashboard';
import { apiFetch } from '../lib/api';

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
  onAddBusinessUnit: (bu: BusinessUnit) => void;
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
  onAddBusinessUnit,
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
}) => {
  const [activeTab, setActiveTab] = useState<
    'branches' | 'staff' | 'services' | 'inventory' | 'commissions' | 'financials' | 'reports' | 'audit' | 'users'
  >('branches');

  // Branch Metric Selection State
  const [selectedMetricBranchId, setSelectedMetricBranchId] = useState<string>(
    selectedBranch?.id || branches[0]?.id || ''
  );

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

  // Modal States
  const [showAddBranchModal, setShowAddBranchModal] = useState(false);
  const [showAddUnitModal, setShowAddUnitModal] = useState(false);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [showAddInventoryModal, setShowAddInventoryModal] = useState(false);
  const [showCommissionRuleModal, setShowCommissionRuleModal] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);

  // Edit Modal States
  const [editingEntity, setEditingEntity] = useState<{ type: string; data: any } | null>(null);

  // Commission Rule Form
  const [ruleTargetType, setRuleTargetType] = useState<'staff' | 'service'>('staff');
  const [ruleTargetId, setRuleTargetId] = useState('');
  const [ruleType, setRuleType] = useState<'percentage' | 'fixed_amount'>('percentage');
  const [ruleValue, setRuleValue] = useState(30);

  // Branch Form
  const [branchName, setBranchName] = useState('');
  const [branchCity, setBranchCity] = useState('Addis Ababa');
  const [branchAddress, setBranchAddress] = useState('');
  const [branchPhone, setBranchPhone] = useState('');

  // Business Unit Form
  const [unitName, setUnitName] = useState('');
  const [unitBranchId, setUnitBranchId] = useState(branches[0]?.id || '');
  const [unitType, setUnitType] = useState<any>('mens_salon');

  // Staff Form
  const [staffName, setStaffName] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffRole, setStaffRole] = useState<any>('barber');
  const [staffCommission, setStaffCommission] = useState(30);
  const [staffBranchId, setStaffBranchId] = useState(branches[0]?.id || '');
  const [staffUnitId, setStaffUnitId] = useState(businessUnits[0]?.id || '');

  // Service Form
  const [srvName, setSrvName] = useState('');
  const [srvCategory, setSrvCategory] = useState('Haircut');
  const [srvPrice, setSrvPrice] = useState(500);
  const [srvDuration, setSrvDuration] = useState(45);
  const [srvCommissionVal, setSrvCommissionVal] = useState(30);
  const [srvUnitId, setSrvUnitId] = useState(businessUnits[0]?.id || '');

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

  const totalCompletedRevenueEtb = visitSessions
    .filter((s) => s.companyId === company.id && s.status === 'completed')
    .reduce((acc, s) => acc + s.netTotalEtb, 0);

  const totalCommissionsEtb = companyCommissions.reduce((acc, c) => acc + c.commissionAmountEtb, 0);
  const totalExpensesEtb = expenses.filter((e) => e.companyId === company.id).reduce((acc, e) => acc + e.amountEtb, 0);
  const lowStockCount = companyInventory.filter((i) => i.currentStock <= i.reorderLevel).length;

  // Real-time Branch Metrics Calculation
  const activeBranchId = selectedMetricBranchId || selectedBranch?.id || companyBranches[0]?.id || '';
  const currentMetricBranch = companyBranches.find((b) => b.id === activeBranchId) || companyBranches[0];

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
    const recurringList = expenses.filter((e) => e.companyId === company.id && e.isRecurring);
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

    alert(`Automated Expense Cycle Check executed! Created ${createdCount} recurring expense ledger items.`);
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
      phone: branchPhone || '+251 11 000 0000',
      isMainBranch: false,
      status: 'active',
    });
    setShowAddBranchModal(false);
    setBranchName('');
  };

  const handleCreateUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitName) return;
    onAddBusinessUnit({
      id: `bu_${Date.now()}`,
      companyId: company.id,
      branchId: unitBranchId,
      type: unitType,
      name: unitName,
      code: `BU-${Date.now().toString().slice(-4)}`,
      status: 'active',
    });
    setShowAddUnitModal(false);
    setUnitName('');
  };

  const handleCreateStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffName) return;
    onAddStaff({
      id: `stf_${Date.now()}`,
      companyId: company.id,
      branchId: staffBranchId,
      businessUnitId: staffUnitId,
      name: staffName,
      phone: staffPhone || '+251 91 000 0000',
      email: `${staffName.toLowerCase().replace(/\s+/g, '')}@${company.slug}.et`,
      role: staffRole,
      specialties: ['General Salon Services'],
      defaultCommissionPercentage: staffCommission,
      status: 'available',
    });
    setShowAddStaffModal(false);
    setStaffName('');
  };

  const handleCreateService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!srvName) return;
    onAddService({
      id: `srv_${Date.now()}`,
      companyId: company.id,
      businessUnitId: srvUnitId,
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

  const handleSaveRuleForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleTargetId) return;

    let targetName = '';
    if (ruleTargetType === 'staff') {
      const stf = companyStaff.find((s) => s.id === ruleTargetId);
      targetName = stf ? `${stf.name} (${stf.role})` : 'Staff Member';
    } else {
      const srv = companyServices.find((s) => s.id === ruleTargetId);
      targetName = srv ? srv.name : 'Service';
    }

    const newRule: CommissionRule = {
      id: `rule_${ruleTargetType}_${Date.now()}`,
      companyId: company.id,
      targetType: ruleTargetType,
      targetId: ruleTargetId,
      targetName,
      type: ruleType,
      value: Number(ruleValue),
      isActive: true,
      updatedAt: new Date().toISOString().split('T')[0],
    };

    onSaveCommissionRule(newRule);
    setShowCommissionRuleModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#5A5A40] text-white rounded-3xl p-6 shadow-sm border border-[#4a4a35] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#f5f5f0]/15 text-[#f5f5f0] border border-[#f5f5f0]/30 uppercase tracking-widest">
              Tenant Company Operations Manager
            </span>
            <span className="text-[#f5f5f0]/80 text-xs">{company.name}</span>
          </div>
          <h2 className="text-2xl font-serif font-light text-[#f5f5f0] mt-1">
            Salon & Spa Multi-Branch Management
          </h2>
          <p className="text-[#f5f5f0]/80 text-xs mt-1 font-sans">
            Manage branches, business units (Men's/Women's/Spa/Massage), staff shifts, service catalog, auto-inventory stock rules, and commission schedules.
          </p>
        </div>

        {/* Quick Metric Pills */}
        <div className="flex items-center space-x-3 text-xs font-sans">
          <div className="bg-[#f5f5f0]/10 px-4 py-2.5 rounded-2xl border border-[#f5f5f0]/20">
            <div className="text-[#f5f5f0]/70 text-[11px]">Total Completed Revenue</div>
            <div className="text-base font-serif font-bold text-white mt-0.5">
              {totalCompletedRevenueEtb.toLocaleString()} ETB
            </div>
          </div>

          <div className="bg-[#f5f5f0]/10 px-4 py-2.5 rounded-2xl border border-[#f5f5f0]/20">
            <div className="text-[#f5f5f0]/70 text-[11px]">Low Stock Items</div>
            <div className={`text-base font-serif font-bold mt-0.5 ${lowStockCount > 0 ? 'text-amber-200' : 'text-emerald-200'}`}>
              {lowStockCount} Items
            </div>
          </div>
        </div>
      </div>

      {/* REAL-TIME BRANCH TOP-LEVEL METRIC CARDS */}
      <div className="bg-white border border-[#e5e5d1] rounded-3xl p-5 shadow-sm space-y-4 font-sans">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#e5e5d1]">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-emerald-600 animate-pulse" />
            <h3 className="font-serif font-bold text-[#2d2d2a] text-base">Real-Time Branch Operations Dashboard</h3>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Live Stream
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-[#737366]">Selected Branch:</span>
            <select
              value={activeBranchId}
              onChange={(e) => setSelectedMetricBranchId(e.target.value)}
              className="bg-[#f5f5f0] border border-[#e5e5d1] text-[#2d2d2a] font-bold text-xs rounded-xl px-3 py-1.5 outline-none focus:border-[#5A5A40]"
            >
              {companyBranches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.city})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Revenue Today */}
          <div className="bg-gradient-to-br from-[#f5f5f0] to-white border border-[#e5e5d1] rounded-2xl p-4 flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#737366] uppercase tracking-wider">Revenue Today</span>
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-serif font-bold text-emerald-800">
                {revenueTodayEtb.toLocaleString()} ETB
              </div>
              <div className="text-[11px] text-[#737366] mt-1 flex items-center space-x-1">
                <TrendingUp className="w-3 h-3 text-emerald-600" />
                <span>Today's completed revenue at {currentMetricBranch?.name}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Active Visits */}
          <div className="bg-gradient-to-br from-[#f5f5f0] to-white border border-[#e5e5d1] rounded-2xl p-4 flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#737366] uppercase tracking-wider">Active Visits</span>
              <div className="p-2 rounded-xl bg-blue-100 text-blue-800">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-serif font-bold text-blue-900">
                {activeVisitsCount} <span className="text-xs font-sans font-normal text-[#737366]">Visits Active</span>
              </div>
              <div className="text-[11px] text-[#737366] mt-1 flex items-center space-x-2">
                <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold">{inProgressCount} In Service</span>
                <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-bold">{queuedCount} Waiting</span>
              </div>
            </div>
          </div>

          {/* Card 3: Staff Occupancy */}
          <div className="bg-gradient-to-br from-[#f5f5f0] to-white border border-[#e5e5d1] rounded-2xl p-4 flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#737366] uppercase tracking-wider">Staff Occupancy</span>
              <div className="p-2 rounded-xl bg-purple-100 text-purple-800">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-serif font-bold text-purple-950">
                {staffOccupancyPct}%
              </div>
              <div className="w-full bg-stone-200 rounded-full h-1.5 mt-2 overflow-hidden">
                <div
                  className="bg-purple-700 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, staffOccupancyPct)}%` }}
                />
              </div>
              <div className="text-[11px] text-[#737366] mt-1 flex justify-between">
                <span>{busyBranchStaffCount} Working/Busy</span>
                <span>{totalBranchStaffCount} Total Staff</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center space-x-2 border-b border-[#e5e5d1] overflow-x-auto pb-2 font-sans">
        {[
          { id: 'branches', label: 'Branches & Units', icon: GitBranch },
          { id: 'staff', label: 'Staff Roster', icon: Users },
          { id: 'services', label: 'Service Catalog', icon: Scissors },
          { id: 'inventory', label: 'Inventory & Stock', icon: Package },
          { id: 'commissions', label: 'Staff Commissions & Rules', icon: DollarSign },
          { id: 'financials', label: 'Financials & Expenses', icon: BarChart3 },
          { id: 'reports', label: 'Reports & Analytics', icon: TrendingUp },
          { id: 'audit', label: 'Security Audit', icon: ShieldCheck },
          { id: 'users', label: 'User Management', icon: ShieldCheck },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-[#5A5A40] text-white shadow-sm'
                  : 'bg-white text-[#737366] hover:text-[#2d2d2a] border border-[#e5e5d1]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: BRANCHES & BUSINESS UNITS */}
      {activeTab === 'branches' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-serif font-bold text-[#2d2d2a]">Company Branches & Business Units</h3>
              <p className="text-xs text-[#737366]">
                A single company can operate multiple branches across cities, each with specialized units (e.g. Men's Salon + Moroccan Hammam).
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowAddBranchModal(true)}
                className="flex items-center space-x-1.5 px-4 py-2 bg-[#5A5A40] hover:bg-[#4a4a35] text-white font-semibold text-xs rounded-full cursor-pointer shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Branch</span>
              </button>
              <button
                onClick={() => setShowAddUnitModal(true)}
                className="flex items-center space-x-1.5 px-4 py-2 bg-[#f5f5f0] hover:bg-[#e5e5d1] text-[#5A5A40] font-semibold text-xs rounded-full border border-[#e5e5d1] cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Business Unit</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {companyBranches.map((branch) => {
              const branchUnits = companyBusinessUnits.filter((bu) => bu.branchId === branch.id);
              const branchStaff = companyStaff.filter((s) => s.branchId === branch.id);
              return (
                <div key={branch.id} className="bg-white border border-[#e5e5d1] rounded-3xl p-5 space-y-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <GitBranch className="w-4 h-4 text-[#5A5A40]" />
                        <h4 className="text-base font-serif font-bold text-[#2d2d2a]">{branch.name}</h4>
                      </div>
                      <p className="text-xs text-[#737366] mt-1">{branch.city} — {branch.address}</p>
                    </div>
                    {branch.isMainBranch && (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                        Main Flagship
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => setEditingEntity({ type: 'branch', data: branch })}
                      className="p-1.5 rounded-lg hover:bg-[#f5f5f0] text-[#737366] hover:text-[#5A5A40] transition-colors"
                      title="Edit Branch"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => { if (confirm('Deactivate this branch?')) onDeleteBranch?.(branch.id); }}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-[#737366] hover:text-red-600 transition-colors"
                      title="Deactivate Branch"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="border-t border-[#e5e5d1] pt-3 space-y-2">
                    <div className="text-xs font-semibold text-[#2d2d2a] flex items-center justify-between">
                      <span>Business Units ({branchUnits.length})</span>
                      <span className="text-[#737366] text-[11px]">{branchStaff.length} Staff Assigned</span>
                    </div>

                    <div className="space-y-1.5">
                      {branchUnits.map((bu) => (
                        <div key={bu.id} className="bg-[#f5f5f0] p-2.5 rounded-2xl text-xs flex items-center justify-between border border-[#e5e5d1]">
                          <div className="flex items-center space-x-2">
                            <Layers className="w-3.5 h-3.5 text-[#5A5A40]" />
                            <span className="font-semibold text-[#2d2d2a]">{bu.name}</span>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 bg-white text-[#737366] rounded font-mono border border-[#e5e5d1]">
                            {bu.code}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: STAFF ROSTER */}
      {activeTab === 'staff' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-serif font-bold text-[#2d2d2a]">Staff Roster & Commission Rates</h3>
              <p className="text-xs text-[#737366]">
                Staff members work across shifts and business units. Commissions earn automatically on session completion.
              </p>
            </div>
            <button
              onClick={() => setShowAddStaffModal(true)}
              className="flex items-center space-x-1.5 px-4 py-2 bg-[#5A5A40] hover:bg-[#4a4a35] text-white font-semibold text-xs rounded-full cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Staff Member</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {companyStaff.map((staff) => {
              const staffBr = companyBranches.find((b) => b.id === staff.branchId);
              const staffBu = companyBusinessUnits.find((u) => u.id === staff.businessUnitId);
              return (
                <div key={staff.id} className="bg-white border border-[#e5e5d1] rounded-3xl p-5 space-y-3 shadow-sm">
                  <div className="flex items-center space-x-3">
                    <img
                      src={staff.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'}
                      alt={staff.name}
                      className="w-12 h-12 rounded-full object-cover border border-[#e5e5d1]"
                    />
                    <div>
                      <h4 className="text-base font-serif font-bold text-[#2d2d2a]">{staff.name}</h4>
                      <p className="text-xs text-[#5A5A40] capitalize font-medium">{staff.role}</p>
                      <p className="text-[11px] text-[#737366]">{staff.phone}</p>
                    </div>
                  </div>

                  <div className="border-t border-[#e5e5d1] pt-3 space-y-1.5 text-xs font-sans">
                    <div className="flex justify-between text-[#737366]">
                      <span>Branch & Unit:</span>
                      <span className="text-[#2d2d2a] font-medium">{staffBr?.name} ({staffBu?.name || 'All'})</span>
                    </div>
                    <div className="flex justify-between text-[#737366]">
                      <span>Commission Rate:</span>
                      <span className="text-emerald-700 font-bold">{staff.defaultCommissionPercentage}% Rate</span>
                    </div>
                    <div className="flex justify-between text-[#737366]">
                      <span>Shift Status:</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        staff.status === 'available' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                        staff.status === 'busy' ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-[#f5f5f0] text-[#737366] border border-[#e5e5d1]'
                      }`}>
                        {staff.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 pt-2 border-t border-[#e5e5d1]">
                    <button
                      onClick={() => setEditingEntity({ type: 'staff', data: staff })}
                      className="flex items-center space-x-1 px-2.5 py-1 rounded-lg hover:bg-[#f5f5f0] text-[#737366] hover:text-[#5A5A40] text-[11px] font-medium transition-colors"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => { if (confirm('Deactivate this staff member?')) onDeleteStaff?.(staff.id); }}
                      className="flex items-center space-x-1 px-2.5 py-1 rounded-lg hover:bg-red-50 text-[#737366] hover:text-red-600 text-[11px] font-medium transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: SERVICES */}
      {activeTab === 'services' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-serif font-bold text-[#2d2d2a]">Service Pricing Catalog & Rules</h3>
              <p className="text-xs text-[#737366]">
                Services configure default duration, price in ETB, staff commission calculation rules, and required inventory items.
              </p>
            </div>
            <button
              onClick={() => setShowAddServiceModal(true)}
              className="flex items-center space-x-1.5 px-4 py-2 bg-[#5A5A40] hover:bg-[#4a4a35] text-white font-semibold text-xs rounded-full cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Service</span>
            </button>
          </div>

          <div className="overflow-x-auto bg-white border border-[#e5e5d1] rounded-3xl p-5 shadow-sm font-sans">
            <table className="w-full text-left text-xs text-[#2d2d2a]">
              <thead className="bg-[#f5f5f0] text-[#737366] uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3 rounded-l-xl">Service Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Price (ETB)</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Staff Commission</th>
                  <th className="px-4 py-3">Business Unit</th>
                  <th className="px-4 py-3 rounded-r-xl">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e5d1]">
                {companyServices.map((srv) => {
                  const bu = companyBusinessUnits.find((u) => u.id === srv.businessUnitId);
                  return (
                    <tr key={srv.id} className="hover:bg-[#f5f5f0]/60">
                      <td className="px-4 py-3 font-bold text-[#2d2d2a] flex items-center space-x-2">
                        <Scissors className="w-3.5 h-3.5 text-[#5A5A40]" />
                        <span>{srv.name}</span>
                      </td>
                      <td className="px-4 py-3 text-[#737366]">{srv.category}</td>
                      <td className="px-4 py-3 text-[#5A5A40] font-bold">{srv.priceEtb.toLocaleString()} ETB</td>
                      <td className="px-4 py-3 text-[#737366]">{srv.durationMinutes} mins</td>
                      <td className="px-4 py-3 text-emerald-700 font-bold">{srv.commissionValue}% Rate</td>
                      <td className="px-4 py-3 text-[#737366]">{bu?.name || 'General'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-1">
                          <button onClick={() => setEditingEntity({ type: 'service', data: srv })} className="p-1 rounded hover:bg-[#f5f5f0] text-[#737366] hover:text-[#5A5A40]">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => { if (confirm('Deactivate this service?')) onDeleteService?.(srv.id); }} className="p-1 rounded hover:bg-red-50 text-[#737366] hover:text-red-600">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: INVENTORY */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-serif font-bold text-[#2d2d2a]">Branch Stock & Auto-Deduction Inventory</h3>
              <p className="text-xs text-[#737366]">
                Stock decrements automatically upon completing visit sessions. Reorder alerts trigger when threshold is reached.
              </p>
            </div>
            <button
              onClick={() => setShowAddInventoryModal(true)}
              className="flex items-center space-x-1.5 px-4 py-2 bg-[#5A5A40] hover:bg-[#4a4a35] text-white font-semibold text-xs rounded-full cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Stock Item</span>
            </button>
          </div>

          {/* Low Stock Alert Toast / Warning Banner */}
          {companyInventory.some((item) => item.currentStock <= item.reorderLevel) && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 shadow-sm text-amber-950 space-y-2 animate-fadeIn">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-sm text-amber-900">
                      Low Stock Warning Alert! ({companyInventory.filter((i) => i.currentStock <= i.reorderLevel).length} items below reorder threshold)
                    </h4>
                    <p className="text-xs text-amber-800/90 mt-0.5">
                      The following consumables are running low and may affect scheduled services. Click + Restock to order supply.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    companyInventory
                      .filter((i) => i.currentStock <= i.reorderLevel)
                      .forEach((i) => onUpdateInventoryStock(i.id, 50));
                  }}
                  className="px-3.5 py-1.5 bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs rounded-full cursor-pointer shadow-sm shrink-0"
                >
                  Restock All Low Items (+50)
                </button>
              </div>

              <div className="flex flex-wrap gap-2 pt-2 border-t border-amber-200/80">
                {companyInventory
                  .filter((i) => i.currentStock <= i.reorderLevel)
                  .map((item) => (
                    <span
                      key={item.id}
                      className="px-3 py-1 bg-white border border-amber-300 rounded-xl text-xs font-bold text-amber-900 flex items-center space-x-2"
                    >
                      <span>{item.name}:</span>
                      <span className="text-red-700 font-mono">{item.currentStock} {item.unit}</span>
                      <span className="text-[10px] text-amber-700">(Min: {item.reorderLevel})</span>
                    </span>
                  ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 font-sans">
            {companyInventory.map((item) => {
              const isLow = item.currentStock <= item.reorderLevel;
              return (
                <div
                  key={item.id}
                  className={`bg-white border rounded-3xl p-5 space-y-3 shadow-sm ${
                    isLow ? 'border-amber-400 bg-amber-50/20' : 'border-[#e5e5d1]'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-base font-serif font-bold text-[#2d2d2a]">{item.name}</h4>
                      <p className="text-[10px] text-[#737366] font-mono">SKU: {item.sku}</p>
                    </div>
                    {isLow && (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold flex items-center space-x-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Low Stock</span>
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-[#737366]">
                      <span>Current Stock:</span>
                      <span className={`font-bold ${isLow ? 'text-amber-800' : 'text-emerald-700'}`}>
                        {item.currentStock} {item.unit}
                      </span>
                    </div>
                    <div className="flex justify-between text-[#737366]">
                      <span>Reorder Threshold:</span>
                      <span className="text-[#2d2d2a] font-medium">{item.reorderLevel} {item.unit}</span>
                    </div>
                    <div className="flex justify-between text-[#737366]">
                      <span>Cost per unit:</span>
                      <span className="text-[#2d2d2a] font-medium">{item.unitCostEtb} ETB</span>
                    </div>
                  </div>

                  <button
                    onClick={() => onUpdateInventoryStock(item.id, 50)}
                    className="w-full mt-2 py-2 bg-[#f5f5f0] hover:bg-[#e5e5d1] text-[#5A5A40] text-xs font-bold rounded-full border border-[#e5e5d1] cursor-pointer"
                  >
                    + Restock (+50 {item.unit})
                  </button>
                  <div className="flex items-center space-x-1 mt-1">
                    <button
                      onClick={() => setEditingEntity({ type: 'inventory', data: item })}
                      className="flex-1 py-1.5 rounded-xl hover:bg-[#f5f5f0] text-[#737366] hover:text-[#5A5A40] text-[11px] font-medium transition-colors flex items-center justify-center space-x-1"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => { if (confirm('Delete this inventory item?')) onDeleteInventoryItem?.(item.id); }}
                      className="flex-1 py-1.5 rounded-xl hover:bg-red-50 text-[#737366] hover:text-red-600 text-[11px] font-medium transition-colors flex items-center justify-center space-x-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 5: COMMISSIONS & RULES */}
      {activeTab === 'commissions' && (
        <div className="space-y-6">
          {/* Commission Rules Configuration Card */}
          <div className="bg-white border border-[#e5e5d1] rounded-3xl p-6 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <Tag className="w-5 h-5 text-[#5A5A40]" />
                  <h3 className="text-lg font-serif font-bold text-[#2d2d2a]">Commission Rules Engine</h3>
                </div>
                <p className="text-xs text-[#737366] mt-0.5">
                  Configure custom commission rules per staff member or per service (percentage % or fixed ETB amount). Applied automatically at checkout.
                </p>
              </div>

              <button
                onClick={() => {
                  setRuleTargetType('staff');
                  setRuleTargetId(companyStaff[0]?.id || '');
                  setShowCommissionRuleModal(true);
                }}
                className="flex items-center space-x-1.5 px-4 py-2 bg-[#5A5A40] hover:bg-[#4a4a35] text-white font-semibold text-xs rounded-full cursor-pointer shadow-sm shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Configure Commission Rule</span>
              </button>
            </div>

            {/* Active Rules Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
              {commissionRules.filter((r) => r.companyId === company.id).length === 0 ? (
                <div className="col-span-full py-6 text-center text-[#737366] text-xs bg-[#f5f5f0] rounded-2xl border border-[#e5e5d1]">
                  No custom commission rules configured yet. Standard default percentages apply.
                </div>
              ) : (
                commissionRules
                  .filter((r) => r.companyId === company.id)
                  .map((rule) => (
                    <div
                      key={rule.id}
                      className="p-4 bg-[#f5f5f0] border border-[#e5e5d1] rounded-2xl space-y-2 flex flex-col justify-between"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#737366]">
                            Target: {rule.targetType === 'staff' ? 'Staff Member' : 'Service'}
                          </span>
                          <h4 className="font-bold text-sm text-[#2d2d2a]">{rule.targetName}</h4>
                        </div>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            rule.isActive
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-stone-100 text-stone-500 border-stone-200'
                          }`}
                        >
                          {rule.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-xs pt-2 border-t border-[#e5e5d1]">
                        <span className="text-[#737366]">Payout Rate:</span>
                        <span className="font-mono font-bold text-[#5A5A40] text-sm">
                          {rule.type === 'percentage' ? `${rule.value}%` : `${rule.value.toLocaleString()} ETB (Fixed)`}
                        </span>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>

          {/* Commission Logs Table */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-serif font-bold text-[#2d2d2a]">Staff Commission Logs & Payout Schedule</h3>
                <p className="text-xs text-[#737366]">
                  Calculated automatically per completed service session according to configured rules.
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleExportPayrollCsv}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-[#5A5A40] hover:bg-[#4a4a35] text-white text-xs font-bold rounded-full cursor-pointer shadow-sm transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Payroll CSV</span>
                </button>
                <div className="text-xs text-emerald-800 font-bold bg-emerald-50 px-4 py-2 rounded-full border border-emerald-200">
                  Total Earned Commissions: {totalCommissionsEtb.toLocaleString()} ETB
                </div>
              </div>
            </div>

            <div className="overflow-x-auto bg-white border border-[#e5e5d1] rounded-3xl p-5 shadow-sm font-sans">
              <table className="w-full text-left text-xs text-[#2d2d2a]">
                <thead className="bg-[#f5f5f0] text-[#737366] uppercase font-bold text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3 rounded-l-xl">Staff Member</th>
                    <th className="px-4 py-3">Service Performed</th>
                    <th className="px-4 py-3">Session Price</th>
                    <th className="px-4 py-3">Earned Commission</th>
                    <th className="px-4 py-3">Rule Applied</th>
                    <th className="px-4 py-3 rounded-r-xl">Payout Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e5d1]">
                  {companyCommissions.map((log) => (
                    <tr key={log.id} className="hover:bg-[#f5f5f0]/60">
                      <td className="px-4 py-3 font-bold text-[#2d2d2a]">{log.staffName}</td>
                      <td className="px-4 py-3 text-[#737366]">{log.serviceName}</td>
                      <td className="px-4 py-3 text-[#737366]">{log.servicePriceEtb} ETB</td>
                      <td className="px-4 py-3 text-emerald-700 font-bold">{log.commissionAmountEtb} ETB</td>
                      <td className="px-4 py-3 text-[#737366]">{log.ruleApplied}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          log.payoutStatus === 'paid' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                          log.payoutStatus === 'payout_requested' ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-[#f5f5f0] text-[#737366] border border-[#e5e5d1]'
                        }`}>
                          {log.payoutStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: REPORTS & ANALYTICS */}
      {activeTab === 'reports' && (
        <ReportsDashboard
          company={company}
          branches={branches}
          businessUnits={businessUnits}
          staffList={staffList}
          services={services}
          visitSessions={visitSessions}
          commissionLogs={commissionLogs}
          expenses={expenses}
        />
      )}
      {activeTab === 'financials' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-sans">
            <div className="bg-white border border-[#e5e5d1] rounded-3xl p-5 shadow-sm">
              <div className="text-[#737366] text-xs font-bold uppercase tracking-wider">Total Gross Sales</div>
              <div className="text-2xl font-serif font-bold text-emerald-700 mt-2">
                {totalCompletedRevenueEtb.toLocaleString()} ETB
              </div>
            </div>

            <div className="bg-white border border-[#e5e5d1] rounded-3xl p-5 shadow-sm">
              <div className="text-[#737366] text-xs font-bold uppercase tracking-wider">Total Operating Expenses</div>
              <div className="text-2xl font-serif font-bold text-amber-800 mt-2">
                {totalExpensesEtb.toLocaleString()} ETB
              </div>
            </div>

            <div className="bg-white border border-[#e5e5d1] rounded-3xl p-5 shadow-sm">
              <div className="text-[#737366] text-xs font-bold uppercase tracking-wider">Net Profit (Sales - Expenses)</div>
              <div className="text-2xl font-serif font-bold text-[#5A5A40] mt-2">
                {(totalCompletedRevenueEtb - totalExpensesEtb).toLocaleString()} ETB
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#e5e5d1] rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-lg font-serif font-bold text-[#2d2d2a]">Operating & Recurring Expense Ledger</h4>
                <p className="text-xs text-[#737366]">
                  Track regular expenses and configure automated recurring billing triggers (monthly rent, software licensing, utility retainers).
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleRunRecurringExpensesTrigger}
                  className="flex items-center space-x-1.5 px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-xs font-bold rounded-full cursor-pointer transition-all"
                  title="Simulate automated creation trigger for recurring schedules"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-purple-700" />
                  <span>Run Recurring Trigger Check</span>
                </button>

                <button
                  onClick={() => setShowAddExpenseModal(true)}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-[#5A5A40] hover:bg-[#4a4a35] text-white text-xs font-bold rounded-full shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Record Expense</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto font-sans">
              <table className="w-full text-left text-xs text-[#2d2d2a]">
                <thead className="bg-[#f5f5f0] text-[#737366] uppercase font-bold text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3 rounded-l-xl">Description</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Amount (ETB)</th>
                    <th className="px-4 py-3">Payment Method</th>
                    <th className="px-4 py-3">Recurrence Schedule</th>
                    <th className="px-4 py-3">Recorded By</th>
                    <th className="px-4 py-3 rounded-r-xl">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e5d1]">
                  {expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-[#f5f5f0]/60">
                      <td className="px-4 py-3 font-semibold text-[#2d2d2a]">
                        <div className="flex items-center space-x-1.5">
                          {exp.isRecurring && <Repeat className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />}
                          <span>{exp.description}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 uppercase text-[10px] text-[#5A5A40] font-bold">{exp.category}</td>
                      <td className="px-4 py-3 text-amber-800 font-bold">{exp.amountEtb.toLocaleString()} ETB</td>
                      <td className="px-4 py-3 uppercase text-[#737366]">{exp.paymentMethod}</td>
                      <td className="px-4 py-3">
                        {exp.isRecurring ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
                            <Repeat className="w-3 h-3" />
                            <span className="capitalize">{exp.recurrenceFrequency} (Next: {exp.nextDueDate || 'Pending'})</span>
                          </span>
                        ) : (
                          <span className="text-[#737366] text-[10px]">One-off</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[#737366]">{exp.recordedBy}</td>
                      <td className="px-4 py-3 text-[#737366]">{exp.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: SECURITY AUDIT */}
      {activeTab === 'audit' && (
        <div className="space-y-6 font-sans">
          <div className="bg-white border border-[#e5e5d1] rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-700" />
                  <h3 className="text-lg font-serif font-bold text-[#2d2d2a]">Security Audit Trail & Sensitive Action Log</h3>
                </div>
                <p className="text-xs text-[#737366] mt-0.5">
                  Immutable security record capturing inventory adjustments, staff commission edits, payment overrides, and tenant system updates.
                </p>
              </div>

              <button
                onClick={handleExportSecurityAuditCsv}
                className="flex items-center space-x-2 px-4 py-2.5 bg-[#5A5A40] hover:bg-[#4a4a35] text-white text-xs font-bold rounded-full cursor-pointer shadow-sm self-start md:self-auto"
              >
                <Download className="w-4 h-4" />
                <span>Export Audit CSV</span>
              </button>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#e5e5d1]">
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-[#737366] font-semibold mr-1">Action Type:</span>
                {[
                  { id: 'all', label: 'All Actions' },
                  { id: 'inventory_adjustment', label: 'Inventory' },
                  { id: 'commission_change', label: 'Commissions' },
                  { id: 'payment_edit', label: 'Payments' },
                  { id: 'expense_added', label: 'Expenses' },
                ].map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setAuditFilterType(type.id)}
                    className={`px-3 py-1 rounded-full font-bold text-[11px] cursor-pointer transition-all ${
                      auditFilterType === type.id
                        ? 'bg-[#5A5A40] text-white'
                        : 'bg-[#f5f5f0] text-[#737366] hover:bg-[#e5e5d1]'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#737366] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search logs by staff or keyword..."
                  value={auditSearchQuery}
                  onChange={(e) => setAuditSearchQuery(e.target.value)}
                  className="bg-[#f5f5f0] border border-[#e5e5d1] text-[#2d2d2a] text-xs rounded-xl pl-8 pr-3 py-1.5 outline-none focus:border-[#5A5A40] w-full sm:w-64"
                />
              </div>
            </div>

            {/* Audit Log Table */}
            <div className="overflow-x-auto bg-white rounded-2xl border border-[#e5e5d1]">
              <table className="w-full text-left text-xs text-[#2d2d2a]">
                <thead className="bg-[#f5f5f0] text-[#737366] uppercase font-bold text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3 rounded-l-xl">Timestamp</th>
                    <th className="px-4 py-3">Action Type</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Performed By</th>
                    <th className="px-4 py-3">Details / Reference</th>
                    <th className="px-4 py-3 rounded-r-xl">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e5d1]">
                  {auditLogs
                    .filter((log) => {
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
                    })
                    .map((log) => {
                      const getBadgeColor = (type: string) => {
                        switch (type) {
                          case 'inventory_adjustment':
                            return 'bg-amber-50 text-amber-800 border-amber-200';
                          case 'commission_change':
                            return 'bg-blue-50 text-blue-800 border-blue-200';
                          case 'payment_edit':
                            return 'bg-emerald-50 text-emerald-800 border-emerald-200';
                          case 'expense_added':
                            return 'bg-purple-50 text-purple-800 border-purple-200';
                          default:
                            return 'bg-[#f5f5f0] text-[#737366] border-[#e5e5d1]';
                        }
                      };

                      return (
                        <tr key={log.id} className="hover:bg-[#f5f5f0]/60">
                          <td className="px-4 py-3 text-[#737366] font-mono whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getBadgeColor(
                                log.actionType
                              )}`}
                            >
                              {log.actionType.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-semibold text-[#2d2d2a]">{log.description}</td>
                          <td className="px-4 py-3 text-[#5A5A40] font-bold">{log.performedBy}</td>
                          <td className="px-4 py-3 text-[#737366] max-w-xs truncate">{log.details || '-'}</td>
                          <td className="px-4 py-3 text-[#737366] font-mono text-[10px]">
                            {log.ipAddress || '197.156.102.88'}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 9: USER MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-serif font-bold text-[#2d2d2a]">User Management</h3>
              <p className="text-xs text-[#737366]">
                Manage system users, roles, and access permissions for this tenant.
              </p>
            </div>
            <button
              onClick={() => setShowAddUserModal(true)}
              className="flex items-center space-x-1.5 px-4 py-2 bg-[#5A5A40] hover:bg-[#4a4a35] text-white font-semibold text-xs rounded-full cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add User</span>
            </button>
          </div>

          <div className="overflow-x-auto bg-white border border-[#e5e5d1] rounded-3xl p-5 shadow-sm font-sans">
            <table className="w-full text-left text-xs text-[#2d2d2a]">
              <thead className="bg-[#f5f5f0] text-[#737366] uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3 rounded-l-xl">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Last Login</th>
                  <th className="px-4 py-3 rounded-r-xl">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e5d1]">
                {users.filter((u) => company.id === '' || u.companyId === company.id).map((usr) => (
                  <tr key={usr.id} className="hover:bg-[#f5f5f0]/60">
                    <td className="px-4 py-3 font-bold text-[#2d2d2a]">{usr.name}</td>
                    <td className="px-4 py-3 text-[#737366]">{usr.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        usr.role === 'super_admin' ? 'bg-purple-50 text-purple-800 border border-purple-200' :
                        usr.role === 'tenant_manager' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                        usr.role === 'receptionist' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                        'bg-[#f5f5f0] text-[#737366] border border-[#e5e5d1]'
                      }`}>
                        {usr.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        usr.isActive ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
                      }`}>
                        {usr.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#737366]">{usr.lastLoginAt ? new Date(usr.lastLoginAt).toLocaleDateString() : 'Never'}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setEditingEntity({ type: 'user', data: usr })}
                        className="p-1.5 rounded-lg hover:bg-[#f5f5f0] text-[#737366] hover:text-[#5A5A40] transition-colors"
                        title="Edit User"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: ADD BRANCH */}
      {showAddBranchModal && (
        <div className="fixed inset-0 z-50 bg-[#2d2d2a]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#e5e5d1] rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-serif font-bold text-[#2d2d2a]">Add New Branch</h3>
            <form onSubmit={handleCreateBranch} className="space-y-3 font-sans">
              <div>
                <label className="block text-xs font-semibold text-[#2d2d2a] mb-1">Branch Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kazanchis Executive Branch"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  className="w-full bg-[#f5f5f0] border border-[#e5e5d1] text-[#2d2d2a] rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-[#5A5A40]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2d2d2a] mb-1">City</label>
                <select
                  value={branchCity}
                  onChange={(e) => setBranchCity(e.target.value)}
                  className="w-full bg-[#f5f5f0] border border-[#e5e5d1] text-[#2d2d2a] rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-[#5A5A40]"
                >
                  <option value="Addis Ababa">Addis Ababa</option>
                  <option value="Hawassa">Hawassa</option>
                  <option value="Adama">Adama</option>
                  <option value="Bahir Dar">Bahir Dar</option>
                  <option value="Dire Dawa">Dire Dawa</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-[#e5e5d1]">
                <button
                  type="button"
                  onClick={() => setShowAddBranchModal(false)}
                  className="px-4 py-2 bg-[#f5f5f0] text-[#737366] font-semibold rounded-full text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#5A5A40] hover:bg-[#4a4a35] text-white font-bold rounded-full text-xs shadow-md"
                >
                  Save Branch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD BUSINESS UNIT */}
      {showAddUnitModal && (
        <div className="fixed inset-0 z-50 bg-[#2d2d2a]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#e5e5d1] rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-serif font-bold text-[#2d2d2a]">Add Business Unit</h3>
            <form onSubmit={handleCreateUnit} className="space-y-3 font-sans">
              <div>
                <label className="block text-xs font-semibold text-[#2d2d2a] mb-1">Unit Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Executive Moroccan Hammam"
                  value={unitName}
                  onChange={(e) => setUnitName(e.target.value)}
                  className="w-full bg-[#f5f5f0] border border-[#e5e5d1] text-[#2d2d2a] rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-[#5A5A40]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2d2d2a] mb-1">Unit Type</label>
                <select
                  value={unitType}
                  onChange={(e) => setUnitType(e.target.value)}
                  className="w-full bg-[#f5f5f0] border border-[#e5e5d1] text-[#2d2d2a] rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-[#5A5A40]"
                >
                  <option value="mens_salon">Men's Salon</option>
                  <option value="womens_salon">Women's Salon</option>
                  <option value="spa_center">Spa Center</option>
                  <option value="massage_center">Massage Center</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2d2d2a] mb-1">Branch</label>
                <select
                  value={unitBranchId}
                  onChange={(e) => setUnitBranchId(e.target.value)}
                  className="w-full bg-[#f5f5f0] border border-[#e5e5d1] text-[#2d2d2a] rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-[#5A5A40]"
                >
                  {companyBranches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-[#e5e5d1]">
                <button
                  type="button"
                  onClick={() => setShowAddUnitModal(false)}
                  className="px-4 py-2 bg-[#f5f5f0] text-[#737366] font-semibold rounded-full text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#5A5A40] hover:bg-[#4a4a35] text-white font-bold rounded-full text-xs shadow-md"
                >
                  Create Unit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD STAFF */}
      {showAddStaffModal && (
        <div className="fixed inset-0 z-50 bg-[#2d2d2a]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#e5e5d1] rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-serif font-bold text-[#2d2d2a]">Add Staff Member</h3>
            <form onSubmit={handleCreateStaff} className="space-y-3 font-sans">
              <div>
                <label className="block text-xs font-semibold text-[#2d2d2a] mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Solomon Kassa"
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  className="w-full bg-[#f5f5f0] border border-[#e5e5d1] text-[#2d2d2a] rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-[#5A5A40]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2d2d2a] mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="+251 91 222 3333"
                  value={staffPhone}
                  onChange={(e) => setStaffPhone(e.target.value)}
                  className="w-full bg-[#f5f5f0] border border-[#e5e5d1] text-[#2d2d2a] rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-[#5A5A40]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#2d2d2a] mb-1">Role</label>
                  <select
                    value={staffRole}
                    onChange={(e) => setStaffRole(e.target.value)}
                    className="w-full bg-[#f5f5f0] border border-[#e5e5d1] text-[#2d2d2a] rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-[#5A5A40]"
                  >
                    <option value="barber">Barber</option>
                    <option value="hairstylist">Hairstylist</option>
                    <option value="masseuse">Masseuse</option>
                    <option value="esthetician">Esthetician</option>
                    <option value="receptionist">Receptionist</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2d2d2a] mb-1">Commission (%)</label>
                  <input
                    type="number"
                    value={staffCommission}
                    onChange={(e) => setStaffCommission(Number(e.target.value))}
                    className="w-full bg-[#f5f5f0] border border-[#e5e5d1] text-[#2d2d2a] rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-[#5A5A40]"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-[#e5e5d1]">
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  className="px-4 py-2 bg-[#f5f5f0] text-[#737366] font-semibold rounded-full text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#5A5A40] hover:bg-[#4a4a35] text-white font-bold rounded-full text-xs shadow-md"
                >
                  Save Staff Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD SERVICE */}
      {showAddServiceModal && (
        <div className="fixed inset-0 z-50 bg-[#2d2d2a]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#e5e5d1] rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-serif font-bold text-[#2d2d2a]">Create New Service</h3>
            <form onSubmit={handleCreateService} className="space-y-3 font-sans">
              <div>
                <label className="block text-xs font-semibold text-[#2d2d2a] mb-1">Service Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hot Stone Full-Body Massage"
                  value={srvName}
                  onChange={(e) => setSrvName(e.target.value)}
                  className="w-full bg-[#f5f5f0] border border-[#e5e5d1] text-[#2d2d2a] rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-[#5A5A40]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#2d2d2a] mb-1">Price (ETB)</label>
                  <input
                    type="number"
                    value={srvPrice}
                    onChange={(e) => setSrvPrice(Number(e.target.value))}
                    className="w-full bg-[#f5f5f0] border border-[#e5e5d1] text-[#2d2d2a] rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-[#5A5A40]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2d2d2a] mb-1">Duration (Mins)</label>
                  <input
                    type="number"
                    value={srvDuration}
                    onChange={(e) => setSrvDuration(Number(e.target.value))}
                    className="w-full bg-[#f5f5f0] border border-[#e5e5d1] text-[#2d2d2a] rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-[#5A5A40]"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-[#e5e5d1]">
                <button
                  type="button"
                  onClick={() => setShowAddServiceModal(false)}
                  className="px-4 py-2 bg-[#f5f5f0] text-[#737366] font-semibold rounded-full text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#5A5A40] hover:bg-[#4a4a35] text-white font-bold rounded-full text-xs shadow-md"
                >
                  Publish Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD INVENTORY */}
      {showAddInventoryModal && (
        <div className="fixed inset-0 z-50 bg-[#2d2d2a]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#e5e5d1] rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-serif font-bold text-[#2d2d2a]">Add Inventory Stock Item</h3>
            <form onSubmit={handleCreateInventory} className="space-y-3 font-sans">
              <div>
                <label className="block text-xs font-semibold text-[#2d2d2a] mb-1">Item Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Organic Eucalyptus Massage Oil"
                  value={invName}
                  onChange={(e) => setInvName(e.target.value)}
                  className="w-full bg-[#f5f5f0] border border-[#e5e5d1] text-[#2d2d2a] rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-[#5A5A40]"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-[#2d2d2a] mb-1">Unit</label>
                  <input
                    type="text"
                    placeholder="ml / pcs"
                    value={invUnit}
                    onChange={(e) => setInvUnit(e.target.value)}
                    className="w-full bg-[#f5f5f0] border border-[#e5e5d1] text-[#2d2d2a] rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-[#5A5A40]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#2d2d2a] mb-1">Initial Stock</label>
                  <input
                    type="number"
                    value={invStock}
                    onChange={(e) => setInvStock(Number(e.target.value))}
                    className="w-full bg-[#f5f5f0] border border-[#e5e5d1] text-[#2d2d2a] rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-[#5A5A40]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#2d2d2a] mb-1">Reorder Level</label>
                  <input
                    type="number"
                    value={invReorder}
                    onChange={(e) => setInvReorder(Number(e.target.value))}
                    className="w-full bg-[#f5f5f0] border border-[#e5e5d1] text-[#2d2d2a] rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-[#5A5A40]"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-[#e5e5d1]">
                <button
                  type="button"
                  onClick={() => setShowAddInventoryModal(false)}
                  className="px-4 py-2 bg-[#f5f5f0] text-[#737366] font-semibold rounded-full text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#5A5A40] hover:bg-[#4a4a35] text-white font-bold rounded-full text-xs shadow-md"
                >
                  Save Stock Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIGURE COMMISSION RULE */}
      {showCommissionRuleModal && (
        <div className="fixed inset-0 z-50 bg-[#2d2d2a]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#e5e5d1] rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-serif font-bold text-[#2d2d2a]">Configure Commission Rule</h3>
            <p className="text-xs text-[#737366]">
              Set custom payout rates per individual staff member or per service offering.
            </p>

            <form onSubmit={handleSaveRuleForm} className="space-y-3 font-sans">
              <div>
                <label className="block text-xs font-semibold text-[#2d2d2a] mb-1">Target Scope</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRuleTargetType('staff');
                      setRuleTargetId(companyStaff[0]?.id || '');
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition ${
                      ruleTargetType === 'staff'
                        ? 'bg-[#5A5A40] text-white'
                        : 'bg-[#f5f5f0] text-[#737366] border border-[#e5e5d1]'
                    }`}
                  >
                    Per Staff Member
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRuleTargetType('service');
                      setRuleTargetId(companyServices[0]?.id || '');
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition ${
                      ruleTargetType === 'service'
                        ? 'bg-[#5A5A40] text-white'
                        : 'bg-[#f5f5f0] text-[#737366] border border-[#e5e5d1]'
                    }`}
                  >
                    Per Service
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2d2d2a] mb-1">
                  Select {ruleTargetType === 'staff' ? 'Staff Member' : 'Service'}
                </label>
                <select
                  value={ruleTargetId}
                  onChange={(e) => setRuleTargetId(e.target.value)}
                  className="w-full bg-[#f5f5f0] border border-[#e5e5d1] text-[#2d2d2a] rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-[#5A5A40]"
                >
                  {ruleTargetType === 'staff'
                    ? companyStaff.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.role})
                        </option>
                      ))
                    : companyServices.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.priceEtb} ETB)
                        </option>
                      ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#2d2d2a] mb-1">Rule Type</label>
                  <select
                    value={ruleType}
                    onChange={(e) => setRuleType(e.target.value as any)}
                    className="w-full bg-[#f5f5f0] border border-[#e5e5d1] text-[#2d2d2a] rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-[#5A5A40]"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed_amount">Fixed Amount (ETB)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2d2d2a] mb-1">
                    {ruleType === 'percentage' ? 'Percentage Rate (%)' : 'Fixed Amount (ETB)'}
                  </label>
                  <input
                    type="number"
                    required
                    value={ruleValue}
                    onChange={(e) => setRuleValue(Number(e.target.value))}
                    className="w-full bg-[#f5f5f0] border border-[#e5e5d1] text-[#2d2d2a] rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-[#5A5A40]"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-[#e5e5d1]">
                <button
                  type="button"
                  onClick={() => setShowCommissionRuleModal(false)}
                  className="px-4 py-2 bg-[#f5f5f0] text-[#737366] font-semibold rounded-full text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#5A5A40] hover:bg-[#4a4a35] text-white font-bold rounded-full text-xs shadow-md"
                >
                  Save Commission Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD EXPENSE WITH RECURRING SUPPORT */}
      {showAddExpenseModal && (
        <div className="fixed inset-0 z-50 bg-[#2d2d2a]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#e5e5d1] rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl font-sans">
            <div className="flex items-center justify-between border-b border-[#e5e5d1] pb-3">
              <div>
                <h3 className="text-lg font-serif font-bold text-[#2d2d2a]">Record Operating Expense</h3>
                <p className="text-xs text-[#737366]">Support one-off expenses and automated recurring schedules.</p>
              </div>
              <button
                onClick={() => setShowAddExpenseModal(false)}
                className="text-[#737366] hover:text-[#2d2d2a] text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateExpenseSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#2d2d2a] mb-1">Expense Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Monthly Commercial Rent - Kazanchis Branch"
                  value={expDescription}
                  onChange={(e) => setExpDescription(e.target.value)}
                  className="w-full bg-[#f5f5f0] border border-[#e5e5d1] text-[#2d2d2a] rounded-xl px-3.5 py-2.5 outline-none focus:border-[#5A5A40]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#2d2d2a] mb-1">Category</label>
                  <select
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value as any)}
                    className="w-full bg-[#f5f5f0] border border-[#e5e5d1] text-[#2d2d2a] rounded-xl px-3.5 py-2.5 outline-none focus:border-[#5A5A40]"
                  >
                    <option value="rent">Rent & Facility</option>
                    <option value="utilities">Utilities & Electricity</option>
                    <option value="salary">Staff Salaries & Advances</option>
                    <option value="inventory_purchase">Inventory Supplies</option>
                    <option value="marketing">Marketing & Ads</option>
                    <option value="other">Other Overhead</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#2d2d2a] mb-1">Amount (ETB)</label>
                  <input
                    type="number"
                    required
                    value={expAmount}
                    onChange={(e) => setExpAmount(Number(e.target.value))}
                    className="w-full bg-[#f5f5f0] border border-[#e5e5d1] text-[#2d2d2a] rounded-xl px-3.5 py-2.5 outline-none focus:border-[#5A5A40]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#2d2d2a] mb-1">Payment Method</label>
                  <select
                    value={expPaymentMethod}
                    onChange={(e) => setExpPaymentMethod(e.target.value as any)}
                    className="w-full bg-[#f5f5f0] border border-[#e5e5d1] text-[#2d2d2a] rounded-xl px-3.5 py-2.5 outline-none focus:border-[#5A5A40]"
                  >
                    <option value="cbe_birr">CBE Birr</option>
                    <option value="telebirr">Telebirr</option>
                    <option value="cash">Cash</option>
                    <option value="card">Card / POS</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#2d2d2a] mb-1">Recorded By</label>
                  <input
                    type="text"
                    value={expRecordedBy}
                    onChange={(e) => setExpRecordedBy(e.target.value)}
                    className="w-full bg-[#f5f5f0] border border-[#e5e5d1] text-[#2d2d2a] rounded-xl px-3.5 py-2.5 outline-none focus:border-[#5A5A40]"
                  />
                </div>
              </div>

              {/* RECURRENCE TOGGLE */}
              <div className="p-3.5 bg-purple-50/60 border border-purple-200 rounded-2xl space-y-2.5">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={expIsRecurring}
                    onChange={(e) => setExpIsRecurring(e.target.checked)}
                    className="rounded text-purple-700 focus:ring-purple-500 w-4 h-4"
                  />
                  <span className="font-bold text-purple-900">Set as Recurring Expense Schedule</span>
                </label>

                {expIsRecurring && (
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-purple-200/80">
                    <div>
                      <label className="block font-semibold text-purple-900 mb-1">Recurrence Frequency</label>
                      <select
                        value={expRecurrenceFreq}
                        onChange={(e) => setExpRecurrenceFreq(e.target.value as any)}
                        className="w-full bg-white border border-purple-200 text-purple-950 rounded-xl px-3 py-2 outline-none focus:border-purple-600"
                      >
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-purple-900 mb-1">Next Due Date</label>
                      <input
                        type="date"
                        value={expNextDueDate}
                        onChange={(e) => setExpNextDueDate(e.target.value)}
                        className="w-full bg-white border border-purple-200 text-purple-950 rounded-xl px-3 py-2 outline-none focus:border-purple-600"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-[#e5e5d1]">
                <button
                  type="button"
                  onClick={() => setShowAddExpenseModal(false)}
                  className="px-4 py-2 bg-[#f5f5f0] text-[#737366] font-semibold rounded-full"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#5A5A40] hover:bg-[#4a4a35] text-white font-bold rounded-full shadow-md"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD USER */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-[#2d2d2a]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#e5e5d1] rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-serif font-bold text-[#2d2d2a]">Add New User</h3>
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
                <label className="block text-xs font-semibold text-[#2d2d2a] mb-1">Full Name</label>
                <input name="name" required className="w-full px-4 py-2.5 bg-[#f5f5f0] border border-[#e5e5d1] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#5A5A40]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#2d2d2a] mb-1">Email</label>
                <input name="email" type="email" required className="w-full px-4 py-2.5 bg-[#f5f5f0] border border-[#e5e5d1] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#5A5A40]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#2d2d2a] mb-1">Password</label>
                <input name="password" type="password" required className="w-full px-4 py-2.5 bg-[#f5f5f0] border border-[#e5e5d1] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#5A5A40]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#2d2d2a] mb-1">Role</label>
                <select name="role" className="w-full px-4 py-2.5 bg-[#f5f5f0] border border-[#e5e5d1] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#5A5A40]">
                  <option value="tenant_manager">Tenant Manager</option>
                  <option value="receptionist">Receptionist</option>
                  <option value="staff">Staff</option>
                </select>
              </div>
              <div className="flex justify-end space-x-2 pt-3 border-t border-[#e5e5d1]">
                <button type="button" onClick={() => setShowAddUserModal(false)} className="px-4 py-2 bg-[#f5f5f0] text-[#737366] font-semibold rounded-full">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-[#5A5A40] hover:bg-[#4a4a35] text-white font-bold rounded-full shadow-md">Create User</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT ENTITY */}
      {editingEntity && (
        <div className="fixed inset-0 z-50 bg-[#2d2d2a]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#e5e5d1] rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-serif font-bold text-[#2d2d2a]">Edit {editingEntity.type.charAt(0).toUpperCase() + editingEntity.type.slice(1)}</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const target = e.target as HTMLFormElement;
              const fd = new FormData(target);
              const data = editingEntity.data;
              if (editingEntity.type === 'branch') {
                onUpdateBranch?.({ ...data, name: fd.get('name') as string, city: fd.get('city') as string, address: fd.get('address') as string, phone: fd.get('phone') as string });
              } else if (editingEntity.type === 'staff') {
                onUpdateStaff?.({ ...data, name: fd.get('name') as string, phone: fd.get('phone') as string, email: fd.get('email') as string, role: fd.get('role') as any, defaultCommissionPercentage: Number(fd.get('commission')) });
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
                <div><label className="block text-xs font-semibold text-[#2d2d2a] mb-1">Name</label><input name="name" defaultValue={editingEntity.data.name} className="w-full px-4 py-2.5 bg-[#f5f5f0] border border-[#e5e5d1] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#5A5A40]" /></div>
                <div><label className="block text-xs font-semibold text-[#2d2d2a] mb-1">City</label><input name="city" defaultValue={editingEntity.data.city} className="w-full px-4 py-2.5 bg-[#f5f5f0] border border-[#e5e5d1] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#5A5A40]" /></div>
                <div><label className="block text-xs font-semibold text-[#2d2d2a] mb-1">Address</label><input name="address" defaultValue={editingEntity.data.address} className="w-full px-4 py-2.5 bg-[#f5f5f0] border border-[#e5e5d1] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#5A5A40]" /></div>
                <div><label className="block text-xs font-semibold text-[#2d2d2a] mb-1">Phone</label><input name="phone" defaultValue={editingEntity.data.phone} className="w-full px-4 py-2.5 bg-[#f5f5f0] border border-[#e5e5d1] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#5A5A40]" /></div>
              </>)}
              {editingEntity.type === 'staff' && (<>
                <div><label className="block text-xs font-semibold text-[#2d2d2a] mb-1">Name</label><input name="name" defaultValue={editingEntity.data.name} className="w-full px-4 py-2.5 bg-[#f5f5f0] border border-[#e5e5d1] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#5A5A40]" /></div>
                <div><label className="block text-xs font-semibold text-[#2d2d2a] mb-1">Phone</label><input name="phone" defaultValue={editingEntity.data.phone} className="w-full px-4 py-2.5 bg-[#f5f5f0] border border-[#e5e5d1] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#5A5A40]" /></div>
                <div><label className="block text-xs font-semibold text-[#2d2d2a] mb-1">Email</label><input name="email" defaultValue={editingEntity.data.email} className="w-full px-4 py-2.5 bg-[#f5f5f0] border border-[#e5e5d1] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#5A5A40]" /></div>
                <div><label className="block text-xs font-semibold text-[#2d2d2a] mb-1">Role</label>
                  <select name="role" defaultValue={editingEntity.data.role} className="w-full px-4 py-2.5 bg-[#f5f5f0] border border-[#e5e5d1] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#5A5A40]">
                    <option value="barber">Barber</option><option value="hairstylist">Hairstylist</option><option value="masseuse">Masseuse</option><option value="esthetician">Esthetician</option><option value="receptionist">Receptionist</option><option value="manager">Manager</option>
                  </select>
                </div>
                <div><label className="block text-xs font-semibold text-[#2d2d2a] mb-1">Commission %</label><input name="commission" type="number" defaultValue={editingEntity.data.defaultCommissionPercentage} className="w-full px-4 py-2.5 bg-[#f5f5f0] border border-[#e5e5d1] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#5A5A40]" /></div>
              </>)}
              {editingEntity.type === 'service' && (<>
                <div><label className="block text-xs font-semibold text-[#2d2d2a] mb-1">Name</label><input name="name" defaultValue={editingEntity.data.name} className="w-full px-4 py-2.5 bg-[#f5f5f0] border border-[#e5e5d1] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#5A5A40]" /></div>
                <div><label className="block text-xs font-semibold text-[#2d2d2a] mb-1">Category</label><input name="category" defaultValue={editingEntity.data.category} className="w-full px-4 py-2.5 bg-[#f5f5f0] border border-[#e5e5d1] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#5A5A40]" /></div>
                <div><label className="block text-xs font-semibold text-[#2d2d2a] mb-1">Price (ETB)</label><input name="price" type="number" defaultValue={editingEntity.data.priceEtb} className="w-full px-4 py-2.5 bg-[#f5f5f0] border border-[#e5e5d1] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#5A5A40]" /></div>
                <div><label className="block text-xs font-semibold text-[#2d2d2a] mb-1">Duration (mins)</label><input name="duration" type="number" defaultValue={editingEntity.data.durationMinutes} className="w-full px-4 py-2.5 bg-[#f5f5f0] border border-[#e5e5d1] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#5A5A40]" /></div>
              </>)}
              {editingEntity.type === 'inventory' && (<>
                <div><label className="block text-xs font-semibold text-[#2d2d2a] mb-1">Name</label><input name="name" defaultValue={editingEntity.data.name} className="w-full px-4 py-2.5 bg-[#f5f5f0] border border-[#e5e5d1] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#5A5A40]" /></div>
                <div><label className="block text-xs font-semibold text-[#2d2d2a] mb-1">SKU</label><input name="sku" defaultValue={editingEntity.data.sku} className="w-full px-4 py-2.5 bg-[#f5f5f0] border border-[#e5e5d1] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#5A5A40]" /></div>
                <div><label className="block text-xs font-semibold text-[#2d2d2a] mb-1">Unit</label><input name="unit" defaultValue={editingEntity.data.unit} className="w-full px-4 py-2.5 bg-[#f5f5f0] border border-[#e5e5d1] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#5A5A40]" /></div>
                <div><label className="block text-xs font-semibold text-[#2d2d2a] mb-1">Stock</label><input name="stock" type="number" defaultValue={editingEntity.data.currentStock} className="w-full px-4 py-2.5 bg-[#f5f5f0] border border-[#e5e5d1] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#5A5A40]" /></div>
                <div><label className="block text-xs font-semibold text-[#2d2d2a] mb-1">Reorder Level</label><input name="reorder" type="number" defaultValue={editingEntity.data.reorderLevel} className="w-full px-4 py-2.5 bg-[#f5f5f0] border border-[#e5e5d1] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#5A5A40]" /></div>
                <div><label className="block text-xs font-semibold text-[#2d2d2a] mb-1">Cost per unit (ETB)</label><input name="cost" type="number" defaultValue={editingEntity.data.unitCostEtb} className="w-full px-4 py-2.5 bg-[#f5f5f0] border border-[#e5e5d1] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#5A5A40]" /></div>
              </>)}
              {editingEntity.type === 'user' && (<>
                <div><label className="block text-xs font-semibold text-[#2d2d2a] mb-1">Name</label><input name="name" defaultValue={editingEntity.data.name} className="w-full px-4 py-2.5 bg-[#f5f5f0] border border-[#e5e5d1] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#5A5A40]" /></div>
                <div><label className="block text-xs font-semibold text-[#2d2d2a] mb-1">Email</label><input name="email" defaultValue={editingEntity.data.email} className="w-full px-4 py-2.5 bg-[#f5f5f0] border border-[#e5e5d1] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#5A5A40]" /></div>
                <div><label className="block text-xs font-semibold text-[#2d2d2a] mb-1">Password (leave blank to keep)</label><input name="password" type="password" className="w-full px-4 py-2.5 bg-[#f5f5f0] border border-[#e5e5d1] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#5A5A40]" /></div>
                <div><label className="block text-xs font-semibold text-[#2d2d2a] mb-1">Role</label>
                  <select name="role" defaultValue={editingEntity.data.role} className="w-full px-4 py-2.5 bg-[#f5f5f0] border border-[#e5e5d1] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#5A5A40]">
                    <option value="tenant_manager">Tenant Manager</option><option value="receptionist">Receptionist</option><option value="staff">Staff</option>
                  </select>
                </div>
              </>)}
              <div className="flex justify-end space-x-2 pt-3 border-t border-[#e5e5d1]">
                <button type="button" onClick={() => setEditingEntity(null)} className="px-4 py-2 bg-[#f5f5f0] text-[#737366] font-semibold rounded-full">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-[#5A5A40] hover:bg-[#4a4a35] text-white font-bold rounded-full shadow-md">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
