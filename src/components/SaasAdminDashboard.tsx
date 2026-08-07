import React, { useState } from 'react';
import {
  Building2,
  DollarSign,
  Layers,
  CheckCircle,
  Plus,
  ShieldAlert,
  Send,
  Sparkles,
  Search,
  Check,
  TrendingUp,
} from 'lucide-react';
import { Company, SubscriptionPlan, SmsLog } from '../types';

interface SaasAdminDashboardProps {
  companies: Company[];
  onAddCompany: (newCmp: Company) => void;
  subscriptionPlans: SubscriptionPlan[];
  smsLogs: SmsLog[];
}

export const SaasAdminDashboard: React.FC<SaasAdminDashboardProps> = ({
  companies,
  onAddCompany,
  subscriptionPlans,
  smsLogs,
}) => {
  const [showNewCompanyModal, setShowNewCompanyModal] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [planId, setPlanId] = useState(subscriptionPlans[1]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');

  const totalMrrEtb = companies.reduce((acc, cmp) => {
    const plan = subscriptionPlans.find((p) => p.id === cmp.subscriptionPlanId);
    return acc + (plan ? plan.monthlyFeeEtb : 0);
  }, 0);

  const filteredCompanies = companies.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName) return;

    const newCmp: Company = {
      id: `cmp_${Date.now()}`,
      name: companyName,
      slug: companyName.toLowerCase().replace(/\s+/g, '-'),
      subscriptionPlanId: planId,
      status: 'active',
      currency: 'ETB',
      timezone: 'Africa/Addis_Ababa',
      phone: companyPhone || '+251 91 000 0000',
      email: companyEmail || `admin@${companyName.toLowerCase().replace(/\s+/g, '')}.et`,
      createdAt: new Date().toISOString().split('T')[0],
    };

    onAddCompany(newCmp);
    setShowNewCompanyModal(false);
    setCompanyName('');
    setCompanyPhone('');
    setCompanyEmail('');
  };

  return (
    <div className="space-y-6">
      {/* SaaS Admin Banner */}
      <div className="bg-[#5A5A40] text-white rounded-3xl p-6 shadow-sm border border-[#4a4a35]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#f5f5f0]/15 text-[#f5f5f0] border border-[#f5f5f0]/30 uppercase tracking-widest">
                SaaS Super Admin Control Center
              </span>
              <span className="text-[#f5f5f0]/80 text-xs">cPanel Multi-Tenant Core</span>
            </div>
            <h2 className="text-2xl font-serif font-light mt-2 text-[#f5f5f0]">
              Platform Overview & Subscription Management
            </h2>
            <p className="text-[#f5f5f0]/80 text-xs mt-1 max-w-2xl font-sans">
              Monitor active tenant companies, monthly subscription revenue (MRR in ETB), multi-branch limits, and automated SMS dispatch gateways across Ethiopia.
            </p>
          </div>

          <button
            id="provision-tenant-btn"
            onClick={() => setShowNewCompanyModal(true)}
            className="flex items-center space-x-2 px-5 py-2.5 bg-[#f5f5f0] hover:bg-white text-[#5A5A40] font-bold rounded-full shadow-sm transition-all text-xs self-start md:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#5A5A40]" />
            <span>Provision Tenant Salon</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#e5e5d1] rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-[#737366] text-xs font-bold uppercase tracking-wider">
            <span>Monthly Revenue (MRR)</span>
            <DollarSign className="w-4 h-4 text-[#5A5A40]" />
          </div>
          <div className="text-2xl font-serif font-bold text-[#2d2d2a] mt-2">
            {totalMrrEtb.toLocaleString()} <span className="text-xs text-[#5A5A40] font-sans font-normal">ETB / mo</span>
          </div>
          <div className="flex items-center space-x-1 text-xs text-emerald-700 mt-2 font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>100% active collection</span>
          </div>
        </div>

        <div className="bg-white border border-[#e5e5d1] rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-[#737366] text-xs font-bold uppercase tracking-wider">
            <span>Active Tenant Companies</span>
            <Building2 className="w-4 h-4 text-[#5A5A40]" />
          </div>
          <div className="text-2xl font-serif font-bold text-[#2d2d2a] mt-2">
            {companies.length} <span className="text-xs text-[#737366] font-sans font-normal">Tenants</span>
          </div>
          <div className="text-xs text-[#737366] mt-2 font-sans">Isolated single-db schemas</div>
        </div>

        <div className="bg-white border border-[#e5e5d1] rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-[#737366] text-xs font-bold uppercase tracking-wider">
            <span>Subscription Tiers</span>
            <Layers className="w-4 h-4 text-[#5A5A40]" />
          </div>
          <div className="text-2xl font-serif font-bold text-[#2d2d2a] mt-2">
            {subscriptionPlans.length} <span className="text-xs text-[#737366] font-sans font-normal">Tiers</span>
          </div>
          <div className="text-xs text-[#5A5A40] mt-2 font-medium">Starter, Growth, Enterprise</div>
        </div>

        <div className="bg-white border border-[#e5e5d1] rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-[#737366] text-xs font-bold uppercase tracking-wider">
            <span>Ethio Telecom SMS</span>
            <Send className="w-4 h-4 text-[#5A5A40]" />
          </div>
          <div className="text-2xl font-serif font-bold text-[#2d2d2a] mt-2">
            {smsLogs.length} <span className="text-xs text-[#737366] font-sans font-normal">Logs</span>
          </div>
          <div className="text-xs text-emerald-700 mt-2 font-medium">cPanel Cron queue active</div>
        </div>
      </div>

      {/* Subscription Tier Cards */}
      <div>
        <h3 className="text-lg font-serif font-bold text-[#2d2d2a] mb-3">SaaS Subscription Plans (ETB)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {subscriptionPlans.map((plan) => (
            <div
              key={plan.id}
              className="bg-white border border-[#e5e5d1] rounded-3xl p-5 hover:border-[#5A5A40] transition-all flex flex-col justify-between shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-base font-serif font-bold text-[#2d2d2a]">{plan.name}</span>
                  <span className="text-xs px-3 py-1 rounded-full bg-[#f5f5f0] text-[#5A5A40] font-bold border border-[#e5e5d1]">
                    {plan.monthlyFeeEtb.toLocaleString()} ETB/mo
                  </span>
                </div>
                <div className="text-xs text-[#737366] mt-3 space-y-1 font-sans">
                  <div>Max Branches: <strong className="text-[#2d2d2a]">{plan.maxBranches}</strong></div>
                  <div>Max Business Units: <strong className="text-[#2d2d2a]">{plan.maxBusinessUnits}</strong></div>
                  <div>Max Staff Capacity: <strong className="text-[#2d2d2a]">{plan.maxStaff}</strong></div>
                </div>

                <ul className="mt-4 space-y-2 border-t border-[#e5e5d1] pt-3 text-xs text-[#2d2d2a] font-sans">
                  {plan.features.map((ft, idx) => (
                    <li key={idx} className="flex items-center space-x-2">
                      <Check className="w-3.5 h-3.5 text-[#5A5A40] shrink-0" />
                      <span>{ft}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tenant Companies Table */}
      <div className="bg-white border border-[#e5e5d1] rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-serif font-bold text-[#2d2d2a]">Registered Tenant Companies</h3>
            <p className="text-xs text-[#737366]">Strict company_id isolation enforced across database models</p>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-[#737366] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search company name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#f5f5f0] border border-[#e5e5d1] text-[#2d2d2a] text-xs rounded-xl pl-9 pr-3 py-2 outline-none focus:border-[#5A5A40] w-full sm:w-64 font-sans"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#2d2d2a] font-sans">
            <thead className="bg-[#f5f5f0] text-[#737366] uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3 rounded-l-xl">Company Name</th>
                <th className="px-4 py-3">Subscription Tier</th>
                <th className="px-4 py-3">Contact Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 rounded-r-xl">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e5d1]">
              {filteredCompanies.map((cmp) => {
                const plan = subscriptionPlans.find((p) => p.id === cmp.subscriptionPlanId);
                return (
                  <tr key={cmp.id} className="hover:bg-[#f5f5f0]/60">
                    <td className="px-4 py-3 font-semibold text-[#2d2d2a] flex items-center space-x-2">
                      <Building2 className="w-4 h-4 text-[#5A5A40]" />
                      <span>{cmp.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#f5f5f0] text-[#5A5A40] border border-[#e5e5d1] font-semibold text-[11px]">
                        {plan?.name || cmp.subscriptionPlanId}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#737366]">{cmp.email}</td>
                    <td className="px-4 py-3 text-[#737366]">{cmp.phone}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
                        <CheckCircle className="w-3 h-3" />
                        <span>Active</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#737366]">{cmp.createdAt}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Provision Tenant Modal */}
      {showNewCompanyModal && (
        <div className="fixed inset-0 z-50 bg-[#2d2d2a]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#e5e5d1] rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#e5e5d1] pb-3">
              <h3 className="text-lg font-serif font-bold text-[#2d2d2a] flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-[#5A5A40]" />
                <span>Provision New Tenant Company</span>
              </h3>
              <button
                onClick={() => setShowNewCompanyModal(false)}
                className="text-[#737366] hover:text-[#2d2d2a] text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCompany} className="space-y-4 font-sans">
              <div>
                <label className="block text-xs font-semibold text-[#2d2d2a] mb-1">Company / Salon Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Addis Luxury Wellness Group"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-[#f5f5f0] border border-[#e5e5d1] text-[#2d2d2a] rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-[#5A5A40]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#2d2d2a] mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+251 91 123 4567"
                    value={companyPhone}
                    onChange={(e) => setCompanyPhone(e.target.value)}
                    className="w-full bg-[#f5f5f0] border border-[#e5e5d1] text-[#2d2d2a] rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-[#5A5A40]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2d2d2a] mb-1">Admin Email</label>
                  <input
                    type="email"
                    placeholder="admin@salon.et"
                    value={companyEmail}
                    onChange={(e) => setCompanyEmail(e.target.value)}
                    className="w-full bg-[#f5f5f0] border border-[#e5e5d1] text-[#2d2d2a] rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-[#5A5A40]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2d2d2a] mb-1">Subscription Plan Tier</label>
                <select
                  value={planId}
                  onChange={(e) => setPlanId(e.target.value)}
                  className="w-full bg-[#f5f5f0] border border-[#e5e5d1] text-[#2d2d2a] rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-[#5A5A40]"
                >
                  {subscriptionPlans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.monthlyFeeEtb.toLocaleString()} ETB/mo)
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2 border-t border-[#e5e5d1]">
                <button
                  type="button"
                  onClick={() => setShowNewCompanyModal(false)}
                  className="px-4 py-2 bg-[#f5f5f0] text-[#737366] font-semibold rounded-full text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#5A5A40] hover:bg-[#4a4a35] text-white font-bold rounded-full text-xs shadow-md"
                >
                  Create Tenant & Provision Database Scope
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
