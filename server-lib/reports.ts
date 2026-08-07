import { Router, Request, Response } from 'express';
import type { Pool } from 'mysql2/promise';
import { authenticate } from './middleware';

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

function whereClauses(req: Request) {
  const companyId = resolveCompanyId(req);
  const branchId = typeof req.query.branchId === 'string' ? req.query.branchId : null;
  const conditions: string[] = [];
  const values: any[] = [];
  if (companyId) {
    conditions.push('company_id = ?');
    values.push(companyId);
  }
  if (branchId) {
    conditions.push('branch_id = ?');
    values.push(branchId);
  }
  return { where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', values };
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

export function createReportsRouter(pool: Pool): Router {
  const router = Router();
  router.use(authenticate);

  // Summary KPIs
  router.get('/summary', async (req, res) => {
    const { where, values } = whereClauses(req);
    const from = typeof req.query.from === 'string' ? req.query.from : null;
    const to = typeof req.query.to === 'string' ? req.query.to : null;
    let dateFilter = '';
    if (from) {
      dateFilter += ' AND DATE(started_at) >= ?';
      values.push(from);
    }
    if (to) {
      dateFilter += ' AND DATE(started_at) <= ?';
      values.push(to);
    }

    const [[revRows]] = (await pool.query(
      `SELECT COALESCE(SUM(net_total_etb),0) AS revenue, COUNT(*) AS visits FROM visit_sessions ${where} AND status='completed'${dateFilter}`,
      values
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
      `SELECT COUNT(*) AS lowStock FROM inventory_items ${where} AND current_stock <= reorder_level`,
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
  });

  // Daily revenue trend
  router.get('/revenue', async (req, res) => {
    const { where, values } = whereClauses(req);
    const [rows] = (await pool.query(
      `SELECT DATE(started_at) AS d, ROUND(SUM(net_total_etb),2) AS revenue, COUNT(*) AS visits
       FROM visit_sessions ${where} AND status='completed'
       GROUP BY DATE(started_at) ORDER BY d ASC`,
      values
    )) as any;
    res.json(rows.map((r: any) => ({ date: r.d, revenue: parseNumber(r.revenue, 0), visits: r.visits })));
  });

  // Commissions by staff
  router.get('/commissions', async (req, res) => {
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
  });

  // Expenses by category
  router.get('/expenses', async (req, res) => {
    const { where, values } = whereClauses(req);
    const [rows] = (await pool.query(
      `SELECT category, ROUND(SUM(amount_etb),2) AS amount FROM expenses ${where} GROUP BY category ORDER BY amount DESC`,
      values
    )) as any;
    res.json(rows);
  });

  // CSV export of completed visits
  router.get('/export/visits.csv', async (req, res) => {
    const { where, values } = whereClauses(req);
    const [rows] = (await pool.query(
      `SELECT queue_number, customer_name, status, subtotal_etb, discount_etb, net_total_etb, payment_method, started_at, completed_at
       FROM visit_sessions ${where} ORDER BY started_at DESC`,
      values
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
  });

  // CSV export of commission ledger
  router.get('/export/commissions.csv', async (req, res) => {
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
  });

  return router;
}