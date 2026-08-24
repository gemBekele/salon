import { Router } from 'express';
import type { DbPool } from '../db';
import { authenticate, mgmtOnly, deskOnly, asyncHandler } from '../middleware';
import { validate } from '../validate';
import { uid, canAccessCompany, notFound, createAuditLogger } from '../core';

/** Fallback daily cap for reception-recorded expenses when a branch has no limit set. */
const RECEPTION_DAILY_EXPENSE_LIMIT = Number(process.env.EXPENSE_RECEPTION_DAILY_LIMIT || 2000);

/**
 * Financial & ledger routes: expenses, commission rules + payout status,
 * audit log writes/export and SMS log writes.
 *
 * Access policy:
 *  - Commission rules/payouts, audit logs, SMS logs, feedback → management only.
 *  - Expenses: recording is open to the front desk (reception included) with a
 *    per-branch daily cap for reception; editing/deleting stays management-only.
 */
export function createFinanceRouter(pool: DbPool): Router {
  const router = Router();
  const insertAudit = createAuditLogger(pool);

  // ==========================================================
  // Payout requests — staff-accessible (must sit BEFORE the mgmtOnly group)
  // ==========================================================
  const PAYOUT_REQUEST_ROLES = ['super_admin', 'owner', 'manager', 'reception', 'staff'];

  // Staff request their unpaid commissions for payout. PIN-issued staff may
  // only ever request for themselves; management may act on any staff member.
  router.post('/commission-logs/payout/request', authenticate, asyncHandler(async (req, res) => {
    if (!PAYOUT_REQUEST_ROLES.includes(req.user!.role || 'staff')) {
      return res.status(403).json({ error: 'You do not have permission to perform this action' });
    }
    const b = req.body;
    if (!b.companyId) return res.status(400).json({ error: 'companyId is required' });
    if (!canAccessCompany(req.user!, b.companyId)) return res.status(403).json({ error: 'Company not found' });

    const staffId = req.user!.role === 'staff' ? req.user!.id : (b.staffId || null);
    if (!staffId) return res.status(400).json({ error: 'staffId is required' });

    const [rows] = (await pool.query(
      `SELECT id, commission_amount_etb FROM commission_logs
       WHERE staff_id = ? AND company_id = ? AND payout_status = 'unpaid'
       ORDER BY created_at ASC`,
      [staffId, b.companyId]
    )) as any;
    if (rows.length === 0) {
      return res.status(400).json({ error: 'No unpaid commissions to request.' });
    }

    const ids = rows.map((r: any) => r.id);
    await pool.query(
      `UPDATE commission_logs SET payout_status = 'payout_requested' WHERE id IN (${ids.map(() => '?').join(',')})`,
      ids
    );
    const total = rows.reduce((a: number, r: any) => a + (Number(r.commission_amount_etb) || 0), 0);
    await insertAudit(
      { companyId: b.companyId, branchId: null },
      'commission_change',
      `Payout requested: ${(req.user!.name)} requested ${total.toFixed(2)} ETB for ${rows.length} commission log(s)`,
      `${req.user!.name} (${staffId})`
    );
    res.json({ success: true, requestedCount: rows.length, requestedTotalEtb: Math.round(total * 100) / 100 });
  }));

  // Management rejects a pending payout request — logs return to unpaid.
  router.post('/commission-logs/payout/request/reject', ...mgmtOnly, asyncHandler(async (req, res) => {
    const b = req.body;
    if (!b.companyId || !b.staffId) return res.status(400).json({ error: 'companyId and staffId are required' });
    if (!canAccessCompany(req.user!, b.companyId)) return res.status(403).json({ error: 'Company not found' });

    const [pendingRows] = await pool.query(
      `SELECT COUNT(*) AS n FROM commission_logs
       WHERE staff_id = ? AND company_id = ? AND payout_status = 'payout_requested'`,
      [b.staffId, b.companyId]
    ) as any;
    const pendingCount = Number(pendingRows[0]?.n ?? 0);
    if (pendingCount === 0) return res.status(400).json({ error: 'No pending payout request for this staff member' });

    await pool.query(
      `UPDATE commission_logs SET payout_status = 'unpaid'
       WHERE staff_id = ? AND company_id = ? AND payout_status = 'payout_requested'`,
      [b.staffId, b.companyId]
    );
    await insertAudit(
      { companyId: b.companyId, branchId: null },
      'commission_change',
      `Payout request rejected for ${pendingCount} log(s)`,
      `${req.user!.name} (${b.staffId})`
    );
    res.json({ success: true, rejectedCount: pendingCount });
  }));

  router.use(['/commission-rules', '/commission-logs', '/audit-logs', '/audit', '/sms-logs', '/feedback'], ...mgmtOnly);

  // ==========================================================
  // Commission rules
  // ==========================================================
  router.post('/commission-rules', asyncHandler(async (req, res) => {
    if (!canAccessCompany(req.user!, req.body.companyId)) return res.status(403).json({ error: 'Company not found' });
    const errs = validate(req.body, {
      companyId: { required: true },
      targetType: { required: true, enum: ['staff', 'service'] },
      targetId: { required: true },
      targetName: { required: true },
      type: { required: true, enum: ['percentage', 'fixed_amount'] },
      value: { required: true, type: 'number', min: 0 },
    });
    if (errs.length) return res.status(400).json({ error: errs.join('; ') });

    const b = req.body;
    const id = uid('rule');
    await pool.query(
      `INSERT INTO commission_rules (id, company_id, target_type, target_id, target_name, type, value, deduct_product_cost, is_active)
       VALUES (?,?,?,?,?,?,?,?,?)
       ON CONFLICT (company_id, target_type, target_id) DO UPDATE
         SET type = EXCLUDED.type,
             value = EXCLUDED.value,
             deduct_product_cost = EXCLUDED.deduct_product_cost,
             is_active = EXCLUDED.is_active`,
      [id, b.companyId, b.targetType, b.targetId, b.targetName, b.type, b.value, b.deductProductCost ? 1 : 0, b.isActive !== false ? 1 : 0]
    );
    await insertAudit({ companyId: b.companyId, branchId: null }, 'commission_change', `Commission Rule configured: ${b.targetName}`, 'Tenant Admin', `Value ${b.value}`);
    res.json({ success: true, id });
  }));

  router.delete('/commission-rules/:id', asyncHandler(async (req, res) => {
    const [rows] = (await pool.query(`SELECT company_id, target_name FROM commission_rules WHERE id = ?`, [req.params.id])) as any;
    const rule = rows[0];
    if (!rule) return notFound('Commission rule not found');
    if (!canAccessCompany(req.user!, rule.company_id)) return res.status(403).json({ error: 'Company not found' });
    await pool.query(`DELETE FROM commission_rules WHERE id = ?`, [req.params.id]);
    await insertAudit({ companyId: rule.company_id, branchId: null }, 'commission_change', `Commission Rule deleted: ${rule.target_name}`, req.user!.name);
    res.json({ success: true });
  }));

  // Update commission payout status
  router.patch('/commission-logs/payout', asyncHandler(async (req, res) => {
    const { id, payoutStatus } = req.body;
    if (!id || !payoutStatus) return res.status(400).json({ error: 'id and payoutStatus are required' });
    if (!['unpaid', 'payout_requested', 'paid'].includes(payoutStatus)) {
      return res.status(400).json({ error: 'payoutStatus must be unpaid, payout_requested, or paid' });
    }
    const [rows] = (await pool.query(`SELECT company_id FROM commission_logs WHERE id = ?`, [id])) as any;
    const log = rows[0];
    if (!log) return notFound('Commission log not found');
    if (!canAccessCompany(req.user!, log.company_id)) return res.status(403).json({ error: 'Company not found' });
    await pool.query(`UPDATE commission_logs SET payout_status = ? WHERE id = ?`, [payoutStatus, id]);
    res.json({ success: true });
  }));

  // Pay a staff member: accept a specific amount, mark the oldest unpaid
  // commission logs as paid up to that amount, and record the payout on that date.
  // Anything not covered stays unpaid.
  router.patch('/commission-logs/payout/batch', asyncHandler(async (req, res) => {
    const { staffId, companyId, amountAcceptedEtb, notes } = req.body;
    if (!staffId || !companyId) {
      return res.status(400).json({ error: 'staffId and companyId are required' });
    }
    if (typeof amountAcceptedEtb !== 'number' || !isFinite(amountAcceptedEtb) || amountAcceptedEtb < 0) {
      return res.status(400).json({ error: 'amountAcceptedEtb must be a non-negative number' });
    }
    if (!canAccessCompany(req.user!, companyId)) return res.status(403).json({ error: 'Company not found' });

    // Oldest unpaid logs first, so "paid up to X" always starts with the due-iest.
    const [logs] = (await pool.query(
      `SELECT id, commission_amount_etb, staff_name
       FROM commission_logs
       WHERE staff_id = ? AND company_id = ? AND payout_status != 'paid'
       ORDER BY created_at ASC, id ASC`,
      [staffId, companyId]
    )) as any;
    if (logs.length === 0) {
      return res.status(400).json({ error: 'No unpaid commissions for this staff member' });
    }

    let remaining = amountAcceptedEtb;
    const toPay: string[] = [];
    for (const log of logs) {
      const amt = Number(log.commission_amount_etb) || 0;
      if (amt <= remaining && amt > 0) {
        toPay.push(log.id);
        remaining -= amt;
      } else {
        // A single log is an indivisible record; if the accepted amount can't
        // cover it completely it stays fully unpaid for a later payout.
        break;
      }
    }

    let logsPaid = 0;
    if (toPay.length > 0) {
      await pool.query(
        `UPDATE commission_logs SET payout_status = 'paid'
         WHERE id IN (${toPay.map(() => '?').join(',')})`,
        toPay
      );
      // The pool adapter only returns rows; the update affects exactly toPay.length
      // rows because every one of them was selected as `payout_status != 'paid'`.
      logsPaid = toPay.length;
    }

    const payoutId = uid('pay_');
    const staffName = logs[0].staff_name;
    await pool.query(
      `INSERT INTO commission_payouts (id, company_id, branch_id, staff_id, staff_name, amount_accepted_etb, logs_paid, notes, created_at)
       VALUES (?, ?, NULL, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [payoutId, companyId, staffId, staffName, amountAcceptedEtb, logsPaid, notes || null]
    );
    await insertAudit(
      { companyId, branchId: null },
      'commission_change',
      `Payout of ${amountAcceptedEtb} ETB accepted for staff ${staffName} (${staffId}) on ${new Date().toISOString().split('T')[0]} - ${logsPaid} log(s) marked paid`,
      req.user!.name
    );
    res.json({
      success: true,
      payoutId,
      amountPaidEtb: toPay.length > 0 ? amountAcceptedEtb - remaining : 0,
      logsPaid,
    });
  }));

  // ==========================================================
  // Expenses
  // ==========================================================
  router.post('/expenses', ...deskOnly, asyncHandler(async (req, res) => {
    if (!canAccessCompany(req.user!, req.body.companyId)) return res.status(403).json({ error: 'Company not found' });
    const errs = validate(req.body, {
      companyId: { required: true },
      branchId: { required: true },
      category: { required: true, enum: ['rent', 'utilities', 'inventory_purchase', 'salary', 'marketing', 'other'] },
      amountEtb: { required: true, type: 'number', min: 0 },
      description: { required: true, type: 'string' },
      paymentMethod: { required: true, enum: ['telebirr', 'cbe_birr', 'cash', 'card', 'mixed'] },
    });
    if (errs.length) return res.status(400).json({ error: errs.join('; ') });

    const b = req.body;
    const id = uid('exp');

    // Enforce the branch daily expense limit for reception-recorded expenses.
    // Falls back to the platform default when the branch has no limit configured.
    if (req.user && req.user.role === 'reception') {
      const [brRows] = (await pool.query(`SELECT daily_expense_limit_etb FROM branches WHERE id = ?`, [b.branchId])) as any;
      const br = brRows[0];
      const branchLimit = br && Number(br.daily_expense_limit_etb) > 0 ? Number(br.daily_expense_limit_etb) : RECEPTION_DAILY_EXPENSE_LIMIT;
      const today = new Date().toISOString().slice(0, 10);
      const [expRows] = (await pool.query(
        `SELECT COALESCE(SUM(amount_etb), 0) AS total FROM expenses WHERE company_id = ? AND branch_id = ? AND date = ?`,
        [b.companyId, b.branchId, today]
      )) as any;
      const spent = Number(expRows[0]?.total || 0);
      if (spent + Number(b.amountEtb) > branchLimit) {
        return res.status(400).json({
          error: `Daily expense limit exceeded. Branch limit is ${branchLimit} ETB, ${spent.toFixed(2)} ETB already recorded today (${b.amountEtb} ETB would exceed it).`,
        });
      }
    }

    await pool.query(
      `INSERT INTO expenses (id, company_id, branch_id, business_unit_id, category, amount_etb, description, payment_method, recorded_by, date, is_recurring, recurrence_frequency, next_due_date, auto_process_trigger)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, b.companyId, b.branchId, b.businessUnitId || null, b.category, b.amountEtb, b.description, b.paymentMethod, b.recordedBy || req.user!.name, b.date || new Date().toISOString().slice(0, 10), b.isRecurring ? 1 : 0, b.recurrenceFrequency || null, b.nextDueDate || null, b.autoProcessTrigger ? 1 : 0]
    );
    await insertAudit({ companyId: b.companyId, branchId: b.branchId }, 'expense_added', `Expense recorded: ${b.description}`, req.user!.name, `Amount ${b.amountEtb} ETB`);
    res.json({ success: true, id });
  }));

  router.put('/expenses/:id', ...mgmtOnly, asyncHandler(async (req, res) => {
    const [rows] = (await pool.query(`SELECT company_id FROM expenses WHERE id = ?`, [req.params.id])) as any;
    const exp = rows[0];
    if (!exp) return notFound('Expense not found');
    if (!canAccessCompany(req.user!, exp.company_id)) return res.status(403).json({ error: 'Company not found' });

    const fields: string[] = [];
    const vals: any[] = [];
    const b = req.body;
    if (b.category !== undefined) { fields.push('category = ?'); vals.push(b.category); }
    if (b.amountEtb !== undefined) { fields.push('amount_etb = ?'); vals.push(b.amountEtb); }
    if (b.description !== undefined) { fields.push('description = ?'); vals.push(b.description); }
    if (b.paymentMethod !== undefined) { fields.push('payment_method = ?'); vals.push(b.paymentMethod); }
    if (b.date !== undefined) { fields.push('date = ?'); vals.push(b.date); }
    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });
    vals.push(req.params.id);
    await pool.query(`UPDATE expenses SET ${fields.join(', ')} WHERE id = ?`, vals);
    res.json({ success: true });
  }));

  router.delete('/expenses/:id', ...mgmtOnly, asyncHandler(async (req, res) => {
    const [rows] = (await pool.query(`SELECT company_id, description FROM expenses WHERE id = ?`, [req.params.id])) as any;
    const exp = rows[0];
    if (!exp) return notFound('Expense not found');
    if (!canAccessCompany(req.user!, exp.company_id)) return res.status(403).json({ error: 'Company not found' });
    await pool.query(`DELETE FROM expenses WHERE id = ?`, [req.params.id]);
    await insertAudit({ companyId: exp.company_id, branchId: null }, 'expense_added', `Expense deleted: ${exp.description}`, req.user!.name);
    res.json({ success: true });
  }));

  // ==========================================================
  // Audit log writes
  // ==========================================================
  router.post('/audit-logs', asyncHandler(async (req, res) => {
    if (!canAccessCompany(req.user!, req.body.companyId)) return res.status(403).json({ error: 'Company not found' });
    const b = req.body;
    await pool.query(
      `INSERT INTO audit_logs (id, company_id, branch_id, action_type, description, performed_by, timestamp, details, ip_address) VALUES (?,?,?,?,?,?,?,?,?)`,
      [uid('aud'), b.companyId, b.branchId || null, b.actionType, b.description, b.performedBy, b.timestamp || new Date().toISOString(), b.details || null, b.ipAddress || null]
    );
    res.json({ success: true });
  }));

  // Audit log CSV export (tenant-scoped, optional actionType filter)
  router.get('/audit/export.csv', asyncHandler(async (req, res) => {
    const companyId = req.user!.role === 'super_admin' ? (typeof req.query.companyId === 'string' ? req.query.companyId : null) : req.user!.companyId;
    const values: any[] = [];
    let where = companyId ? 'WHERE company_id = ?' : '';
    if (companyId) values.push(companyId);
    if (typeof req.query.actionType === 'string' && req.query.actionType) {
      where += where ? ` AND action_type = ?` : 'WHERE action_type = ?';
      values.push(req.query.actionType);
    }
    const [rows] = (await pool.query(`SELECT id, timestamp, action_type, description, performed_by, details, ip_address FROM audit_logs ${where} ORDER BY timestamp DESC`, values)) as any;
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [
      ['Log ID', 'Timestamp', 'Action Type', 'Description', 'Performed By', 'Details', 'IP Address'].join(','),
      ...rows.map((r: any) => [r.id, r.timestamp, r.action_type, esc(r.description), esc(r.performed_by), esc(r.details), r.ip_address || '127.0.0.1'].join(',')),
    ].join('\n');
    res.status(200).type('text/csv').setHeader('Content-Disposition', `attachment; filename="security_audit_${new Date().toISOString().split('T')[0]}.csv"`).send(csv);
  }));

  // ==========================================================
  // Feedback & complaints review (owner / manager)
  // ==========================================================
  router.get('/feedback', asyncHandler(async (req, res) => {
    const companyId = req.user!.role === 'super_admin' ? (typeof req.query.companyId === 'string' ? req.query.companyId : null) : req.user!.companyId;
    const values: any[] = [];
    let where = companyId ? 'WHERE f.company_id = ?' : '';
    if (companyId) values.push(companyId);
    if (typeof req.query.branchId === 'string' && req.query.branchId) {
      where += where ? ` AND f.branch_id = ?` : 'WHERE f.branch_id = ?';
      values.push(req.query.branchId);
    }
    const [rows] = (await pool.query(
      `SELECT f.id, f.company_id, f.branch_id, f.visit_session_id, f.customer_id, f.rating, f.complaint,
              f.is_anonymous, f.created_at,
              vs.queue_number, vs.customer_name AS session_customer_name,
              c.name AS customer_name, c.phone AS customer_phone
       FROM feedback f
       LEFT JOIN visit_sessions vs ON vs.id = f.visit_session_id
       LEFT JOIN customers c ON c.id = f.customer_id
       ${where}
       ORDER BY f.created_at DESC
       LIMIT 200`,
      values
    )) as any;
    res.json({
      feedback: (rows as any[]).map((r) => ({
        id: r.id,
        companyId: r.company_id,
        branchId: r.branch_id,
        visitSessionId: r.visit_session_id,
        customerId: r.customer_id,
        rating: Number(r.rating),
        complaint: r.complaint || undefined,
        isAnonymous: Boolean(r.is_anonymous),
        createdAt: r.created_at,
        queueNumber: r.queue_number || undefined,
        customerName: r.is_anonymous ? undefined : (r.customer_name || r.session_customer_name || undefined),
        customerPhone: r.is_anonymous ? undefined : (r.customer_phone || undefined),
      })),
    });
  }));

  // ==========================================================
  // SMS log writes
  // ==========================================================
  router.post('/sms-logs', asyncHandler(async (req, res) => {
    if (!canAccessCompany(req.user!, req.body.companyId)) return res.status(403).json({ error: 'Company not found' });
    const b = req.body;
    await pool.query(`INSERT INTO sms_logs (id, company_id, recipient_phone, message_type, content, status, sent_at) VALUES (?,?,?,?,?,?,?)`,
      [uid('sms'), b.companyId, b.recipientPhone, b.messageType, b.content, b.status || 'sent', b.sentAt || new Date().toISOString()]);
    res.json({ success: true });
  }));

  return router;
}
