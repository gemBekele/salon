import { Router } from 'express';
import type { DbPool } from '../db';
import type { SmsService } from '../sms';
import { authenticate, mgmtOnly, deskOnly, posOnly, asyncHandler } from '../middleware';
import { validate } from '../validate';
import { uid, canAccessCompany, notFound, createAuditLogger } from '../core';
import { createPaymentService } from '../payments';

/**
 * Payments router: banks (configurable channels), receipt uploads, the unified
 * checkout endpoint and the payments ledger. Bank management is mgmt-only;
 * checkout/banks-list/upload are available to reception staff.
 */
export function createPaymentsRouter(pool: DbPool, sms: SmsService): Router {
  const router = Router();
  const payments = createPaymentService({ pool, sms });
  const insertAudit = createAuditLogger(pool);

  router.use(authenticate);

  // ==========================================================
  // Banks (configurable payment channels)
  // ==========================================================
  router.get('/banks', asyncHandler(async (req, res) => {
    const companyId = req.user!.role === 'super_admin' && req.query.companyId
      ? String(req.query.companyId)
      : req.user!.companyId;
    const includeInactive = req.query.all === '1';
    const [rows] = (await pool.query(
      `SELECT * FROM banks ${companyId ? 'WHERE company_id = ?' : ''}${includeInactive ? '' : " AND is_active = TRUE"} ORDER BY name ASC`,
      companyId ? [companyId] : []
    )) as any;
    res.json(rows);
  }));

  router.post('/banks', ...mgmtOnly, asyncHandler(async (req, res) => {
    if (!canAccessCompany(req.user!, req.body.companyId)) return res.status(403).json({ error: 'Company not found' });
    const errs = validate(req.body, {
      companyId: { required: true },
      name: { required: true, type: 'string' },
      code: { required: true, type: 'string' },
    });
    if (errs.length) return res.status(400).json({ error: errs.join('; ') });

    const id = uid('bank');
    await pool.query(`INSERT INTO banks (id, company_id, name, code, is_active) VALUES (?,?,?,?,?)`,
      [id, req.body.companyId, req.body.name, req.body.code.toUpperCase(), req.body.isActive !== false ? 1 : 0]);
    await insertAudit({ companyId: req.body.companyId }, 'commission_change', `Bank added: ${req.body.name}`, req.user!.name);
    res.json({ success: true, id });
  }));

  router.patch('/banks/:id', ...mgmtOnly, asyncHandler(async (req, res) => {
    const [rows] = (await pool.query(`SELECT company_id FROM banks WHERE id = ?`, [req.params.id])) as any;
    const bank = rows[0];
    if (!bank) return notFound('Bank not found');
    if (!canAccessCompany(req.user!, bank.company_id)) return res.status(403).json({ error: 'Company not found' });

    const fields: string[] = [];
    const vals: any[] = [];
    if (req.body.name !== undefined) { fields.push('name = ?'); vals.push(req.body.name); }
    if (req.body.code !== undefined) { fields.push('code = ?'); vals.push(String(req.body.code).toUpperCase()); }
    if (req.body.isActive !== undefined) { fields.push('is_active = ?'); vals.push(req.body.isActive ? 1 : 0); }
    if (fields.length) {
      vals.push(req.params.id);
      await pool.query(`UPDATE banks SET ${fields.join(', ')} WHERE id = ?`, vals);
      await insertAudit({ companyId: bank.company_id }, 'commission_change', `Bank updated: ${req.params.id}`, req.user!.name);
    }
    res.json({ success: true });
  }));

  router.delete('/banks/:id', ...mgmtOnly, asyncHandler(async (req, res) => {
    const [rows] = (await pool.query(`SELECT company_id, name FROM banks WHERE id = ?`, [req.params.id])) as any;
    const bank = rows[0];
    if (!bank) return notFound('Bank not found');
    if (!canAccessCompany(req.user!, bank.company_id)) return res.status(403).json({ error: 'Company not found' });
    await pool.query(`DELETE FROM banks WHERE id = ?`, [req.params.id]);
    await insertAudit({ companyId: bank.company_id }, 'commission_change', `Bank removed: ${bank.name}`, req.user!.name);
    res.json({ success: true });
  }));

  // ==========================================================
  // Receipt image upload (client-compressed, stored on server)
  // ==========================================================
  router.post('/upload', ...posOnly, asyncHandler(async (req, res) => {
    const data = typeof req.body?.data === 'string' ? req.body.data : null;
    const path = await payments.saveReceipt(data, req.body?.filename);
    res.json({ success: true, path });
  }));

  // ==========================================================
  // Unified checkout (visit | material_sale | group)
  // ==========================================================
  router.post('/checkout', ...posOnly, asyncHandler(async (req, res) => {
    const errs = validate(req.body, {
      payableType: { required: true, enum: ['visit', 'material_sale', 'group'] },
      payableId: { required: true },
    });
    if (errs.length) return res.status(400).json({ error: errs.join('; ') });
    const result = await payments.checkout(req.user!, req.body);
    res.json(result);
  }));

  // ==========================================================
  // Payments ledger
  // ==========================================================
  router.get('/', asyncHandler(async (req, res) => {
    const type = typeof req.query.payableType === 'string' && req.query.payableType ? String(req.query.payableType) : null;
    const id = typeof req.query.payableId === 'string' && req.query.payableId ? String(req.query.payableId) : null;
    if (type && id) {
      // Payment history for one payable — front-desk readable.
      if (!['super_admin', 'owner', 'manager', 'reception'].includes(req.user!.role)) {
        return res.status(403).json({ error: 'You do not have permission to perform this action' });
      }
      return res.json(await payments.listPayments(req.user!, type, id));
    }
    // Broad ledger — management only.
    if (!['super_admin', 'owner', 'manager'].includes(req.user!.role)) {
      return res.status(403).json({ error: 'You do not have permission to perform this action' });
    }
    const companyId = typeof req.query.companyId === 'string' ? req.query.companyId : null;
    const branchId = typeof req.query.branchId === 'string' ? req.query.branchId : null;
    const method = req.query.method === 'cash' || req.query.method === 'bank' ? (req.query.method as 'cash' | 'bank') : null;
    const bankId = typeof req.query.bankId === 'string' ? req.query.bankId : null;
    const from = typeof req.query.from === 'string' ? req.query.from : null;
    const to = typeof req.query.to === 'string' ? req.query.to : null;
    const rows = await payments.listLedger(req.user!, { companyId, branchId, method, bankId, from, to });
    res.json(rows);
  }));

  return router;
}