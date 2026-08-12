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
import { TrendingUp, Calendar, Award, Scissors, Building2, Filter } from 'lucide-react';
import { Staff, CommissionLog, VisitSession, Branch, BusinessUnit } from '../types';

interface StaffPerformanceDashboardProps {
  activeStaff: Staff;
  commissionLogs: CommissionLog[];
  visitSessions: VisitSession[];
  branches?: Branch[];
  businessUnits?: BusinessUnit[];
}

const COLORS = ['#18181b', '#c29a52', '#3a3a41', '#8b8b95', '#0ea5e9', '#b3a382', '#3b82f6'];

export const StaffPerformanceDashboard: React.FC<StaffPerformanceDashboardProps> = ({
  activeStaff,
  commissionLogs,
  visitSessions,
  branches = [],
  businessUnits = [],
}) => {
  const [timeRange, setTimeRange] = useState<'30days' | '14days' | '7days'>('30days');
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
  const daysCount = timeRange === '30days' ? 30 : timeRange === '14days' ? 14 : 7;
  const now = new Date();

  // Generate date buckets
  const performanceByDate: { [dateStr: string]: { date: string; earningsEtb: number; serviceCount: number } } = {};

  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateKey = d.toISOString().split('T')[0];
    const displayLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
    <div className="bg-card border border-border rounded-3xl p-6 space-y-6 shadow-sm font-sans">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-foreground" />
            <h3 className="text-lg font-serif font-bold text-foreground">Staff Performance & Earnings Analytics</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Visualize your 30-day commission trend, completed service volumes, and revenue breakdown.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          <div className="flex items-center space-x-1.5 bg-muted px-3 py-1.5 rounded-full border border-border">
            <Calendar className="w-3.5 h-3.5 text-foreground" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="bg-transparent text-foreground font-bold outline-none cursor-pointer text-xs"
            >
              <option value="30days">Last 30 Days</option>
              <option value="14days">Last 14 Days</option>
              <option value="7days">Last 7 Days</option>
            </select>
          </div>

          <div className="flex items-center space-x-1.5 bg-muted px-3 py-1.5 rounded-full border border-border">
            <Building2 className="w-3.5 h-3.5 text-foreground" />
            <select
              value={selectedBranchFilter}
              onChange={(e) => setSelectedBranchFilter(e.target.value)}
              className="bg-transparent text-foreground font-bold outline-none cursor-pointer text-xs"
            >
              <option value="all">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-1.5 bg-muted px-3 py-1.5 rounded-full border border-border">
            <Scissors className="w-3.5 h-3.5 text-foreground" />
            <select
              value={selectedUnitFilter}
              onChange={(e) => setSelectedUnitFilter(e.target.value)}
              className="bg-transparent text-foreground font-bold outline-none cursor-pointer text-xs"
            >
              <option value="all">All Business Units</option>
              {businessUnits.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-muted/60 border border-border rounded-2xl p-4">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">30-Day Period Earnings</div>
          <div className="text-2xl font-serif font-bold text-foreground mt-1">
            {totalCommissionsPeriod.toLocaleString()} <span className="text-xs font-sans text-foreground">ETB</span>
          </div>
          <div className="text-[10px] text-foreground font-bold mt-1">Active Commission Rules Applied</div>
        </div>

        <div className="bg-muted/60 border border-border rounded-2xl p-4">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Services Completed</div>
          <div className="text-2xl font-serif font-bold text-foreground mt-1">{totalServicesCompleted}</div>
          <div className="text-[10px] text-blue-700 font-bold mt-1">Visit Sessions Logged</div>
        </div>

        <div className="bg-muted/60 border border-border rounded-2xl p-4">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Avg Earnings / Service</div>
          <div className="text-2xl font-serif font-bold text-foreground mt-1">
            {avgEarningsPerService.toLocaleString()} <span className="text-xs font-sans text-foreground">ETB</span>
          </div>
          <div className="text-[10px] text-foreground font-bold mt-1">Efficiency Ratio</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Bar / Area Chart: Daily Earnings & Service Count */}
        <div className="lg:col-span-8 bg-muted/30 border border-border rounded-2xl p-5 space-y-3">
          <h4 className="font-serif font-bold text-foreground text-sm flex items-center justify-between">
            <span>Commission Earnings (ETB) & Completed Service Trend</span>
            <span className="text-xs font-sans text-muted-foreground font-normal">Recharts Interactive</span>
          </h4>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#efe8d9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#71717a' }} />
                <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#71717a' }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#71717a' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    color: '#f6f3ec',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar yAxisId="left" dataKey="earningsEtb" name="Commission (ETB)" fill="#18181b" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="serviceCount" name="Service Count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Side Donut Chart: Service Breakdown */}
        <div className="lg:col-span-4 bg-muted/30 border border-border rounded-2xl p-5 space-y-3">
          <h4 className="font-serif font-bold text-foreground text-sm">Service Category Distribution</h4>
          <div className="h-48 w-full flex items-center justify-center">
            {pieData.length === 0 ? (
              <div className="text-xs text-muted-foreground italic">No service data for period</div>
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
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="space-y-1 text-xs">
            {pieData.map((item, idx) => (
              <div key={item.name} className="flex items-center justify-between text-[11px] text-muted-foreground">
                <div className="flex items-center space-x-1.5 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                  ></span>
                  <span className="truncate">{item.name}</span>
                </div>
                <span className="font-bold text-foreground">{item.totalEtb.toLocaleString()} ETB</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
