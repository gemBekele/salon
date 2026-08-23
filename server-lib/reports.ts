import { Router, Request, Response } from 'express';
import type { DbPool } from './db';
import { authenticate, asyncHandler } from './middleware';

/**
 * Company resolution: super admins may view any tenant (or all), other roles
 * are locked to their own company_id.
 */
function resolveCompanyId(req: Request): string | null {
  const user = req.user!;
  if (user.role === 'super_admin') {
    const q = req.query.companyId;
    return typeof q === 'string' && q ? q : null;
  }
  return user.companyId;
}

/**
 * Report read tiers:
 *  - staff (PIN sessions): no report access at all.
 *  - reception: today's data only — any explicit range beyond today is rejected.
 *  - owner/manager/super_admin: full history.
 */
function guardReportAccess(req: Request, res: Response): boolean {
  const role = req.user!.role || 'staff';
  if (!['super_admin', 'owner', 'manager', 'reception'].includes(role)) {
    res.status(403).json({ error: 'You do not have permission to perform this action' });
    return false;
  }
  if (role === 'reception') {
    const today = new Date().toISOString().slice(0, 10);
    const rawFrom = typeof req.query.from === 'string' ? req.query.from.slice(0, 10) : null;
    const rawTo = typeof req.query.to === 'string' ? req.query.to.slice(0, 10) : null;
    const rawDate = typeof req.query.date === 'string' ? req.query.date.slice(0, 10) : null;
    // Missing ranges are pinned to today; explicit non-today ranges are rejected.
    if ((rawFrom && rawFrom !== today) || (rawTo && rawTo !== today)) {
      res.status(403).json({ error: 'Reception access is limited to today\'s reports' });
      return false;
    }
    if (rawDate && rawDate !== today) {
      res.status(403).json({ error: 'Reception access is limited to today\'s reports' });
      return false;
    }
    req.query.from = rawFrom || today;
    req.query.to = rawTo || today;
    if (rawDate) req.query.date = today;
  }
  return true;
}

/** Management-only guard for CSV exports and other sensitive reads. */
function guardMgmtReport(req: Request, res: Response): boolean {
  if (!['super_admin', 'owner', 'manager'].includes(req.user!.role || 'staff')) {
    res.status(403).json({ error: 'You do not have permission to perform this action' });
    return false;
  }
  return true;
}

function whereClauses(req: Request, table = '') {
  const companyId = resolveCompanyId(req);
  const branchId = typeof req.query.branchId === 'string' ? req.query.branchId : null;
  const conditions: string[] = [];
  const values: any[] = [];
  const q = (col: string) => (table ? `${table}.${col}` : col);
  if (companyId) {
    conditions.push(`${q('company_id')} = ?`);
    values.push(companyId);
  }
  if (branchId) {
    conditions.push(`${q('branch_id')} = ?`);
    values.push(branchId);
  }
  return { where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', values };
}

/** Compose `WHERE a AND b` safely even when the tenant scope is empty (super_admin). */
function scopedWhere(where: string, extra: string): string {
  return where ? `${where} AND ${extra}` : `WHERE ${extra}`;
}

function parseNumber(v: any, d: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

function csvResponse(res: Response, filename: string, rows: any[], header: string[], toRow: (r: any) => string[]) {
  const lines = rows.map((r) => toRow(r).join(','));
  res
    .status(200)
    .type('text/csv')
    .setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    .send([header.join(','), ...lines].join('\n'));
}

export function createReportsRouter(pool: DbPool): Router {
  const router = Router();
  router.use(authenticate);

  // Summary KPIs
  router.get('/summary', asyncHandler(async (req, res) => {
    if (!guardReportAccess(req, res)) return;
    const { where, values } = whereClauses(req);
    const from = typeof req.query.from === 'string' ? req.query.from : null;
    const to = typeof req.query.to === 'string' ? req.query.to : null;
    let dateFilter = '';
    const dateValues = [...values];
    if (from) {
      dateFilter += ' AND DATE(started_at) >= ?';
      dateValues.push(from);
    }
    if (to) {
      dateFilter += ' AND DATE(started_at) <= ?';
      dateValues.push(to);
    }

    const [[revRows]] = (await pool.query(
      `SELECT COALESCE(SUM(net_total_etb),0) AS revenue, COUNT(*) AS visits FROM visit_sessions ${scopedWhere(where, "status='completed'")}${dateFilter}`,
      dateValues
    )) as any;
    const [[commRows]] = (await pool.query(
      `SELECT COALESCE(SUM(commission_amount_etb),0) AS commissions FROM commission_logs ${where}`,
      values
    )) as any;
    const [[expRows]] = (await pool.query(
      `SELECT COALESCE(SUM(amount_etb),0) AS expenses FROM expenses ${where}`,
      values
    )) as any;
    const [[stockRows]] = (await pool.query(
      `SELECT COUNT(*) AS lowStock FROM inventory_items ${scopedWhere(where, 'current_stock <= reorder_level')}`,
      values
    )) as any;

    const revenue = parseNumber(revRows.revenue, 0);
    const visits = parseNumber(revRows.visits, 0);
    const commissions = parseNumber(commRows.commissions, 0);
    const expenses = parseNumber(expRows.expenses, 0);

    res.json({
      totalRevenue: revenue,
      visitsCompleted: visits,
      totalCommissions: commissions,
      totalExpenses: expenses,
      netProfit: revenue - commissions - expenses,
      avgTicket: visits > 0 ? Math.round(revenue / visits) : 0,
      lowStock: parseNumber(stockRows.lowStock, 0),
    });
  }));

    // Payment summary for the reception desk — today's collections by channel
  // (cash / bank), discounts given, and the outstanding credit balance owed.
  router.get('/payment-summary', asyncHandler(async (req, res) => {
    if (!guardReportAccess(req, res)) return;
    const companyId = resolveCompanyId(req);
    const branchId = typeof req.query.branchId === 'string' && req.query.branchId ? String(req.query.branchId) : null;
    const dateParam = typeof req.query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date) ? String(req.query.date) : null;
    const dayExpr = dateParam ? '?' : 'CURRENT_DATE';

    const ledConds: string[] = [`DATE(created_at) = ${dayExpr}`];
    const ledVals: any[] = dateParam ? [dateParam] : [];
    if (companyId) { ledConds.unshift('company_id = ?'); ledVals.unshift(companyId); }
    if (branchId) { ledConds.unshift('branch_id = ?'); ledVals.unshift(branchId); }
    const [[led]] = (await pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN method = 'cash' THEN amount_etb - cashback_etb END), 0) AS cash,
         COALESCE(SUM(CASE WHEN method = 'bank' THEN amount_etb - cashback_etb END), 0) AS bank
       FROM payments WHERE ${ledConds.join(' AND ')}`,
      ledVals
    )) as any;

    // Discounts given on sessions/retail completed the same day.
    const doneConds = (dateCol: string): { conds: string[]; vals: any[] } => {
      const conds: string[] = [`DATE(${dateCol}) = ${dayExpr}`];
      const vals: any[] = dateParam ? [dateParam] : [];
      if (companyId) { conds.unshift('company_id = ?'); vals.unshift(companyId); }
      if (branchId) { conds.unshift('branch_id = ?'); vals.unshift(branchId); }
      return { conds, vals };
    };

    const vDone = doneConds('completed_at');
    const [[vDisc]] = (await pool.query(
      `SELECT COALESCE(SUM(discount_etb), 0) AS discounts FROM visit_sessions WHERE status = 'completed' AND ${vDone.conds.join(' AND ')}`,
      vDone.vals
    )) as any;

    const mDone = doneConds('paid_at');
    const [[mDisc]] = (await pool.query(
      `SELECT COALESCE(SUM(discount_etb), 0) AS discounts FROM material_sales WHERE status = 'completed' AND ${mDone.conds.join(' AND ')}`,
      mDone.vals
    )) as any;

    // Outstanding credit = completed work not yet paid for (all-time balance).
    const debtConds: string[] = [];
    const debtVals: any[] = [];
    if (companyId) { debtConds.push('company_id = ?'); debtVals.push(companyId); }
    if (branchId) { debtConds.push('branch_id = ?'); debtVals.push(branchId); }
    const debtWhere = debtConds.length ? `AND ${debtConds.join(' AND ')}` : '';

    const [[vDebt]] = (await pool.query(
      `SELECT COALESCE(SUM(net_total_etb), 0) AS amt, COUNT(*) AS cnt FROM visit_sessions WHERE status = 'completed' AND is_paid = FALSE ${debtWhere}`,
      debtVals
    )) as any;
    const [[mDebt]] = (await pool.query(
      `SELECT COALESCE(SUM(net_total_etb), 0) AS amt FROM material_sales WHERE status = 'completed' AND is_paid = FALSE ${debtWhere}`,
      debtVals
    )) as any;

    const r2 = (n: any) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
    const cashEtb = r2(led.cash);
    const bankEtb = r2(led.bank);
    const visitDiscountsEtb = r2(vDisc.discounts);
    const retailDiscountsEtb = r2(mDisc.discounts);
    const outstandingVisitsEtb = r2(vDebt.amt);
    const outstandingRetailEtb = r2(mDebt.amt);

    res.json({
      cashEtb,
      bankEtb,
      totalCollectedEtb: r2(cashEtb + bankEtb),
      visitDiscountsEtb,
      retailDiscountsEtb,
      discountsEtb: r2(visitDiscountsEtb + retailDiscountsEtb),
      outstandingVisitsEtb,
      outstandingVisitCount: parseNumber(vDebt.cnt, 0),
      outstandingRetailEtb,
      outstandingTotalEtb: r2(outstandingVisitsEtb + outstandingRetailEtb),
    });
  }));

  // Daily revenue trend
  router.get('/revenue', asyncHandler(async (req, res) => {
    if (!guardReportAccess(req, res)) return;
    const { where, values } = whereClauses(req);
    const [rows] = (await pool.query(
      `SELECT DATE(started_at) AS d, ROUND(SUM(net_total_etb),2) AS revenue, COUNT(*) AS visits
       FROM visit_sessions ${scopedWhere(where, "status='completed'")}
       GROUP BY DATE(started_at) ORDER BY d ASC`,
      values
    )) as any;
    res.json(rows.map((r: any) => ({ date: r.d, revenue: parseNumber(r.revenue, 0), visits: r.visits })));
  }));

  // Commissions by staff
  router.get('/commissions', asyncHandler(async (req, res) => {
    if (!guardReportAccess(req, res)) return;
    const { where, values } = whereClauses(req);
    const [rows] = (await pool.query(
      `SELECT staff_id, staff_name,
        COUNT(*) AS servicesCompleted,
        ROUND(SUM(service_price_etb),2) AS revenueGenerated,
        ROUND(SUM(commission_amount_etb),2) AS commissionEarned
       FROM commission_logs ${where}
       GROUP BY staff_id, staff_name ORDER BY revenueGenerated DESC`,
      values
    )) as any;
    res.json(rows);
  }));

  // Payment channel breakdown (split-payment aware, sourced from the ledger).
  // A single payable may span multiple cash/bank lines; only the payments rows
  // capture the true split.
  router.get('/payments', asyncHandler(async (req, res) => {
    if (!guardReportAccess(req, res)) return;
    const { where, values } = whereClauses(req, 'p');
    const from = typeof req.query.from === 'string' ? req.query.from : null;
    const to = typeof req.query.to === 'string' ? req.query.to : null;
    let dateFilter = '';
    const dateValues = [...values];
    if (from) { dateFilter += ' AND DATE(p.created_at) >= ?'; dateValues.push(from); }
    if (to) { dateFilter += ' AND DATE(p.created_at) <= ?'; dateValues.push(to); }
    const [rows] = (await pool.query(
      `SELECT method, COALESCE(NULLIF(p.bank_name, ''), NULLIF(b.name, ''), 'Cash') AS channel,
        DATE(p.created_at) AS d,
        ROUND(SUM(p.amount_etb),2) AS amount, COUNT(*) AS lines
       FROM payments p LEFT JOIN banks b ON b.id = p.bank_id
       ${where}${dateFilter}
       GROUP BY method, channel, DATE(p.created_at) ORDER BY d ASC, channel ASC`,
      dateValues
    )) as any;
    res.json(rows.map((r: any) => ({
      method: r.method,
      channel: r.channel === 'Cash' && r.method === 'bank' ? 'Other Bank' : r.channel,
      date: r.d,
      amount: parseNumber(r.amount, 0),
      lines: parseNumber(r.lines, 0),
    })));
  }));

  // Expenses by category
  router.get('/expenses', asyncHandler(async (req, res) => {
    if (!guardReportAccess(req, res)) return;
    const { where, values } = whereClauses(req);
    const [rows] = (await pool.query(
      `SELECT category, ROUND(SUM(amount_etb),2) AS amount FROM expenses ${where} GROUP BY category ORDER BY amount DESC`,
      values
    )) as any;
    res.json(rows);
  }));

  // CSV export of completed visits
  router.get('/export/visits.csv', asyncHandler(async (req, res) => {
    if (!guardMgmtReport(req, res)) return;
    const { where, values } = whereClauses(req);
    const serviceFilter: string[] = [];
    const serviceValues: any[] = [...values];
    const staffId = typeof req.query.staffId === 'string' ? req.query.staffId : null;
    const category = typeof req.query.serviceCategory === 'string' ? req.query.serviceCategory : null;
    const onlyCompleted = req.query.completed === 'true';
    if (staffId) {
      serviceFilter.push('EXISTS (SELECT 1 FROM visit_session_services vss WHERE vss.visit_session_id = visit_sessions.id AND vss.staff_id = ?)');
      serviceValues.push(staffId);
    }
    if (category) {
      serviceFilter.push('EXISTS (SELECT 1 FROM visit_session_services vss JOIN services svc ON svc.id = vss.service_id WHERE vss.visit_session_id = visit_sessions.id AND svc.category = ?)');
      serviceValues.push(category);
    }
    if (onlyCompleted) serviceFilter.push("status='completed'");
    const whereAll = where + (serviceFilter.length ? `${where ? ' AND ' : 'WHERE '}${serviceFilter.join(' AND ')}` : '');
    const [rows] = (await pool.query(
      `SELECT queue_number, customer_name, status, subtotal_etb, discount_etb, net_total_etb, payment_method, started_at, completed_at
       FROM visit_sessions ${whereAll} ORDER BY started_at DESC`,
      serviceValues
    )) as any;
    csvResponse(res, 'visits_report.csv', rows, [
      'Queue',
      'Customer',
      'Status',
      'Subtotal ETB',
      'Discount ETB',
      'Net Total ETB',
      'Payment Method',
      'Started At',
      'Completed At',
    ], (r) => [
      r.queue_number,
      `"${r.customer_name}"`,
      r.status,
      r.subtotal_etb,
      r.discount_etb,
      r.net_total_etb,
      r.payment_method || '',
      r.started_at,
      r.completed_at || '',
    ]);
  }));

  // CSV export of commission ledger
  router.get('/export/commissions.csv', asyncHandler(async (req, res) => {
    if (!guardMgmtReport(req, res)) return;
    const { where, values } = whereClauses(req);
    const [rows] = (await pool.query(
      `SELECT staff_name, service_name, service_price_etb, commission_amount_etb, rule_applied, payout_status, created_at
       FROM commission_logs ${where} ORDER BY created_at DESC`,
      values
    )) as any;
    csvResponse(res, 'commissions.csv', rows, [
      'Staff',
      'Service',
      'Price ETB',
      'Commission ETB',
      'Rule Applied',
      'Payout Status',
      'Created At',
    ], (r) => [
      `"${r.staff_name}"`,
      `"${r.service_name}"`,
      r.service_price_etb,
      r.commission_amount_etb,
      `"${r.rule_applied}"`,
      r.payout_status,
      r.created_at,
    ]);
  }));

  return router;
}