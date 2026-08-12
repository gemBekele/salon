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
  Sun,
  Moon,
} from 'lucide-react';
import { PersonaRole, Company, Branch, BusinessUnit, AuthUser } from '../types';
import { useTheme } from '../lib/theme';

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
  onViewWebsite?: () => void;
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
  onViewWebsite,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

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

  const [showTvPinModal, setShowTvPinModal] = useState(false);
  const [tvPinInput, setTvPinInput] = useState('');
  const [tvPinErr, setTvPinErr] = useState('');

  const handlePersonaSelect = (personaId: PersonaRole) => {
    if (personaId === 'queue_tv') {
      setShowTvPinModal(true);
      setTvPinInput('');
      setTvPinErr('');
    } else {
      setCurrentPersona(personaId);
      setMobileOpen(false);
    }
  };

  const handleVerifyTvPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (tvPinInput.trim() === '7777' || tvPinInput.trim() === 'Manager123!' || tvPinInput.trim() === '1234') {
      setShowTvPinModal(false);
      setCurrentPersona('queue_tv');
      setMobileOpen(false);
    } else {
      setTvPinErr('Invalid TV PIN/Password. Default PIN is 7777.');
    }
  };

  /* ─── Sidebar Content (shared between desktop & mobile) ─── */
  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className={`flex items-center gap-3 px-4 py-4 border-b border-[#111114] ${isWide ? '' : 'justify-center'}`}>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#f6f3ec] to-[#efe8d9] flex items-center justify-center text-[#18181b] font-serif font-bold text-lg shadow-md border border-white/40 shrink-0">
          S
        </div>
        {isWide && (
          <div className="min-w-0">
            <h1 className="text-sm font-serif font-semibold text-[#f6f3ec] tracking-tight truncate">Gech Beauty Salon</h1>
            <p className="text-[10px] text-[#f6f3ec]/60 font-sans truncate">Salon Management ERP</p>
          </div>
        )}
      </div>

      {/* Persona Navigation */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {onViewWebsite && (
          <button
            onClick={onViewWebsite}
            title="Public Barbershop Website"
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer bg-ink-500/20 text-ink-300 hover:bg-ink-500/30 border border-ink-500/40 mb-2 ${
              isWide ? '' : 'justify-center'
            }`}
          >
            <span className="text-sm">🌐</span>
            {isWide && <span>Public Barbershop Web</span>}
          </button>
        )}
        {isWide && (
          <div className="text-[10px] text-[#f6f3ec]/50 uppercase tracking-widest font-bold px-2 mb-2 font-sans">
            Navigation
          </div>
        )}
        {personaConfig.map((item) => {
          const Icon = item.icon;
          const isActive = currentPersona === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handlePersonaSelect(item.id as PersonaRole)}
              title={item.label}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isWide ? '' : 'justify-center'
              } ${
                isActive
                  ? 'bg-[#f6f3ec] text-[#18181b] shadow-md font-bold'
                  : 'text-[#f6f3ec]/70 hover:bg-[#f6f3ec]/10 hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#18181b]' : ''}`} />
              {isWide && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}

        {/* Tenant Selectors (only for non-super-admin) */}
        {currentPersona !== 'saas_super_admin' && isWide && (
          <div className="mt-4 pt-3 border-t border-[#111114] space-y-3 px-1">
            <div className="text-[10px] text-[#f6f3ec]/50 uppercase tracking-widest font-bold font-sans">
              Tenant Context
            </div>

            {/* Company */}
            <div className="space-y-1">
              <label className="text-[10px] text-[#f6f3ec]/60 font-medium flex items-center gap-1">
                <Building2 className="w-3 h-3" /> Company
              </label>
              <div className="relative bg-[#111114] rounded-lg border border-[#f6f3ec]/15">
                <select
                  value={selectedCompany?.id || ''}
                  onChange={(e) => {
                    const cmp = companies.find((c) => c.id === e.target.value);
                    if (cmp) setSelectedCompany(cmp);
                  }}
                  className="w-full bg-transparent px-2.5 py-1.5 text-[11px] font-medium text-[#f6f3ec] outline-none appearance-none cursor-pointer truncate"
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id} className="bg-[#18181b] text-[#f6f3ec]">{c.name}</option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-[#f6f3ec]/50 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Branch */}
            <div className="space-y-1">
              <label className="text-[10px] text-[#f6f3ec]/60 font-medium flex items-center gap-1">
                <GitBranch className="w-3 h-3" /> Branch
              </label>
              <div className="relative bg-[#111114] rounded-lg border border-[#f6f3ec]/15">
                <select
                  value={selectedBranch?.id || ''}
                  onChange={(e) => {
                    const br = branches.find((b) => b.id === e.target.value);
                    if (br) setSelectedBranch(br);
                  }}
                  className="w-full bg-transparent px-2.5 py-1.5 text-[11px] font-medium text-[#f6f3ec] outline-none appearance-none cursor-pointer truncate"
                >
                  {filteredBranches.map((b) => (
                    <option key={b.id} value={b.id} className="bg-[#18181b] text-[#f6f3ec]">{b.name}</option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-[#f6f3ec]/50 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Business Unit */}
            <div className="space-y-1">
              <label className="text-[10px] text-[#f6f3ec]/60 font-medium flex items-center gap-1">
                <Layers className="w-3 h-3" /> Business Unit
              </label>
              <div className="relative bg-[#111114] rounded-lg border border-[#f6f3ec]/15">
                <select
                  value={selectedBusinessUnit?.id || ''}
                  onChange={(e) => {
                    const bu = businessUnits.find((u) => u.id === e.target.value);
                    setSelectedBusinessUnit(bu || null);
                  }}
                  className="w-full bg-transparent px-2.5 py-1.5 text-[11px] font-medium text-[#f6f3ec] outline-none appearance-none cursor-pointer truncate"
                >
                  <option value="" className="bg-[#18181b] text-[#f6f3ec]">All Units</option>
                  {filteredBusinessUnits.map((bu) => (
                    <option key={bu.id} value={bu.id} className="bg-[#18181b] text-[#f6f3ec]">{bu.name}</option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-[#f6f3ec]/50 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="border-t border-[#111114] p-2 space-y-1">
        {/* AI Copilot */}
        <button
          onClick={onOpenAiAssistant}
          title="AI Copilot"
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer bg-gradient-to-r from-[#f6f3ec]/15 to-[#f6f3ec]/5 hover:from-[#f6f3ec]/25 hover:to-[#f6f3ec]/10 text-[#f6f3ec] ${isWide ? '' : 'justify-center'}`}
        >
          <Sparkles className="w-4 h-4 shrink-0 animate-pulse" />
          {isWide && <span>AI Copilot</span>}
        </button>

        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          title={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-[#f6f3ec]/70 hover:bg-[#f6f3ec]/10 hover:text-white ${isWide ? '' : 'justify-center'}`}
        >
          {resolvedTheme === 'dark' ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
          {isWide && <span>{resolvedTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>

        {/* User Info */}
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-[#111114]/50 ${isWide ? '' : 'justify-center'}`}>
          <span className="w-7 h-7 rounded-full bg-[#f6f3ec] text-[#18181b] flex items-center justify-center font-bold text-[10px] uppercase shrink-0">
            {currentUser.name.charAt(0)}
          </span>
          {isWide && (
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold text-[#f6f3ec] truncate capitalize">{currentUser.role.replace('_', ' ')}</div>
              <div className="text-[10px] text-[#f6f3ec]/50 truncate">{currentUser.email}</div>
            </div>
          )}
          <button
            onClick={onLogout}
            className={`text-[#f6f3ec]/50 hover:text-white p-1.5 rounded-lg hover:bg-[#f6f3ec]/10 cursor-pointer shrink-0 ${isWide ? '' : ''}`}
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
        className="lg:hidden fixed top-3 left-3 z-[60] p-2 rounded-xl bg-[#18181b] text-[#f6f3ec] shadow-lg border border-[#111114] cursor-pointer"
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
          <aside className="lg:hidden fixed inset-y-0 left-0 z-[80] w-64 bg-[#18181b] shadow-2xl transform transition-transform duration-200">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-3 right-3 p-1.5 rounded-lg bg-[#f6f3ec]/10 hover:bg-[#f6f3ec]/20 text-[#f6f3ec] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            {sidebarContent}
          </aside>
        </>
      )}

      {/* ─── Desktop Sidebar ─── */}
      <aside
        className={`hidden lg:flex fixed inset-y-0 left-0 z-40 bg-[#18181b] text-[#f6f3ec] flex-col border-r border-[#111114] transition-all duration-200 shadow-xl ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-5 z-50 w-6 h-6 rounded-full bg-[#18181b] border border-[#111114] text-[#f6f3ec] flex items-center justify-center shadow-md cursor-pointer hover:bg-[#111114] transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen className="w-3 h-3" /> : <PanelLeftClose className="w-3 h-3" />}
        </button>
        {sidebarContent}
      </aside>
    </>
  );
};
