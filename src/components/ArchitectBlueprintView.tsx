import React, { useState } from 'react';
import {
  ShieldCheck,
  Workflow,
  Server,
  Database,
  FileCode2,
  CheckCircle,
  Copy,
  Check,
  Layers,
  Sparkles,
  AlertOctagon,
  BookOpen,
  Building2,
  Layout,
  BarChart3,
  DollarSign,
} from 'lucide-react';
import { ArchitectureDocSection } from '../types';

interface ArchitectBlueprintViewProps {
  sections: ArchitectureDocSection[];
}

export const ArchitectBlueprintView: React.FC<ArchitectBlueprintViewProps> = ({
  sections,
}) => {
  const [activeSectionId, setActiveSectionId] = useState<string>(sections[0]?.id || 'tenant_isolation');
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<number | null>(null);

  const activeSection = sections.find((s) => s.id === activeSectionId) || sections[0];

  const handleCopyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeIndex(idx);
    setTimeout(() => setCopiedCodeIndex(null), 2000);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Blueprint Header */}
      <div className="bg-[#5A5A40] text-white border border-[#4a4a35] rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#f5f5f0]/15 text-[#f5f5f0] border border-[#f5f5f0]/30 uppercase tracking-widest">
                Senior SaaS Architect Blueprint & Documentation
              </span>
              <span className="text-[#f5f5f0]/80 text-xs">Laravel 11 + MySQL + cPanel</span>
            </div>
            <h2 className="text-2xl font-serif font-light mt-2 text-[#f5f5f0]">Enterprise Multi-Tenant Salon & Spa ERP Specification</h2>
            <p className="text-[#f5f5f0]/80 text-xs mt-1 max-w-3xl">
              Complete architectural documentation, database ERD schema, tenant isolation Eloquent scopes, cPanel queue execution, edge case strategies, and acceptance criteria.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Navigation Sidebar (4 Cols) */}
        <div className="lg:col-span-4 space-y-2">
          <div className="text-xs font-bold text-[#737366] uppercase tracking-wider px-1">
            Architecture Blueprint Index
          </div>

          <div className="space-y-1.5">
            {[
              { id: 'assumptions', title: '1. Assumptions & Business Scope', icon: BookOpen },
              { id: 'arch_decisions', title: '2. Architecture Decisions', icon: Server },
              { id: 'data_model', title: '3. Data Model & Database ERD', icon: Database },
              { id: 'workflow', title: '4. Receptionist & Commission Workflow', icon: Workflow },
              { id: 'edge_cases', title: '5. Edge Cases & Concurrency', icon: AlertOctagon },
              { id: 'tenant_isolation', title: '6. Laravel Eloquent Tenant Scopes', icon: ShieldCheck },
              { id: 'visit_session_engine', title: '7. Atomic Session & Checkout Engine', icon: Workflow },
              { id: 'cpanel_queue_deployment', title: '8. cPanel Deployment & Queue Cron', icon: Server },
              { id: 'rbac_system', title: '9. Multi-Tenant Roles & Permissions (RBAC)', icon: ShieldCheck },
              { id: 'customer_journey', title: '10. End-to-End Customer Journey', icon: Workflow },
              { id: 'multi_branch_architecture', title: '11. Multi-Branch & Business Unit Hierarchy', icon: Building2 },
              { id: 'saas_architecture', title: '12. Single-DB Multi-Tenant SaaS Architecture', icon: Server },
              { id: 'ui_ux_system', title: '13. Touch-First UI/UX System & Wireframes', icon: Layout },
              { id: 'reports_analytics', title: '14. Multi-Tenant Reports & Analytics', icon: BarChart3 },
              { id: 'staff_commission_system', title: '15. Staff Commission & Payroll Engine', icon: DollarSign },
              { id: 'acceptance_criteria', title: '16. Acceptance Criteria Checklist', icon: CheckCircle },
            ].map((nav) => {
              const Icon = nav.icon;
              const isActive = activeSectionId === nav.id;
              return (
                <button
                  key={nav.id}
                  onClick={() => setActiveSectionId(nav.id)}
                  className={`w-full text-left p-3.5 rounded-2xl border text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                    isActive
                      ? 'bg-[#5A5A40] text-white border-[#4a4a35] shadow-sm'
                      : 'bg-white text-[#2d2d2a] border-[#e5e5d1] hover:bg-[#f5f5f0]'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#f5f5f0]' : 'text-[#5A5A40]'}`} />
                    <span>{nav.title}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Blueprint Content Viewer (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* SECTION 1: ASSUMPTIONS */}
          {activeSectionId === 'assumptions' && (
            <div className="bg-white border border-[#e5e5d1] rounded-3xl p-6 space-y-4 text-xs text-[#2d2d2a] shadow-sm">
              <h3 className="text-lg font-serif font-bold text-[#2d2d2a] border-b border-[#e5e5d1] pb-3">
                1. Assumptions & Business Scope
              </h3>

              <div className="space-y-3">
                <div className="bg-[#f5f5f0] p-4 rounded-2xl border border-[#e5e5d1] space-y-2">
                  <h4 className="font-bold text-[#5A5A40] text-sm">Tenant & Company Isolation:</h4>
                  <p className="text-[#737366] leading-relaxed">
                    Each salon business entity operates as an independent Tenant Company. All business data tables (<code className="bg-white px-1.5 py-0.5 rounded border border-[#e5e5d1] text-[#2d2d2a]">branches</code>, <code className="bg-white px-1.5 py-0.5 rounded border border-[#e5e5d1] text-[#2d2d2a]">business_units</code>, <code className="bg-white px-1.5 py-0.5 rounded border border-[#e5e5d1] text-[#2d2d2a]">staff</code>, <code className="bg-white px-1.5 py-0.5 rounded border border-[#e5e5d1] text-[#2d2d2a]">customers</code>, <code className="bg-white px-1.5 py-0.5 rounded border border-[#e5e5d1] text-[#2d2d2a]">visit_sessions</code>, <code className="bg-white px-1.5 py-0.5 rounded border border-[#e5e5d1] text-[#2d2d2a]">inventory_items</code>, <code className="bg-white px-1.5 py-0.5 rounded border border-[#e5e5d1] text-[#2d2d2a]">commissions</code>) contain a mandatory indexed <code className="bg-white px-1.5 py-0.5 rounded border border-[#e5e5d1] text-[#2d2d2a]">company_id</code> column.
                  </p>
                </div>

                <div className="bg-[#f5f5f0] p-4 rounded-2xl border border-[#e5e5d1] space-y-2">
                  <h4 className="font-bold text-[#5A5A40] text-sm">Multi-Branch & Business Unit Scoping:</h4>
                  <p className="text-[#737366] leading-relaxed">
                    A single Tenant Company can own multiple Branches in different cities (e.g. Bole Medhanealem Flagship, Kazanchis Executive, Hawassa Resort). A Branch contains multiple Business Units (e.g. Men's Grooming Salon, Women's Spa Lounge, Royal Moroccan Hammam, Massage Center).
                  </p>
                </div>

                <div className="bg-[#f5f5f0] p-4 rounded-2xl border border-[#e5e5d1] space-y-2">
                  <h4 className="font-bold text-emerald-800 text-sm">Localization Defaults:</h4>
                  <p className="text-[#737366] leading-relaxed">
                    Currency defaults to <strong>ETB</strong> (Ethiopian Birr). Timezone defaults to <strong>Africa/Addis_Ababa</strong>. Phone formats support international and local Ethiopian numbers (<code className="bg-white px-1.5 py-0.5 rounded border border-[#e5e5d1] text-[#2d2d2a]">+251 91 123 4567</code> or <code className="bg-white px-1.5 py-0.5 rounded border border-[#e5e5d1] text-[#2d2d2a]">0911234567</code>). Local payment rails support Telebirr, CBE Birr, Cash, and POS Cards.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: ARCHITECTURE DECISIONS */}
          {activeSectionId === 'arch_decisions' && (
            <div className="bg-white border border-[#e5e5d1] rounded-3xl p-6 space-y-4 text-xs text-[#2d2d2a] shadow-sm">
              <h3 className="text-lg font-serif font-bold text-[#2d2d2a] border-b border-[#e5e5d1] pb-3">
                2. Core Architecture Decisions
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#f5f5f0] p-4 rounded-2xl border border-[#e5e5d1] space-y-2">
                  <h4 className="font-serif font-bold text-[#2d2d2a] text-sm">Modular Monolith Architecture</h4>
                  <p className="text-[#737366]">
                    Laravel 11 modular structure grouping domains into explicit modules (<code className="bg-white px-1 py-0.5 rounded border border-[#e5e5d1]">SaaSAdmin</code>, <code className="bg-white px-1 py-0.5 rounded border border-[#e5e5d1]">TenantCore</code>, <code className="bg-white px-1 py-0.5 rounded border border-[#e5e5d1]">POSQueue</code>, <code className="bg-white px-1 py-0.5 rounded border border-[#e5e5d1]">CommissionEngine</code>, <code className="bg-white px-1 py-0.5 rounded border border-[#e5e5d1]">InventoryManagement</code>, <code className="bg-white px-1 py-0.5 rounded border border-[#e5e5d1]">SmsNotification</code>).
                  </p>
                </div>

                <div className="bg-[#f5f5f0] p-4 rounded-2xl border border-[#e5e5d1] space-y-2">
                  <h4 className="font-serif font-bold text-[#2d2d2a] text-sm">Single-Database Multi-Tenancy</h4>
                  <p className="text-[#737366]">
                    High-performance shared database model. Strict application-level tenant isolation via Eloquent Global Scope (<code className="bg-white px-1 py-0.5 rounded border border-[#e5e5d1]">CompanyTenantScope</code>) enforcing <code className="bg-white px-1 py-0.5 rounded border border-[#e5e5d1]">WHERE company_id = ?</code> on every query.
                  </p>
                </div>

                <div className="bg-[#f5f5f0] p-4 rounded-2xl border border-[#e5e5d1] space-y-2">
                  <h4 className="font-serif font-bold text-[#2d2d2a] text-sm">cPanel Deployment Compatibility</h4>
                  <p className="text-[#737366]">
                    Uses MySQL and <code className="bg-white px-1 py-0.5 rounded border border-[#e5e5d1]">database</code> queue driver. Asynchronous background jobs (SMS receipts, email alerts) execute via standard cPanel cron without Redis/Daemon infrastructure requirements.
                  </p>
                </div>

                <div className="bg-[#f5f5f0] p-4 rounded-2xl border border-[#e5e5d1] space-y-2">
                  <h4 className="font-serif font-bold text-[#2d2d2a] text-sm">Livewire Polling Real-Time UI</h4>
                  <p className="text-[#737366]">
                    Receptionist Queue Board updates in real-time using Livewire <code className="bg-white px-1 py-0.5 rounded border border-[#e5e5d1]">wire:poll.5s</code>, eliminating WebSocket server complexity while maintaining responsive UI state.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: DATA MODEL & DATABASE ERD */}
          {activeSectionId === 'data_model' && (
            <div className="bg-white border border-[#e5e5d1] rounded-3xl p-6 space-y-4 text-xs text-[#2d2d2a] shadow-sm">
              <h3 className="text-lg font-serif font-bold text-[#2d2d2a] border-b border-[#e5e5d1] pb-3">
                3. Data Model & Database ERD Structure
              </h3>

              <div className="space-y-3">
                <div className="bg-[#2d2d2a] p-5 rounded-2xl border border-[#1c1c19] font-mono text-[11px] text-[#f5f5f0] space-y-1.5 shadow-inner leading-relaxed">
                  <div className="text-amber-300 font-bold">[companies] (id, name, slug, subscription_plan_id, status, currency, timezone)</div>
                  <div> └── <span className="text-emerald-300">[branches]</span> (id, company_id, name, city, address, phone, is_main_branch)</div>
                  <div>      └── <span className="text-indigo-300">[business_units]</span> (id, company_id, branch_id, type, name, code)</div>
                  <div>           ├── <span className="text-amber-200">[staff]</span> (id, company_id, branch_id, business_unit_id, name, role, default_commission_percentage)</div>
                  <div>           ├── <span className="text-amber-200">[services]</span> (id, company_id, business_unit_id, name, price_etb, duration_minutes, commission_value)</div>
                  <div>           ├── <span className="text-amber-200">[inventory_items]</span> (id, company_id, branch_id, business_unit_id, sku, current_stock, reorder_level)</div>
                  <div>           └── <span className="text-amber-200">[visit_sessions]</span> (id, company_id, branch_id, queue_number, customer_id, status, subtotal, net_total, payment_method)</div>
                  <div>                ├── [visit_session_services] (id, visit_session_id, service_id, staff_id, price_etb, commission_earned_etb)</div>
                  <div>                ├── [commission_logs] (id, company_id, branch_id, staff_id, visit_session_id, commission_amount_etb)</div>
                  <div>                └── [sms_logs] (id, company_id, recipient_phone, message_type, content, status)</div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: WORKFLOW EXPLANATION */}
          {activeSectionId === 'workflow' && (
            <div className="bg-white border border-[#e5e5d1] rounded-3xl p-6 space-y-4 text-xs text-[#2d2d2a] shadow-sm">
              <h3 className="text-lg font-serif font-bold text-[#2d2d2a] border-b border-[#e5e5d1] pb-3">
                4. Receptionist POS & Commission Workflow
              </h3>

              <ol className="list-decimal list-inside space-y-3 text-[#737366]">
                <li className="p-4 bg-[#f5f5f0] rounded-2xl border border-[#e5e5d1]">
                  <strong className="text-[#2d2d2a]">Walk-In / Appointment Check-In:</strong> Receptionist selects or registers customer phone (<code className="bg-white px-1 py-0.5 rounded border border-[#e5e5d1] text-[#2d2d2a]">+251 9...</code>), assigns Queue ticket (<code className="bg-white px-1 py-0.5 rounded border border-[#e5e5d1] text-[#2d2d2a]">Q-104</code>).
                </li>
                <li className="p-4 bg-[#f5f5f0] rounded-2xl border border-[#e5e5d1]">
                  <strong className="text-[#2d2d2a]">Multi-Staff Service Assignment:</strong> Multiple services can be attached to 1 session (e.g. Executive Haircut assigned to Barber Abel + Moroccan Spa Hammam assigned to Esthetician Marta).
                </li>
                <li className="p-4 bg-[#f5f5f0] rounded-2xl border border-[#e5e5d1]">
                  <strong className="text-[#2d2d2a]">Atomic Checkout Execution:</strong> Receptionist collects Telebirr/CBE Birr/Cash. System locks session record inside a Database Transaction, decrements inventory stock, writes staff commission logs, and dispatches SMS receipt.
                </li>
              </ol>
            </div>
          )}

          {/* SECTION 5: EDGE CASES */}
          {activeSectionId === 'edge_cases' && (
            <div className="bg-white border border-[#e5e5d1] rounded-3xl p-6 space-y-4 text-xs text-[#2d2d2a] shadow-sm">
              <h3 className="text-lg font-serif font-bold text-[#2d2d2a] border-b border-[#e5e5d1] pb-3">
                5. Edge Cases & Concurrency Handling
              </h3>

              <div className="space-y-3">
                <div className="bg-[#f5f5f0] p-4 rounded-2xl border border-[#e5e5d1]">
                  <h4 className="font-bold text-[#5A5A40]">Queue Number Race Conditions:</h4>
                  <p className="text-[#737366] mt-1">Resolved using atomic database sequence generation or optimistic locking (<code className="bg-white px-1 py-0.5 rounded border border-[#e5e5d1] text-[#2d2d2a]">lockForUpdate()</code>) on queue counters per branch.</p>
                </div>

                <div className="bg-[#f5f5f0] p-4 rounded-2xl border border-[#e5e5d1]">
                  <h4 className="font-bold text-[#5A5A40]">Low Stock / Zero Stock During Active Service:</h4>
                  <p className="text-[#737366] mt-1">System allows service completion but flags inventory item as negative stock warning and sends urgent reorder alert to Branch Manager.</p>
                </div>

                <div className="bg-[#f5f5f0] p-4 rounded-2xl border border-[#e5e5d1]">
                  <h4 className="font-bold text-[#5A5A40]">Session Discounts & Commission Adjustments:</h4>
                  <p className="text-[#737366] mt-1">Configurable setting per tenant company whether discounts reduce staff commission proportionally or if staff commission calculates on gross service list price.</p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 9: RBAC ROLES & PERMISSIONS SYSTEM */}
          {activeSectionId === 'rbac_system' && (
            <div className="bg-white border border-[#e5e5d1] rounded-3xl p-6 space-y-6 text-xs text-[#2d2d2a] shadow-sm">
              <div className="border-b border-[#e5e5d1] pb-3">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-[#5A5A40]" />
                  <h3 className="text-lg font-serif font-bold text-[#2d2d2a]">
                    9. Multi-Tenant User Roles & Permissions Architecture (RBAC)
                  </h3>
                </div>
                <p className="text-[#737366] text-xs mt-1">
                  Enterprise security model using <code className="bg-[#f5f5f0] px-1.5 py-0.5 rounded border border-[#e5e5d1] text-[#2d2d2a] font-mono">spatie/laravel-permission</code> with <strong>Teams / Multi-Tenancy</strong> (<code className="bg-[#f5f5f0] px-1.5 py-0.5 rounded border border-[#e5e5d1] text-[#2d2d2a] font-mono">permission.teams = true</code>) enforcing tenant isolation via <code className="bg-[#f5f5f0] px-1.5 py-0.5 rounded border border-[#e5e5d1] text-[#2d2d2a] font-mono">company_id</code>.
                </p>
              </div>

              {/* Roles Hierarchy Overview */}
              <div>
                <h4 className="font-serif font-bold text-sm text-[#2d2d2a] mb-3">1. Role Definitions & Scope Hierarchy</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="bg-[#f5f5f0] p-4 rounded-2xl border border-[#e5e5d1] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#2d2d2a]">Super Admin</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#2d2d2a] text-white">Global SaaS</span>
                    </div>
                    <p className="text-[11px] text-[#737366]">Platform owner. Manages companies, subscription plans, platform settings, support impersonation with audit logs.</p>
                    <div className="text-[10px] text-[#5A5A40] font-semibold">Scope: Global System (company_id = null)</div>
                  </div>

                  <div className="bg-[#f5f5f0] p-4 rounded-2xl border border-[#e5e5d1] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#2d2d2a]">Salon Owner</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#5A5A40] text-white">Tenant Owner</span>
                    </div>
                    <p className="text-[11px] text-[#737366]">Company owner. Manages branding, all branches, staff, consolidated financial P&L, commission rules, subscriptions.</p>
                    <div className="text-[10px] text-[#5A5A40] font-semibold">Scope: Entire Company (company_id)</div>
                  </div>

                  <div className="bg-[#f5f5f0] p-4 rounded-2xl border border-[#e5e5d1] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#2d2d2a]">Branch Manager</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-800 text-white">Branch Level</span>
                    </div>
                    <p className="text-[11px] text-[#737366]">Branch supervisor. Manages daily operations, queue board, inventory reorders, voiding services, approving discounts.</p>
                    <div className="text-[10px] text-[#5A5A40] font-semibold">Scope: Assigned Branch (branch_id)</div>
                  </div>

                  <div className="bg-[#f5f5f0] p-4 rounded-2xl border border-[#e5e5d1] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#2d2d2a]">Receptionist</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-800 text-white">Front Desk POS</span>
                    </div>
                    <p className="text-[11px] text-[#737366]">Registers customers, creates visit sessions, assigns queue tickets, adds services & staff, receives Telebirr/CBE/Cash payments.</p>
                    <div className="text-[10px] text-[#5A5A40] font-semibold">Scope: Active POS Desk / Branch</div>
                  </div>

                  <div className="bg-[#f5f5f0] p-4 rounded-2xl border border-[#e5e5d1] space-y-1.5 md:col-span-2 lg:col-span-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#2d2d2a]">Staff / Provider</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-800 text-white">Service Provider</span>
                    </div>
                    <p className="text-[11px] text-[#737366]">Barbers, estheticians, therapists. Views assigned services, updates service status, tracks personal commission ledger.</p>
                    <div className="text-[10px] text-[#5A5A40] font-semibold">Scope: Personal Assigned Sessions</div>
                  </div>
                </div>
              </div>

              {/* Granular Permission Matrix */}
              <div>
                <h4 className="font-serif font-bold text-sm text-[#2d2d2a] mb-2">2. Granular Permission Matrix across 16 Categories</h4>
                <div className="overflow-x-auto border border-[#e5e5d1] rounded-2xl">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-[#f5f5f0] text-[#737366] font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="px-3 py-2.5 border-b border-[#e5e5d1]">Permission Category</th>
                        <th className="px-3 py-2.5 border-b border-[#e5e5d1] text-center">Super Admin</th>
                        <th className="px-3 py-2.5 border-b border-[#e5e5d1] text-center">Salon Owner</th>
                        <th className="px-3 py-2.5 border-b border-[#e5e5d1] text-center">Branch Mgr</th>
                        <th className="px-3 py-2.5 border-b border-[#e5e5d1] text-center">Receptionist</th>
                        <th className="px-3 py-2.5 border-b border-[#e5e5d1] text-center">Staff</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e5e5d1] text-[#2d2d2a]">
                      {[
                        { cat: '1. Tenant Administration', sa: true, owner: true, mgr: false, rec: false, staff: false },
                        { cat: '2. Branch Management', sa: true, owner: true, mgr: 'Read/Edit', rec: 'Read', staff: false },
                        { cat: '3. User Management', sa: true, owner: true, mgr: 'Branch Staff', rec: false, staff: false },
                        { cat: '4. Staff Management', sa: true, owner: true, mgr: 'Branch Staff', rec: 'Read', staff: 'Self' },
                        { cat: '5. Customer Management', sa: true, owner: true, mgr: true, rec: true, staff: 'Read' },
                        { cat: '6. Appointment Management', sa: true, owner: true, mgr: true, rec: true, staff: 'Self' },
                        { cat: '7. Visit Session Management', sa: true, owner: true, mgr: true, rec: true, staff: 'Assigned' },
                        { cat: '8. Service Catalog & Prices', sa: true, owner: true, mgr: 'Read', rec: 'Read', staff: 'Read' },
                        { cat: '9. POS Checkout & Payments', sa: true, owner: true, mgr: true, rec: true, staff: false },
                        { cat: '10. Commission Ledger', sa: true, owner: 'Company', mgr: 'Branch', rec: false, staff: 'Self Only' },
                        { cat: '11. Inventory & Stock', sa: true, owner: true, mgr: 'Adjust/Order', rec: 'Read', staff: 'Request' },
                        { cat: '12. Expenses Management', sa: true, owner: true, mgr: 'Branch Exp', rec: false, staff: false },
                        { cat: '13. Reports & Analytics', sa: true, owner: 'Full P&L', mgr: 'Branch Sales', rec: 'Shift Summary', staff: 'Self Stats' },
                        { cat: '14. SMS & Notifications', sa: true, owner: true, mgr: true, rec: 'Send Receipts', staff: false },
                        { cat: '15. Settings Management', sa: true, owner: true, mgr: 'Read', rec: false, staff: false },
                        { cat: '16. Subscriptions & Billing', sa: true, owner: true, mgr: false, rec: false, staff: false },
                      ].map((row, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#f5f5f0]/40'}>
                          <td className="px-3 py-2 font-semibold text-[#2d2d2a]">{row.cat}</td>
                          <td className="px-3 py-2 text-center font-bold text-emerald-700">✓ Full</td>
                          <td className="px-3 py-2 text-center font-bold text-emerald-700">{row.owner === true ? '✓ Full' : row.owner}</td>
                          <td className="px-3 py-2 text-center font-bold text-[#5A5A40]">{row.mgr === true ? '✓ Yes' : row.mgr === false ? '—' : row.mgr}</td>
                          <td className="px-3 py-2 text-center text-[#737366]">{row.rec === true ? '✓ Yes' : row.rec === false ? '—' : row.rec}</td>
                          <td className="px-3 py-2 text-center text-[#737366]">{row.staff === true ? '✓ Yes' : row.staff === false ? '—' : row.staff}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sensitive Operations Authority Table */}
              <div>
                <h4 className="font-serif font-bold text-sm text-[#2d2d2a] mb-2">3. Sensitive Operations Authority Matrix</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                  <div className="bg-[#f5f5f0] p-3.5 rounded-2xl border border-[#e5e5d1]">
                    <span className="font-bold text-[#2d2d2a] block">Void a Service / Session:</span>
                    <p className="text-[#737366] mt-0.5">Allowed for <strong>Branch Manager</strong> & <strong>Salon Owner</strong> (<code className="bg-white px-1 py-0.5 rounded border border-[#e5e5d1]">visits.void</code>). Blocked for Receptionist once payment is finalized without manager override code.</p>
                  </div>

                  <div className="bg-[#f5f5f0] p-3.5 rounded-2xl border border-[#e5e5d1]">
                    <span className="font-bold text-[#2d2d2a] block">Discount an Invoice:</span>
                    <p className="text-[#737366] mt-0.5">Allowed for <strong>Branch Manager</strong> & <strong>Salon Owner</strong> (<code className="bg-white px-1 py-0.5 rounded border border-[#e5e5d1]">checkout.apply_discount</code>). Max discount capped by company settings (e.g. max 15% without owner approval).</p>
                  </div>

                  <div className="bg-[#f5f5f0] p-3.5 rounded-2xl border border-[#e5e5d1]">
                    <span className="font-bold text-[#2d2d2a] block">Refund a Payment:</span>
                    <p className="text-[#737366] mt-0.5">Allowed for <strong>Salon Owner</strong> & <strong>Super Admin</strong> (<code className="bg-white px-1 py-0.5 rounded border border-[#e5e5d1]">checkout.process_refund</code>). Requires written transaction reason and writes an immutable audit record in <code className="bg-white px-1 py-0.5 rounded border border-[#e5e5d1]">audit_logs</code>.</p>
                  </div>

                  <div className="bg-[#f5f5f0] p-3.5 rounded-2xl border border-[#e5e5d1]">
                    <span className="font-bold text-[#2d2d2a] block">Edit Completed Visit Records:</span>
                    <p className="text-[#737366] mt-0.5">Allowed for <strong>Salon Owner</strong> & <strong>Branch Manager</strong> (<code className="bg-white px-1 py-0.5 rounded border border-[#e5e5d1]">visits.edit_completed</code>). Adjustments trigger automated recalculation of staff commission logs.</p>
                  </div>

                  <div className="bg-[#f5f5f0] p-3.5 rounded-2xl border border-[#e5e5d1]">
                    <span className="font-bold text-[#2d2d2a] block">Delete Records (Soft Delete):</span>
                    <p className="text-[#737366] mt-0.5">Strictly restricted to <strong>Salon Owner</strong> & <strong>Super Admin</strong> (<code className="bg-white px-1 py-0.5 rounded border border-[#e5e5d1]">*.delete</code>). Hard deletes are completely disabled in production.</p>
                  </div>

                  <div className="bg-[#f5f5f0] p-3.5 rounded-2xl border border-[#e5e5d1]">
                    <span className="font-bold text-[#2d2d2a] block">Export P&L Financial CSV Reports:</span>
                    <p className="text-[#737366] mt-0.5">Allowed for <strong>Salon Owner</strong> & <strong>Branch Manager</strong> (<code className="bg-white px-1 py-0.5 rounded border border-[#e5e5d1]">reports.export_csv</code>). Includes encrypted audit logging of report exports.</p>
                  </div>
                </div>
              </div>

              {/* Multi-Branch Staff Handling */}
              <div className="bg-[#2d2d2a] text-[#f5f5f0] p-4 rounded-2xl border border-[#1c1c19] space-y-2">
                <h4 className="font-serif font-bold text-amber-300 text-sm">4. Multi-Branch & Multi-Unit Staff Working Rules</h4>
                <p className="text-xs text-[#f5f5f0]/80 leading-relaxed">
                  Staff members working across multiple branches (e.g. Barber Abel split between Bole Flagship and Kazanchis Center) are assigned via the <code className="bg-[#1c1c19] px-1.5 py-0.5 rounded border border-[#3d3d38] text-amber-200">staff_branch</code> pivot table with an <code className="bg-[#1c1c19] px-1.5 py-0.5 rounded border border-[#3d3d38] text-amber-200">is_primary</code> boolean flag. Their operational permissions adapt dynamically based on their currently selected active branch session (<code className="bg-[#1c1c19] px-1.5 py-0.5 rounded border border-[#3d3d38] text-amber-200">session('active_branch_id')</code>), preventing accidental cross-branch data corruption.
                </p>
              </div>
            </div>
          )}

          {/* SECTION 10: END-TO-END CUSTOMER JOURNEY */}
          {activeSectionId === 'customer_journey' && (
            <div className="bg-white border border-[#e5e5d1] rounded-3xl p-6 space-y-6 text-xs text-[#2d2d2a] shadow-sm">
              <div className="border-b border-[#e5e5d1] pb-3">
                <div className="flex items-center space-x-2">
                  <Workflow className="w-5 h-5 text-[#5A5A40]" />
                  <h3 className="text-lg font-serif font-bold text-[#2d2d2a]">
                    10. End-to-End Customer Journey Workflow Engine
                  </h3>
                </div>
                <p className="text-[#737366] text-xs mt-1">
                  11-Stage real-world operational journey bridging front-desk reception, multi-staff allocation, queue ticket dispatching, pending charges accumulation, multi-channel payment checkout, staff commission posting, stock deduction, and automated Ethio Telecom SMS receipts.
                </p>
              </div>

              {/* Step-by-Step Interactive Diagram */}
              <div className="space-y-3">
                <h4 className="font-serif font-bold text-sm text-[#2d2d2a]">Complete Operational Journey Flow</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    { step: '1. Registration', title: 'Customer Search / Reg', desc: 'Walk-in or phone lookup. Creates/links customer profile with SMS consent & notes.' },
                    { step: '2. Session Start', title: 'Create Visit Session', desc: 'Opens open visit tied to company, branch, business unit, and customer.' },
                    { step: '3. Queue Ticket', title: 'Generate Queue Ticket', desc: 'Assigns BU prefix (e.g. BAR-101, SPA-202). Resets daily at 00:00 local time.' },
                    { step: '4. Service Select', title: 'Select Multiple Services', desc: 'Adds N services to visit (Haircut, Beard Trim, Facial Massage, Hammam).' },
                    { step: '5. Staff Assign', title: 'Assign Staff per Service', desc: 'Each service line assigned to specific provider (Barber Abel, Stylist Sara).' },
                    { step: '6. Live Queue', title: 'Pending Charges Accumulation', desc: 'Tracks running total live on POS board while services are performed.' },
                    { step: '7. Service Exec', title: 'Staff Marks Complete', desc: 'Staff marks service status as in_progress -> completed from provider portal.' },
                    { step: '8. POS Checkout', title: 'Final Invoice Checkout', desc: 'Receptionist reviews charges, applies discounts, selects Telebirr/CBE/Cash.' },
                    { step: '9. Payment Seal', title: 'Payment Processing', desc: 'Generates immutable invoice, records split payment transaction reference.' },
                    { step: '10. Automation', title: 'Commissions & Stock', desc: 'Triggers atomic database event: calculates commissions + deducts inventory.' },
                    { step: '11. SMS Dispatch', title: 'Ethio Telecom SMS Receipt', desc: 'Queues background SMS thank you message with invoice summary & review link.' },
                  ].map((s, idx) => (
                    <div key={idx} className="bg-[#f5f5f0] p-3.5 rounded-2xl border border-[#e5e5d1] space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#5A5A40]">{s.step}</span>
                      <h5 className="font-bold text-[#2d2d2a]">{s.title}</h5>
                      <p className="text-[11px] text-[#737366] leading-relaxed">{s.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* State Machine Overview */}
              <div className="bg-[#2d2d2a] text-[#f5f5f0] p-4 rounded-2xl border border-[#1c1c19] space-y-3">
                <h4 className="font-serif font-bold text-amber-300 text-sm">Visit Session & Service Item State Machine</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="font-bold text-amber-200 block mb-1">Visit Session Statuses:</span>
                    <ul className="space-y-1 text-[#f5f5f0]/80 text-[11px]">
                      <li>• <code className="text-amber-300">open</code>: Session created, awaiting service assignment.</li>
                      <li>• <code className="text-amber-300">in_progress</code>: At least one service is actively being performed.</li>
                      <li>• <code className="text-amber-300">ready_for_checkout</code>: All services completed, waiting at POS desk.</li>
                      <li>• <code className="text-amber-300">completed</code>: Payment received, invoice sealed, commissions logged.</li>
                      <li>• <code className="text-amber-300">cancelled</code>: Cancelled before services started (voided ticket).</li>
                      <li>• <code className="text-amber-300">no_show</code>: Customer leftqueue before calling number.</li>
                    </ul>
                  </div>
                  <div>
                    <span className="font-bold text-amber-200 block mb-1">Service Line Item Statuses:</span>
                    <ul className="space-y-1 text-[#f5f5f0]/80 text-[11px]">
                      <li>• <code className="text-amber-300">pending</code>: Added to visit, staff not yet assigned.</li>
                      <li>• <code className="text-amber-300">assigned</code>: Staff member selected, waiting in station queue.</li>
                      <li>• <code className="text-amber-300">in_progress</code>: Staff actively performing service in station.</li>
                      <li>• <code className="text-amber-300">completed</code>: Finished, triggers pending commission eligibility.</li>
                      <li>• <code className="text-amber-300">cancelled</code>: Voided mid-visit by manager or receptionist.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 11: MULTI-BRANCH, BUSINESS UNIT & DEPARTMENT HIERARCHY */}
          {activeSectionId === 'multi_branch_architecture' && (
            <div className="bg-white border border-[#e5e5d1] rounded-3xl p-6 space-y-6 text-xs text-[#2d2d2a] shadow-sm">
              <div className="border-b border-[#e5e5d1] pb-3">
                <div className="flex items-center space-x-2">
                  <Building2 className="w-5 h-5 text-[#5A5A40]" />
                  <h3 className="text-lg font-serif font-bold text-[#2d2d2a]">
                    11. Multi-Branch, Business Unit & Department Organizational Architecture
                  </h3>
                </div>
                <p className="text-[#737366] text-xs mt-1">
                  Enterprise 4-tier hierarchy balancing operational autonomy for individual business units (e.g. Barber Shop vs Moroccan Hammam) with consolidated financial control for tenant owners.
                </p>
              </div>

              {/* 4-Tier Hierarchy Diagram */}
              <div>
                <h4 className="font-serif font-bold text-sm text-[#2d2d2a] mb-3">1. 4-Tier Organizational Hierarchy</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="bg-[#f5f5f0] p-4 rounded-2xl border border-[#e5e5d1] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#2d2d2a]">1. Company</span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#2d2d2a] text-white">Tenant Root</span>
                    </div>
                    <p className="text-[11px] text-[#737366]">Tenant account bound by <code className="bg-white px-1 py-0.5 rounded border border-[#e5e5d1]">company_id</code>. Manages subscriptions, logos, tax rules, global currency (ETB), consolidated P&L.</p>
                  </div>

                  <div className="bg-[#f5f5f0] p-4 rounded-2xl border border-[#e5e5d1] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#2d2d2a]">2. Branch</span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#5A5A40] text-white">Physical Site</span>
                    </div>
                    <p className="text-[11px] text-[#737366]">Physical salon site (e.g., Bole Flagship, Kazanchis Branch). Manages local operating hours, branch manager, location pricing, cash drawer totals.</p>
                  </div>

                  <div className="bg-[#f5f5f0] p-4 rounded-2xl border border-[#e5e5d1] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#2d2d2a]">3. Business Unit</span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-800 text-white">Service Hub</span>
                    </div>
                    <p className="text-[11px] text-[#737366]">Specialized service division (Barber Shop, Women Spa, Moroccan Hammam, Body Massage). Independent queues (<code className="bg-white px-1 py-0.5 rounded border border-[#e5e5d1]">BAR-101</code>), inventory, staff.</p>
                  </div>

                  <div className="bg-[#f5f5f0] p-4 rounded-2xl border border-[#e5e5d1] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#2d2d2a]">4. Department</span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-800 text-white">Skill Group</span>
                    </div>
                    <p className="text-[11px] text-[#737366]">Functional operational skills (Hair Care, Nail Care, Facial & Skin, Massage, Cashier). Used for commission rules & skill Matrix.</p>
                  </div>
                </div>
              </div>

              {/* Data Scoping & Authorization Matrix */}
              <div>
                <h4 className="font-serif font-bold text-sm text-[#2d2d2a] mb-2">2. Dynamic Role-Based Data Scoping Matrix</h4>
                <div className="overflow-x-auto border border-[#e5e5d1] rounded-2xl">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-[#f5f5f0] text-[#737366] font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="px-3 py-2.5 border-b border-[#e5e5d1]">User Role</th>
                        <th className="px-3 py-2.5 border-b border-[#e5e5d1]">Active Scope</th>
                        <th className="px-3 py-2.5 border-b border-[#e5e5d1]">Visible Data / Reports</th>
                        <th className="px-3 py-2.5 border-b border-[#e5e5d1]">Cross-Branch Capabilities</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e5e5d1] text-[#2d2d2a]">
                      <tr>
                        <td className="px-3 py-2 font-bold text-indigo-900">Salon Owner</td>
                        <td className="px-3 py-2 font-mono text-[#5A5A40]">company_id</td>
                        <td className="px-3 py-2">All branches, all business units, consolidated P&L, branch comparison reports</td>
                        <td className="px-3 py-2 font-semibold text-emerald-700">Full Access (Can switch active branch view instantly)</td>
                      </tr>
                      <tr className="bg-[#f5f5f0]/40">
                        <td className="px-3 py-2 font-bold text-amber-900">Branch Manager</td>
                        <td className="px-3 py-2 font-mono text-[#5A5A40]">branch_id</td>
                        <td className="px-3 py-2">Assigned branch sales, branch queue board, branch stock, branch staff commissions</td>
                        <td className="px-3 py-2 text-[#737366]">Restricted to assigned branch unless granted cross-branch scope</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 font-bold text-emerald-900">Receptionist</td>
                        <td className="px-3 py-2 font-mono text-[#5A5A40]">branch_id + BU</td>
                        <td className="px-3 py-2">Active POS queue board, branch walk-ins, daily cash shift summary</td>
                        <td className="px-3 py-2 text-[#737366]">Operates on active branch POS desk; can transfer visits across BUs</td>
                      </tr>
                      <tr className="bg-[#f5f5f0]/40">
                        <td className="px-3 py-2 font-bold text-blue-900">Staff / Provider</td>
                        <td className="px-3 py-2 font-mono text-[#5A5A40]">staff_id + session</td>
                        <td className="px-3 py-2">Personal schedule, assigned visit services, personal commission ledger</td>
                        <td className="px-3 py-2 text-[#737366]">Assigned via staff_branch pivot; views active assigned sessions</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Multi-Branch Operational Scenarios */}
              <div className="bg-[#2d2d2a] text-[#f5f5f0] p-4 rounded-2xl border border-[#1c1c19] space-y-3">
                <h4 className="font-serif font-bold text-amber-300 text-sm">3. Central Control vs Local Autonomy Balance</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
                  <div className="bg-[#1c1c19] p-3 rounded-xl border border-[#3d3d38]">
                    <span className="font-bold text-amber-200 block mb-1">Service Catalog Standardizing:</span>
                    <p className="text-[#f5f5f0]/80">Owner defines global service categories (e.g. Hair Care, Facial Spa). Individual branches can set custom price overrides (e.g. Bole Premium pricing vs Kazanchis Standard pricing).</p>
                  </div>
                  <div className="bg-[#1c1c19] p-3 rounded-xl border border-[#3d3d38]">
                    <span className="font-bold text-amber-200 block mb-1">Multi-Branch Staff Transfer:</span>
                    <p className="text-[#f5f5f0]/80">Staff can be linked to multiple branches via <code className="text-amber-300">staff_branch</code>. Appointments validate real-time schedule conflict across all assigned branches.</p>
                  </div>
                  <div className="bg-[#1c1c19] p-3 rounded-xl border border-[#3d3d38]">
                    <span className="font-bold text-amber-200 block mb-1">Inter-Branch Stock Transfers:</span>
                    <p className="text-[#f5f5f0]/80">Stock can be transferred from Bole Central Warehouse to Kazanchis Branch with atomic <code className="text-amber-300">stock_transactions</code> audit records (Out / In transfers).</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 12: SINGLE-DB MULTI-TENANT SAAS ARCHITECTURE */}
          {activeSectionId === 'saas_architecture' && (
            <div className="bg-white border border-[#e5e5d1] rounded-3xl p-6 space-y-6 text-xs text-[#2d2d2a] shadow-sm">
              <div className="border-b border-[#e5e5d1] pb-3">
                <div className="flex items-center space-x-2">
                  <Server className="w-5 h-5 text-[#5A5A40]" />
                  <h3 className="text-lg font-serif font-bold text-[#2d2d2a]">
                    12. Single-Database Multi-Tenant SaaS Architecture Specification
                  </h3>
                </div>
                <p className="text-[#737366] text-xs mt-1">
                  Single-database multi-tenancy model enforced via Eloquent <code className="bg-[#f5f5f0] px-1.5 py-0.5 rounded border border-[#e5e5d1] text-[#2d2d2a] font-mono">company_id</code> global scopes, subscription tier gating, account suspension lifecycles, and audit-logged Super Admin impersonation.
                </p>
              </div>

              {/* Tenant Identification & Middleware Pipeline */}
              <div className="space-y-3">
                <h4 className="font-serif font-bold text-sm text-[#2d2d2a]">1. Tenant Identification & Security Isolation</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-[#f5f5f0] p-4 rounded-2xl border border-[#e5e5d1] space-y-2">
                    <span className="font-bold text-[#2d2d2a] block">Step 1: Auth & Resolution</span>
                    <p className="text-[#737366] text-[11px] leading-relaxed">
                      On login, authenticated user's <code className="bg-white px-1 py-0.5 rounded border border-[#e5e5d1]">company_id</code> is bound to session container via <code className="bg-white px-1 py-0.5 rounded border border-[#e5e5d1]">EnsureTenantContext</code> middleware.
                    </p>
                  </div>
                  <div className="bg-[#f5f5f0] p-4 rounded-2xl border border-[#e5e5d1] space-y-2">
                    <span className="font-bold text-[#2d2d2a] block">Step 2: Eloquent Global Scope</span>
                    <p className="text-[#737366] text-[11px] leading-relaxed">
                      All tenant models implement <code className="bg-white px-1 py-0.5 rounded border border-[#e5e5d1]">CompanyScope</code>, appending <code className="bg-white px-1 py-0.5 rounded border border-[#e5e5d1]">WHERE company_id = ?</code> to SQL queries automatically.
                    </p>
                  </div>
                  <div className="bg-[#f5f5f0] p-4 rounded-2xl border border-[#e5e5d1] space-y-2">
                    <span className="font-bold text-[#2d2d2a] block">Step 3: Route Model Binding Protection</span>
                    <p className="text-[#737366] text-[11px] leading-relaxed">
                      Route parameters validate <code className="bg-white px-1 py-0.5 rounded border border-[#e5e5d1]">company_id</code> ownership before controller dispatch, returning 404 to prevent URL manipulation scanning.
                    </p>
                  </div>
                </div>
              </div>

              {/* Table Categorization Table */}
              <div>
                <h4 className="font-serif font-bold text-sm text-[#2d2d2a] mb-2">2. Scoping Rules by Table Category</h4>
                <div className="overflow-x-auto border border-[#e5e5d1] rounded-2xl">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-[#f5f5f0] text-[#737366] font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="px-3 py-2.5 border-b border-[#e5e5d1]">Scope Category</th>
                        <th className="px-3 py-2.5 border-b border-[#e5e5d1]">Key Tables Included</th>
                        <th className="px-3 py-2.5 border-b border-[#e5e5d1]">Filtering Rule</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e5e5d1] text-[#2d2d2a]">
                      <tr>
                        <td className="px-3 py-2 font-bold text-slate-800">Global Tables</td>
                        <td className="px-3 py-2 font-mono text-[#5A5A40]">plans, plan_features, global_settings, audit_logs</td>
                        <td className="px-3 py-2">No company_id filter. Accessible only to Super Admins.</td>
                      </tr>
                      <tr className="bg-[#f5f5f0]/40">
                        <td className="px-3 py-2 font-bold text-indigo-800">Tenant-Owned Tables</td>
                        <td className="px-3 py-2 font-mono text-[#5A5A40]">companies, subscriptions, branches, customers, services, staff, visit_sessions, invoices</td>
                        <td className="px-3 py-2 font-semibold text-emerald-800">CompanyScope applied. Strictly filtered by active company_id.</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 font-bold text-amber-800">Branch-Owned Tables</td>
                        <td className="px-3 py-2 font-mono text-[#5A5A40]">staff_branch, stock_transactions, shift_closures, sms_logs</td>
                        <td className="px-3 py-2 font-semibold text-amber-800">CompanyScope + BranchScope applied (Filtered by company_id & branch_id).</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Subscription Plans & Limits Matrix */}
              <div>
                <h4 className="font-serif font-bold text-sm text-[#2d2d2a] mb-2">3. Subscription Tiers, Limits & Feature Gating</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
                  <div className="bg-[#f5f5f0] p-4 rounded-2xl border border-[#e5e5d1] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#2d2d2a]">Basic Plan</span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] bg-slate-200 text-slate-800 font-bold">$49 / mo</span>
                    </div>
                    <ul className="space-y-1 text-[#737366]">
                      <li>• Max 1 Branch Location</li>
                      <li>• Max 3 Staff Members</li>
                      <li>• Max 500 Customers</li>
                      <li>• Basic Checkout & Cash Receipts</li>
                      <li>• ✖ No Commission Engine</li>
                      <li>• ✖ No TV Queue Display</li>
                    </ul>
                  </div>

                  <div className="bg-[#f5f5f0] p-4 rounded-2xl border border-[#e5e5d1] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#2d2d2a]">Pro Plan</span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] bg-[#5A5A40] text-white font-bold">$149 / mo</span>
                    </div>
                    <ul className="space-y-1 text-[#737366]">
                      <li>• Max 3 Branch Locations</li>
                      <li>• Max 15 Staff Members</li>
                      <li>• Unlimited Customers</li>
                      <li>• Staff Commission Engine</li>
                      <li>• Ethio Telecom / Telebirr SMS Integration</li>
                      <li>• TV Waiting Queue Display Module</li>
                    </ul>
                  </div>

                  <div className="bg-[#f5f5f0] p-4 rounded-2xl border border-[#e5e5d1] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#2d2d2a]">Enterprise Plan</span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] bg-[#2d2d2a] text-white font-bold">$399 / mo</span>
                    </div>
                    <ul className="space-y-1 text-[#737366]">
                      <li>• Unlimited Branches & Staff</li>
                      <li>• Multi-Business Unit Hierarchy</li>
                      <li>• Custom Commission Formulas</li>
                      <li>• Consolidate Multi-Branch P&L</li>
                      <li>• Dedicated cPanel / VPS Deployment</li>
                      <li>• Priority SLA Support</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Account Suspension Lifecycle */}
              <div className="bg-[#2d2d2a] text-[#f5f5f0] p-4 rounded-2xl border border-[#1c1c19] space-y-3">
                <h4 className="font-serif font-bold text-amber-300 text-sm">4. Account Suspension Lifecycle & Impersonation Audit</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="font-bold text-amber-200 block mb-1">Subscription Lifecycle States:</span>
                    <ul className="space-y-1 text-[#f5f5f0]/80 text-[11px]">
                      <li>• <code className="text-amber-300">trialing</code>: 14-Day full feature trial.</li>
                      <li>• <code className="text-amber-300">active</code>: Regular paid billing subscription.</li>
                      <li>• <code className="text-amber-300">past_due</code>: 3-Day grace period after failed payment retry.</li>
                      <li>• <code className="text-amber-300">suspended</code>: Read-only access for 30 days. POS transactions blocked.</li>
                      <li>• <code className="text-amber-300">archived</code>: Account purged after 90 days following GDPR data deletion policies.</li>
                    </ul>
                  </div>
                  <div>
                    <span className="font-bold text-amber-200 block mb-1">Super Admin Impersonation Security:</span>
                    <p className="text-[#f5f5f0]/80 text-[11px] leading-relaxed">
                      Super Admins can impersonate tenant users for customer support. Every impersonation session writes an immutable record in <code className="text-amber-300">audit_logs</code> capturing <code className="text-amber-300">admin_id</code>, <code className="text-amber-300">target_user_id</code>, IP address, timestamp, and action summary.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 13: TOUCH-FIRST UI/UX SYSTEM & WIREFRAMES */}
          {activeSectionId === 'ui_ux_system' && (
            <div className="bg-white border border-[#e5e5d1] rounded-3xl p-6 space-y-6 text-xs text-[#2d2d2a] shadow-sm">
              <div className="border-b border-[#e5e5d1] pb-3">
                <div className="flex items-center space-x-2">
                  <Layout className="w-5 h-5 text-[#5A5A40]" />
                  <h3 className="text-lg font-serif font-bold text-[#2d2d2a]">
                    13. Touch-First UI/UX System & ASCII Wireframe Blueprint
                  </h3>
                </div>
                <p className="text-[#737366] text-xs mt-1">
                  Touch-optimized interface design system tailored for non-technical salon receptionists and busy salon POS desks, featuring large tap targets, quick search, and role-based dashboard cards.
                </p>
              </div>

              {/* Reception Screen ASCII Wireframe */}
              <div className="bg-[#2d2d2a] text-[#f5f5f0] p-4 rounded-2xl border border-[#1c1c19] space-y-3 font-mono text-[10px]">
                <h4 className="font-serif font-bold text-amber-300 text-xs font-sans">Front Desk Receptionist Hub Wireframe (Tablet & POS Desktop)</h4>
                <pre className="overflow-x-auto leading-tight text-[#f5f5f0]/90">
{`+--------------------------------------------------------------------------------------------------+
| [LOGOUT]  BRANCH: Bole Flagship Salon  |  ACTIVE USER: Receptionist Eden  | [QUEUE TV DISPLAY]    |
+--------------------------------------------------------------------------------------------------+
| LEFT PANEL (4 COLS) - QUEUE & SEARCH               | RIGHT PANEL (8 COLS) - ACTIVE VISIT DETAILS  |
|                                                   |                                              |
| SEARCH PHONE: [ 0911223344                 ]      | CUSTOMER: Tigist Alemu (VIP)                 |
|                                                   | TICKET: #BAR-101  • BU: Barber Shop          |
| [+ CREATE NEW WALK-IN VISIT TICKET]               | STATUS: In Progress (35 mins)                |
|                                                   |                                              |
| TODAY'S WAITING QUEUE (4 Customers)                | ASSIGNED SERVICES & STAFF:                   |
| ----------------------------------                | • Haircut & Styling - Staff Abel (1,200 ETB) |
| [BAR-101] Tigist Alemu  (In Progress)             | • Beard Trim & Steam - Staff Sara (600 ETB)  |
| [SPA-202] Dawit Yonas   (Waiting)                 |                                              |
| [MAS-303] Sara Kassa    (Ready for Checkout)      | RUNNING TOTAL: 1,800.00 ETB                  |
|                                                   |                                              |
| QUICK ACTIONS:                                    | BOTTOM ACTION BAR:                           |
| [ + ADD PRODUCT CONSUMPTION ]                     | [ + ADD SERVICE ]   [ PROCEED TO CHECKOUT -> ] |
+--------------------------------------------------------------------------------------------------+`}
                </pre>
              </div>

              {/* Role Dashboards Grid */}
              <div>
                <h4 className="font-serif font-bold text-sm text-[#2d2d2a] mb-3">Role-Based Dashboard System</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="bg-[#f5f5f0] p-3.5 rounded-2xl border border-[#e5e5d1] space-y-1.5">
                    <span className="font-bold text-[#2d2d2a]">Salon Owner</span>
                    <p className="text-[11px] text-[#737366]">Consolidated revenue totals across all branches, branch comparison charts, P&L stats, plan subscription usage.</p>
                  </div>
                  <div className="bg-[#f5f5f0] p-3.5 rounded-2xl border border-[#e5e5d1] space-y-1.5">
                    <span className="font-bold text-[#2d2d2a]">Branch Manager</span>
                    <p className="text-[11px] text-[#737366]">Today's branch revenue, active staff roster attendance, stock alert warnings, void/refund authorization logs.</p>
                  </div>
                  <div className="bg-[#f5f5f0] p-3.5 rounded-2xl border border-[#e5e5d1] space-y-1.5">
                    <span className="font-bold text-[#2d2d2a]">Receptionist POS</span>
                    <p className="text-[11px] text-[#737366]">Search phone lookup, live waiting queue board, active service running total, quick multi-channel checkout bar.</p>
                  </div>
                  <div className="bg-[#f5f5f0] p-3.5 rounded-2xl border border-[#e5e5d1] space-y-1.5">
                    <span className="font-bold text-[#2d2d2a]">Staff Provider</span>
                    <p className="text-[11px] text-[#737366]">Personal station queue list, service complete toggle, daily commission earnings summary, schedule roster.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 14: MULTI-TENANT REPORTS & ANALYTICS */}
          {activeSectionId === 'reports_analytics' && (
            <div className="bg-white border border-[#e5e5d1] rounded-3xl p-6 space-y-6 text-xs text-[#2d2d2a] shadow-sm">
              <div className="border-b border-[#e5e5d1] pb-3">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5 text-[#5A5A40]" />
                  <h3 className="text-lg font-serif font-bold text-[#2d2d2a]">
                    14. Multi-Tenant Reports & Analytics Architecture Specification
                  </h3>
                </div>
                <p className="text-[#737366] text-xs mt-1">
                  High-performance reporting engine with 9 specialized report categories, composite SQL indexing, <code className="bg-[#f5f5f0] px-1.5 py-0.5 rounded border border-[#e5e5d1] font-mono">Africa/Addis_Ababa</code> timezone handling, Redis caching, and async CSV/PDF export generation.
                </p>
              </div>

              {/* 9 Report Categories Matrix */}
              <div>
                <h4 className="font-serif font-bold text-sm text-[#2d2d2a] mb-3">1. 9 Core Report Modules & Authorization Scopes</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
                  {[
                    { title: '1. Daily Operational Report', scope: 'Receptionist & Manager', desc: 'Gross/net sales, walk-in vs appointment ratio, average invoice value, Telebirr/CBE/Cash breakdown, cancelled services.' },
                    { title: '2. Weekly Management Report', scope: 'Branch Manager & Owner', desc: 'Daily revenue curves, business unit revenue breakdown, staff utilization rates, commission liabilities.' },
                    { title: '3. Monthly Executive Financials', scope: 'Salon Owner', desc: 'Net profit margins, gross revenue vs operating expenses variance, product stock cost of goods sold (COGS).' },
                    { title: '4. Yearly Strategic Trends', scope: 'Salon Owner', desc: 'YoY annual revenue growth, holiday/wedding peak seasonality, long-term customer cohort retention curves.' },
                    { title: '5. Staff Payroll & Productivity', scope: 'Manager & Owner', desc: 'Service counts per staff, revenue generated, base salary vs variable commission earned, service execution speed.' },
                    { title: '6. Service & Category Margin', scope: 'Manager & Owner', desc: 'Top high-margin services, low-performing underutilized treatments, category popularity trends.' },
                    { title: '7. Financial Cash Flow Audit', scope: 'Branch Manager & Owner', desc: 'Cash drawer shift reconciliations, digital payment reference logs (Telebirr/CBE), refund & void audit logs.' },
                    { title: '8. Customer Intelligence & Retention', scope: 'Receptionist & Owner', desc: 'New vs returning ratios, Customer LTV, top spenders, inactive customer lists (>60 days), birthday calendar.' },
                    { title: '9. Inventory & Stock Valuation', scope: 'Manager & Owner', desc: 'Real-time stock valuation, low-stock reorder alerts, service consumption deductions, inter-branch transfers.' },
                  ].map((r, idx) => (
                    <div key={idx} className="bg-[#f5f5f0] p-3.5 rounded-2xl border border-[#e5e5d1] space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-[#2d2d2a]">{r.title}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-[#5A5A40] text-white font-bold">{r.scope}</span>
                      </div>
                      <p className="text-[#737366] text-[11px]">{r.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Implementation Technical Performance Strategy */}
              <div className="bg-[#2d2d2a] text-[#f5f5f0] p-4 rounded-2xl border border-[#1c1c19] space-y-3">
                <h4 className="font-serif font-bold text-amber-300 text-sm">2. Database Indexing, Timezone & Caching Strategy</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="font-bold text-amber-200 block mb-1">Composite Database Indexing:</span>
                    <p className="text-[#f5f5f0]/80 text-[11px] leading-relaxed">
                      All aggregated SQL queries leverage composite indexes on <code className="text-amber-300">[company_id, branch_id, status, created_at]</code> across <code className="text-amber-300">invoices</code>, <code className="text-amber-300">visit_sessions</code>, and <code className="text-amber-300">commission_logs</code> to avoid full-table scans.
                    </p>
                  </div>
                  <div>
                    <span className="font-bold text-amber-200 block mb-1">Timezone & Export Streaming:</span>
                    <p className="text-[#f5f5f0]/80 text-[11px] leading-relaxed">
                      All date filters explicitly normalize timestamps to <code className="text-amber-300">Africa/Addis_Ababa</code> (EAT UTC+3). Reports exceeding 10,000 rows stream via Laravel Chunking to CSV/DomPDF memory-safely.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 15: STAFF COMMISSION ENGINE */}
          {activeSectionId === 'staff_commission_system' && (
            <div className="bg-white border border-[#e5e5d1] rounded-3xl p-6 space-y-6 text-xs text-[#2d2d2a] shadow-sm">
              <div className="border-b border-[#e5e5d1] pb-3">
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-5 h-5 text-[#5A5A40]" />
                  <h3 className="text-lg font-serif font-bold text-[#2d2d2a]">
                    15. Staff Commission & Payroll Calculation Engine Specification
                  </h3>
                </div>
                <p className="text-[#737366] text-xs mt-1">
                  Engineered for real-world salon scenarios, handling percentage, fixed rate, tiered brackets, product deduction rules, idempotency duplicate prevention, and refund clawbacks.
                </p>
              </div>

              {/* Commission Rule Hierarchy & Calculation Example */}
              <div className="bg-[#f5f5f0] p-4 rounded-2xl border border-[#e5e5d1] space-y-3">
                <h4 className="font-serif font-bold text-sm text-[#2d2d2a]">Practical Calculation Matrix & Examples</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
                  <div className="bg-white p-3 rounded-xl border border-[#e5e5d1] space-y-1">
                    <span className="font-bold text-[#5A5A40] block">Standard Percentage Rule</span>
                    <p className="text-[#737366]">Hair Cut Price: <strong>300 ETB</strong></p>
                    <p className="text-[#737366]">Rule Rate: <strong>30%</strong></p>
                    <p className="text-[#2d2d2a] font-bold">Commission Earned = 90 ETB</p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-[#e5e5d1] space-y-1">
                    <span className="font-bold text-[#5A5A40] block">Consumable Product Deduction</span>
                    <p className="text-[#737366]">Keratin Treatment: <strong>2,000 ETB</strong></p>
                    <p className="text-[#737366]">Consumable Product Cost: <strong>400 ETB</strong></p>
                    <p className="text-[#737366]">Net Base: 1,600 ETB @ 30%</p>
                    <p className="text-[#2d2d2a] font-bold">Commission Earned = 480 ETB</p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-[#e5e5d1] space-y-1">
                    <span className="font-bold text-[#5A5A40] block">Tiered Monthly Volume</span>
                    <p className="text-[#737366]">Tier 1 (0-20k): 25%</p>
                    <p className="text-[#737366]">Tier 2 (20k-50k): 30%</p>
                    <p className="text-[#737366]">Tier 3 (&gt;50k): 35%</p>
                    <p className="text-[#2d2d2a] font-bold">Auto-calculated per payroll cycle</p>
                  </div>
                </div>
              </div>

              {/* Security & Audit Flow */}
              <div className="bg-[#2d2d2a] text-[#f5f5f0] p-4 rounded-2xl border border-[#1c1c19] space-y-2">
                <h4 className="font-serif font-bold text-amber-300 text-sm">Settlement Cycle & Audit Security</h4>
                <p className="text-[#f5f5f0]/80 text-[11px] leading-relaxed">
                  Commissions flow through a strict 3-phase governance pipeline: <code className="text-amber-300">Pending</code> (auto-calculated) ➔ <code className="text-amber-300">Approved</code> (Branch Manager review) ➔ <code className="text-amber-300">Paid</code> (disbursed). Refund clawbacks create negative adjustment logs (<code className="text-amber-300">commission_adjustments</code>) to ensure financial reconciliation.
                </p>
              </div>
            </div>
          )}

          {/* SECTION 16: ACCEPTANCE CRITERIA */}
          {activeSectionId === 'acceptance_criteria' && (
            <div className="bg-white border border-[#e5e5d1] rounded-3xl p-6 space-y-4 text-xs text-[#2d2d2a] shadow-sm">
              <h3 className="text-lg font-serif font-bold text-[#2d2d2a] border-b border-[#e5e5d1] pb-3">
                16. ERP Acceptance Criteria Checklist
              </h3>

              <div className="space-y-2">
                {[
                  'Strict company_id global scoping on all business database models.',
                  'Touch-friendly Receptionist POS supporting multi-service & multi-staff session creation.',
                  'Automatic inventory stock deduction upon session payment checkout.',
                  'Staff commission calculation supporting percentage & fixed rate schedules.',
                  'Telebirr, CBE Birr, Cash payment checkout with SMS receipt dispatching.',
                  'cPanel compatible database queue configuration for background tasks.',
                  'Multi-branch and business unit scoping (Men\'s/Women\'s/Spa/Massage).',
                  'Financial P&L reports breaking down Gross Revenue, Expenses, and Net Profit.',
                  'Multi-tenant RBAC with Spatie teams enforcing company_id & branch authorization boundaries.',
                  'Sensitive operation safeguards (voids, refunds, discounts, completed visit edits) with audit logs.',
                  'Single-database multi-tenant security isolation with Eloquent CompanyScope & EnsureTenantContext middleware.',
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center space-x-2.5 p-3 bg-[#f5f5f0] rounded-2xl border border-[#e5e5d1]">
                    <CheckCircle className="w-4 h-4 text-[#5A5A40] shrink-0" />
                    <span className="font-medium text-[#2d2d2a]">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CODE SNIPPETS FOR CODE-BASED SECTIONS */}
          {activeSection.codeSnippets && activeSection.codeSnippets.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-sm font-serif font-bold text-[#2d2d2a]">Laravel 11 Implementation Snippets</h4>
              {activeSection.codeSnippets.map((snippet, idx) => (
                <div key={idx} className="bg-[#2d2d2a] border border-[#1c1c19] rounded-2xl overflow-hidden shadow-sm">
                  <div className="bg-[#1c1c19] px-4 py-2.5 flex items-center justify-between text-xs border-b border-[#3d3d38]">
                    <span className="font-mono text-amber-300 font-bold">{snippet.filename}</span>
                    <button
                      onClick={() => handleCopyCode(snippet.code, idx)}
                      className="text-[#f5f5f0]/70 hover:text-white flex items-center space-x-1 cursor-pointer"
                    >
                      {copiedCodeIndex === idx ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-4 text-[#f5f5f0] font-mono text-[11px] overflow-x-auto leading-relaxed">
                    <code>{snippet.code}</code>
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
