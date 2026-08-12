import { Router } from 'express';
import type { DbPool } from '../db';
import { mgmtOnly, asyncHandler } from '../middleware';
import { validate } from '../validate';
import { uid, canAccessCompany, notFound, createAuditLogger, buildUpdate } from '../core';

/**
 * Tenant & catalog CRUD: companies, branches, business units, staff,
 * services (with inventory requirements) and inventory items.
 */
export function createEntitiesRouter(pool: DbPool): Router {
  const router = Router();
  const insertAudit = createAuditLogger(pool);

  router.use(['/companies', '/branches', '/business-units', '/staff', '/services', '/inventory-items'], ...mgmtOnly);

  // ==========================================================
  // Companies (super_admin only)
  // ==========================================================
  router.post('/companies', asyncHandler(async (req, res) => {
    if (req.user!.role !== 'super_admin') {
      return res.status(403).json({ error: 'Only the Super Admin may provision tenants' });
    }
    const errs = validate(req.body, {
      name: { required: true, type: 'string' },
      subscriptionPlanId: { required: true, type: 'string' },
    });
    if (errs.length) return res.status(400).json({ error: errs.join('; ') });

    const b = req.body;
    const id = uid('cmp');
    await pool.query(
      `INSERT INTO companies (id, name, slug, subscription_plan_id, status, currency, timezone, phone, email, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,NOW())`,
      [id, b.name, b.slug || b.name.toLowerCase().replace(/\s+/g, '-'), b.subscriptionPlanId, b.status || 'active', b.currency || 'ETB', b.timezone || 'Africa/Addis_Ababa', b.phone || null, b.email || null]
    );
    res.json({ success: true, id });
  }));

  router.put('/companies/:id', asyncHandler(async (req, res) => {
    if (req.user!.role !== 'super_admin') {
      return res.status(403).json({ error: 'Only the Super Admin may edit tenants' });
    }
    const [rows] = (await pool.query(`SELECT id FROM companies WHERE id = ?`, [req.params.id])) as any;
    if (!rows[0]) return notFound('Company not found');
    const update = buildUpdate('companies', {
      name: { column: 'name' },
      status: { column: 'status' },
      phone: { column: 'phone' },
      email: { column: 'email' },
      subscriptionPlanId: { column: 'subscription_plan_id' },
    });
    const changed = await update(pool, req.params.id, req.body);
    if (!changed) return res.status(400).json({ error: 'No fields to update' });
    res.json({ success: true });
  }));

  // ==========================================================
  // Branches
  // ==========================================================
  router.post('/branches', asyncHandler(async (req, res) => {
    if (!canAccessCompany(req.user!, req.body.companyId)) return res.status(403).json({ error: 'Company not found' });
    const errs = validate(req.body, {
      companyId: { required: true },
      name: { required: true, type: 'string' },
      city: { required: true, type: 'string' },
    });
    if (errs.length) return res.status(400).json({ error: errs.join('; ') });

    const b = req.body;
    const id = uid('br');
    await pool.query(
      `INSERT INTO branches (id, company_id, name, city, address, phone, is_main_branch, status) VALUES (?,?,?,?,?,?,?,?)`,
      [id, b.companyId, b.name, b.city, b.address || '', b.phone || '', b.isMainBranch ? 1 : 0, b.status || 'active']
    );
    res.json({ success: true, id });
  }));

  router.put('/branches/:id', asyncHandler(async (req, res) => {
    const [rows] = (await pool.query(`SELECT company_id FROM branches WHERE id = ?`, [req.params.id])) as any;
    const br = rows[0];
    if (!br) return notFound('Branch not found');
    if (!canAccessCompany(req.user!, br.company_id)) return res.status(403).json({ error: 'Company not found' });

    const update = buildUpdate('branches', {
      name: { column: 'name' },
      city: { column: 'city' },
      address: { column: 'address' },
      phone: { column: 'phone' },
      isMainBranch: { column: 'is_main_branch', transform: (v) => (v ? 1 : 0) },
      status: { column: 'status' },
    });
    const changed = await update(pool, req.params.id, req.body);
    if (!changed) return res.status(400).json({ error: 'No fields to update' });
    res.json({ success: true });
  }));

  router.delete('/branches/:id', asyncHandler(async (req, res) => {
    const [rows] = (await pool.query(`SELECT company_id FROM branches WHERE id = ?`, [req.params.id])) as any;
    const br = rows[0];
    if (!br) return notFound('Branch not found');
    if (!canAccessCompany(req.user!, br.company_id)) return res.status(403).json({ error: 'Company not found' });
    await pool.query(`UPDATE branches SET status = 'inactive' WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
  }));

  // ==========================================================
  // Business units
  // ==========================================================
  router.post('/business-units', asyncHandler(async (req, res) => {
    if (!canAccessCompany(req.user!, req.body.companyId)) return res.status(403).json({ error: 'Company not found' });
    const errs = validate(req.body, {
      companyId: { required: true },
      branchId: { required: true },
      name: { required: true },
      type: { required: true, enum: ['mens_salon', 'womens_salon', 'spa_center', 'massage_center'] },
    });
    if (errs.length) return res.status(400).json({ error: errs.join('; ') });

    const b = req.body;
    const id = uid('bu');
    await pool.query(
      `INSERT INTO business_units (id, company_id, branch_id, type, name, code, status) VALUES (?,?,?,?,?,?,?)`,
      [id, b.companyId, b.branchId, b.type, b.name, b.code || `BU-${Date.now()}`, b.status || 'active']
    );
    res.json({ success: true, id });
  }));

  router.put('/business-units/:id', asyncHandler(async (req, res) => {
    const [rows] = (await pool.query(`SELECT company_id FROM business_units WHERE id = ?`, [req.params.id])) as any;
    const bu = rows[0];
    if (!bu) return notFound('Business unit not found');
    if (!canAccessCompany(req.user!, bu.company_id)) return res.status(403).json({ error: 'Company not found' });

    const update = buildUpdate('business_units', {
      name: { column: 'name' },
      type: { column: 'type' },
      branchId: { column: 'branch_id' },
      code: { column: 'code' },
      status: { column: 'status' },
    });
    const changed = await update(pool, req.params.id, req.body);
    if (!changed) return res.status(400).json({ error: 'No fields to update' });
    res.json({ success: true });
  }));

  router.delete('/business-units/:id', asyncHandler(async (req, res) => {
    const [rows] = (await pool.query(`SELECT company_id FROM business_units WHERE id = ?`, [req.params.id])) as any;
    const bu = rows[0];
    if (!bu) return notFound('Business unit not found');
    if (!canAccessCompany(req.user!, bu.company_id)) return res.status(403).json({ error: 'Company not found' });
    await pool.query(`UPDATE business_units SET status = 'inactive' WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
  }));

  // ==========================================================
  // Staff
  // ==========================================================
  router.post('/staff', asyncHandler(async (req, res) => {
    if (!canAccessCompany(req.user!, req.body.companyId)) return res.status(403).json({ error: 'Company not found' });
    const errs = validate(req.body, {
      companyId: { required: true },
      branchId: { required: true },
      businessUnitId: { required: true },
      name: { required: true, type: 'string' },
      defaultCommissionPercentage: { required: true, type: 'number', min: 0, max: 100 },
    });
    if (errs.length) return res.status(400).json({ error: errs.join('; ') });

    const b = req.body;
    const id = uid('stf');
    await pool.query(
      `INSERT INTO staff (id, company_id, branch_id, business_unit_id, name, phone, email, role, specialties, default_commission_percentage, status, avatar_url)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, b.companyId, b.branchId, b.businessUnitId, b.name, b.phone || null, b.email || null, b.role || 'barber', JSON.stringify(b.specialties || []), b.defaultCommissionPercentage, b.status || 'available', b.avatarUrl || null]
    );
    res.json({ success: true, id });
  }));

  router.put('/staff/:id', asyncHandler(async (req, res) => {
    const [rows] = (await pool.query(`SELECT company_id FROM staff WHERE id = ?`, [req.params.id])) as any;
    const st = rows[0];
    if (!st) return notFound('Staff not found');
    if (!canAccessCompany(req.user!, st.company_id)) return res.status(403).json({ error: 'Company not found' });

    const update = buildUpdate('staff', {
      name: { column: 'name' },
      phone: { column: 'phone' },
      email: { column: 'email' },
      role: { column: 'role' },
      branchId: { column: 'branch_id' },
      businessUnitId: { column: 'business_unit_id' },
      specialties: { column: 'specialties', transform: (v) => JSON.stringify(v) },
      defaultCommissionPercentage: { column: 'default_commission_percentage' },
      status: { column: 'status' },
      avatarUrl: { column: 'avatar_url' },
    });
    const changed = await update(pool, req.params.id, req.body);
    if (!changed) return res.status(400).json({ error: 'No fields to update' });
    res.json({ success: true });
  }));

  router.delete('/staff/:id', asyncHandler(async (req, res) => {
    const [rows] = (await pool.query(`SELECT company_id FROM staff WHERE id = ?`, [req.params.id])) as any;
    const st = rows[0];
    if (!st) return notFound('Staff not found');
    if (!canAccessCompany(req.user!, st.company_id)) return res.status(403).json({ error: 'Company not found' });
    await pool.query(`UPDATE staff SET status = 'inactive' WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
  }));

  // ==========================================================
  // Services
  // ==========================================================
  router.post('/services', asyncHandler(async (req, res) => {
    if (!canAccessCompany(req.user!, req.body.companyId)) return res.status(403).json({ error: 'Company not found' });
    const errs = validate(req.body, {
      companyId: { required: true },
      businessUnitId: { required: true },
      name: { required: true, type: 'string' },
      priceEtb: { required: true, type: 'number', min: 0 },
    });
    if (errs.length) return res.status(400).json({ error: errs.join('; ') });

    const b = req.body;
    const id = uid('srv');
    await pool.query(
      `INSERT INTO services (id, company_id, business_unit_id, name, category, price_etb, duration_minutes, commission_type, commission_value, is_active)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [id, b.companyId, b.businessUnitId, b.name, b.category || 'General', b.priceEtb, b.durationMinutes || 30, b.commissionType || 'percentage', b.commissionValue || 0, b.isActive ? 1 : 0]
    );
    if (Array.isArray(b.requiredInventory) && b.requiredInventory.length) {
      for (const item of b.requiredInventory) {
        await pool.query(`INSERT INTO service_inventory_requirements (service_id, inventory_item_id, quantity_used) VALUES (?,?,?)`, [id, item.inventoryItemId, item.quantityUsed]);
      }
    }
    res.json({ success: true, id });
  }));

  router.put('/services/:id', asyncHandler(async (req, res) => {
    const [rows] = (await pool.query(`SELECT company_id FROM services WHERE id = ?`, [req.params.id])) as any;
    const sv = rows[0];
    if (!sv) return notFound('Service not found');
    if (!canAccessCompany(req.user!, sv.company_id)) return res.status(403).json({ error: 'Company not found' });

    const update = buildUpdate('services', {
      name: { column: 'name' },
      category: { column: 'category' },
      priceEtb: { column: 'price_etb' },
      durationMinutes: { column: 'duration_minutes' },
      commissionType: { column: 'commission_type' },
      commissionValue: { column: 'commission_value' },
      businessUnitId: { column: 'business_unit_id' },
      isActive: { column: 'is_active', transform: (v) => (v ? 1 : 0) },
    });
    const changed = await update(pool, req.params.id, req.body);
    if (!changed) return res.status(400).json({ error: 'No fields to update' });

    if (Array.isArray(req.body.requiredInventory)) {
      await pool.query(`DELETE FROM service_inventory_requirements WHERE service_id = ?`, [req.params.id]);
      for (const item of req.body.requiredInventory) {
        await pool.query(`INSERT INTO service_inventory_requirements (service_id, inventory_item_id, quantity_used) VALUES (?,?,?)`, [req.params.id, item.inventoryItemId, item.quantityUsed]);
      }
    }
    res.json({ success: true });
  }));

  router.delete('/services/:id', asyncHandler(async (req, res) => {
    const [rows] = (await pool.query(`SELECT company_id FROM services WHERE id = ?`, [req.params.id])) as any;
    const sv = rows[0];
    if (!sv) return notFound('Service not found');
    if (!canAccessCompany(req.user!, sv.company_id)) return res.status(403).json({ error: 'Company not found' });
    await pool.query(`UPDATE services SET is_active = FALSE WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
  }));

  // ==========================================================
  // Inventory items
  // ==========================================================
  router.post('/inventory-items', asyncHandler(async (req, res) => {
    if (!canAccessCompany(req.user!, req.body.companyId)) return res.status(403).json({ error: 'Company not found' });
    const errs = validate(req.body, {
      companyId: { required: true },
      branchId: { required: true },
      name: { required: true, type: 'string' },
    });
    if (errs.length) return res.status(400).json({ error: errs.join('; ') });

    const b = req.body;
    const id = uid('inv');
    await pool.query(
      `INSERT INTO inventory_items (id, company_id, branch_id, business_unit_id, name, sku, unit, current_stock, reorder_level, unit_cost_etb)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [id, b.companyId, b.branchId, b.businessUnitId, b.name, b.sku || b.name, b.unit || 'pcs', b.currentStock || 0, b.reorderLevel || 0, b.unitCostEtb || 0]
    );
    await insertAudit({ companyId: b.companyId, branchId: b.branchId }, 'inventory_adjustment', `Inventory item created: ${b.name}`, 'Tenant Admin', 'Stock added');
    res.json({ success: true, id });
  }));

  router.put('/inventory-items/:id', asyncHandler(async (req, res) => {
    const [rows] = (await pool.query(`SELECT company_id FROM inventory_items WHERE id = ?`, [req.params.id])) as any;
    const inv = rows[0];
    if (!inv) return notFound('Inventory item not found');
    if (!canAccessCompany(req.user!, inv.company_id)) return res.status(403).json({ error: 'Company not found' });

    const update = buildUpdate('inventory_items', {
      name: { column: 'name' },
      sku: { column: 'sku' },
      unit: { column: 'unit' },
      currentStock: { column: 'current_stock' },
      reorderLevel: { column: 'reorder_level' },
      unitCostEtb: { column: 'unit_cost_etb' },
      sellingPriceEtb: { column: 'selling_price_etb' },
      branchId: { column: 'branch_id' },
      businessUnitId: { column: 'business_unit_id' },
    });
    const changed = await update(pool, req.params.id, req.body);
    if (!changed) return res.status(400).json({ error: 'No fields to update' });
    res.json({ success: true });
  }));

  router.delete('/inventory-items/:id', asyncHandler(async (req, res) => {
    const [rows] = (await pool.query(`SELECT company_id, name FROM inventory_items WHERE id = ?`, [req.params.id])) as any;
    const inv = rows[0];
    if (!inv) return notFound('Inventory item not found');
    if (!canAccessCompany(req.user!, inv.company_id)) return res.status(403).json({ error: 'Company not found' });
    await pool.query(`DELETE FROM inventory_items WHERE id = ?`, [req.params.id]);
    await insertAudit({ companyId: inv.company_id, branchId: null }, 'inventory_adjustment', `Inventory item deleted: ${inv.name}`, req.user!.name);
    res.json({ success: true });
  }));

  router.post('/inventory-items/adjust-stock', asyncHandler(async (req, res) => {
    const b = req.body;
    const [rows] = (await pool.query(`SELECT company_id, branch_id, name FROM inventory_items WHERE id = ?`, [b.id])) as any;
    const item = rows[0];
    if (!item) return notFound('Inventory item not found');
    if (!canAccessCompany(req.user!, item.company_id)) return res.status(403).json({ error: 'Company not found' });
    const added = Number(b.addedStock) || 0;
    await pool.query(`UPDATE inventory_items SET current_stock = current_stock + ? WHERE id = ?`, [added, b.id]);
    await insertAudit({ companyId: item.company_id, branchId: item.branch_id }, 'inventory_adjustment', `Stock restocked: ${item.name} (+${added} unit(s))`, 'Tenant Admin', `Adjusted by ${req.user!.name}`);
    res.json({ success: true });
  }));

  return router;
}
