import React, { useState } from 'react';
import {
  PanelLeftOpen,
  ChevronLeft,
  ChevronRight,
  Globe,
  LogOut,
  Bot,
} from 'lucide-react';
import { PersonaRole, Company, Branch } from '../types';
import { Button } from './ui/button';
import { ADMIN_TABS, useAdminTab } from '../lib/adminNav';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from './ui/sheet';

interface SidebarProps {
  currentPersona: PersonaRole;
  companies: Company[];
  selectedCompany: Company | null;
  setSelectedCompany: (cmp: Company) => void;
  branches: Branch[];
  selectedBranch: Branch | null;
  setSelectedBranch: (br: Branch) => void;
  currentUser: { name?: string; role: string; companyId: string | null } | null;
  onLogout: () => void;
  onOpenAiAssistant: () => void;
  onViewWebsite?: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPersona,
  companies,
  selectedCompany,
  setSelectedCompany,
  branches,
  selectedBranch,
  setSelectedBranch,
  currentUser,
  onLogout,
  onOpenAiAssistant,
  onViewWebsite,
  collapsed,
  onToggleCollapsed,
}) => {
  const [open, setOpen] = useState(false);
  const { adminTab, setAdminTab } = useAdminTab();

  const filteredBranches = branches.filter((b) => b.companyId === selectedCompany?.id);

  const roleLabel =
    currentUser?.role === 'super_admin'
      ? 'Super Admin'
      : currentUser?.role === 'tenant_manager'
      ? 'Manager'
      : currentUser?.role === 'receptionist'
      ? 'Receptionist'
      : 'Staff';

  const userInitial = (currentUser?.name || 'U').charAt(0).toUpperCase();

  const renderContent = (collapsed: boolean) => (
    <>
      {/* Header */}
      <div className={`flex items-center ${collapsed ? 'justify-center px-0' : 'gap-3 px-4'} border-b border-border h-16 shrink-0`}>
        <div className="w-9 h-9 bg-primary text-primary-foreground rounded-lg flex items-center justify-center font-extrabold text-sm shrink-0 shadow-sm">
          SG
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-extrabold uppercase tracking-widest text-foreground truncate">
              Gech Salon
            </p>
            <p className="text-[10px] text-muted-foreground font-semibold truncate">{roleLabel}</p>
          </div>
        )}
      </div>

      {/* Context Selectors */}
      {!collapsed && (
        <div className="px-3.5 py-3 border-b border-border space-y-2.5 shrink-0">
          {companies.length > 1 && (
            <div>
              <label className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                Company
              </label>
              <select
                value={selectedCompany?.id || ''}
                onChange={(e) => {
                  const cmp = companies.find((c) => c.id === e.target.value);
                  if (cmp) setSelectedCompany(cmp);
                }}
                className="w-full h-9 bg-muted border border-border rounded-lg px-2.5 text-sm font-medium text-foreground outline-none focus:border-primary cursor-pointer"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
              Branch
            </label>
            <select
              value={selectedBranch?.id || ''}
              onChange={(e) => {
                const br = filteredBranches.find((b) => b.id === e.target.value);
                if (br) setSelectedBranch(br);
              }}
              className="w-full h-9 bg-muted border border-border rounded-lg px-2.5 text-sm font-medium text-foreground outline-none focus:border-primary cursor-pointer"
            >
              {filteredBranches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          </div>
      )}

      {/* Navigation */}
      <nav className={`flex-1 overflow-y-auto py-4 space-y-1 ${collapsed ? 'px-2' : 'px-3'}`}>
        {/* Admin management sections */}
        {currentPersona === 'tenant_admin' && (
          <>
            {!collapsed && (
              <p className="px-3 mb-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                Management Sections
              </p>
            )}
            {ADMIN_TABS.map(({ id, label, icon: Icon }) => {
              const isActive = adminTab === id;
              return (
                <Button
                  key={id}
                  variant="ghost"
                  title={collapsed ? label : undefined}
                  className={`${collapsed ? 'w-full justify-center px-0' : 'w-full justify-start gap-3'} h-9 rounded-lg text-[12px] font-semibold ${
                    isActive
                      ? 'bg-brass-600/10 text-brass-700 hover:bg-brass-600/15 border border-brass-600/20'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => {
                    setAdminTab(id);
                    setOpen(false);
                  }}
                >
                  <Icon className="size-4 shrink-0" />
                  {!collapsed && <span className="flex-1 text-left truncate">{label}</span>}
                </Button>
              );
            })}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className={`${collapsed ? 'px-2' : 'px-3'} pt-3 border-t border-border shrink-0 space-y-1`}>
        <Button
          variant="outline"
          title={collapsed ? 'AI Assistant' : undefined}
          className={`${collapsed ? 'w-full justify-center px-0' : 'w-full justify-start gap-3'} h-9 rounded-lg font-medium text-sm`}
          onClick={() => {
            onOpenAiAssistant();
            setOpen(false);
          }}
        >
          <Bot className="size-4 shrink-0" />
          {!collapsed && 'AI Assistant'}
        </Button>

        {onViewWebsite && (
          <Button
            variant="outline"
            title={collapsed ? 'Public Website' : undefined}
            className={`${collapsed ? 'w-full justify-center px-0' : 'w-full justify-start gap-3'} h-9 rounded-lg font-medium text-sm`}
            onClick={() => {
              onViewWebsite();
              setOpen(false);
            }}
          >
            <Globe className="size-4 shrink-0" />
            {!collapsed && 'Public Website'}
          </Button>
        )}

        <div className={`flex items-center ${collapsed ? 'justify-center gap-2' : 'gap-2.5 mx-1'} mt-3 py-2.5 border-t border-border`}>
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-medium text-sm shrink-0">
            {userInitial}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-foreground truncate">{currentUser?.name || 'User'}</p>
              <p className="text-[10px] text-muted-foreground truncate">{roleLabel}</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-lg text-muted-foreground hover:text-destructive"
            title="Logout"
            onClick={() => {
              onLogout();
              setOpen(false);
            }}
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop: fixed sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 hidden lg:flex flex-col bg-card border-r border-border transition-all duration-200 ${collapsed ? 'w-16' : 'w-60'}`}>
        {renderContent(collapsed)}

        {/* Collapse toggle */}
        <button
          onClick={onToggleCollapsed}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="absolute top-1/2 -right-3 -translate-y-1/2 z-50 flex items-center justify-center size-6 rounded-full border border-border bg-card text-foreground/70 shadow-sm hover:bg-muted hover:text-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="size-3.5" /> : <ChevronLeft className="size-3.5" />}
        </button>
      </aside>

      {/* Mobile: drawer */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          className="fixed top-4 left-4 z-50 inline-flex lg:hidden size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-foreground shadow-sm hover:bg-muted transition-colors"
          aria-label="Toggle navigation"
        >
          <PanelLeftOpen className="size-[18px]" />
        </SheetTrigger>
        <SheetContent side="left" className="w-64 flex flex-col p-0">
          {renderContent(false)}
        </SheetContent>
      </Sheet>
    </>
  );
};