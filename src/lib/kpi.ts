/**
 * Shared KPI / analytics helpers.
 *
 * Every dashboard computes money/queue/popularity figures; keeping the math
 * in one place prevents the same label from being calculated two different
 * ways in different views.
 */
import type { VisitSession, InventoryItem, CommissionLog, Service } from '../types';

/** Chart palette shared across dashboards. */
export const COLORS = ['#0d9488', '#0ea5e9', '#8b5cf6', '#f59e0b', '#ef4444', '#14b8a6'];

/** Sum of net totals for completed sessions. */
export function completedNetTotal(visits: VisitSession[]): number {
  return visits
    .filter((s) => s.status === 'completed')
    .reduce((acc, s) => acc + (s.netTotalEtb || 0), 0);
}

/** Completed revenue recorded on the given calendar day (UTC date string). */
export function revenueOn(referenceDate: IsoDay, visits: VisitSession[]): number {
  return visits
    .filter((s) => {
      if (s.status !== 'completed') return false;
      return (
        (s.completedAt && s.completedAt.startsWith(referenceDate)) ||
        (s.startedAt && s.startedAt.startsWith(referenceDate))
      );
    })
    .reduce((acc, s) => acc + (s.netTotalEtb || 0), 0);
}

export type IsoDay = string; // YYYY-MM-DD

/** Queue + in-service counts. */
export function activeQueue(visits: VisitSession[]): { queued: number; inProgress: number } {
  return visits.reduce(
    (acc, s) => {
      if (s.status === 'queued') acc.queued += 1;
      else if (s.status === 'in_progress') acc.inProgress += 1;
      return acc;
    },
    { queued: 0, inProgress: 0 }
  );
}

/** Completed-but-unpaid sessions (still owed money to the salon). */
export function unpaidCompleted(visits: VisitSession[]): VisitSession[] {
  return visits.filter((s) => s.status === 'completed' && !s.isPaid);
}

/** Inventory items sitting at or below their reorder point. */
export function lowStockItems(items: InventoryItem[]): InventoryItem[] {
  return items.filter((i) => i.currentStock <= i.reorderLevel);
}

export interface PaymentChannelRow {
  name: string;
  method: 'cash' | 'bank';
  amount: number;
  lines: number;
}

/** Aggregates payment-ledger rows (any shape carrying channel/method/amount/lines). */
export function channelTotals(payments: any[]): PaymentChannelRow[] {
  const map: Record<string, PaymentChannelRow> = {};
  (payments || []).forEach((p) => {
    const key = p.channel || 'Cash';
    map[key] = map[key] || { name: key, method: p.method === 'cash' ? 'cash' : 'bank', amount: 0, lines: 0 };
    map[key].amount += Number(p.amount || 0);
    map[key].lines += Number(p.lines || 0);
  });
  return Object.values(map).sort((a, b) => b.amount - a.amount);
}

export interface StaffAgg {
  staffId: string;
  staffName: string;
  role: string;
  servicesCompleted: number;
  revenueGenerated: number;
  commissionEarned: number;
}

/** Per-staff aggregation from completed visit sessions (client-side fallback). */
export function staffAggFromVisits(visits: VisitSession[], staffList: { id: string; name: string; role: string }[]): StaffAgg[] {
  const map: Record<string, StaffAgg> = {};
  visits
    .filter((s) => s.status === 'completed')
    .forEach((session) => {
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
}

/** Total commission earned across a set of logs. */
export function commissionSum(logs: CommissionLog[]): number {
  return logs.reduce((acc, l) => acc + l.commissionAmountEtb, 0);
}

export interface ServicePopularityRow {
  serviceId: string;
  serviceName: string;
  category: string;
  priceEtb: number;
  count: number;
  totalRevenue: number;
}

/** Most-performed/highest-revenue services from completed visits. */
export function servicePopularity(visits: VisitSession[], services: Service[]): ServicePopularityRow[] {
  const map: Record<string, ServicePopularityRow> = {};
  visits
    .filter((s) => s.status === 'completed')
    .forEach((session) => {
      session.services.forEach((srv) => {
        if (!map[srv.serviceId]) {
          const s = services.find((item) => item.id === srv.serviceId);
          map[srv.serviceId] = {
            serviceId: srv.serviceId,
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
}

/** Service-category revenue breakdown (drives the donut chart). */
export function categoryRevenue(visits: VisitSession[], services: Service[]) {
  const map: Record<string, number> = {};
  visits
    .filter((s) => s.status === 'completed')
    .forEach((session) => {
      session.services.forEach((srv) => {
        const matchingSrv = services.find((s) => s.id === srv.serviceId);
        const cat = matchingSrv?.category || 'General Services';
        map[cat] = (map[cat] || 0) + srv.priceEtb;
      });
    });
  return Object.keys(map).map((name) => ({ name, value: map[name] }));
}