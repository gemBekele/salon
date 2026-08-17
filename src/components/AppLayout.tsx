import React, { Suspense, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { ErrorBoundary } from './ErrorBoundary';
import { useApp } from '../lib/AppContext';
import { AdminTabContext, AdminTab } from '../lib/adminNav';
import type { PersonaRole } from '../types';

const PERSONA_BY_PATH: Record<string, PersonaRole> = {
  '/saas': 'saas_super_admin',
  '/admin': 'tenant_admin',
  '/pos': 'receptionist',
  '/staff': 'staff_member',
  '/architect': 'architect_lead',
  '/tv': 'queue_tv',
};

function personaFromPath(pathname: string): PersonaRole {
  for (const [prefix, persona] of Object.entries(PERSONA_BY_PATH)) {
    if (pathname.startsWith(prefix)) return persona;
  }
  return 'receptionist';
}

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    user,
    companies, selectedCompany, setSelectedCompany,
    branches, selectedBranch, setSelectedBranch,
    dbError, setDbError,
    fetchDbState, handleLogout, setIsAiModalOpen,
  } = useApp();

  const persona = personaFromPath(location.pathname);
  const isStaffView = persona === 'staff_member';
  const isSidebarlessView = isStaffView || persona === 'receptionist';

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed((prev) => !prev);
  };

  const [adminTab, setAdminTab] = useState<AdminTab>('branches');

  return (
    <AdminTabContext.Provider value={{ adminTab, setAdminTab }}>
    <div id="app-root" className="min-h-screen bg-[#fafafa] text-[#18181b] flex flex-col font-sans antialiased selection:bg-[#18181b] selection:text-white">
      {!isSidebarlessView && (
        <Sidebar
          currentPersona={persona}
          companies={companies}
          selectedCompany={selectedCompany}
          setSelectedCompany={setSelectedCompany}
          branches={branches}
          selectedBranch={selectedBranch}
          setSelectedBranch={setSelectedBranch}
          currentUser={user}
          onLogout={handleLogout}
          onOpenAiAssistant={() => setIsAiModalOpen(true)}
          onViewWebsite={() => navigate('/')}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={toggleSidebarCollapsed}
        />
      )}

      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-200 ${isSidebarlessView ? '' : sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60'}`}>
        <div className="lg:hidden h-12" />

        {dbError && (
          <div className="mx-4 sm:mx-6 lg:mx-auto lg:max-w-7xl w-full lg:px-8 mt-4 flex items-center justify-between gap-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span className="font-medium">{dbError}</span>
            <button
              onClick={() => { setDbError(null); fetchDbState(); }}
              className="shrink-0 rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        )}

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          <ErrorBoundary fallbackLabel="Failed to load dashboard">
            <Suspense fallback={<div className="flex items-center justify-center py-12 text-[#71717a] text-sm">Loading...</div>}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>

        <footer id="app-footer" className="bg-white border-t border-[#e4e4e7] py-4 text-sm text-[#71717a] text-center">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div>
              <strong className="text-[#18181b] font-serif font-medium">Gech Beauty Salon</strong> — Hawassa Salon Management ERP
            </div>
            <div className="text-[11px] uppercase tracking-wider font-semibold text-[#18181b]/70">
              Designed &amp; Built by <strong>EngelsTech</strong> • ETB Currency
            </div>
          </div>
        </footer>
      </div>
    </div>
    </AdminTabContext.Provider>
  );
}
