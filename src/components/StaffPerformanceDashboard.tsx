import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { TrendingUp, Calendar, CalendarDays, Scissors, Building2 } from 'lucide-react';
import { Staff, CommissionLog, VisitSession, Branch, BusinessUnit } from '../types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

interface StaffPerformanceDashboardProps {
  activeStaff: Staff;
  commissionLogs: CommissionLog[];
  visitSessions: VisitSession[];
  branches?: Branch[];
  businessUnits?: BusinessUnit[];
}

const COLORS = ['#0d9488', '#0ea5e9', '#8b5cf6', '#f59e0b', '#ef4444', '#14b8a6', '#0d9488'];

export const StaffPerformanceDashboard: React.FC<StaffPerformanceDashboardProps> = ({
  activeStaff,
  commissionLogs,
  visitSessions,
  branches = [],
  businessUnits = [],
}) => {
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('day');
  const [customDate, setCustomDate] = useState<string>('');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('all');
  const [selectedUnitFilter, setSelectedUnitFilter] = useState<string>('all');

  // Filter logs for this staff member
  const staffLogs = commissionLogs.filter((log) => {
    if (log.staffId !== activeStaff.id) return false;
    if (selectedBranchFilter !== 'all' && log.branchId !== selectedBranchFilter) return false;
    if (selectedUnitFilter !== 'all' && log.businessUnitId !== selectedUnitFilter) return false;
    return true;
  });

  // Calculate earnings by date over the selected range
  const daysCount = timeRange === 'month' ? 30 : timeRange === 'week' ? 7 : 1;
  const anchor = customDate ? new Date(`${customDate}T12:00:00`) : new Date();
  const todayKey = new Date().toISOString().split('T')[0];
  const periodLabel = customDate
    ? `Earnings for ${anchor.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`
    : timeRange === 'day'
      ? "Today's Earnings"
      : timeRange === 'week'
        ? 'Weekly Earnings'
        : 'Monthly Earnings';

  // Generate date buckets
  const performanceByDate: { [dateStr: string]: { date: string; earningsEtb: number; serviceCount: number } } = {};

  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(anchor);
    d.setDate(anchor.getDate() - i);
    const dateKey = d.toISOString().split('T')[0];
    const isToday = dateKey === todayKey;
    const displayLabel = isToday ? 'Today' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    performanceByDate[dateKey] = {
      date: displayLabel,
      earningsEtb: 0,
      serviceCount: 0,
    };
  }

  // Populate data
  staffLogs.forEach((log) => {
    const logDateKey = log.createdAt.split('T')[0];
    if (performanceByDate[logDateKey]) {
      performanceByDate[logDateKey].earningsEtb += log.commissionAmountEtb;
      performanceByDate[logDateKey].serviceCount += 1;
    }
  });

  const chartData = Object.values(performanceByDate);

  // Service breakdown by category
  const serviceCategoryBreakdown: { [category: string]: { name: string; count: number; totalEtb: number } } = {};
  staffLogs.forEach((log) => {
    const cat = log.serviceName || 'General Service';
    if (!serviceCategoryBreakdown[cat]) {
      serviceCategoryBreakdown[cat] = { name: cat, count: 0, totalEtb: 0 };
    }
    serviceCategoryBreakdown[cat].count += 1;
    serviceCategoryBreakdown[cat].totalEtb += log.commissionAmountEtb;
  });

  const pieData = Object.values(serviceCategoryBreakdown);

  const totalCommissionsPeriod = staffLogs.reduce((acc, l) => acc + l.commissionAmountEtb, 0);
  const totalServicesCompleted = staffLogs.length;
  const avgEarningsPerService =
    totalServicesCompleted > 0 ? Math.round(totalCommissionsPeriod / totalServicesCompleted) : 0;

  return (
    <div className="bg-card border border-border rounded-md p-5 space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-foreground" />
            <h3 className="text-lg font-semibold tracking-tight text-foreground">Staff Performance & Earnings Analytics</h3>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Visualize the daily, weekly, or monthly commission trend, completed service volumes, and revenue breakdown.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center flex-wrap gap-2 text-sm">
          <div className="flex items-center space-x-1.5 bg-muted px-3 py-1.5 rounded-full border border-border">
            <Calendar className="w-3.5 h-3.5 text-foreground" />
            <Select value={timeRange} onValueChange={(v) => { setTimeRange(v as any); setCustomDate(''); }}>
              <SelectTrigger className="h-6 gap-1 border-0 bg-transparent p-0 text-sm font-semibold text-foreground focus:ring-0 focus-visible:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Today (1 Day)</SelectItem>
                <SelectItem value="week">Last 7 Days (Weekly)</SelectItem>
                <SelectItem value="month">Last 30 Days (Monthly)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-1.5 bg-muted px-3 py-1.5 rounded-full border border-border">
            <CalendarDays className="w-3.5 h-3.5 text-foreground" />
            <input
              type="date"
              value={customDate}
              max={todayKey}
              onChange={(e) => { setCustomDate(e.target.value); setTimeRange('day'); }}
              className="bg-transparent border-0 p-0 text-sm font-semibold text-foreground outline-none focus:ring-0"
              title="Show earnings for a specific day"
            />
          </div>

          <div className="flex items-center space-x-1.5 bg-muted px-3 py-1.5 rounded-full border border-border">
            <Building2 className="w-3.5 h-3.5 text-foreground" />
            <Select value={selectedBranchFilter} onValueChange={(v) => setSelectedBranchFilter(v)}>
              <SelectTrigger className="h-6 gap-1 border-0 bg-transparent p-0 text-sm font-semibold text-foreground focus:ring-0 focus-visible:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-1.5 bg-muted px-3 py-1.5 rounded-full border border-border">
            <Scissors className="w-3.5 h-3.5 text-foreground" />
            <Select value={selectedUnitFilter} onValueChange={(v) => setSelectedUnitFilter(v)}>
              <SelectTrigger className="h-6 gap-1 border-0 bg-transparent p-0 text-sm font-semibold text-foreground focus:ring-0 focus-visible:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Business Units</SelectItem>
                {businessUnits.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* KPI Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-muted/60 border border-border rounded-md p-4">
          <div className="flex items-center justify-between">
            <div className="kpi-label mb-1.5">{periodLabel}</div>
            <div className="w-7 h-7 rounded-md bg-primary/10 text-primary flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="kpi-value">
            {totalCommissionsPeriod.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">ETB</span>
          </div>
          <div className="text-sm text-muted-foreground mt-1.5">Active Commission Rules Applied</div>
        </div>

        <div className="bg-muted/60 border border-border rounded-md p-4">
          <div className="flex items-center justify-between">
            <div className="kpi-label mb-1.5">Services Completed</div>
            <div className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900">
              <Scissors className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="kpi-value">{totalServicesCompleted}</div>
          <div className="text-sm text-muted-foreground mt-1.5">Visit Sessions Logged</div>
        </div>

        <div className="bg-muted/60 border border-border rounded-md p-4">
          <div className="flex items-center justify-between">
            <div className="kpi-label mb-1.5">Avg Earnings / Service</div>
            <div className="w-7 h-7 rounded-md bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-900">
              <Calendar className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="kpi-value">
            {avgEarningsPerService.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">ETB</span>
          </div>
          <div className="text-sm text-muted-foreground mt-1.5">Efficiency Ratio</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Bar / Area Chart: Daily Earnings & Service Count */}
        <div className="lg:col-span-8 bg-muted/30 border border-border rounded-md p-4 space-y-3">
          <h4 className="section-title flex items-center justify-between">
            <span>Commission Earnings (ETB) & Completed Service Trend</span>
            <span className="text-sm font-normal text-muted-foreground">Recharts Interactive</span>
          </h4>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#71717a' }} />
                <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#71717a' }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#71717a' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    color: '#fafafa',
                    borderRadius: '2px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar yAxisId="left" dataKey="earningsEtb" name="Commission (ETB)" fill="#0d9488" radius={[2, 2, 0, 0]} />
                <Bar yAxisId="right" dataKey="serviceCount" name="Service Count" fill="#0ea5e9" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Side Donut Chart: Service Breakdown */}
        <div className="lg:col-span-4 bg-muted/30 border border-border rounded-md p-4 space-y-3">
          <h4 className="section-title">Service Category Distribution</h4>
          <div className="h-48 w-full flex items-center justify-center">
            {pieData.length === 0 ? (
              <div className="text-sm text-muted-foreground italic">No service data for period</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="totalEtb"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      color: '#fff',
                      borderRadius: '2px',
                      fontSize: '11px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="space-y-1 text-sm">
            {pieData.map((item, idx) => (
              <div key={item.name} className="flex items-center justify-between text-[11px] text-muted-foreground">
                <div className="flex items-center space-x-1.5 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                  ></span>
                  <span className="truncate">{item.name}</span>
                </div>
                <span className="font-semibold text-foreground tabular-nums">{item.totalEtb.toLocaleString()} ETB</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
