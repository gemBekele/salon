import React, { useState } from 'react';
import {
  Building2,
  GitBranch,
  Layers,
  UserCheck,
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
} from 'lucide-react';
import { PersonaRole, Company, Branch, BusinessUnit, AuthUser } from '../types';

interface NavbarProps {
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

export const Navbar: React.FC<NavbarProps> = ({
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const filteredBranches = branches.filter((b) => b.companyId === selectedCompany?.id);
  const filteredBusinessUnits = businessUnits.filter((bu) => bu.branchId === selectedBranch?.id);

  const personaConfig = [
    {
      id: 'receptionist',
      label: 'Receptionist POS',
      icon: Scissors,
      color: 'bg-emerald-600',
    },
    {
      id: 'tenant_admin',
      label: 'Tenant Executive',
      icon: Building2,
      color: 'bg-indigo-600',
    },
    {
      id: 'staff_member',
      label: 'Staff Portal',
      icon: UserCheck2,
      color: 'bg-amber-600',
    },
    {
      id: 'saas_super_admin',
      label: 'SaaS Platform Owner',
      icon: ShieldCheck,
      color: 'bg-purple-600',
    },
    {
      id: 'queue_tv',
      label: 'TV Waiting Queue',
      icon: Tv,
      color: 'bg-amber-700',
    },
    {
      id: 'architect_lead',
      label: 'Architecture Blueprint',
      icon: FileCode2,
      color: 'bg-slate-800',
    },
  ].filter((p) => allowedPersonas.includes(p.id as PersonaRole));

  return (
    <header id="app-navbar" className="bg-[#5A5A40] border-b border-[#4a4a35] text-[#f5f5f0] sticky top-0 z-50 shadow-lg backdrop-blur-md bg-opacity-95">
      {/* Top Banner Row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3 border-b border-[#4a4a35]">
        {/* Brand & App Title */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#f5f5f0] to-[#e0e0ce] flex items-center justify-center text-[#5A5A40] font-serif font-bold text-xl shadow-md border border-white/40">
            S
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-lg font-serif font-semibold text-[#f5f5f0] tracking-tight">
                Serenity Salon & Spa ERP <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#f5f5f0]/15 text-[#f5f5f0] border border-[#f5f5f0]/30 uppercase tracking-widest font-sans font-bold ml-1">SaaS</span>
              </h1>
            </div>
            <p className="text-[11px] text-[#f5f5f0]/70 hidden md:block font-sans">
              Multi-Tenant Multi-Branch Management • XAMPP Live MySQL Engine
            </p>
          </div>
        </div>

        {/* Desktop Multi-Tenant Filters (Hidden on Mobile) */}
        {currentPersona !== 'saas_super_admin' && (
          <div className="hidden lg:flex items-center space-x-2 text-xs font-sans">
            {/* Company Select */}
            <div className="relative flex items-center space-x-1.5 bg-[#f5f5f0]/10 hover:bg-[#f5f5f0]/15 px-3 py-1.5 rounded-lg border border-[#f5f5f0]/20 text-[#f5f5f0] transition-colors">
              <Building2 className="w-3.5 h-3.5 text-[#f5f5f0]/80 shrink-0" />
              <select
                id="company-select-desktop"
                value={selectedCompany?.id || ''}
                onChange={(e) => {
                  const cmp = companies.find((c) => c.id === e.target.value);
                  if (cmp) setSelectedCompany(cmp);
                }}
                className="bg-transparent text-[#f5f5f0] font-medium outline-none cursor-pointer text-xs pr-4 appearance-none"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id} className="bg-[#5A5A40] text-[#f5f5f0]">
                    {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-[#f5f5f0]/70 absolute right-2 pointer-events-none" />
            </div>

            {/* Branch Select */}
            <div className="relative flex items-center space-x-1.5 bg-[#f5f5f0]/10 hover:bg-[#f5f5f0]/15 px-3 py-1.5 rounded-lg border border-[#f5f5f0]/20 text-[#f5f5f0] transition-colors">
              <GitBranch className="w-3.5 h-3.5 text-[#f5f5f0]/80 shrink-0" />
              <select
                id="branch-select-desktop"
                value={selectedBranch?.id || ''}
                onChange={(e) => {
                  const br = branches.find((b) => b.id === e.target.value);
                  if (br) setSelectedBranch(br);
                }}
                className="bg-transparent text-[#f5f5f0] font-medium outline-none cursor-pointer text-xs pr-4 appearance-none"
              >
                {filteredBranches.map((b) => (
                  <option key={b.id} value={b.id} className="bg-[#5A5A40] text-[#f5f5f0]">
                    {b.name} ({b.city})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-[#f5f5f0]/70 absolute right-2 pointer-events-none" />
            </div>

            {/* Business Unit Select */}
            <div className="relative flex items-center space-x-1.5 bg-[#f5f5f0]/10 hover:bg-[#f5f5f0]/15 px-3 py-1.5 rounded-lg border border-[#f5f5f0]/20 text-[#f5f5f0] transition-colors">
              <Layers className="w-3.5 h-3.5 text-[#f5f5f0]/80 shrink-0" />
              <select
                id="unit-select-desktop"
                value={selectedBusinessUnit?.id || ''}
                onChange={(e) => {
                  const bu = businessUnits.find((u) => u.id === e.target.value);
                  setSelectedBusinessUnit(bu || null);
                }}
                className="bg-transparent text-[#f5f5f0] font-medium outline-none cursor-pointer text-xs pr-4 appearance-none"
              >
                <option value="" className="bg-[#5A5A40] text-[#f5f5f0]">
                  All Business Units
                </option>
                {filteredBusinessUnits.map((bu) => (
                  <option key={bu.id} value={bu.id} className="bg-[#5A5A40] text-[#f5f5f0]">
                    {bu.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-[#f5f5f0]/70 absolute right-2 pointer-events-none" />
            </div>
          </div>
        )}

        {/* Action Controls & Mobile Toggle */}
        <div className="flex items-center space-x-2">
          {/* Signed-in user + logout */}
          <div className="hidden sm:flex items-center space-x-2 text-xs font-sans bg-[#f5f5f0]/10 border border-[#f5f5f0]/20 rounded-full pl-1.5 pr-3 py-1">
            <span className="w-6 h-6 rounded-full bg-[#f5f5f0] text-[#5A5A40] flex items-center justify-center font-bold text-[10px] uppercase">
              {currentUser.name.charAt(0)}
            </span>
            <span className="text-[#f5f5f0]/90 capitalize">{currentUser.role.replace('_', ' ')}</span>
            <button
              onClick={onLogout}
              className="ml-1 text-[#f5f5f0]/70 hover:text-white cursor-pointer"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* AI Assistant Quick Trigger */}
          <button
            id="open-ai-assistant-btn"
            onClick={onOpenAiAssistant}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#f5f5f0] to-[#e5e5d1] hover:from-white hover:to-[#f5f5f0] text-[#5A5A40] text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#5A5A40] animate-pulse" />
            <span className="font-sans">AI Copilot</span>
          </button>

          {/* Mobile Hamburger Toggle */}
          <button
            id="mobile-menu-toggle-btn"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg bg-[#f5f5f0]/10 hover:bg-[#f5f5f0]/20 text-[#f5f5f0] border border-[#f5f5f0]/20 transition-all cursor-pointer focus:outline-none"
            aria-label="Toggle Mobile Menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Desktop Persona Bar (Hidden on Mobile) */}
      <div className="hidden lg:flex max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 items-center justify-between gap-2 border-t border-[#4a4a35]/50">
        <div className="text-xs text-[#f5f5f0]/70 font-medium uppercase tracking-wider whitespace-nowrap flex items-center space-x-1.5">
          <UserCheck className="w-3.5 h-3.5 text-[#f5f5f0]/90" />
          <span>Active Role Persona:</span>
        </div>

        <div className="flex items-center space-x-2 overflow-x-auto py-0.5">
          {personaConfig.map((item) => {
            const Icon = item.icon;
            const isActive = currentPersona === item.id;
            return (
              <button
                key={item.id}
                id={`persona-btn-desktop-${item.id}`}
                onClick={() => setCurrentPersona(item.id as PersonaRole)}
                className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#f5f5f0] text-[#5A5A40] font-bold shadow-md scale-105'
                    : 'bg-[#f5f5f0]/10 text-[#f5f5f0]/80 hover:bg-[#f5f5f0]/20 hover:text-white border border-[#f5f5f0]/15'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#5A5A40]' : 'text-[#f5f5f0]/80'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* MOBILE EXPANDABLE MENU (Drawer / Overlay) */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-[#4e4e37] border-b border-[#3e3e2b] px-4 py-4 space-y-4 animate-in slide-in-from-top duration-200">
          {/* Tenant Scoping Controls for Mobile */}
          {currentPersona !== 'saas_super_admin' && (
            <div className="space-y-2.5 pb-3 border-b border-[#5A5A40]">
              <div className="text-[11px] text-[#f5f5f0]/60 uppercase tracking-widest font-bold font-sans">
                Branch & Tenant Context
              </div>

              {/* Company Select */}
              <div className="flex flex-col space-y-1">
                <label className="text-xs text-[#f5f5f0]/80 font-medium flex items-center space-x-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#f5f5f0]" />
                  <span>Tenant Company:</span>
                </label>
                <div className="relative bg-[#5A5A40] rounded-lg border border-[#f5f5f0]/25">
                  <select
                    id="company-select-mobile"
                    value={selectedCompany?.id || ''}
                    onChange={(e) => {
                      const cmp = companies.find((c) => c.id === e.target.value);
                      if (cmp) setSelectedCompany(cmp);
                    }}
                    className="w-full bg-transparent px-3 py-2 text-xs font-semibold text-[#f5f5f0] outline-none appearance-none cursor-pointer"
                  >
                    {companies.map((c) => (
                      <option key={c.id} value={c.id} className="bg-[#5A5A40] text-[#f5f5f0]">
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#f5f5f0]/70 absolute right-2.5 top-2.5 pointer-events-none" />
                </div>
              </div>

              {/* Branch Select */}
              <div className="flex flex-col space-y-1">
                <label className="text-xs text-[#f5f5f0]/80 font-medium flex items-center space-x-1.5">
                  <GitBranch className="w-3.5 h-3.5 text-[#f5f5f0]" />
                  <span>Selected Branch:</span>
                </label>
                <div className="relative bg-[#5A5A40] rounded-lg border border-[#f5f5f0]/25">
                  <select
                    id="branch-select-mobile"
                    value={selectedBranch?.id || ''}
                    onChange={(e) => {
                      const br = branches.find((b) => b.id === e.target.value);
                      if (br) setSelectedBranch(br);
                    }}
                    className="w-full bg-transparent px-3 py-2 text-xs font-semibold text-[#f5f5f0] outline-none appearance-none cursor-pointer"
                  >
                    {filteredBranches.map((b) => (
                      <option key={b.id} value={b.id} className="bg-[#5A5A40] text-[#f5f5f0]">
                        {b.name} ({b.city})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#f5f5f0]/70 absolute right-2.5 top-2.5 pointer-events-none" />
                </div>
              </div>

              {/* Business Unit Select */}
              <div className="flex flex-col space-y-1">
                <label className="text-xs text-[#f5f5f0]/80 font-medium flex items-center space-x-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#f5f5f0]" />
                  <span>Business Unit Filter:</span>
                </label>
                <div className="relative bg-[#5A5A40] rounded-lg border border-[#f5f5f0]/25">
                  <select
                    id="unit-select-mobile"
                    value={selectedBusinessUnit?.id || ''}
                    onChange={(e) => {
                      const bu = businessUnits.find((u) => u.id === e.target.value);
                      setSelectedBusinessUnit(bu || null);
                    }}
                    className="w-full bg-transparent px-3 py-2 text-xs font-semibold text-[#f5f5f0] outline-none appearance-none cursor-pointer"
                  >
                    <option value="" className="bg-[#5A5A40] text-[#f5f5f0]">
                      All Business Units
                    </option>
                    {filteredBusinessUnits.map((bu) => (
                      <option key={bu.id} value={bu.id} className="bg-[#5A5A40] text-[#f5f5f0]">
                        {bu.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#f5f5f0]/70 absolute right-2.5 top-2.5 pointer-events-none" />
                </div>
              </div>
            </div>
          )}

          {/* Persona Switcher Grid for Mobile */}
          <div className="space-y-2">
            <div className="text-[11px] text-[#f5f5f0]/60 uppercase tracking-widest font-bold font-sans flex items-center justify-between">
              <span>Switch User Persona Role</span>
              <span className="text-[10px] bg-[#f5f5f0]/15 px-2 py-0.5 rounded-full text-[#f5f5f0]">
                {personaConfig.find((p) => p.id === currentPersona)?.label}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              {personaConfig.map((item) => {
                const Icon = item.icon;
                const isActive = currentPersona === item.id;
                return (
                  <button
                    key={item.id}
                    id={`persona-btn-mobile-${item.id}`}
                    onClick={() => {
                      setCurrentPersona(item.id as PersonaRole);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex items-center space-x-2 p-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left border ${
                      isActive
                        ? 'bg-[#f5f5f0] text-[#5A5A40] border-white shadow-md font-bold'
                        : 'bg-[#5A5A40]/80 text-[#f5f5f0] border-[#f5f5f0]/20 hover:bg-[#5A5A40]'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg ${isActive ? 'bg-[#5A5A40] text-[#f5f5f0]' : 'bg-[#f5f5f0]/10 text-[#f5f5f0]'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
