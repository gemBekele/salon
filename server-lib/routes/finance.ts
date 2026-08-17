import { Router } from 'express';
import type { DbPool } from '../db';
import { mgmtOnly, asyncHandler } from '../middleware';
import { validate } from '../validate';
import { uid, canAccessCompany, notFound, createAuditLogger } from '../core';

/**
 * Financial & ledger routes: expenses, commission rules + payout status,
 * audit log writes/export and SMS log writes.
 */
export function createFinanceRouter(pool: DbPool): Router {
  const router = Router();
  const insertAudit = createAuditLogger(pool);

  router.use(['/commission-rules', '/commission-logs', '/expenses', '/audit-logs', '/audit', '/sms-logs'], ...mgmtOnly);

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

  // ==========================================================
  // Expenses
  // ==========================================================
  router.post('/expenses', asyncHandler(async (req, res) => {
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

    // Enforce the branch daily expense limit (set by salon admin) for receptionist-recorded expenses
    if (req.user && req.user.role === 'receptionist') {
      const [brRows] = (await pool.query(`SELECT daily_expense_limit_etb FROM branches WHERE id = ?`, [b.branchId])) as any;
      const br = brRows[0];
      const limit = br ? Number(br.daily_expense_limit_etb || 0) : 0;
      if (limit > 0) {
        const today = new Date().toISOString().slice(0, 10);
        const [expRows] = (await pool.query(
          `SELECT COALESCE(SUM(amount_etb), 0) AS total FROM expenses WHERE company_id = ? AND branch_id = ? AND date = ?`,
          [b.companyId, b.branchId, today]
        )) as any;
        const spent = Number(expRows[0]?.total || 0);
        if (spent + Number(b.amountEtb) > limit) {
          return res.status(400).json({
            error: `Daily expense limit exceeded. Branch limit is ${limit} ETB, ${spent.toFixed(2)} ETB already recorded today (${b.amountEtb} ETB would exceed it).`,
          });
        }
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

  router.put('/expenses/:id', asyncHandler(async (req, res) => {
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

  router.delete('/expenses/:id', asyncHandler(async (req, res) => {
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
