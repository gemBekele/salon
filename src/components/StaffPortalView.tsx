import React, { useState } from 'react';
import {
  UserCheck2,
  DollarSign,
  Scissors,
  CheckCircle,
  Send,
  Calendar,
  Clock,
  Award,
  Wallet,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { Staff, CommissionLog, VisitSession, Branch, BusinessUnit } from '../types';
import { StaffPerformanceDashboard } from './StaffPerformanceDashboard';

interface StaffPortalViewProps {
  staffList: Staff[];
  commissionLogs: CommissionLog[];
  visitSessions: VisitSession[];
  branches?: Branch[];
  businessUnits?: BusinessUnit[];
}

export const StaffPortalView: React.FC<StaffPortalViewProps> = ({
  staffList,
  commissionLogs,
  visitSessions,
  branches = [],
  businessUnits = [],
}) => {
  const [selectedStaffId, setSelectedStaffId] = useState<string>(staffList[0]?.id || '');
  const [payoutRequested, setPayoutRequested] = useState(false);

  const activeStaff = staffList.find((s) => s.id === selectedStaffId) || staffList[0];

  const staffCommissions = commissionLogs.filter((c) => c.staffId === activeStaff.id);
  const totalEarnedCommissions = staffCommissions.reduce((acc, c) => acc + c.commissionAmountEtb, 0);

  const unpaidCommissions = staffCommissions
    .filter((c) => c.payoutStatus === 'unpaid')
    .reduce((acc, c) => acc + c.commissionAmountEtb, 0);

  const paidCommissions = staffCommissions
    .filter((c) => c.payoutStatus === 'paid')
    .reduce((acc, c) => acc + c.commissionAmountEtb, 0);

  const handleRequestPayout = () => {
    setPayoutRequested(true);
    setTimeout(() => setPayoutRequested(false), 4000);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Staff Switcher & Banner */}
      <div className="bg-[#5A5A40] text-white border border-[#4a4a35] rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#f5f5f0]/15 text-[#f5f5f0] border border-[#f5f5f0]/30 uppercase tracking-widest">
              Personal Staff Member Portal
            </span>
            <span className="text-[#f5f5f0]/80 text-xs">{activeStaff.name}</span>
          </div>
          <h2 className="text-2xl font-serif font-light mt-1 text-[#f5f5f0]">Daily Earnings & Commission Ledger</h2>
          <p className="text-[#f5f5f0]/80 text-xs mt-0.5">
            Track your completed client sessions, earned commissions per service, tips, and request payout transfers to Telebirr or CBE Birr.
          </p>
        </div>

        {/* Staff Persona Selector */}
        <div className="bg-[#f5f5f0] p-3 rounded-2xl border border-[#e5e5d1] text-xs text-[#2d2d2a]">
          <label className="block text-[10px] text-[#737366] font-bold uppercase tracking-wider mb-1">Switch Staff Persona:</label>
          <select
            value={selectedStaffId}
            onChange={(e) => setSelectedStaffId(e.target.value)}
            className="bg-white text-[#2d2d2a] font-bold rounded-xl px-3 py-1.5 outline-none cursor-pointer text-xs border border-[#e5e5d1]"
          >
            {staffList.map((st) => (
              <option key={st.id} value={st.id}>
                {st.name} ({st.role}) — {st.defaultCommissionPercentage}% Rate
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#e5e5d1] rounded-3xl p-5 shadow-sm">
          <div className="text-[#737366] text-xs font-bold uppercase tracking-wider flex items-center justify-between">
            <span>Total Earned Commissions</span>
            <DollarSign className="w-4 h-4 text-[#5A5A40]" />
          </div>
          <div className="text-2xl font-serif font-bold text-[#2d2d2a] mt-2">
            {totalEarnedCommissions.toLocaleString()} <span className="text-xs text-[#5A5A40] font-sans font-normal">ETB</span>
          </div>
          <div className="text-xs text-emerald-700 mt-2 font-medium">Auto-calculated from completed services</div>
        </div>

        <div className="bg-white border border-[#e5e5d1] rounded-3xl p-5 shadow-sm">
          <div className="text-[#737366] text-xs font-bold uppercase tracking-wider flex items-center justify-between">
            <span>Unpaid Payout Balance</span>
            <Wallet className="w-4 h-4 text-amber-800" />
          </div>
          <div className="text-2xl font-serif font-bold text-amber-800 mt-2">
            {unpaidCommissions.toLocaleString()} <span className="text-xs text-[#737366] font-sans font-normal">ETB</span>
          </div>
          <div className="text-xs text-[#737366] mt-2">Ready for withdrawal request</div>
        </div>

        <div className="bg-white border border-[#e5e5d1] rounded-3xl p-5 shadow-sm">
          <div className="text-[#737366] text-xs font-bold uppercase tracking-wider flex items-center justify-between">
            <span>Paid Commissions</span>
            <CheckCircle className="w-4 h-4 text-[#5A5A40]" />
          </div>
          <div className="text-2xl font-serif font-bold text-[#2d2d2a] mt-2">
            {paidCommissions.toLocaleString()} <span className="text-xs text-[#737366] font-sans font-normal">ETB</span>
          </div>
          <div className="text-xs text-emerald-700 mt-2 font-medium">Dispatched via Telebirr/CBE</div>
        </div>
      </div>

      {/* Payout Request Card */}
      <div className="bg-white border border-[#e5e5d1] rounded-3xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <h3 className="text-base font-serif font-bold text-[#2d2d2a] flex items-center space-x-2">
            <Wallet className="w-4 h-4 text-[#5A5A40]" />
            <span>Commission Payout Schedule</span>
          </h3>
          <p className="text-xs text-[#737366] mt-1">
            Current balance: <strong className="text-emerald-700">{unpaidCommissions} ETB</strong>. Default payout rule: <span className="text-[#5A5A40] font-semibold">{activeStaff.defaultCommissionPercentage}% Standard Rate</span>.
          </p>
        </div>

        <button
          onClick={handleRequestPayout}
          disabled={unpaidCommissions === 0}
          className="px-5 py-2.5 bg-[#5A5A40] hover:bg-[#4a4a35] text-white font-bold rounded-full text-xs shadow-sm disabled:opacity-50 cursor-pointer flex items-center space-x-2"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Request Payout Transfer ({unpaidCommissions} ETB)</span>
        </button>
      </div>

      {payoutRequested && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-xs text-emerald-800 font-semibold flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-emerald-700" />
          <span>Payout request of {unpaidCommissions} ETB submitted to salon management!</span>
        </div>
      )}

      {/* Recharts Analytics Dashboard */}
      <StaffPerformanceDashboard
        activeStaff={activeStaff}
        commissionLogs={commissionLogs}
        visitSessions={visitSessions}
        branches={branches}
        businessUnits={businessUnits}
      />

      {/* Commission Breakdown Table */}
      <div className="bg-white border border-[#e5e5d1] rounded-3xl p-6 shadow-sm">
        <h3 className="text-lg font-serif font-bold text-[#2d2d2a] mb-3">Service Commission History</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#2d2d2a]">
            <thead className="bg-[#f5f5f0] text-[#737366] uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3 rounded-l-xl">Service Name</th>
                <th className="px-4 py-3">Session Price</th>
                <th className="px-4 py-3">Commission Earned</th>
                <th className="px-4 py-3">Applied Rule</th>
                <th className="px-4 py-3">Payout Status</th>
                <th className="px-4 py-3 rounded-r-xl">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e5d1]">
              {staffCommissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-[#737366]">
                    No commission logs found for {activeStaff.name}.
                  </td>
                </tr>
              ) : (
                staffCommissions.map((log) => (
                  <tr key={log.id} className="hover:bg-[#f5f5f0]/60">
                    <td className="px-4 py-3 font-bold text-[#2d2d2a]">{log.serviceName}</td>
                    <td className="px-4 py-3 text-[#737366]">{log.servicePriceEtb} ETB</td>
                    <td className="px-4 py-3 text-emerald-700 font-bold">{log.commissionAmountEtb} ETB</td>
                    <td className="px-4 py-3 text-[#737366]">{log.ruleApplied}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        log.payoutStatus === 'paid' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                        log.payoutStatus === 'payout_requested' ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-[#f5f5f0] text-[#737366] border border-[#e5e5d1]'
                      }`}>
                        {log.payoutStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#737366]">{log.createdAt.split('T')[0]}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
