import React, { useState, useEffect } from 'react';
import { Tv, Star } from 'lucide-react';
import { Company, Branch, VisitSession, BusinessUnit, Staff, Customer } from '../types';
import { getStaffQueue } from '../lib/queue';

interface QueueDisplayViewProps {
  company: Company;
  branch: Branch;
  visitSessions: VisitSession[];
  businessUnits?: BusinessUnit[];
  staffList?: Staff[];
  customers?: Customer[];
  onExitTvMode?: () => void;
  onRefresh?: () => Promise<void>;
}

export const QueueDisplayView: React.FC<QueueDisplayViewProps> = ({
  company,
  branch,
  visitSessions,
  businessUnits,
  staffList = [],
  customers = [],
  onExitTvMode,
  onRefresh,
}) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const poll = setInterval(() => onRefresh?.(), 10_000);
    return () => clearInterval(poll);
  }, [onRefresh]);

  const branchStaff = staffList.filter((s) => s.branchId === branch.id && s.role !== 'receptionist');
  const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const maskPhone = (phone: string): string => {
    const digits = (phone || '').replace(/\D/g, '');
    if (digits.length < 7) return '****';
    if (digits.startsWith('251') && digits.length >= 12) {
      return `+${digits.slice(0, 6)}***${digits.slice(-3)}`;
    }
    return `${digits.slice(0, 3)}***${digits.slice(-3)}`;
  };

  const unitNameFor = (staff: Staff): string => {
    const bu = (businessUnits || []).find((u) => u.id === staff.businessUnitId);
    return bu ? bu.name : staff.role;
  };

  const staffBoards = branchStaff
    .map((staff) => {
      const queue = getStaffQueue(staff.id, visitSessions, customers);
      const serving = queue.find((q) => q.service.status === 'in_progress');
      const next = queue.find((q) => q.available);
      return { staff, serving, next, count: queue.length };
    })
    .filter((b) => b.serving || b.next);

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex flex-col font-sans select-none">
      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">{company.name}</h1>
          <p className="text-sm text-white/50">{branch.name}</p>
        </div>
        <div className="flex items-center gap-6 text-white/60">
          <span className="text-4xl font-mono font-light">{timeStr}</span>
          {onExitTvMode && (
            <button onClick={onExitTvMode} className="text-white/40 hover:text-white/70 transition-colors">
              <Tv className="size-5" />
            </button>
          )}
        </div>
      </div>

      {/* Per-staff boards */}
      <div className="flex-1 p-8">
        {staffBoards.length === 0 ? (
          <p className="text-white/20 text-lg flex items-center justify-center h-full">No active queue</p>
        ) : (
          <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(320px, 1fr))` }}>
            {staffBoards.map(({ staff, serving, next }) => (
              <div key={staff.id} className="rounded-md bg-white/[0.04] border border-white/[0.08] p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-medium">{staff.name}</h2>
                  <span className="text-sm uppercase tracking-widest text-white/40">{staff.role}</span>
                </div>

                {/* Now serving */}
                <div className="mb-4">
                  <p className="text-[11px] uppercase tracking-widest text-amber-400/70 mb-2">Now Serving</p>
                  {serving ? (
                    <div className="rounded-md bg-amber-500/10 border border-amber-500/20 p-3">
                      <div className="flex items-center gap-2">
                        {serving.isVip && <Star className="size-4 text-amber-400 fill-amber-400" />}
                        <span className="text-xl font-medium font-mono">{maskPhone(serving.session.customerPhone)}</span>
                      </div>
                      <p className="text-sm text-white/60 mt-1">{serving.service.serviceName}</p>
                      <p className="text-xs text-amber-400/80 mt-0.5">Go to: {unitNameFor(staff)}</p>
                    </div>
                  ) : (
                    <p className="text-white/20 text-sm">—</p>
                  )}
                </div>

                {/* Next up */}
                <div>
                  <p className="text-[11px] uppercase tracking-widest text-white/40 mb-2">Next Up</p>
                  {next ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      {next.isVip && <Star className="size-4 text-amber-400 fill-amber-400" />}
                      <span className="text-base font-semibold text-white/80 font-mono">{maskPhone(next.session.customerPhone)}</span>
                      <span className="text-sm text-white/40">· {next.service.serviceName}</span>
                      <span className="text-xs text-white/50">→ {unitNameFor(staff)}</span>
                    </div>
                  ) : (
                    <p className="text-white/20 text-sm">—</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
