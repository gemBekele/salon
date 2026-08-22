import { Router } from 'express';
import type { DbPool } from '../db';
import { mgmtOnly, authenticate, asyncHandler } from '../middleware';
import { validate } from '../validate';
import { hashPassword } from '../auth';
import { uid, canAccessCompany, scopedCompanyId, notFound } from '../core';

/**
 * SaaS platform admin: user management and the tenant-scoped read model used
 * to bootstrap the dashboard.
 */
export function createAdminRouter(pool: DbPool): Router {
  const router = Router();

  // ==========================================================
  // Tenant-scoped read bundle (dashboard bootstrap)
  // Accessible to all authenticated users so staff portal can load
  // ==========================================================
  router.get('/db-state', authenticate, asyncHandler(async (req, res) => {
    const companyId = scopedCompanyId(req.user!, undefined);
    const scope = companyId ? 'WHERE company_id = ?' : '';
    const params = companyId ? [companyId] : [];

    // Lightweight mode: ?sections=visitSessions,customers returns only those
    // slices. Hot paths (start/complete/payment + polling) use this so
    // mutations stay fast instead of reloading the entire workspace.
    const wanted = typeof req.query.sections === 'string' && req.query.sections.trim()
      ? new Set(req.query.sections.split(',').map((s) => s.trim()).filter(Boolean))
      : null;
    const full = !wanted;
    const want = (key: string) => full || wanted!.has(key);

    const [subRows] = want('subscriptionPlans') ? await pool.query('SELECT * FROM subscription_plans') : [[]];
    const [cmpRows] = want('companies') ? await pool.query('SELECT * FROM companies') : [[]];
    const [brRows] = want('branches') ? await pool.query(`SELECT * FROM branches ${scope}`, params) : [[]];
    const [buRows] = want('businessUnits') ? await pool.query(`SELECT * FROM business_units ${scope}`, params) : [[]];
    const [stfRows] = want('staffList') ? await pool.query(`SELECT * FROM staff ${scope}`, params) : [[]];
    const [srvRows] = want('services') ? await pool.query(
      companyId
        ? `SELECT * FROM services WHERE company_id = ? AND is_active = TRUE`
        : 'SELECT * FROM services WHERE is_active = TRUE',
      companyId ? [companyId] : []
    ) : [[]];
    const [reqRows] = want('services') ? await pool.query(
      companyId
        ? `SELECT sir.* FROM service_inventory_requirements sir JOIN services s ON sir.service_id = s.id WHERE s.company_id = ?`
        : 'SELECT * FROM service_inventory_requirements',
      companyId ? [companyId] : []
    ) : [[]];
    const [invRows] = want('inventoryItems') ? await pool.query(`SELECT * FROM inventory_items ${scope}`, params) : [[]];
    const [custRows] = want('customers') ? await pool.query(`SELECT * FROM customers ${scope}`, params) : [[]];
    const [vstRows] = want('visitSessions') ? await pool.query(
      companyId
        ? `SELECT * FROM visit_sessions WHERE company_id = ? ${typeof req.query.startDate === 'string' ? 'AND started_at >= ?' : ''} ${typeof req.query.endDate === 'string' ? 'AND started_at <= ?' : ''}`
        : `SELECT * FROM visit_sessions ${typeof req.query.startDate === 'string' ? 'WHERE started_at >= ?' : ''} ${typeof req.query.endDate === 'string' ? (typeof req.query.startDate === 'string' ? 'AND' : 'WHERE') + ' started_at <= ?' : ''}`,
      [...(companyId ? [companyId] : []), ...(typeof req.query.startDate === 'string' ? [req.query.startDate] : []), ...(typeof req.query.endDate === 'string' ? [req.query.endDate + ' 23:59:59'] : [])]
    ) : [[]];
    const [sessionSrvRows] = want('visitSessions') ? await pool.query(
      companyId
        ? `SELECT vss.* FROM visit_session_services vss JOIN visit_sessions vs ON vss.visit_session_id = vs.id WHERE vs.company_id = ?`
        : 'SELECT * FROM visit_session_services',
      companyId ? [companyId] : []
    ) : [[]];
    const [ruleRows] = want('commissionRules') ? await pool.query(`SELECT * FROM commission_rules ${scope}`, params) : [[]];
    const [logRows] = want('commissionLogs') ? await pool.query(`SELECT * FROM commission_logs ${scope}`, params) : [[]];
    const [expRows] = want('expenses') ? await pool.query(`SELECT * FROM expenses ${scope} ORDER BY date DESC`, params) : [[]];
    // Display-only activity feeds are capped to keep the payload small.
    const [smsRows] = want('smsLogs') ? await pool.query(
      `SELECT * FROM sms_logs ${companyId ? 'WHERE company_id = ?' : ''} ORDER BY created_at DESC LIMIT 200`,
      companyId ? [companyId] : []
    ) : [[]];
    const [auditRows] = want('auditLogs') ? await pool.query(
      `SELECT * FROM audit_logs ${companyId ? 'WHERE company_id = ?' : ''} ORDER BY timestamp DESC LIMIT 300`,
      companyId ? [companyId] : []
    ) : [[]];
    const [userRows] = want('users') ? await pool.query(
      companyId ? `SELECT * FROM users WHERE company_id = ?` : `SELECT * FROM users`,
      companyId ? [companyId] : []
    ) : [[]];

    // Group session services / inventory requirements once (O(n)) instead of
    // filtering per row (O(n*m)).
    const servicesBySession = new Map<string, any[]>();
    for (const s of sessionSrvRows as any[]) {
      const list = servicesBySession.get(s.visit_session_id);
      if (list) list.push(s); else servicesBySession.set(s.visit_session_id, [s]);
    }
    const reqByService = new Map<string, any[]>();
    for (const q of reqRows as any[]) {
      const list = reqByService.get(q.service_id);
      if (list) list.push(q); else reqByService.set(q.service_id, [q]);
    }

    const jsonArr = (rows: any, parser: (r: any) => any) => (rows as any[]).map(parser);

    const payload: Record<string, any> = {
      subscriptionPlans: jsonArr(subRows, (r) => ({
        id: r.id, name: r.name, maxBranches: r.max_branches, maxBusinessUnits: r.max_business_units,
        maxStaff: r.max_staff, monthlyFeeEtb: Number(r.monthly_fee_etb),
        features: typeof r.features === 'string' ? JSON.parse(r.features) : r.features || [],
      })),
      companies: jsonArr(cmpRows, (r) => ({
        id: r.id, name: r.name, slug: r.slug, subscriptionPlanId: r.subscription_plan_id, status: r.status,
        currency: r.currency, timezone: r.timezone, phone: r.phone || '', email: r.email || '', createdAt: r.created_at,
      })),
      branches: jsonArr(brRows, (r) => ({
        id: r.id, companyId: r.company_id, name: r.name, city: r.city, address: r.address || '',
        phone: r.phone || '', isMainBranch: Boolean(r.is_main_branch), status: r.status,
        dailyExpenseLimitEtb: Number(r.daily_expense_limit_etb || 0),
      })),
      businessUnits: jsonArr(buRows, (r) => ({
        id: r.id, companyId: r.company_id, branchId: r.branch_id, type: r.type, name: r.name, code: r.code, status: r.status,
      })),
      staffList: jsonArr(stfRows, (r) => ({
        id: r.id, companyId: r.company_id, branchId: r.branch_id, businessUnitId: r.business_unit_id, name: r.name,
        phone: r.phone || '', email: r.email || '', role: r.role,
        specialties: typeof r.specialties === 'string' ? JSON.parse(r.specialties) : r.specialties || [],
        defaultCommissionPercentage: Number(r.default_commission_percentage), status: r.status,
      })),
      services: jsonArr(srvRows, (r) => ({
        id: r.id, companyId: r.company_id, businessUnitId: r.business_unit_id, name: r.name, category: r.category,
        priceEtb: Number(r.price_etb), durationMinutes: r.duration_minutes, commissionType: r.commission_type,
        commissionValue: Number(r.commission_value), isActive: Boolean(r.is_active),
        requiredInventory: (reqByService.get(r.id) || []).map((q) => ({
          inventoryItemId: q.inventory_item_id, quantityUsed: Number(q.quantity_used),
        })),
      })),
      inventoryItems: jsonArr(invRows, (r) => ({
        id: r.id, companyId: r.company_id, branchId: r.branch_id, businessUnitId: r.business_unit_id, name: r.name,
        sku: r.sku, unit: r.unit, currentStock: Number(r.current_stock), reorderLevel: Number(r.reorder_level),
        unitCostEtb: Number(r.unit_cost_etb), sellingPriceEtb: r.selling_price_etb ? Number(r.selling_price_etb) : undefined,
        lastRestockedAt: r.last_restocked_at || '',
      })),
      customers: jsonArr(custRows, (r) => ({
        id: r.id, companyId: r.company_id, name: r.name, phone: r.phone, email: r.email || undefined,
        totalVisits: r.total_visits, totalSpentEtb: Number(r.total_spent_etb), loyaltyPoints: r.loyalty_points,
        isVip: Boolean(r.is_vip), notes: r.notes || undefined, createdAt: r.created_at,
      })),
      visitSessions: jsonArr(vstRows, (r) => ({
        id: r.id, companyId: r.company_id, branchId: r.branch_id, businessUnitId: r.business_unit_id,
        queueNumber: r.queue_number, customerId: r.customer_id, customerName: r.customer_name,
        customerPhone: r.customer_phone, status: r.status, subtotalEtb: Number(r.subtotal_etb),
        discountEtb: Number(r.discount_etb), taxEtb: Number(r.tax_etb), netTotalEtb: Number(r.net_total_etb),
        paymentMethod: r.payment_method || undefined, paymentReference: r.payment_reference || undefined,
        isPaid: Boolean(r.is_paid), startedAt: r.started_at, completedAt: r.completed_at || undefined,
        notes: r.notes || undefined, createdAt: r.created_at || r.started_at,
        services: (servicesBySession.get(r.id) || []).map((s) => ({
          id: s.id, serviceId: s.service_id, serviceName: s.service_name, staffId: s.staff_id, staffName: s.staff_name,
          priceEtb: Number(s.price_etb), durationMinutes: s.duration_minutes,
          commissionEarnedEtb: Number(s.commission_earned_etb), status: s.status, createdAt: s.created_at,
        })),
      })),
      commissionRules: jsonArr(ruleRows, (r) => ({
        id: r.id, companyId: r.company_id, targetType: r.target_type, targetId: r.target_id, targetName: r.target_name,
        type: r.type, value: Number(r.value), deductProductCost: Boolean(r.deduct_product_cost),
        isActive: Boolean(r.is_active), updatedAt: r.updated_at,
      })),
      commissionLogs: jsonArr(logRows, (r) => ({
        id: r.id, companyId: r.company_id, branchId: r.branch_id, staffId: r.staff_id, staffName: r.staff_name,
        visitSessionId: r.visit_session_id, serviceName: r.service_name, servicePriceEtb: Number(r.service_price_etb),
        commissionAmountEtb: Number(r.commission_amount_etb), ruleApplied: r.rule_applied, payoutStatus: r.payout_status,
        createdAt: r.created_at,
      })),
      expenses: jsonArr(expRows, (r) => ({
        id: r.id, companyId: r.company_id, branchId: r.branch_id, businessUnitId: r.business_unit_id || undefined,
        category: r.category, amountEtb: Number(r.amount_etb), description: r.description, paymentMethod: r.payment_method,
        recordedBy: r.recorded_by, date: r.date, isRecurring: Boolean(r.is_recurring),
        recurrenceFrequency: r.recurrence_frequency || undefined, nextDueDate: r.next_due_date || undefined,
        autoProcessTrigger: Boolean(r.auto_process_trigger),
      })),
      smsLogs: jsonArr(smsRows, (r) => ({
        id: r.id, companyId: r.company_id, recipientPhone: r.recipient_phone, messageType: r.message_type,
        content: r.content, status: r.status, sentAt: r.sent_at,
      })),
      auditLogs: jsonArr(auditRows, (r) => ({
        id: r.id, companyId: r.company_id, branchId: r.branch_id || undefined, actionType: r.action_type,
        description: r.description, performedBy: r.performed_by, timestamp: r.timestamp,
        details: r.details || undefined, ipAddress: r.ip_address || undefined,
      })),
      users: jsonArr(userRows, (r) => ({
        id: r.id, companyId: r.company_id, name: r.name, email: r.email, role: r.role,
        isActive: Boolean(r.is_active), lastLoginAt: r.last_login_at || undefined, createdAt: r.created_at,
      })),
    };
    // In sections mode, omit unrequested keys entirely — returning them as []
    // would make the client wipe real state with empty arrays.
    if (wanted) {
      for (const k of Object.keys(payload)) {
        if (!wanted.has(k)) delete payload[k];
      }
    }
    return res.json(payload);
  }));

  router.use('/users', ...mgmtOnly);

  // ==========================================================
  // User management
  // ==========================================================
  router.post('/users', asyncHandler(async (req, res) => {
    if (!canAccessCompany(req.user!, req.body.companyId)) return res.status(403).json({ error: 'Company not found' });
    const errs = validate(req.body, {
      companyId: { required: true },
      name: { required: true, type: 'string' },
      email: { required: true, type: 'string' },
      password: { required: true, type: 'string' },
      role: { required: true, enum: ['super_admin', 'owner', 'manager', 'reception', 'staff'] },
    });
    if (errs.length) return res.status(400).json({ error: errs.join('; ') });

    const b = req.body;
    const [existing] = (await pool.query(`SELECT id FROM users WHERE email = ?`, [b.email])) as any;
    if (existing.length > 0) return res.status(409).json({ error: 'Email already in use' });
    const id = uid('user');
    await pool.query(
      `INSERT INTO users (id, company_id, name, email, password_hash, role, is_active) VALUES (?,?,?,?,?,?,?)`,
      [id, b.companyId, b.name, b.email, hashPassword(b.password), b.role, b.isActive !== false ? 1 : 0]
    );
    res.json({ success: true, id });
  }));

  router.put('/users/:id', asyncHandler(async (req, res) => {
    const [rows] = (await pool.query(`SELECT company_id FROM users WHERE id = ?`, [req.params.id])) as any;
    const u = rows[0];
    if (!u) return notFound('User not found');
    if (!canAccessCompany(req.user!, u.company_id)) return res.status(403).json({ error: 'Company not found' });

    const b = req.body;
    const fields: string[] = [];
    const vals: any[] = [];
    if (b.name !== undefined) { fields.push('name = ?'); vals.push(b.name); }
    if (b.email !== undefined) {
      const [dup] = (await pool.query(`SELECT id FROM users WHERE email = ? AND id != ?`, [b.email, req.params.id])) as any;
      if (dup.length > 0) return res.status(409).json({ error: 'Email already in use' });
      fields.push('email = ?'); vals.push(b.email);
    }
    if (b.role !== undefined) { fields.push('role = ?'); vals.push(b.role); }
    if (b.isActive !== undefined) { fields.push('is_active = ?'); vals.push(b.isActive ? 1 : 0); }
    if (b.password && b.password.length > 0) { fields.push('password_hash = ?'); vals.push(hashPassword(b.password)); }
    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });
    vals.push(req.params.id);
    await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, vals);
    res.json({ success: true });
  }));

  return router;
}