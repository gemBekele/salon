import React, { useState } from 'react';
import {
  Building2,
  DollarSign,
  Layers,
  CheckCircle,
  Plus,
  Send,
  Search,
  Check,
  TrendingUp,
} from 'lucide-react';
import { Company, SubscriptionPlan, SmsLog } from '../types';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';

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
      <div className="bg-primary text-primary-foreground rounded-md p-6 border border-primary/80">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 rounded-full text-sm font-semibold bg-muted/15 text-primary-foreground border border-primary-foreground/30 uppercase tracking-widest">
                SaaS Super Admin Control Center
              </span>
              <span className="text-primary-foreground/80 text-sm">cPanel Multi-Tenant Core</span>
            </div>
            <h2 className="text-lg font-semibold tracking-tight text-primary-foreground mt-1.5">
              Platform Overview & Subscription Management
            </h2>
            <p className="text-primary-foreground/80 text-sm mt-1 max-w-2xl font-sans">
              Monitor active tenant companies, monthly subscription revenue (MRR in ETB), multi-branch limits, and automated SMS dispatch gateways across Ethiopia.
            </p>
          </div>

          <Button
            id="provision-tenant-btn"
            onClick={() => setShowNewCompanyModal(true)}
            className="flex items-center space-x-1.5 bg-muted hover:bg-muted text-foreground font-semibold text-sm rounded-md border border-border cursor-pointer self-start md:self-auto"
          >
            <Plus className="w-4 h-4 text-foreground" />
            <span>Provision Tenant Salon</span>
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-md p-5">
          <div className="flex items-center justify-between">
            <span className="kpi-label">Monthly Revenue (MRR)</span>
            <div className="w-8 h-8 rounded-md bg-primary/10 text-primary flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="kpi-value mt-2">
            {totalMrrEtb.toLocaleString()} <span className="text-sm text-muted-foreground font-sans font-medium">ETB / mo</span>
          </div>
          <div className="flex items-center space-x-1 text-sm text-muted-foreground mt-2 font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>100% active collection</span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-md p-5">
          <div className="flex items-center justify-between">
            <span className="kpi-label">Active Tenant Companies</span>
            <div className="w-8 h-8 rounded-md bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-900">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="kpi-value mt-2">
            {companies.length} <span className="text-sm text-muted-foreground font-sans font-medium">Tenants</span>
          </div>
          <div className="text-sm text-muted-foreground mt-2 font-sans">Isolated single-db schemas</div>
        </div>

        <div className="bg-card border border-border rounded-md p-5">
          <div className="flex items-center justify-between">
            <span className="kpi-label">Subscription Tiers</span>
            <div className="w-8 h-8 rounded-md bg-violet-50 text-violet-600 border border-violet-100 flex items-center justify-center dark:bg-violet-950/40 dark:text-violet-400 dark:border-violet-900">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="kpi-value mt-2">
            {subscriptionPlans.length} <span className="text-sm text-muted-foreground font-sans font-medium">Tiers</span>
          </div>
          <div className="text-sm text-muted-foreground mt-2 font-sans">Starter, Growth, Enterprise</div>
        </div>

        <div className="bg-card border border-border rounded-md p-5">
          <div className="flex items-center justify-between">
            <span className="kpi-label">Ethio Telecom SMS</span>
            <div className="w-8 h-8 rounded-md bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <div className="kpi-value mt-2">
            {smsLogs.length} <span className="text-sm text-muted-foreground font-sans font-medium">Logs</span>
          </div>
          <div className="text-sm text-muted-foreground mt-2 font-sans">cPanel Cron queue active</div>
        </div>
      </div>

      {/* Subscription Tier Cards */}
      <div>
        <h3 className="section-title mb-3">SaaS Subscription Plans (ETB)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {subscriptionPlans.map((plan) => (
            <div
              key={plan.id}
              className="bg-card border border-border rounded-md p-5 hover:border-primary transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold text-foreground">{plan.name}</span>
                  <span className="text-sm px-3 py-1 rounded-full bg-muted text-foreground font-semibold border border-border">
                    {plan.monthlyFeeEtb.toLocaleString()} ETB/mo
                  </span>
                </div>
                <div className="text-sm text-muted-foreground mt-3 space-y-1 font-sans">
                  <div>Max Branches: <strong className="text-foreground">{plan.maxBranches}</strong></div>
                  <div>Max Business Units: <strong className="text-foreground">{plan.maxBusinessUnits}</strong></div>
                  <div>Max Staff Capacity: <strong className="text-foreground">{plan.maxStaff}</strong></div>
                </div>

                <ul className="mt-4 space-y-2 border-t border-border pt-3 text-sm text-foreground font-sans">
                  {plan.features.map((ft, idx) => (
                    <li key={idx} className="flex items-center space-x-2">
                      <Check className="w-3.5 h-3.5 text-foreground shrink-0" />
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
      <div className="bg-card border border-border rounded-md p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="section-title">Registered Tenant Companies</h3>
            <p className="text-meta mt-0.5">Strict company_id isolation enforced across database models</p>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Search company name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-full sm:w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table className="w-full text-left text-sm text-foreground font-sans">
            <TableHeader>
              <TableRow>
                <TableHead>Company Name</TableHead>
                <TableHead>Subscription Tier</TableHead>
                <TableHead>Contact Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCompanies.map((cmp) => {
                const plan = subscriptionPlans.find((p) => p.id === cmp.subscriptionPlanId);
                return (
                  <TableRow key={cmp.id} className="hover:bg-muted/40">
                    <TableCell className="font-semibold text-foreground flex items-center space-x-2">
                      <Building2 className="w-4 h-4 text-foreground" />
                      <span>{cmp.name}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="neutral" className="font-semibold">
                        {plan?.name || cmp.subscriptionPlanId}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{cmp.email}</TableCell>
                    <TableCell className="text-muted-foreground">{cmp.phone}</TableCell>
                    <TableCell>
                      <Badge variant="success" className="font-semibold">
                        <CheckCircle className="w-3 h-3" />
                        <span>Active</span>
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{cmp.createdAt}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Provision Tenant Modal */}
      {showNewCompanyModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-md max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="section-title flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-foreground" />
                <span>Provision New Tenant Company</span>
              </h3>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowNewCompanyModal(false)}
                className="text-muted-foreground hover:text-foreground text-lg font-semibold"
              >
                ✕
              </Button>
            </div>

            <form onSubmit={handleCreateCompany} className="space-y-4 font-sans">
              <div>
                <label className="block kpi-label mb-1.5">Company / Salon Name</label>
                <Input
                  type="text"
                  required
                  placeholder="e.g. Addis Luxury Wellness Group"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block kpi-label mb-1.5">Phone Number</label>
                  <Input
                    type="text"
                    placeholder="+251 91 123 4567"
                    value={companyPhone}
                    onChange={(e) => setCompanyPhone(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block kpi-label mb-1.5">Admin Email</label>
                  <Input
                    type="email"
                    placeholder="admin@salon.et"
                    value={companyEmail}
                    onChange={(e) => setCompanyEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block kpi-label mb-1.5">Subscription Plan Tier</label>
                <Select value={planId} onValueChange={(v) => setPlanId(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {subscriptionPlans.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.monthlyFeeEtb.toLocaleString()} ETB/mo)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNewCompanyModal(false)}
                  className="text-sm font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="text-sm font-semibold"
                >
                  Create Tenant & Provision Database Scope
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};