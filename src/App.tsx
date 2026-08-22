import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastContainer, showToast } from './components/Toast';
import { AuthGuard } from './components/AuthGuard';
import { AppLayout } from './components/AppLayout';
import { LoginScreen } from './components/LoginScreen';
import { AppProvider } from './lib/AppContext';
import type { AppState } from './lib/AppContext';

const SaasAdminDashboard = lazy(() => import('./components/SaasAdminDashboard').then(m => ({ default: m.SaasAdminDashboard })));
const TenantAdminView = lazy(() => import('./components/TenantAdminView').then(m => ({ default: m.TenantAdminView })));
const ReceptionistPos = lazy(() => import('./components/ReceptionistPos').then(m => ({ default: m.ReceptionistPos })));
const StaffPortalView = lazy(() => import('./components/StaffPortalView').then(m => ({ default: m.StaffPortalView })));
const ArchitectBlueprintView = lazy(() => import('./components/ArchitectBlueprintView').then(m => ({ default: m.ArchitectBlueprintView })));
const QueueDisplayView = lazy(() => import('./components/QueueDisplayView').then(m => ({ default: m.QueueDisplayView })));
const AiAssistantModal = lazy(() => import('./components/AiAssistantModal').then(m => ({ default: m.AiAssistantModal })));
const CustomerWebsiteView = lazy(() => import('./components/CustomerWebsiteView').then(m => ({ default: m.CustomerWebsiteView })));
const AppointmentBookingModal = lazy(() => import('./components/AppointmentBookingModal').then(m => ({ default: m.AppointmentBookingModal })));
const WalkInTabletView = lazy(() => import('./components/WalkInTabletView').then(m => ({ default: m.WalkInTabletView })));

import { mockArchitectureSections } from './data/mockErpData';

import {
  AuthUser,
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
  User,
} from './types';
import { apiFetch, clearToken, apiOk, ApiError, readApiError } from './lib/api';

export default function App() {
  // ── Auth ──
  const [user, setUser] = useState<AuthUser | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [staffSessionPin, setStaffSessionPin] = useState<string | undefined>(undefined);


  // ── Org ──
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [businessUnits, setBusinessUnits] = useState<BusinessUnit[]>([]);
  const [selectedBusinessUnit, setSelectedBusinessUnit] = useState<BusinessUnit | null>(null);

  // ── Data ──
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
  const [users, setUsers] = useState<User[]>([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);

  // ── UI ──
  const [dbError, setDbError] = useState<string | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [websiteTheme, setWebsiteTheme] = useState<'dark' | 'light'>('dark');
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingServiceId, setBookingServiceId] = useState<string | null>(null);

  // The `/tablet` route is the public walk-in self-registration kiosk that the
  // login screen links to (no auth required).

  // ── fetchDbState ──
  // Pass a subset of section names (e.g. ['visitSessions']) for a fast partial
  // refresh; omitted keys keep their current values. Full fetch when omitted.
  const fetchDbState = useCallback(async (sections?: string[]) => {
    try {
      const qs = sections?.length ? `?sections=${encodeURIComponent(sections.join(','))}` : '';
      const res = await apiFetch(`/api/db-state${qs}`);
      if (!res.ok) { setDbError(`Could not load workspace data (${res.status}).`); return; }
      const data = await res.json();
      if (data.companies?.length) {
        setCompanies(data.companies);
        setSelectedCompany((prev) =>
          prev ? data.companies.find((c: Company) => c.id === prev.id) || data.companies[0] : data.companies[0]
        );
      }
      if (data.branches?.length) {
        setBranches(data.branches);
        setSelectedBranch((prev) =>
          prev ? data.branches.find((b: Branch) => b.id === prev.id) || data.branches[0] : data.branches[0]
        );
      }
      if (data.businessUnits?.length) {
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
      if (data.users) setUsers(data.users);
      if (data.subscriptionPlans) setSubscriptionPlans(data.subscriptionPlans);
      setDbError(null);
    } catch { setDbError('Could not load workspace data from the server.'); }
  }, []);

  // ── Bootstrap auth ──
  useEffect(() => {
    const token = localStorage.getItem('sserp_token');
    if (!token) { setBootstrapping(false); return; }
    (async () => {
      try {
        const res = await apiFetch('/api/auth/me');
        if (!res.ok) { setBootstrapping(false); return; }
        const data = await res.json();
        setUser(data.user as AuthUser);
        if ((data.user as AuthUser).role === 'staff') setStaffSessionPin(undefined);
        await fetchDbState();
      } catch { /* ignore */ }
      finally { setBootstrapping(false); }
    })();
  }, [fetchDbState]);

  useEffect(() => {
    const onExpired = () => { setUser(null); setSelectedCompany(null); setSelectedBranch(null); setSelectedBusinessUnit(null); };
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, []);

  // Light polls only refresh sessions; reconcile the full workspace when the
  // user comes back to the tab (throttled to once a minute).
  useEffect(() => {
    let last = 0;
    const reconcile = () => {
      if (document.hidden) return;
      const now = Date.now();
      if (now - last > 60_000) { last = now; fetchDbState(); }
    };
    window.addEventListener('focus', reconcile);
    document.addEventListener('visibilitychange', reconcile);
    return () => {
      window.removeEventListener('focus', reconcile);
      document.removeEventListener('visibilitychange', reconcile);
    };
  }, [fetchDbState]);

  // ── Handlers ──
  const handleLogin = (u: AuthUser, pin?: string) => {
    setUser(u);
    setStaffSessionPin(u.role === 'staff' ? pin : undefined);
    fetchDbState();
  };

  const handleLogout = async () => {
    try { await apiFetch('/api/auth/logout', { method: 'POST' }); } catch { /* ok */ }
    clearToken();
    setUser(null);
    setStaffSessionPin(undefined);
    setCompanies([]);
    setSelectedCompany(null);
    setSelectedBranch(null);
    setSelectedBusinessUnit(null);
  };

  const handleAddCompany = async (c: Company) => { try { await apiOk(await apiFetch('/api/companies', { method: 'POST', body: JSON.stringify(c) })); await fetchDbState(); setSelectedCompany(c); showToast('success', 'Company created'); } catch (e) { showToast('error', e instanceof ApiError ? e.message : 'Failed'); } };
  const handleAddBranch = async (b: Branch) => { try { await apiOk(await apiFetch('/api/branches', { method: 'POST', body: JSON.stringify(b) })); await fetchDbState(); setSelectedBranch(b); showToast('success', 'Branch created'); } catch (e) { showToast('error', e instanceof ApiError ? e.message : 'Failed'); } };
  const handleAddStaff = async (s: Staff) => { try { await apiOk(await apiFetch('/api/staff', { method: 'POST', body: JSON.stringify(s) })); await fetchDbState(); showToast('success', 'Staff created'); } catch (e) { showToast('error', e instanceof ApiError ? e.message : 'Failed'); } };
  const handleAddService = async (s: Service) => { try { await apiOk(await apiFetch('/api/services', { method: 'POST', body: JSON.stringify(s) })); await fetchDbState(); showToast('success', 'Service created'); } catch (e) { showToast('error', e instanceof ApiError ? e.message : 'Failed'); } };
  const handleAddInventoryItem = async (i: InventoryItem) => { try { await apiOk(await apiFetch('/api/inventory-items', { method: 'POST', body: JSON.stringify(i) })); await fetchDbState(); showToast('success', 'Inventory item created'); } catch (e) { showToast('error', e instanceof ApiError ? e.message : 'Failed'); } };
  const handleUpdateInventoryStock = async (id: string, qty: number) => { try { await apiOk(await apiFetch('/api/inventory-items/adjust-stock', { method: 'POST', body: JSON.stringify({ id, addedStock: qty }) })); showToast('success', 'Stock updated'); fetchDbState(['inventoryItems']); } catch (e) { showToast('error', e instanceof ApiError ? e.message : 'Failed'); } };
  const handleAddCustomer = async (c: Customer) => {
    setCustomers((prev) => [c, ...prev]);
    try {
      const res = await apiFetch('/api/customers', { method: 'POST', body: JSON.stringify(c) });
      if (!res.ok) {
        const msg = await readApiError(res);
        setCustomers((prev) => prev.filter((item) => item.id !== c.id));
        showToast('error', msg);
        throw new Error(msg);
      }
      showToast('success', 'Customer registered');
      fetchDbState(['customers']);
    } catch (e: any) {
      setCustomers((prev) => prev.filter((item) => item.id !== c.id));
      const msg = e instanceof ApiError ? e.message : (e.message || 'Failed to register customer');
      showToast('error', msg);
      throw new Error(msg);
    }
  };
  const handleCreateVisitSession = async (s: VisitSession) => {
    setVisitSessions((prev) => [s, ...prev]);
    try {
      const res = await apiFetch('/api/visit-sessions', { method: 'POST', body: JSON.stringify(s) });
      if (!res.ok) {
        const msg = await readApiError(res);
        setVisitSessions((prev) => prev.filter((item) => item.id !== s.id));
        showToast('error', msg);
        throw new Error(msg);
      }
      showToast('success', 'Visit session created');
      fetchDbState(['visitSessions']);
    } catch (e: any) {
      setVisitSessions((prev) => prev.filter((item) => item.id !== s.id));
      const msg = e instanceof ApiError ? e.message : (e.message || 'Failed to create visit session');
      showToast('error', msg);
      throw new Error(msg);
    }
  };
  const handleUpdateSessionServices = async (id: string, svc: any) => { try { await apiOk(await apiFetch('/api/visit-sessions/services', { method: 'PATCH', body: JSON.stringify({ sessionId: id, service: svc }) })); showToast('success', 'Service added'); fetchDbState(['visitSessions']); } catch (e) { showToast('error', e instanceof ApiError ? e.message : 'Failed'); } };
  const handleUpdateServiceStatus = async (serviceId: string, status: 'in_progress' | 'completed') => {
    // Optimistic: patch locally so Start/Complete feels instant, then
    // reconcile with a light sessions-only refresh in the background.
    setVisitSessions((prev) => prev.map((s) => {
      if (!s.services.some((v) => v.id === serviceId)) return s;
      const services = s.services.map((v) => (v.id === serviceId ? { ...v, status } : v));
      const allDone = services.every((v) => v.status === 'completed');
      const anyStarted = services.some((v) => v.status !== 'pending');
      return {
        ...s,
        services,
        status: status === 'completed' && allDone ? 'completed' : anyStarted ? 'in_progress' : s.status,
        startedAt: s.startedAt || new Date().toISOString(),
        completedAt: status === 'completed' && allDone ? (s.completedAt || new Date().toISOString()) : s.completedAt,
      } as VisitSession;
    }));
    try {
      const res = await apiFetch(`/api/visit-sessions/services/${serviceId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      if (!res.ok) {
        const msg = await readApiError(res);
        showToast('error', msg);
        fetchDbState(['visitSessions']);
        return;
      }
      showToast('success', status === 'in_progress' ? 'Service started' : 'Service completed');
      fetchDbState(['visitSessions']);
    } catch (e) {
      showToast('error', e instanceof ApiError ? e.message : 'Failed');
    }
  };
  const handleCancelSession = async (sessionId: string, reason?: string) => { try { await apiOk(await apiFetch(`/api/visit-sessions/${sessionId}`, { method: 'DELETE', body: JSON.stringify({ reason }) })); showToast('success', 'Client removed from queue'); fetchDbState(['visitSessions']); } catch (e) { showToast('error', e instanceof ApiError ? e.message : 'Failed'); } };
  const handleRemoveSessionService = async (sessionId: string, serviceId: string) => { try { await apiOk(await apiFetch(`/api/visit-sessions/${sessionId}/services/${serviceId}`, { method: 'DELETE' })); showToast('success', 'Service removed'); fetchDbState(['visitSessions']); } catch (e) { showToast('error', e instanceof ApiError ? e.message : 'Failed'); } };
  const handleUpdateSessionStatus = async (id: string, status: 'queued' | 'in_progress' | 'completed' | 'cancelled') => {
    setVisitSessions((prev) => prev.map((s) => s.id === id ? { ...s, status } : s));
    try { const res = await apiFetch('/api/visit-sessions/status', { method: 'PATCH', body: JSON.stringify({ id, status }) }); if (res.ok) showToast('success', `Status: ${status}`); } catch { /* optimistic */ }
  };
  const handleCheckoutSession = async (id: string, method: PaymentMethod, ref: string) => {
    setVisitSessions((prev) => prev.map((s) => s.id === id ? { ...s, isPaid: true, paymentMethod: method, paymentReference: ref } : s));
    try {
      await apiOk(await apiFetch('/api/visit-sessions/checkout', { method: 'POST', body: JSON.stringify({ sessionId: id, paymentMethod: method, reference: ref, completedAt: new Date().toISOString() }) }));
      showToast('success', 'Checkout completed');
      fetchDbState(['visitSessions', 'customers', 'inventoryItems', 'commissionLogs']);
    } catch (e) { showToast('error', e instanceof ApiError ? e.message : 'Failed'); }
  };
  const handleSaveCommissionRule = async (r: CommissionRule) => { try { await apiOk(await apiFetch('/api/commission-rules', { method: 'POST', body: JSON.stringify(r) })); await fetchDbState(); showToast('success', 'Commission rule saved'); } catch (e) { showToast('error', e instanceof ApiError ? e.message : 'Failed'); } };
  const handleAddExpense = async (e: ExpenseRecord) => { try { await apiOk(await apiFetch('/api/expenses', { method: 'POST', body: JSON.stringify(e) })); await fetchDbState(); showToast('success', 'Expense created'); } catch (e2) { showToast('error', e2 instanceof ApiError ? e2.message : 'Failed'); } };
  const handleAddAuditLog = async (l: AuditLog) => { try { await apiFetch('/api/audit-logs', { method: 'POST', body: JSON.stringify(l) }); } catch { /* non-critical */ } };
  const handleUpdateBranch = async (b: Branch) => { try { await apiOk(await apiFetch(`/api/branches/${b.id}`, { method: 'PUT', body: JSON.stringify(b) })); await fetchDbState(); showToast('success', 'Branch updated'); } catch (e) { showToast('error', e instanceof ApiError ? e.message : 'Failed'); } };
  const handleDeleteBranch = async (id: string) => { try { await apiOk(await apiFetch(`/api/branches/${id}`, { method: 'DELETE' })); await fetchDbState(); showToast('success', 'Branch deactivated'); } catch (e) { showToast('error', e instanceof ApiError ? e.message : 'Failed'); } };
  const handleUpdateStaff = async (s: Staff) => { try { await apiOk(await apiFetch(`/api/staff/${s.id}`, { method: 'PUT', body: JSON.stringify(s) })); await fetchDbState(); showToast('success', 'Staff updated'); } catch (e) { showToast('error', e instanceof ApiError ? e.message : 'Failed'); } };
  const handleDeleteStaff = async (id: string) => { try { await apiOk(await apiFetch(`/api/staff/${id}`, { method: 'DELETE' })); await fetchDbState(); showToast('success', 'Staff deactivated'); } catch (e) { showToast('error', e instanceof ApiError ? e.message : 'Failed'); } };
  const handleUpdateService = async (s: Service) => { try { await apiOk(await apiFetch(`/api/services/${s.id}`, { method: 'PUT', body: JSON.stringify(s) })); await fetchDbState(); showToast('success', 'Service updated'); } catch (e) { showToast('error', e instanceof ApiError ? e.message : 'Failed'); } };
  const handleDeleteService = async (id: string) => { try { await apiOk(await apiFetch(`/api/services/${id}`, { method: 'DELETE' })); await fetchDbState(); showToast('success', 'Service deactivated'); } catch (e) { showToast('error', e instanceof ApiError ? e.message : 'Failed'); } };
  const handleUpdateInventoryItem = async (i: InventoryItem) => { try { await apiOk(await apiFetch(`/api/inventory-items/${i.id}`, { method: 'PUT', body: JSON.stringify(i) })); await fetchDbState(); showToast('success', 'Inventory updated'); } catch (e) { showToast('error', e instanceof ApiError ? e.message : 'Failed'); } };
  const handleDeleteInventoryItem = async (id: string) => { try { await apiOk(await apiFetch(`/api/inventory-items/${id}`, { method: 'DELETE' })); await fetchDbState(); showToast('success', 'Inventory deactivated'); } catch (e) { showToast('error', e instanceof ApiError ? e.message : 'Failed'); } };
  const handleAddUser = async (u: User) => { try { await apiOk(await apiFetch('/api/users', { method: 'POST', body: JSON.stringify(u) })); await fetchDbState(); showToast('success', 'User created'); } catch (e) { showToast('error', e instanceof ApiError ? e.message : 'Failed'); } };
  const handleUpdateUser = async (u: User & { password?: string }) => { try { await apiOk(await apiFetch(`/api/users/${u.id}`, { method: 'PUT', body: JSON.stringify(u) })); await fetchDbState(); showToast('success', 'User updated'); } catch (e) { showToast('error', e instanceof ApiError ? e.message : 'Failed'); } };

  // ── Context value ──
  const ctx: AppState = {
    user, bootstrapping, staffSessionPin,
    companies, selectedCompany, setSelectedCompany,
    branches, selectedBranch, setSelectedBranch,
    businessUnits, selectedBusinessUnit, setSelectedBusinessUnit,
    staffList, services, customers, visitSessions,
    commissionLogs, commissionRules, inventoryItems, expenses,
    smsLogs, auditLogs, users, subscriptionPlans,
    dbError, setDbError,
    isAiModalOpen, setIsAiModalOpen,
    websiteTheme, setWebsiteTheme,
    isBookingModalOpen, setIsBookingModalOpen,
    bookingServiceId, setBookingServiceId,
    setUser, setStaffSessionPin,
    fetchDbState, handleLogin, handleLogout,
    handleCreateVisitSession, handleAddCustomer, handleUpdateSessionStatus,
    handleUpdateSessionServices, handleCheckoutSession,
    handleUpdateServiceStatus, handleCancelSession, handleRemoveSessionService,
    handleAddCompany, handleAddBranch,
    handleAddStaff, handleAddService, handleAddInventoryItem,
    handleUpdateInventoryStock, handleSaveCommissionRule,
    handleAddExpense, handleAddAuditLog,
    handleUpdateBranch, handleDeleteBranch,
    handleUpdateStaff, handleDeleteStaff,
    handleUpdateService, handleDeleteService,
    handleUpdateInventoryItem, handleDeleteInventoryItem,
    handleAddUser, handleUpdateUser,
  };

  // ── Bootstrapping ──
  if (bootstrapping) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-foreground font-sans">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-4 border-foreground border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold">Connecting to Gech Beauty Salon ERP...</p>
        </div>
      </div>
    );
  }

  return (
    <AppProvider value={ctx}>
      <ErrorBoundary fallbackLabel="The app hit an unexpected error">
      <Routes>
        {/* ── Public: Website landing page ── */}
        <Route path="/" element={
          <ErrorBoundary fallbackLabel="Failed to load Customer Website">
            <Suspense fallback={<div className="min-h-screen bg-[#09090b] text-ink-500 flex items-center justify-center font-serif text-lg">Loading Gech Barbershop...</div>}>
              <ToastContainer />
              <CustomerWebsiteView
                company={selectedCompany || companies[0] || null}
                branch={selectedBranch || branches[0] || null}
                services={services}
                staffList={staffList}
                onOpenBooking={(srvId) => { setBookingServiceId(srvId || null); setIsBookingModalOpen(true); }}
                onLaunchStaffErp={() => window.location.href = '/login'}
                theme={websiteTheme}
                setTheme={setWebsiteTheme}
              />
              <AppointmentBookingModal
                isOpen={isBookingModalOpen}
                onClose={() => setIsBookingModalOpen(false)}
                company={selectedCompany || companies[0] || null}
                branch={selectedBranch || branches[0] || null}
                services={services}
                staffList={staffList}
                initialServiceId={bookingServiceId}
                onBookingCreated={(s) => { setVisitSessions((prev) => [s, ...prev]); fetchDbState(); }}
                theme={websiteTheme}
              />
            </Suspense>
          </ErrorBoundary>
        } />

        {/* ── Public: Login ── */}
        <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />

        {/* ── Public: Walk-in registration tablet ── */}
        <Route path="/tablet" element={
          <ErrorBoundary fallbackLabel="Failed to load the walk-in tablet">
            <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-[#09090b] text-[#fafafa] text-sm">Loading Walk-in Registration...</div>}>
              <TabletPage
                company={selectedCompany || companies[0] || { id: 'cmp_gech_01', name: 'Gech Beauty Salon', slug: 'gech', subscriptionPlanId: '', status: 'active', currency: 'ETB', timezone: 'Africa/Addis_Ababa', phone: '', email: '', createdAt: new Date().toISOString() }}
                branch={selectedBranch || branches[0] || { id: 'br_mens_01', companyId: 'cmp_gech_01', name: 'Main Branch', city: 'Hawassa', address: '', phone: '', isMainBranch: true, status: 'active' }}
                services={services}
                staffList={staffList}
              />
            </Suspense>
          </ErrorBoundary>
        } />

        {/* ── Public: TV fullscreen ── */}
        <Route path="/tv" element={
          <ErrorBoundary fallbackLabel="Failed to load TV display">
            <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-[#141417] text-[#fafafa] text-sm">Loading TV Lounge Queue Board...</div>}>
              <TvPage fetchDbState={fetchDbState} visitSessions={visitSessions} businessUnits={businessUnits} companies={companies} branches={branches} selectedCompany={selectedCompany} selectedBranch={selectedBranch} staffList={staffList} customers={customers} />
            </Suspense>
          </ErrorBoundary>
        } />

        {/* ── Protected: ERP routes ── */}
        <Route element={<AuthGuard />}>
          <Route element={<AppLayout />}>
            <Route path="/saas" element={
              user?.role === 'super_admin' ? (
                <SaasAdminDashboard companies={companies} onAddCompany={handleAddCompany} subscriptionPlans={subscriptionPlans} smsLogs={smsLogs} />
              ) : <Navigate to="/staff" replace />
            } />
            <Route path="/admin" element={
              user && ['super_admin', 'owner', 'manager'].includes(user.role) ? (
                <TenantAdminView company={selectedCompany} branches={branches} businessUnits={businessUnits} staffList={staffList} services={services} inventoryItems={inventoryItems} commissionLogs={commissionLogs} commissionRules={commissionRules} expenses={expenses} visitSessions={visitSessions} auditLogs={auditLogs} users={users} selectedBranch={selectedBranch}
                  onAddBranch={handleAddBranch} onAddStaff={handleAddStaff} onAddService={handleAddService} onAddInventoryItem={handleAddInventoryItem} onUpdateInventoryStock={handleUpdateInventoryStock} onSaveCommissionRule={handleSaveCommissionRule} onAddExpense={handleAddExpense} onAddAuditLog={handleAddAuditLog}
                  onUpdateBranch={handleUpdateBranch} onDeleteBranch={handleDeleteBranch} onUpdateStaff={handleUpdateStaff} onDeleteStaff={handleDeleteStaff} onUpdateService={handleUpdateService} onDeleteService={handleDeleteService} onUpdateInventoryItem={handleUpdateInventoryItem} onDeleteInventoryItem={handleDeleteInventoryItem} onAddUser={handleAddUser} onUpdateUser={handleUpdateUser} onRefresh={fetchDbState}
                />
              ) : <Navigate to="/pos" replace />
            } />
            <Route path="/pos" element={
              <ReceptionistPos company={selectedCompany} branch={selectedBranch} businessUnit={selectedBusinessUnit} staffList={staffList} services={services} customers={customers} visitSessions={visitSessions} commissionLogs={commissionLogs} inventoryItems={inventoryItems} expenses={expenses} currentUser={user}
                onCreateVisitSession={handleCreateVisitSession} onCheckoutSession={handleCheckoutSession} onAddCustomer={handleAddCustomer} onUpdateSessionStatus={handleUpdateSessionStatus} onRefresh={() => fetchDbState(['visitSessions', 'customers', 'inventoryItems', 'commissionLogs'])}
                onCancelSession={handleCancelSession} onRemoveSessionService={handleRemoveSessionService}
                onAddInventoryItem={handleAddInventoryItem} onUpdateInventoryItem={handleUpdateInventoryItem} onDeleteInventoryItem={handleDeleteInventoryItem} onUpdateInventoryStock={handleUpdateInventoryStock} onAddExpense={handleAddExpense} onLogout={handleLogout}
              />
            } />
            <Route path="/staff" element={
              <StaffPortalView company={selectedCompany} branch={selectedBranch} staffList={staffList} loggedInStaffId={user?.role === 'staff' ? user.id : undefined} services={services} customers={customers} inventoryItems={inventoryItems} commissionLogs={commissionLogs} visitSessions={visitSessions} branches={branches} businessUnits={businessUnits}
                onCreateVisitSession={handleCreateVisitSession} onUpdateSessionStatus={handleUpdateSessionStatus} onAddCustomer={handleAddCustomer} onUpdateSessionServices={handleUpdateSessionServices} onCheckoutSession={handleCheckoutSession} onRefresh={() => fetchDbState(['visitSessions', 'commissionLogs'])} onLogout={handleLogout}
                onUpdateServiceStatus={handleUpdateServiceStatus}
              />
            } />
            <Route path="/architect" element={
              <ArchitectBlueprintView sections={mockArchitectureSections} />
            } />
          </Route>
        </Route>

        {/* ── Catch-all ── */}
        <Route path="*" element={
          user
            ? (user.role === 'staff' ? <Navigate to="/staff" replace /> : <Navigate to="/pos" replace />)
            : <Navigate to="/login" replace />
        } />
      </Routes>
      </ErrorBoundary>

      {/* ── Overlays ── */}
      <Suspense fallback={null}>
        {isAiModalOpen && selectedCompany && selectedBranch && (
          <AiAssistantModal
            isOpen={isAiModalOpen}
            onClose={() => setIsAiModalOpen(false)}
            selectedCompany={selectedCompany}
            selectedBranch={selectedBranch}
          />
        )}
      </Suspense>
      <ToastContainer />
    </AppProvider>
  );
}

/** Wraps LoginScreen with routing. */
function LoginPage({ onLogin }: { onLogin: (u: AuthUser, pin?: string) => void }) {
  const navigate = useNavigate();
  return (
    <LoginScreen
      onLogin={(u, pin) => {
        onLogin(u, pin);
        const defaults: Record<string, string> = {
          staff: '/staff', reception: '/pos', manager: '/admin', owner: '/admin', super_admin: '/saas',
        };
        navigate(defaults[u.role] || '/pos', { replace: true });
      }}
      onLaunchTv={() => navigate('/tv')}
      onReturnToWebsite={() => navigate('/tablet')}
    />
  );
}

/** Wraps the walk-in registration tablet with routing. */
function TabletPage(props: { company: Company; branch: Branch; services: Service[]; staffList: Staff[] }) {
  const navigate = useNavigate();
  return (
    <WalkInTabletView
      company={props.company}
      branch={props.branch}
      services={props.services}
      staffList={props.staffList}
      onExitTvMode={() => navigate('/')}
    />
  );
}

/** Wraps TV fullscreen display with routing. */
  function TvPage(props: { fetchDbState: (sections?: string[]) => Promise<void>; visitSessions: VisitSession[]; businessUnits: BusinessUnit[]; companies: Company[]; branches: Branch[]; selectedCompany: Company | null; selectedBranch: Branch | null; staffList: Staff[]; customers: Customer[] }) {
  const navigate = useNavigate();
  const company = props.selectedCompany || props.companies?.[0] || { id: 'comp_1', name: 'Gech Beauty Salon', code: 'GECH-HW', city: 'Hawassa', currency: 'ETB', createdAt: new Date().toISOString() };
  const branch = props.selectedBranch || props.branches?.[0] || { id: 'br_1', companyId: company.id, name: 'Hawassa Central Branch', code: 'HW-01', city: 'Hawassa', createdAt: new Date().toISOString() };
  return (
    <QueueDisplayView
      company={company}
      branch={branch}
      visitSessions={props.visitSessions}
      businessUnits={props.businessUnits}
      staffList={props.staffList}
      customers={props.customers}
      onExitTvMode={() => navigate('/pos')}
      onRefresh={() => props.fetchDbState(['visitSessions'])}
    />
  );
}
