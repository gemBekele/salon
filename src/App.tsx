import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { SaasAdminDashboard } from './components/SaasAdminDashboard';
import { TenantAdminView } from './components/TenantAdminView';
import { ReceptionistPos } from './components/ReceptionistPos';
import { StaffPortalView } from './components/StaffPortalView';
import { ArchitectBlueprintView } from './components/ArchitectBlueprintView';
import { QueueDisplayView } from './components/QueueDisplayView';
import { AiAssistantModal } from './components/AiAssistantModal';
import { LoginScreen } from './components/LoginScreen';

import { mockArchitectureSections } from './data/mockErpData';

import {
  PersonaRole,
  AuthUser,
  AuthUserRole,
  Company,
  Branch,
  BusinessUnit,
  Staff,
  Service,
  Customer,
  VisitSession,
  CommissionLog,
  CommissionRule,
  InventoryItem,
  ExpenseRecord,
  SmsLog,
  AuditLog,
  PaymentMethod,
  SubscriptionPlan,
} from './types';
import { apiFetch, clearToken } from './lib/api';

/** Role -> personas each role may access. */
const ROLE_PERSONAS: Record<AuthUserRole, PersonaRole[]> = {
  super_admin: ['saas_super_admin', 'architect_lead'],
  tenant_manager: ['tenant_admin', 'receptionist', 'queue_tv', 'architect_lead'],
  receptionist: ['receptionist', 'queue_tv'],
  staff: ['staff_member'],
};

/** Default persona selected after login for each role. */
const DEFAULT_PERSONA: Record<AuthUserRole, PersonaRole> = {
  super_admin: 'saas_super_admin',
  tenant_manager: 'tenant_admin',
  receptionist: 'receptionist',
  staff: 'staff_member',
};

export default function App() {
  // Auth
  const [user, setUser] = useState<AuthUser | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);

  // Active Persona State (restricted by role)
  const [currentPersona, setCurrentPersona] = useState<PersonaRole>('receptionist');

  // Multi-Tenant State Collections (Populated dynamically from MySQL Database)
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [businessUnits, setBusinessUnits] = useState<BusinessUnit[]>([]);
  const [selectedBusinessUnit, setSelectedBusinessUnit] = useState<BusinessUnit | null>(null);

  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [visitSessions, setVisitSessions] = useState<VisitSession[]>([]);
  const [commissionLogs, setCommissionLogs] = useState<CommissionLog[]>([]);
  const [commissionRules, setCommissionRules] = useState<CommissionRule[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [smsLogs, setSmsLogs] = useState<SmsLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);

  // Gemini AI Assistant Modal
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  // FETCH ALL DATA FROM MYSQL DATABASE (scoped by role server-side)
  const fetchDbState = useCallback(async () => {
    try {
      const res = await apiFetch('/api/db-state');
      if (!res.ok) return;
      const data = await res.json();

      if (data.companies && data.companies.length > 0) {
        setCompanies(data.companies);
        setSelectedCompany((prev) =>
          prev ? data.companies.find((c: Company) => c.id === prev.id) || data.companies[0] : data.companies[0]
        );
      }
      if (data.branches && data.branches.length > 0) {
        setBranches(data.branches);
        setSelectedBranch((prev) =>
          prev ? data.branches.find((b: Branch) => b.id === prev.id) || data.branches[0] : data.branches[0]
        );
      }
      if (data.businessUnits && data.businessUnits.length > 0) {
        setBusinessUnits(data.businessUnits);
        setSelectedBusinessUnit((prev) =>
          prev ? data.businessUnits.find((bu: BusinessUnit) => bu.id === prev.id) || data.businessUnits[0] : data.businessUnits[0]
        );
      }
      if (data.staffList) setStaffList(data.staffList);
      if (data.services) setServices(data.services);
      if (data.customers) setCustomers(data.customers);
      if (data.visitSessions) setVisitSessions(data.visitSessions);
      if (data.commissionLogs) setCommissionLogs(data.commissionLogs);
      if (data.commissionRules) setCommissionRules(data.commissionRules);
      if (data.inventoryItems) setInventoryItems(data.inventoryItems);
      if (data.expenses) setExpenses(data.expenses);
      if (data.smsLogs) setSmsLogs(data.smsLogs);
      if (data.auditLogs) setAuditLogs(data.auditLogs);
      if (data.subscriptionPlans) setSubscriptionPlans(data.subscriptionPlans);
    } catch (err) {
      console.error('Failed to load database state from MySQL:', err);
    }
  }, []);

  // Bootstrap authentication: validate stored token then load data
  useEffect(() => {
    const token = localStorage.getItem('sserp_token');
    if (!token) {
      setBootstrapping(false);
      return;
    }
    (async () => {
      try {
        const res = await apiFetch('/api/auth/me');
        if (!res.ok) {
          setBootstrapping(false);
          return;
        }
        const data = await res.json();
        setUser(data.user as AuthUser);
        await fetchDbState();
      } catch (err) {
        console.error('Auth bootstrap failed:', err);
      } finally {
        setBootstrapping(false);
      }
    })();
  }, [fetchDbState]);

  // Listen for session expiry / forced logout
  useEffect(() => {
    const onExpired = () => {
      setUser(null);
      setSelectedCompany(null);
      setSelectedBranch(null);
      setSelectedBusinessUnit(null);
    };
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, []);

  // Default persona for the signed-in role
  useEffect(() => {
    if (user) setCurrentPersona(DEFAULT_PERSONA[user.role]);
  }, [user]);

  const handleLogin = (u: AuthUser) => {
    setUser(u);
    setCurrentPersona(DEFAULT_PERSONA[u.role]);
    fetchDbState();
  };

  const handleLogout = () => {
    clearToken();
    setUser(null);
    setCompanies([]);
    setSelectedCompany(null);
    setSelectedBranch(null);
    setSelectedBusinessUnit(null);
  };

  const allowedPersonas = user ? ROLE_PERSONAS[user.role] : [];

  // HANDLERS FOR CREATING / UPDATING ENTITIES IN MYSQL DATABASE

  const handleAddCompany = async (newCompany: Company) => {
    try {
      await apiFetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCompany),
      });
      await fetchDbState();
      setSelectedCompany(newCompany);
    } catch (err) {
      console.error('Failed to add company', err);
    }
  };

  const handleAddBranch = async (newBranch: Branch) => {
    try {
      await apiFetch('/api/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBranch),
      });
      await fetchDbState();
      setSelectedBranch(newBranch);
    } catch (err) {
      console.error('Failed to add branch', err);
    }
  };

  const handleAddBusinessUnit = async (newUnit: BusinessUnit) => {
    try {
      await apiFetch('/api/business-units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUnit),
      });
      await fetchDbState();
      setSelectedBusinessUnit(newUnit);
    } catch (err) {
      console.error('Failed to add business unit', err);
    }
  };

  const handleAddStaff = async (newStaff: Staff) => {
    try {
      await apiFetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStaff),
      });
      await fetchDbState();
    } catch (err) {
      console.error('Failed to add staff', err);
    }
  };

  const handleAddService = async (newService: Service) => {
    try {
      await apiFetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newService),
      });
      await fetchDbState();
    } catch (err) {
      console.error('Failed to add service', err);
    }
  };

  const handleAddInventoryItem = async (newItem: InventoryItem) => {
    try {
      await apiFetch('/api/inventory-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
      });
      await fetchDbState();
    } catch (err) {
      console.error('Failed to add inventory item', err);
    }
  };

  const handleUpdateInventoryStock = async (invId: string, addedStock: number) => {
    try {
      await apiFetch('/api/inventory-items/adjust-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: invId, addedStock }),
      });
      await fetchDbState();
    } catch (err) {
      console.error('Failed to update inventory stock', err);
    }
  };

  const handleAddCustomer = async (newCust: Customer) => {
    try {
      await apiFetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCust),
      });
      await fetchDbState();
    } catch (err) {
      console.error('Failed to add customer', err);
    }
  };

  const handleCreateVisitSession = async (newSession: VisitSession) => {
    try {
      const res = await apiFetch('/api/visit-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSession),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error('Failed to create visit session:', data.error);
      }
      await fetchDbState();
    } catch (err) {
      console.error('Failed to create visit session', err);
    }
  };

  const handleUpdateSessionStatus = async (
    sessionId: string,
    newStatus: 'queued' | 'in_progress' | 'completed' | 'cancelled'
  ) => {
    try {
      await apiFetch('/api/visit-sessions/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: sessionId, status: newStatus }),
      });
      await fetchDbState();
    } catch (err) {
      console.error('Failed to update session status', err);
    }
  };

  const handleUpdateSessionTimeOrStaff = async (
    sessionId: string,
    newStaffId: string,
    _newTime: string
  ) => {
    try {
      const stf = staffList.find((st) => st.id === newStaffId);
      await apiFetch('/api/visit-sessions/staff', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: sessionId,
          companyId: selectedCompany?.id,
          staffId: newStaffId,
          staffName: stf?.name || 'Staff Member',
        }),
      });
      await fetchDbState();
    } catch (err) {
      console.error('Failed to update session staff assignment', err);
    }
  };

  const handleSaveCommissionRule = async (newRule: CommissionRule) => {
    try {
      await apiFetch('/api/commission-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRule),
      });
      await fetchDbState();
    } catch (err) {
      console.error('Failed to save commission rule', err);
    }
  };

  const handleAddExpense = async (newExpense: ExpenseRecord) => {
    try {
      await apiFetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newExpense),
      });
      await fetchDbState();
    } catch (err) {
      console.error('Failed to add expense', err);
    }
  };

  const handleAddAuditLog = async (newLog: AuditLog) => {
    try {
      await apiFetch('/api/audit-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLog),
      });
    } catch (err) {
      console.error('Failed to add audit log', err);
    }
  };

  const handleCheckoutSession = async (
    sessionId: string,
    paymentMethod: PaymentMethod,
    reference: string
  ) => {
    try {
      const session = visitSessions.find((s) => s.id === sessionId);
      if (!session) return;

      // Atomic server checkout: commissions, loyalty & inventory handled in one transaction.
      await apiFetch('/api/visit-sessions/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          paymentMethod,
          reference,
          completedAt: new Date().toISOString(),
        }),
      });

      await fetchDbState();
    } catch (err) {
      console.error('Failed to checkout session', err);
    }
  };

  if (bootstrapping) {
    return (
      <div className="min-h-screen bg-[#f5f5f0] flex items-center justify-center text-[#5A5A40] font-sans">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-4 border-[#5A5A40] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold">Connecting to Serenity ERP...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  if (!selectedCompany || !selectedBranch) {
    return (
      <div className="min-h-screen bg-[#f5f5f0] flex items-center justify-center text-[#5A5A40] font-sans">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-4 border-[#5A5A40] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold">Loading tenant workspace from XAMPP MySQL...</p>
        </div>
      </div>
    );
  }

  return (
    <div id="app-root" className="min-h-screen bg-[#f5f5f0] text-[#2d2d2a] flex flex-col font-sans antialiased selection:bg-[#5A5A40] selection:text-white">
      <Navbar
        currentPersona={currentPersona}
        setCurrentPersona={setCurrentPersona}
        companies={companies}
        selectedCompany={selectedCompany}
        setSelectedCompany={setSelectedCompany}
        branches={branches}
        selectedBranch={selectedBranch}
        setSelectedBranch={setSelectedBranch}
        businessUnits={businessUnits}
        selectedBusinessUnit={selectedBusinessUnit}
        setSelectedBusinessUnit={setSelectedBusinessUnit}
        allowedPersonas={allowedPersonas}
        currentUser={user}
        onLogout={handleLogout}
        onOpenAiAssistant={() => setIsAiModalOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {currentPersona === 'saas_super_admin' && user.role === 'super_admin' && (
          <SaasAdminDashboard
            companies={companies}
            onAddCompany={handleAddCompany}
            subscriptionPlans={subscriptionPlans}
            smsLogs={smsLogs}
          />
        )}

        {currentPersona === 'tenant_admin' && (
          <TenantAdminView
            company={selectedCompany}
            branches={branches}
            businessUnits={businessUnits}
            staffList={staffList}
            services={services}
            inventoryItems={inventoryItems}
            commissionLogs={commissionLogs}
            commissionRules={commissionRules}
            expenses={expenses}
            visitSessions={visitSessions}
            auditLogs={auditLogs}
            selectedBranch={selectedBranch}
            onAddBranch={handleAddBranch}
            onAddBusinessUnit={handleAddBusinessUnit}
            onAddStaff={handleAddStaff}
            onAddService={handleAddService}
            onAddInventoryItem={handleAddInventoryItem}
            onUpdateInventoryStock={handleUpdateInventoryStock}
            onSaveCommissionRule={handleSaveCommissionRule}
            onAddExpense={handleAddExpense}
            onAddAuditLog={handleAddAuditLog}
          />
        )}

        {currentPersona === 'receptionist' && (
          <ReceptionistPos
            company={selectedCompany}
            branch={selectedBranch}
            businessUnit={selectedBusinessUnit}
            staffList={staffList}
            services={services}
            customers={customers}
            visitSessions={visitSessions}
            inventoryItems={inventoryItems}
            smsLogs={smsLogs}
            onCreateVisitSession={handleCreateVisitSession}
            onCheckoutSession={handleCheckoutSession}
            onAddCustomer={handleAddCustomer}
            onUpdateSessionStatus={handleUpdateSessionStatus}
            onUpdateSessionTimeOrStaff={handleUpdateSessionTimeOrStaff}
          />
        )}

        {currentPersona === 'queue_tv' && (
          <QueueDisplayView
            company={selectedCompany}
            branch={selectedBranch}
            visitSessions={visitSessions}
            onExitTvMode={() => setCurrentPersona('receptionist')}
          />
        )}

        {currentPersona === 'staff_member' && (
          <StaffPortalView
            staffList={staffList}
            commissionLogs={commissionLogs}
            visitSessions={visitSessions}
            branches={branches}
            businessUnits={businessUnits}
          />
        )}

        {currentPersona === 'architect_lead' && (
          <ArchitectBlueprintView sections={mockArchitectureSections} />
        )}
      </main>

      <footer id="app-footer" className="bg-white border-t border-[#e5e5d1] py-4 text-xs text-[#737366] text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <strong className="text-[#5A5A40] font-serif font-bold">Serenity Salon & Spa Management ERP SaaS</strong> — Multi-Tenant Multi-Branch Platform
          </div>
          <div className="text-[11px] uppercase tracking-wider font-semibold text-[#5A5A40]/70">
            RBAC Secured • XAMPP MySQL Live DB • Single DB Multi-Tenancy • ETB Currency
          </div>
        </div>
      </footer>

      <AiAssistantModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        selectedCompany={selectedCompany}
        selectedBranch={selectedBranch}
      />
    </div>
  );
}