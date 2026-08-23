import { Router } from 'express';
import type { DbPool } from '../db';
import { deskOnly, asyncHandler } from '../middleware';
import { validate } from '../validate';
import { uid, canAccessCompany, notFound } from '../core';

/**
 * Material / retail sales: a separate pipeline from visit sessions. Prices are
 * always locked to the inventory item's `selling_price_etb` at sale time and
 * stock is only deducted when the sale is paid (see the shared payments service).
 * Retail sales never generate staff commissions.
 */
export function createMaterialSalesRouter(pool: DbPool): Router {
  const router = Router();
  router.use('/material-sales', ...deskOnly);

  router.get('/material-sales', asyncHandler(async (req, res) => {
    const companyId = canAccessCompany(req.user!, String(req.query.companyId || '')) ? String(req.query.companyId) : req.user!.companyId;
    const branchId = typeof req.query.branchId === 'string' ? req.query.branchId : null;
    const status = typeof req.query.status === 'string' ? req.query.status : null;

    const where: string[] = [];
    const params: any[] = [];
    if (companyId) { where.push('company_id = ?'); params.push(companyId); }
    if (branchId) { where.push('branch_id = ?'); params.push(branchId); }
    if (status) { where.push('status = ?'); params.push(status); }

    const [rows] = (await pool.query(
      `SELECT * FROM material_sales ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY created_at DESC`,
      params
    )) as any;

    const [itemRows] = (await pool.query(
      `SELECT * FROM material_sale_items WHERE material_sale_id = ANY(?)`,
      [(rows as any[]).filter((r) => r).map((r) => r.id)]
    )) as any;

    res.json((rows as any[]).map((s) => ({
      id: s.id, companyId: s.company_id, branchId: s.branch_id, customerId: s.customer_id,
      customerName: s.customer_name, customerPhone: s.customer_phone,
      subtotalEtb: Number(s.subtotal_etb), discountEtb: Number(s.discount_etb), netTotalEtb: Number(s.net_total_etb),
      status: s.status, isPaid: Boolean(s.is_paid), paidAt: s.paid_at || undefined, createdAt: s.created_at,
      items: (itemRows as any[]).filter((i) => i.material_sale_id === s.id).map((i) => ({
        id: i.id, inventoryItemId: i.inventory_item_id, itemName: i.item_name, sku: i.sku, unit: i.unit,
        quantity: Number(i.quantity), unitPriceEtb: Number(i.unit_price_etb), totalEtb: Number(i.total_etb),
      })),
    })));
  }));

  router.post('/material-sales', asyncHandler(async (req, res) => {
    if (!canAccessCompany(req.user!, req.body.companyId)) return res.status(403).json({ error: 'Company not found' });
    const errs = validate(req.body, {
      companyId: { required: true },
      branchId: { required: true },
      items: { required: true, type: 'array' },
    });
    if (errs.length) return res.status(400).json({ error: errs.join('; ') });

    const b = req.body;
    if (!Array.isArray(b.items) || b.items.length === 0) {
      return res.status(400).json({ error: 'At least one product is required.' });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const id = uid('mat');
      let requested: any[] = [];

      for (const it of b.items) {
        const [invRows] = (await connection.query(
          `SELECT id, name, sku, unit, current_stock, selling_price_etb FROM inventory_items WHERE id = ? AND company_id = ?`,
          [it.inventoryItemId, b.companyId]
        )) as any;
        const inv = invRows[0];
        if (!inv) {
          const e: any = new Error(`Product "${it.inventoryItemId}" not found.`);
          e.status = 400;
          throw e;
        }
        const price = Number(inv.selling_price_etb);
        if (!price || price <= 0) {
          const e: any = new Error(`Product "${inv.name}" has no retail selling price configured.`);
          e.status = 400;
          throw e;
        }
        const qty = Number(it.quantity || 1);
        if (qty <= 0) {
          const e: any = new Error(`Quantity must be greater than zero for "${inv.name}".`);
          e.status = 400;
          throw e;
        }
        if (qty > Number(inv.current_stock)) {
          const e: any = new Error(`Only ${inv.current_stock} × "${inv.name}" in stock.`);
          e.status = 409;
          throw e;
        }
        requested.push({ ...it, inv, price, qty });
      }

      const subtotal = Math.round(requested.reduce((a, r) => a + r.price * r.qty, 0) * 100) / 100;

      await connection.query(
        `INSERT INTO material_sales (id, company_id, branch_id, customer_id, customer_name, customer_phone, subtotal_etb, discount_etb, net_total_etb, status, is_paid)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [id, b.companyId, b.branchId, b.customerId || null, b.customerName || 'Walk-in', b.customerPhone || null, subtotal, 0, subtotal, 'open', false]
      );

      for (const r of requested) {
        await connection.query(
          `INSERT INTO material_sale_items (id, material_sale_id, inventory_item_id, item_name, sku, unit, quantity, unit_price_etb, total_etb)
           VALUES (?,?,?,?,?,?,?,?,?)`,
          [uid('msi'), id, r.inventoryItemId, r.inv.name, r.inv.sku, r.inv.unit, r.qty, r.price, Math.round(r.price * r.qty * 100) / 100]
        );
      }

      await connection.query(
        `INSERT INTO audit_logs (id, company_id, branch_id, action_type, description, performed_by, timestamp) VALUES (?,?,?,?,?,?,NOW())`,
        [uid('aud'), b.companyId, b.branchId, 'payment_edit', `Retail sale ${id.slice(-6).toUpperCase()} opened for ${requested.length} product line(s) (${subtotal} ETB)`, `Receptionist (${req.user!.name})`]
      );

      await connection.commit();
      res.json({ success: true, id, subtotalEtb: subtotal });
    } catch (e: any) {
      await connection.rollback();
      if (e && e.status) {
        return res.status(e.status).json({ error: e.message });
      }
      throw e;
    } finally {
      connection.release();
    }
  }));

  router.get('/material-sales/:id/items', asyncHandler(async (req, res) => {
    const [saleRows] = (await pool.query(`SELECT company_id FROM material_sales WHERE id = ?`, [req.params.id])) as any;
    const sale = saleRows[0];
    if (!sale) return notFound('Retail sale not found');
    if (!canAccessCompany(req.user!, sale.company_id)) return res.status(403).json({ error: 'Company not found' });
    const [rows] = (await pool.query(`SELECT * FROM material_sale_items WHERE material_sale_id = ?`, [req.params.id])) as any;
    res.json((rows as any[]).map((i) => ({
      id: i.id, inventoryItemId: i.inventory_item_id, itemName: i.item_name, sku: i.sku, unit: i.unit,
      quantity: Number(i.quantity), unitPriceEtb: Number(i.unit_price_etb), totalEtb: Number(i.total_etb),
    })));
  }));

  router.delete('/material-sales/:id', asyncHandler(async (req, res) => {
    const [saleRows] = (await pool.query(`SELECT company_id, is_paid, status FROM material_sales WHERE id = ?`, [req.params.id])) as any;
    const s = saleRows[0];
    if (!s) return notFound('Retail sale not found');
    if (!canAccessCompany(req.user!, s.company_id)) return res.status(403).json({ error: 'Company not found' });
    if (s.is_paid || s.status === 'completed') {
      return res.status(409).json({ error: 'Cannot cancel a paid retail sale.' });
    }
    await pool.query(`UPDATE material_sales SET status = 'cancelled' WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
  }));

  return router;
}