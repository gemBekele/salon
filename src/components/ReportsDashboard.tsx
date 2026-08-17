import React, { useState, useMemo, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Award,
  Filter,
  Download,
  CheckCircle,
  Receipt,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Company,
  Branch,
  BusinessUnit,
  Staff,
  Service,
  VisitSession,
  CommissionLog,
  ExpenseRecord,
} from '../types';
import { apiFetch } from '../lib/api';
import { Button } from './ui/button';
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

interface ReportsDashboardProps {
  company: Company;
  branches: Branch[];
  staffList: Staff[];
  services: Service[];
  visitSessions: VisitSession[];
  commissionLogs: CommissionLog[];
  expenses: ExpenseRecord[];
}

const COLORS = ['#0d9488', '#0ea5e9', '#8b5cf6', '#f59e0b', '#ef4444', '#14b8a6'];

export const ReportsDashboard: React.FC<ReportsDashboardProps> = ({
  company,
  branches,
  staffList,
  services,
  visitSessions,
  commissionLogs,
  expenses,
}) => {
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'all'>('all');
  const [reportData, setReportData] = useState<any>(null);
  const [loadingReports, setLoadingReports] = useState(true);

  const dateFilter = useMemo(() => {
    const now = new Date();
    const to = now.toISOString().split('T')[0];
    let from = '';
    if (timeRange === 'today') from = to;
    else if (timeRange === 'week') {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      from = d.toISOString().split('T')[0];
    } else if (timeRange === 'month') {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 1);
      from = d.toISOString().split('T')[0];
    }
    return { from, to };
  }, [timeRange]);

  useEffect(() => {
    let active = true;
    setLoadingReports(true);
    const params = new URLSearchParams();
    if (selectedBranchId !== 'all') params.set('branchId', selectedBranchId);
    if (dateFilter.from) params.set('from', dateFilter.from);
    params.set('to', dateFilter.to);
    const qs = params.toString();
    Promise.all([
      apiFetch(`/api/reports/summary?${qs}`),
      apiFetch(`/api/reports/revenue?${qs}`),
      apiFetch(`/api/reports/commissions?${qs}`),
      apiFetch(`/api/reports/expenses?${qs}`),
    ])
      .then(async ([summary, revenue, commissions, expenses]) => {
        if (!active) return;
        const [s, r, c, e] = await Promise.all([
          summary.ok ? summary.json() : null,
          revenue.ok ? revenue.json() : null,
          commissions.ok ? commissions.json() : null,
          expenses.ok ? expenses.json() : null,
        ]);
        setReportData({ summary: s, revenue: r || [], commissions: c || [], expenses: e || [] });
      })
      .catch((err) => console.error('Failed to load reports from API:', err))
      .finally(() => active && setLoadingReports(false));
    return () => {
      active = false;
    };
  }, [selectedBranchId, dateFilter]);

  // Filter visit sessions by company & selected branch
  const companyVisits = useMemo(() => {
    return visitSessions.filter((s) => {
      if (s.companyId !== company.id) return false;
      if (selectedBranchId !== 'all' && s.branchId !== selectedBranchId) return false;
      return true;
    });
  }, [visitSessions, company.id, selectedBranchId]);

  const companyCommissions = useMemo(() => {
    return commissionLogs.filter((c) => {
      if (c.companyId !== company.id) return false;
      if (selectedBranchId !== 'all' && c.branchId !== selectedBranchId) return false;
      return true;
    });
  }, [commissionLogs, company.id, selectedBranchId]);

  const companyExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (e.companyId !== company.id) return false;
      if (selectedBranchId !== 'all' && e.branchId !== selectedBranchId) return false;
      return true;
    });
  }, [expenses, company.id, selectedBranchId]);

  // Key KPI Calculations (prefer authoritative server summary; fall back to local)
  const completedVisits = companyVisits.filter((s) => s.status === 'completed');
  const summary = reportData?.summary;
  const totalGrossRevenue = summary ? Number(summary.totalRevenue || 0) : completedVisits.reduce((acc, s) => acc + s.netTotalEtb, 0);
  const totalCommissionsEarned = summary ? Number(summary.totalCommissions || 0) : companyCommissions.reduce((acc, c) => acc + c.commissionAmountEtb, 0);
  const totalExpensesAmount = summary ? Number(summary.totalExpenses || 0) : companyExpenses.reduce((acc, e) => acc + e.amountEtb, 0);
  const netProfit = summary ? Number(summary.netProfit || 0) : totalGrossRevenue - totalCommissionsEarned - totalExpensesAmount;
  const avgTicketValue = summary ? Number(summary.avgTicket || 0) : completedVisits.length > 0 ? Math.round(totalGrossRevenue / completedVisits.length) : 0;

  // Daily Sales & Revenue Trend Data
  const dailySalesData = useMemo(() => {
    if (reportData?.revenue && reportData.revenue.length > 0) {
      return reportData.revenue.map((r: any) => ({
        date: r.date ? String(r.date).split('T')[0] : '',
        revenue: Number(r.revenue || 0),
        visits: Number(r.visits || 0),
      }));
    }
    const map: Record<string, { date: string; revenue: number; visits: number }> = {};

    completedVisits.forEach((session) => {
      const dateStr = session.startedAt ? session.startedAt.split('T')[0] : 'Today';
      if (!map[dateStr]) {
        map[dateStr] = { date: dateStr, revenue: 0, visits: 0 };
      }
      map[dateStr].revenue += session.netTotalEtb;
      map[dateStr].visits += 1;
    });

    // If empty, return empty array
    if (Object.keys(map).length === 0) {
      return [];
    }

    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [reportData, completedVisits, totalGrossRevenue]);

  // Service Category Breakdown (Pie Chart)
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};

    completedVisits.forEach((session) => {
      session.services.forEach((srvItem) => {
        const matchingSrv = services.find((s) => s.id === srvItem.serviceId);
        const cat = matchingSrv?.category || 'General Services';
        map[cat] = (map[cat] || 0) + srvItem.priceEtb;
      });
    });

    const result = Object.keys(map).map((catName) => ({
      name: catName,
      value: map[catName],
    }));

    if (result.length === 0) {
      return [];
    }
    return result;
  }, [completedVisits, services]);

  // Payment Method Distribution Data
  const paymentMethodData = useMemo(() => {
    const map: Record<string, number> = {
      telebirr: 0,
      cbe_birr: 0,
      cash: 0,
      card: 0,
    };

    completedVisits.forEach((session) => {
      const pm = session.paymentMethod || 'telebirr';
      map[pm] = (map[pm] || 0) + session.netTotalEtb;
    });

    return [
      { name: 'Telebirr', amount: map.telebirr },
      { name: 'CBE Birr', amount: map.cbe_birr },
      { name: 'Cash', amount: map.cash },
      { name: 'Card / POS', amount: map.card },
    ].filter((item) => item.amount > 0);
  }, [completedVisits]);

  // Staff Performance Ranking (server-authoritative when available)
  const staffPerformance = useMemo(() => {
    if (reportData?.commissions && reportData.commissions.length > 0) {
      return reportData.commissions.map((c: any) => {
        const stf = staffList.find((s) => s.id === c.staff_id);
        return {
          staffId: c.staff_id,
          staffName: c.staff_name,
          role: stf?.role || 'Provider',
          servicesCompleted: Number(c.servicesCompleted || 0),
          revenueGenerated: Number(c.revenueGenerated || 0),
          commissionEarned: Number(c.commissionEarned || 0),
        };
      });
    }
    const map: Record<
      string,
      {
        staffId: string;
        staffName: string;
        role: string;
        servicesCompleted: number;
        revenueGenerated: number;
        commissionEarned: number;
      }
    > = {};

    completedVisits.forEach((session) => {
      session.services.forEach((srv) => {
        if (!map[srv.staffId]) {
          const stf = staffList.find((s) => s.id === srv.staffId);
          map[srv.staffId] = {
            staffId: srv.staffId,
            staffName: srv.staffName,
            role: stf?.role || 'Provider',
            servicesCompleted: 0,
            revenueGenerated: 0,
            commissionEarned: 0,
          };
        }
        map[srv.staffId].servicesCompleted += 1;
        map[srv.staffId].revenueGenerated += srv.priceEtb;
        map[srv.staffId].commissionEarned += srv.commissionEarnedEtb;
      });
    });

    return Object.values(map).sort((a, b) => b.revenueGenerated - a.revenueGenerated);
  }, [reportData, completedVisits, staffList]);

  // Service Popularity Ranking
  const servicePopularity = useMemo(() => {
    const map: Record<
      string,
      { serviceName: string; category: string; priceEtb: number; count: number; totalRevenue: number }
    > = {};

    completedVisits.forEach((session) => {
      session.services.forEach((srv) => {
        if (!map[srv.serviceId]) {
          const s = services.find((item) => item.id === srv.serviceId);
          map[srv.serviceId] = {
            serviceName: srv.serviceName,
            category: s?.category || 'General',
            priceEtb: srv.priceEtb,
            count: 0,
            totalRevenue: 0,
          };
        }
        map[srv.serviceId].count += 1;
        map[srv.serviceId].totalRevenue += srv.priceEtb;
      });
    });

    return Object.values(map).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [completedVisits, services]);

  const handleExportCsv = async () => {
    const params = new URLSearchParams();
    if (selectedBranchId !== 'all') params.set('branchId', selectedBranchId);
    if (dateFilter.from) params.set('from', dateFilter.from);
    params.set('to', dateFilter.to);
    const res = await apiFetch(`/api/reports/export/visits.csv?${params.toString()}`);
    if (!res.ok) {
      console.error('CSV export failed', res.status);
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${company.name.replace(/\s+/g, '_')}_sales_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div id="reports-dashboard-root" className="space-y-6">
      {/* Top Header & Filter Controls */}
      <div className="bg-card rounded-md p-6 border border-border flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-6 h-6 text-foreground" />
            <h2 className="page-title">
              Reports & Executive Analytics Dashboard
            </h2>
          </div>
          <p className="text-meta mt-1">
            Real-time daily sales, staff commissions, service popularity, and branch revenue summaries for{' '}
            <strong className="text-foreground">{company.name}</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Branch Select */}
          <div className="flex items-center space-x-1.5 bg-muted border border-border rounded-md px-3 py-2 text-sm">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={selectedBranchId} onValueChange={(v) => setSelectedBranchId(v)}>
              <SelectTrigger className="h-8 gap-1 border-0 bg-transparent p-0 text-sm font-medium text-foreground focus:ring-0 focus-visible:ring-0 [&>svg]:hidden">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branches
                  .filter((b) => b.companyId === company.id)
                  .map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} ({b.city})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Time Range Switch */}
          <div className="flex items-center bg-muted border border-border rounded-md p-1 text-sm">
            {(['today', 'week', 'month', 'all'] as const).map((range) => (
              <Button
                key={range}
                type="button"
                size="sm"
                onClick={() => setTimeRange(range)}
                className={`px-3 rounded-md text-sm font-medium transition cursor-pointer capitalize border-0 ${
                  timeRange === range
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-transparent'
                }`}
              >
                {range}
              </Button>
            ))}
          </div>

          {/* Export Actions */}
          <Button
            onClick={handleExportCsv}
            className="gap-1.5 text-sm font-semibold"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      {loadingReports && (
        <div className="bg-card rounded-md p-4 border border-border text-center text-sm text-muted-foreground">
          <span className="inline-flex items-center space-x-2">
            <span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span>Refreshing report figures...</span>
          </span>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Revenue */}
        <div className="bg-card rounded-md p-5 border border-border space-y-2">
          <div className="flex justify-between items-center">
            <span className="kpi-label">Gross Sales Revenue</span>
            <div className="w-8 h-8 rounded-md bg-primary/10 text-primary flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="kpi-value">
            {totalGrossRevenue.toLocaleString()} <span className="text-sm font-sans text-muted-foreground font-medium">ETB</span>
          </div>
          <div className="flex items-center text-[11px] text-muted-foreground space-x-1 font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{completedVisits.length} visits completed</span>
          </div>
        </div>

        {/* Avg Ticket Value */}
        <div className="bg-card rounded-md p-5 border border-border space-y-2">
          <div className="flex justify-between items-center">
            <span className="kpi-label">Avg Invoice Value</span>
            <div className="w-8 h-8 rounded-md bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-900">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="kpi-value">
            {avgTicketValue.toLocaleString()} <span className="text-sm font-sans text-muted-foreground font-medium">ETB</span>
          </div>
          <div className="text-[11px] text-muted-foreground">Per visit transaction average</div>
        </div>

        {/* Staff Commissions */}
        <div className="bg-card rounded-md p-5 border border-border space-y-2">
          <div className="flex justify-between items-center">
            <span className="kpi-label">Staff Commissions</span>
            <div className="w-8 h-8 rounded-md bg-violet-50 text-violet-600 border border-violet-100 flex items-center justify-center dark:bg-violet-950/40 dark:text-violet-400 dark:border-violet-900">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="kpi-value">
            {totalCommissionsEarned.toLocaleString()} <span className="text-sm font-sans text-muted-foreground font-medium">ETB</span>
          </div>
          <div className="text-[11px] text-muted-foreground">Accrued provider payouts</div>
        </div>

        {/* Net Profit */}
        <div className="bg-card rounded-md p-5 border border-border space-y-2">
          <div className="flex justify-between items-center">
            <span className="kpi-label">Net Operating Surplus</span>
            <div className="w-8 h-8 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="kpi-value">
            {netProfit.toLocaleString()} <span className="text-sm font-sans text-muted-foreground font-medium">ETB</span>
          </div>
          <div className="text-[11px] text-muted-foreground font-medium">After commissions & expenses</div>
        </div>
      </div>

      {/* Charts Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Daily Revenue Trend Chart (8 Cols) */}
        <div className="lg:col-span-8 bg-card rounded-md p-6 border border-border space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="section-title">Daily Revenue & Visit Trend</h3>
              <p className="text-meta mt-0.5">Gross revenue collected per day in Ethiopian Birr (ETB)</p>
            </div>
            <span className="text-sm px-2.5 py-1 rounded-full bg-muted text-foreground font-semibold border border-border">
              Daily Breakdown
            </span>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailySalesData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis dataKey="date" stroke="#71717a" fontSize={11} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={11} tickLine={false} />
                <Tooltip
                  formatter={(value: any) => [`${Number(value).toLocaleString()} ETB`, 'Revenue']}
                  contentStyle={{
                    backgroundColor: '#18181b',
                    color: '#fafafa',
                    borderRadius: '2px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="revenue" fill="#0d9488" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Service Popularity Pie Chart (4 Cols) */}
        <div className="lg:col-span-4 bg-card rounded-md p-6 border border-border flex flex-col justify-between space-y-4">
          <div>
            <h3 className="section-title">Service Category Revenue</h3>
            <p className="text-meta mt-0.5">Distribution across service categories</p>
          </div>

          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={4}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [`${Number(val).toLocaleString()} ETB`, 'Sales']}
                  contentStyle={{
                    backgroundColor: '#18181b',
                    color: '#fafafa',
                    borderRadius: '2px',
                    fontSize: '11px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="space-y-1.5 pt-2 border-t border-border">
            {categoryData.slice(0, 4).map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-sm">
                <div className="flex items-center space-x-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                  />
                  <span className="text-foreground font-medium">{item.name}</span>
                </div>
                <span className="font-mono font-semibold text-foreground num">{item.value.toLocaleString()} ETB</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Staff Performance KPIs Table */}
      <div className="bg-card rounded-md p-6 border border-border space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="section-title">Staff Performance & Commission Leaderboard</h3>
            <p className="text-meta mt-0.5">Completed services, total sales contribution, and commission earned per provider</p>
          </div>
          <span className="text-sm text-muted-foreground font-mono num">
            {staffPerformance.length} Providers Tracked
          </span>
        </div>

        <div className="overflow-x-auto">
          <Table className="w-full text-left text-sm border-collapse">
            <TableHeader>
              <TableRow>
                <TableHead>Staff Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-center">Services Done</TableHead>
                <TableHead className="text-right num">Revenue Generated</TableHead>
                <TableHead className="text-right num">Commission Earned</TableHead>
                <TableHead className="text-right num">Avg / Service</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staffPerformance.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    No completed service data recorded yet for this selection.
                  </TableCell>
                </TableRow>
              ) : (
                staffPerformance.map((stf, index) => {
                  const avgPerSrv = stf.servicesCompleted > 0 ? Math.round(stf.revenueGenerated / stf.servicesCompleted) : 0;
                  return (
                    <TableRow key={stf.staffId} className="hover:bg-muted/40">
                      <TableCell className="font-semibold flex items-center space-x-2">
                        {index === 0 && <Award className="w-4 h-4 text-muted-foreground shrink-0" />}
                        <span>{stf.staffName}</span>
                      </TableCell>
                      <TableCell className="capitalize text-muted-foreground">{stf.role}</TableCell>
                      <TableCell className="text-center font-mono font-semibold num">{stf.servicesCompleted}</TableCell>
                      <TableCell className="text-right font-mono font-semibold num text-foreground">
                        {stf.revenueGenerated.toLocaleString()} ETB
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold num text-foreground">
                        {stf.commissionEarned.toLocaleString()} ETB
                      </TableCell>
                      <TableCell className="text-right font-mono num text-muted-foreground">
                        {avgPerSrv.toLocaleString()} ETB
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Top Performing Services List */}
      <div className="bg-card rounded-md p-6 border border-border space-y-4">
        <h3 className="section-title">Most Popular & High-Margin Services</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {servicePopularity.slice(0, 6).map((srv, idx) => (
            <div key={idx} className="p-4 bg-muted rounded-md border border-border space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold text-sm text-foreground">{srv.serviceName}</div>
                  <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{srv.category}</span>
                </div>
                <span className="text-sm font-mono font-semibold px-2 py-0.5 rounded-full bg-card border border-border text-foreground">
                  #{idx + 1}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm pt-1 border-t border-border">
                <span className="text-muted-foreground">{srv.count} Times Sold</span>
                <span className="font-mono font-semibold num text-foreground">{srv.totalRevenue.toLocaleString()} ETB</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};