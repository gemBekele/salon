import React, { useState } from 'react';
import {
  Building2,
  GitBranch,
  Layers,
  Sparkles,
  ShieldCheck,
  Scissors,
  UserCheck2,
  FileCode2,
  Tv,
  Menu,
  X,
  ChevronDown,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { PersonaRole, Company, Branch, BusinessUnit, AuthUser } from '../types';

interface SidebarProps {
  currentPersona: PersonaRole;
  setCurrentPersona: (persona: PersonaRole) => void;
  companies: Company[];
  selectedCompany: Company;
  setSelectedCompany: (cmp: Company) => void;
  branches: Branch[];
  selectedBranch: Branch;
  setSelectedBranch: (br: Branch) => void;
  businessUnits: BusinessUnit[];
  selectedBusinessUnit: BusinessUnit | null;
  setSelectedBusinessUnit: (bu: BusinessUnit | null) => void;
  allowedPersonas: PersonaRole[];
  currentUser: AuthUser;
  onLogout: () => void;
  onOpenAiAssistant: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPersona,
  setCurrentPersona,
  companies,
  selectedCompany,
  setSelectedCompany,
  branches,
  selectedBranch,
  setSelectedBranch,
  businessUnits,
  selectedBusinessUnit,
  setSelectedBusinessUnit,
  allowedPersonas,
  currentUser,
  onLogout,
  onOpenAiAssistant,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const filteredBranches = branches.filter((b) => b.companyId === selectedCompany?.id);
  const filteredBusinessUnits = businessUnits.filter((bu) => bu.branchId === selectedBranch?.id);

  const personaConfig = [
    { id: 'receptionist', label: 'Receptionist POS', icon: Scissors },
    { id: 'tenant_admin', label: 'Tenant Executive', icon: Building2 },
    { id: 'staff_member', label: 'Staff Portal', icon: UserCheck2 },
    { id: 'saas_super_admin', label: 'SaaS Platform', icon: ShieldCheck },
    { id: 'queue_tv', label: 'TV Queue', icon: Tv },
    { id: 'architect_lead', label: 'Architecture', icon: FileCode2 },
  ].filter((p) => allowedPersonas.includes(p.id as PersonaRole));

  const isWide = !collapsed;

  /* ─── Sidebar Content (shared between desktop & mobile) ─── */
  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className={`flex items-center gap-3 px-4 py-4 border-b border-[#4a4a35] ${isWide ? '' : 'justify-center'}`}>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#f5f5f0] to-[#e0e0ce] flex items-center justify-center text-[#5A5A40] font-serif font-bold text-lg shadow-md border border-white/40 shrink-0">
          S
        </div>
        {isWide && (
          <div className="min-w-0">
            <h1 className="text-sm font-serif font-semibold text-[#f5f5f0] tracking-tight truncate">Serenity ERP</h1>
            <p className="text-[10px] text-[#f5f5f0]/60 font-sans truncate">SaaS Platform</p>
          </div>
        )}
      </div>

      {/* Persona Navigation */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {isWide && (
          <div className="text-[10px] text-[#f5f5f0]/50 uppercase tracking-widest font-bold px-2 mb-2 font-sans">
            Navigation
          </div>
        )}
        {personaConfig.map((item) => {
          const Icon = item.icon;
          const isActive = currentPersona === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setCurrentPersona(item.id as PersonaRole);
                setMobileOpen(false);
              }}
              title={item.label}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isWide ? '' : 'justify-center'
              } ${
                isActive
                  ? 'bg-[#f5f5f0] text-[#5A5A40] shadow-md font-bold'
                  : 'text-[#f5f5f0]/70 hover:bg-[#f5f5f0]/10 hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#5A5A40]' : ''}`} />
              {isWide && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}

        {/* Tenant Selectors (only for non-super-admin) */}
        {currentPersona !== 'saas_super_admin' && isWide && (
          <div className="mt-4 pt-3 border-t border-[#4a4a35] space-y-3 px-1">
            <div className="text-[10px] text-[#f5f5f0]/50 uppercase tracking-widest font-bold font-sans">
              Tenant Context
            </div>

            {/* Company */}
            <div className="space-y-1">
              <label className="text-[10px] text-[#f5f5f0]/60 font-medium flex items-center gap-1">
                <Building2 className="w-3 h-3" /> Company
              </label>
              <div className="relative bg-[#4a4a35] rounded-lg border border-[#f5f5f0]/15">
                <select
                  value={selectedCompany?.id || ''}
                  onChange={(e) => {
                    const cmp = companies.find((c) => c.id === e.target.value);
                    if (cmp) setSelectedCompany(cmp);
                  }}
                  className="w-full bg-transparent px-2.5 py-1.5 text-[11px] font-medium text-[#f5f5f0] outline-none appearance-none cursor-pointer truncate"
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id} className="bg-[#5A5A40] text-[#f5f5f0]">{c.name}</option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-[#f5f5f0]/50 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Branch */}
            <div className="space-y-1">
              <label className="text-[10px] text-[#f5f5f0]/60 font-medium flex items-center gap-1">
                <GitBranch className="w-3 h-3" /> Branch
              </label>
              <div className="relative bg-[#4a4a35] rounded-lg border border-[#f5f5f0]/15">
                <select
                  value={selectedBranch?.id || ''}
                  onChange={(e) => {
                    const br = branches.find((b) => b.id === e.target.value);
                    if (br) setSelectedBranch(br);
                  }}
                  className="w-full bg-transparent px-2.5 py-1.5 text-[11px] font-medium text-[#f5f5f0] outline-none appearance-none cursor-pointer truncate"
                >
                  {filteredBranches.map((b) => (
                    <option key={b.id} value={b.id} className="bg-[#5A5A40] text-[#f5f5f0]">{b.name}</option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-[#f5f5f0]/50 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Business Unit */}
            <div className="space-y-1">
              <label className="text-[10px] text-[#f5f5f0]/60 font-medium flex items-center gap-1">
                <Layers className="w-3 h-3" /> Business Unit
              </label>
              <div className="relative bg-[#4a4a35] rounded-lg border border-[#f5f5f0]/15">
                <select
                  value={selectedBusinessUnit?.id || ''}
                  onChange={(e) => {
                    const bu = businessUnits.find((u) => u.id === e.target.value);
                    setSelectedBusinessUnit(bu || null);
                  }}
                  className="w-full bg-transparent px-2.5 py-1.5 text-[11px] font-medium text-[#f5f5f0] outline-none appearance-none cursor-pointer truncate"
                >
                  <option value="" className="bg-[#5A5A40] text-[#f5f5f0]">All Units</option>
                  {filteredBusinessUnits.map((bu) => (
                    <option key={bu.id} value={bu.id} className="bg-[#5A5A40] text-[#f5f5f0]">{bu.name}</option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-[#f5f5f0]/50 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="border-t border-[#4a4a35] p-2 space-y-1">
        {/* AI Copilot */}
        <button
          onClick={onOpenAiAssistant}
          title="AI Copilot"
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer bg-gradient-to-r from-[#f5f5f0]/15 to-[#f5f5f0]/5 hover:from-[#f5f5f0]/25 hover:to-[#f5f5f0]/10 text-[#f5f5f0] ${isWide ? '' : 'justify-center'}`}
        >
          <Sparkles className="w-4 h-4 shrink-0 animate-pulse" />
          {isWide && <span>AI Copilot</span>}
        </button>

        {/* User Info */}
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-[#4a4a35]/50 ${isWide ? '' : 'justify-center'}`}>
          <span className="w-7 h-7 rounded-full bg-[#f5f5f0] text-[#5A5A40] flex items-center justify-center font-bold text-[10px] uppercase shrink-0">
            {currentUser.name.charAt(0)}
          </span>
          {isWide && (
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold text-[#f5f5f0] truncate capitalize">{currentUser.role.replace('_', ' ')}</div>
              <div className="text-[10px] text-[#f5f5f0]/50 truncate">{currentUser.email}</div>
            </div>
          )}
          <button
            onClick={onLogout}
            className={`text-[#f5f5f0]/50 hover:text-white p-1.5 rounded-lg hover:bg-[#f5f5f0]/10 cursor-pointer shrink-0 ${isWide ? '' : ''}`}
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* ─── Mobile Hamburger (fixed top-left on mobile only) ─── */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-[60] p-2 rounded-xl bg-[#5A5A40] text-[#f5f5f0] shadow-lg border border-[#4a4a35] cursor-pointer"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* ─── Mobile Drawer ─── */}
      {mobileOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="lg:hidden fixed inset-y-0 left-0 z-[80] w-64 bg-[#5A5A40] shadow-2xl transform transition-transform duration-200">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-3 right-3 p-1.5 rounded-lg bg-[#f5f5f0]/10 hover:bg-[#f5f5f0]/20 text-[#f5f5f0] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            {sidebarContent}
          </aside>
        </>
      )}

      {/* ─── Desktop Sidebar ─── */}
      <aside
        id="app-sidebar"
        className={`hidden lg:flex flex-col fixed inset-y-0 left-0 z-40 bg-[#5A5A40] border-r border-[#4a4a35] shadow-lg transition-all duration-200 ${
          collapsed ? 'w-[68px]' : 'w-60'
        }`}
      >
        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-5 z-50 w-6 h-6 rounded-full bg-[#5A5A40] border border-[#4a4a35] text-[#f5f5f0] flex items-center justify-center shadow-md cursor-pointer hover:bg-[#4a4a35] transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen className="w-3 h-3" /> : <PanelLeftClose className="w-3 h-3" />}
        </button>
        {sidebarContent}
      </aside>
    </>
  );
};
