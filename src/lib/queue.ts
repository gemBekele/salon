import { VisitSession, Customer, SessionServiceItem } from '../types';

/** A single service item positioned in one staff's queue. */
export interface QueueItem {
  service: SessionServiceItem;
  session: VisitSession;
  isVip: boolean;
  /** 1-based position in this staff's queue, by (VIP desc, check-in time asc). */
  position: number;
  /** The client can be served right now (not already being served elsewhere). */
  available: boolean;
}

/**
 * A client is "available" at a given service when that service is still pending
 * AND no sibling service in the same session is currently in progress (one
 * person can only be at one station at a time).
 */
function isServiceAvailable(session: VisitSession, service: SessionServiceItem): boolean {
  if (service.status !== 'pending') return false;
  const busyElsewhere = session.services.some(
    (s) => s.id !== service.id && s.status === 'in_progress'
  );
  return !busyElsewhere;
}

function checkInTime(session: VisitSession): number {
  return new Date(session.createdAt || session.startedAt || 0).getTime();
}

/**
 * Compute one staff member's ordered queue.
 *
 * - Includes services assigned to this staff whose status is pending/in_progress
 *   on sessions that are not completed/cancelled/paid.
 * - Ordered by VIP first, then check-in (created_at) time.
 * - `available` marks who can actually be served now.
 */
export function getStaffQueue(
  staffId: string,
  visitSessions: VisitSession[],
  customers: Customer[]
): QueueItem[] {
  const vipById = new Map(customers.map((c) => [c.id, c.isVip]));

  const items: QueueItem[] = [];
  for (const session of visitSessions) {
    if (session.status === 'completed' || session.status === 'cancelled' || session.isPaid) continue;
    for (const service of session.services) {
      if (service.staffId !== staffId) continue;
      if (service.status !== 'pending' && service.status !== 'in_progress') continue;
      items.push({
        service,
        session,
        isVip: vipById.get(session.customerId) || false,
        position: 0,
        available: isServiceAvailable(session, service),
      });
    }
  }

  items.sort((a, b) => {
    if (a.isVip !== b.isVip) return a.isVip ? -1 : 1;
    const ta = checkInTime(a.session);
    const tb = checkInTime(b.session);
    if (ta !== tb) return ta - tb;
    const sa = a.service.createdAt ? new Date(a.service.createdAt).getTime() : 0;
    const sb = b.service.createdAt ? new Date(b.service.createdAt).getTime() : 0;
    return sa - sb;
  });

  items.forEach((it, idx) => (it.position = idx + 1));
  return items;
}

/** The first available (servable) item in a staff's queue, if any. */
export function nextAvailable(
  staffId: string,
  visitSessions: VisitSession[],
  customers: Customer[]
): QueueItem | null {
  return getStaffQueue(staffId, visitSessions, customers).find((i) => i.available) || null;
}

/** A customer grouped in a staff queue: one row per person, with all their services. */
export interface GroupedQueueItem {
  session: VisitSession;
  isVip: boolean;
  /** 1-based position in this staff's queue. */
  position: number;
  /** Services for this customer assigned to the staff. */
  services: SessionServiceItem[];
  /** The customer can be served right now (any service ready & not busy elsewhere). */
  available: boolean;
  /** At least one of this customer's services is in progress. */
  inProgress: boolean;
}

/**
 * Group one staff's queue by customer / session, so a person with several
 * services appears once with all their services stacked underneath. The board
 * and TV then show people (queue numbers) instead of individual services.
 */
export function groupStaffQueue(
  staffId: string,
  visitSessions: VisitSession[],
  customers: Customer[]
): GroupedQueueItem[] {
  const flat = getStaffQueue(staffId, visitSessions, customers);
  const groups = new Map<string, GroupedQueueItem>();
  for (const item of flat) {
    const g = groups.get(item.session.id);
    if (g) {
      g.services.push(item.service);
      g.available = g.available || item.available;
      g.inProgress = g.inProgress || item.service.status === 'in_progress';
    } else {
      groups.set(item.session.id, {
        session: item.session,
        isVip: item.isVip,
        position: 0,
        services: [item.service],
        available: item.available,
        inProgress: item.service.status === 'in_progress',
      });
    }
  }
  const ordered = [...groups.values()];
  ordered.forEach((g, idx) => (g.position = idx + 1));
  return ordered;
}

/** Suggest the staff with the shortest queue for a service's business unit. */
export function suggestStaff(
  candidates: { id: string; name: string; businessUnitId: string; role: string }[],
  businessUnitId: string,
  visitSessions: VisitSession[],
  customers: Customer[]
): { id: string; name: string } | null {
  const inUnit = candidates.filter(
    (s) => s.businessUnitId === businessUnitId && !['receptionist', 'reception'].includes(s.role)
  );
  if (inUnit.length === 0) return null;
  let best = inUnit[0];
  let bestLoad = getStaffQueue(best.id, visitSessions, customers).length;
  for (const st of inUnit.slice(1)) {
    const load = getStaffQueue(st.id, visitSessions, customers).length;
    if (load < bestLoad) {
      best = st;
      bestLoad = load;
    }
  }
  return { id: best.id, name: best.name };
}
