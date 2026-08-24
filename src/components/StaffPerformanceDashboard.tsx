import React, { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Scissors, TrendingUp } from 'lucide-react';
import { Staff, CommissionLog } from '../types';
import { cn } from '../lib/utils';

interface StaffPerformanceDashboardProps {
  activeStaff: Staff;
  commissionLogs: CommissionLog[];
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * Month calendar showing this staff member's commission earnings per day.
 * Click a day to see the services behind that number.
 */
export const StaffPerformanceDashboard: React.FC<StaffPerformanceDashboardProps> = ({
  activeStaff,
  commissionLogs,
}) => {
  const today = new Date();
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selectedDay, setSelectedDay] = useState<string>(dateKey(today));

  // Earnings per day for the active staff member
  const logsByDay = useMemo(() => {
    const map = new Map<string, CommissionLog[]>();
    commissionLogs
      .filter((l) => l.staffId === activeStaff.id)
      .forEach((log) => {
        const key = (log.createdAt || '').slice(0, 10);
        if (!key) return;
        const list = map.get(key);
        if (list) list.push(log);
        else map.set(key, [log]);
      });
    return map;
  }, [commissionLogs, activeStaff.id]);

  const dayTotal = (logs: CommissionLog[] | undefined) =>
    (logs || []).reduce((a, l) => a + l.commissionAmountEtb, 0);

  // Build the month grid: leading blanks + one cell per day
  const firstOfMonth = new Date(cursor.year, cursor.month, 1);
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const leadBlanks = firstOfMonth.getDay();
  const cells: (string | null)[] = [
    ...Array.from({ length: leadBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => dateKey(new Date(cursor.year, cursor.month, i + 1))),
  ];

  const monthTotals = useMemo(() => {
    let earnings = 0;
    let services = 0;
    let bestDay: { key: string; amount: number } | null = null;
    for (const [key, logs] of logsByDay) {
      if (!key.startsWith(`${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}`)) continue;
      const amount = dayTotal(logs);
      earnings += amount;
      services += logs.length;
      if (!bestDay || amount > bestDay.amount) bestDay = { key, amount };
    }
    return { earnings, services, bestDay };
  }, [logsByDay, cursor]);

  const maxDayAmount = useMemo(() => {
    let max = 0;
    for (const [key, logs] of logsByDay) {
      if (!key.startsWith(`${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}`)) continue;
      max = Math.max(max, dayTotal(logs));
    }
    return max;
  }, [logsByDay, cursor]);

  const selectedLogs = logsByDay.get(selectedDay) || [];
  const selectedLabel = new Date(`${selectedDay}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const moveMonth = (delta: number) => {
    setCursor((c) => {
      const m = c.month + delta;
      if (m < 0) return { year: c.year - 1, month: 11 };
      if (m > 11) return { year: c.year + 1, month: 0 };
      return { ...c, month: m };
    });
  };

  const intensity = (amount: number) => {
    if (amount <= 0) return '';
    const ratio = maxDayAmount > 0 ? amount / maxDayAmount : 0;
    if (ratio > 0.66) return 'bg-primary text-primary-foreground';
    if (ratio > 0.33) return 'bg-primary/20 text-foreground';
    return 'bg-primary/10 text-foreground';
  };

  return (
    <div className="bg-card border border-border rounded-md p-4 sm:p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="section-title flex items-center gap-2">
            <CalendarDays className="size-4" />
            Earnings Calendar
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">Commission earned each day — tap a day for details</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => moveMonth(-1)}
            className="size-8 rounded-md border border-border flex items-center justify-center hover:bg-muted"
            aria-label="Previous month"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="text-sm font-semibold text-foreground min-w-[120px] text-center">
            {MONTHS[cursor.month]} {cursor.year}
          </span>
          <button
            type="button"
            onClick={() => moveMonth(1)}
            className="size-8 rounded-md border border-border flex items-center justify-center hover:bg-muted"
            aria-label="Next month"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {/* Month summary strip */}
      <div className="grid grid-cols-3 gap-px bg-border border border-border rounded-md overflow-hidden">
        <div className="bg-card px-3 py-2.5">
          <p className="kpi-label mb-0.5">This Month</p>
          <p className="text-base font-bold tabular-nums">{monthTotals.earnings.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">ETB</span></p>
        </div>
        <div className="bg-card px-3 py-2.5">
          <p className="kpi-label mb-0.5">Services</p>
          <p className="text-base font-bold tabular-nums">{monthTotals.services}</p>
        </div>
        <div className="bg-card px-3 py-2.5 min-w-0">
          <p className="kpi-label mb-0.5">Best Day</p>
          {monthTotals.bestDay ? (
            <p className="text-base font-bold tabular-nums truncate">
              {monthTotals.bestDay.amount.toLocaleString()} <span className="text-[10px] font-normal text-muted-foreground">ETB · {monthTotals.bestDay.key.slice(8)}</span>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">—</p>
          )}
        </div>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-[10px] font-bold uppercase tracking-wide text-muted-foreground py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((key, i) => {
          if (!key) return <div key={`b${i}`} />;
          const logs = logsByDay.get(key);
          const amount = dayTotal(logs);
          const dayNum = Number(key.slice(8));
          const isToday = key === dateKey(today);
          const isSelected = key === selectedDay;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedDay(key)}
              className={cn(
                'rounded-md border min-h-[56px] sm:min-h-[64px] p-1 flex flex-col items-center justify-start gap-0.5 transition-colors',
                amount > 0 ? `border-transparent ${intensity(amount)}` : 'border-border bg-background',
                isSelected && 'ring-2 ring-primary ring-offset-1 ring-offset-card',
                isToday && !isSelected && 'border-primary/60'
              )}
            >
              <span className={cn('text-[10px] font-semibold', isToday && 'underline underline-offset-2')}>{dayNum}</span>
              {logs && logs.length > 0 && (
                <>
                  <span className="text-[11px] sm:text-xs font-bold tabular-nums leading-none">{amount.toLocaleString()}</span>
                  <span className="text-[8px] opacity-70 leading-none">{logs.length} svc</span>
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day detail */}
      <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2">
        <p className="text-sm font-semibold text-foreground">{selectedLabel}</p>
        {selectedLogs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No commissions recorded on this day.</p>
        ) : (
          <div className="divide-y divide-border">
            {selectedLogs.map((l) => (
              <div key={l.id} className="py-1.5 flex items-center justify-between gap-2">
                <div className="min-w-0 flex items-center gap-2">
                  <Scissors className="size-3.5 text-muted-foreground shrink-0" />
                  <span className="text-sm text-foreground truncate">{l.serviceName}</span>
                  <span className="text-[11px] text-muted-foreground shrink-0">from {l.servicePriceEtb.toLocaleString()} ETB</span>
                </div>
                <span className="text-sm font-bold text-primary tabular-nums shrink-0">+{l.commissionAmountEtb.toLocaleString()} ETB</span>
              </div>
            ))}
            <div className="pt-1.5 flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Day total</span>
              <span className="text-sm font-bold tabular-nums"><TrendingUp className="size-3.5 inline mr-1 -mt-0.5" />{dayTotal(selectedLogs).toLocaleString()} ETB</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
