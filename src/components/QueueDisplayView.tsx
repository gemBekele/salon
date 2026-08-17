import React, { useState, useEffect } from 'react';
import { Tv, Star, Users } from 'lucide-react';
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
      const next = queue.filter((q) => q.available);
      return { staff, serving, next, count: queue.length };
    })
    .filter((b) => b.serving || b.next.length > 0);

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex flex-col font-sans select-none">
      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{company.name}</h1>
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
          <div className="grid gap-6 items-start justify-items-center" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(340px, 1fr))` }}>
            {staffBoards.map(({ staff, serving, next }) => (
              <div key={staff.id} className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] p-6 flex flex-col items-center text-center">
                <div className="mb-5 text-center">
                  <h2 className="text-xl font-bold">{staff.name}</h2>
                  <span className="text-xs font-medium uppercase tracking-widest text-white/40">{staff.role}</span>
                </div>

                {/* Now serving */}
                <div className="w-full mb-5">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-amber-400/80 mb-2">Now Serving</p>
                  {serving ? (
                    <div className="rounded-lg bg-amber-500/10 border-2 border-amber-500/30 px-4 py-4 flex flex-col items-center gap-1.5">
                      <div className="flex items-center gap-2">
                        {serving.isVip && <Star className="size-5 text-amber-400 fill-amber-400" />}
                        <span className="text-2xl font-bold font-mono tracking-wide">{maskPhone(serving.session.customerPhone)}</span>
                      </div>
                      <p className="text-sm font-semibold text-white/70">{serving.service.serviceName}</p>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/40 px-3 py-1 text-sm font-bold text-emerald-300">
                        Go to {unitNameFor(staff)}
                      </span>
                    </div>
                  ) : (
                    <p className="text-white/20 text-sm">—</p>
                  )}
                </div>

                {/* Next up */}
                <div className="w-full flex-1">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-white/40 mb-2">Next Up</p>
                  {next.length === 0 ? (
                    <p className="text-white/20 text-sm">—</p>
                  ) : (
                    <ul className="space-y-2">
                      {next.slice(0, 3).map((q) => (
                        <li key={q.service.id} className="flex items-center justify-center gap-3 rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2.5">
                          <span className="text-sm font-bold text-white/40">#{q.position}</span>
                          {q.isVip && <Star className="size-4 text-amber-400 fill-amber-400" />}
                          <span className="text-lg font-bold font-mono tracking-wide">{maskPhone(q.session.customerPhone)}</span>
                          <span className="text-xs font-semibold text-white/40">· {q.service.serviceName}</span>
                        </li>
                      ))}
                      {next.length > 3 && (
                        <li className="text-sm font-semibold text-white/40 pt-1">
                          <Users className="size-4 inline mr-1 -mt-0.5" />+{next.length - 3} more
                        </li>
                      )}
                    </ul>
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
