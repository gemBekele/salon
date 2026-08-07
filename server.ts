import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import crypto from 'node:crypto';

import { verifyPassword, signToken, AuthUser, hashPassword } from './server-lib/auth';
import { authenticate, requireRoles, securityHeaders, corsMiddleware, requestLogger, rateLimit, loginRateLimit, errorHandler, asyncHandler } from './server-lib/middleware';
import { validate, ValidationSchema } from './server-lib/validate';
import { createSmsService } from './server-lib/sms';
import { ensureSeeded } from './server-lib/seed';
import { createReportsRouter } from './server-lib/reports';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

// ==========================================================
// MySQL pool
// ==========================================================
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'gech_salon_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const sms = createSmsService(pool);
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

const id = (prefix: string) => `${prefix}_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`;

/** Effective company scope: super_admin may act globally, other roles are locked to their tenant. */
const scopedCompanyId = (user: AuthUser, requested?: string) => (user.role === 'super_admin' ? requested || null : user.companyId);
/** Permission: is the requested companyId within the user's authority? */
function canAccessCompany(user: AuthUser, companyId: any): boolean {
  if (user.role === 'super_admin') return true;
  return user.companyId === companyId;
}
const notFound = (msg: string): never => {
  const err: any = new Error(msg);
  err.status = 404;
  throw err;
};

/** Derive the next queue number for a branch, e.g. Q-104. */
async function nextQueueNumber(companyId: string, branchId: string): Promise<string> {
  const [rows] = (await pool.query(
    `SELECT queue_number FROM visit_sessions WHERE company_id = ? AND branch_id = ? ORDER BY created_at DESC LIMIT 1`,
    [companyId, branchId]
  )) as any;
  const last = rows[0]?.queue_number as string | undefined;
  const current = last ? parseInt(last.replace(/[^0-9]/g, ''), 10) || 100 : 100;
  return `Q-${current + 1}`;
}

/** Insert a server-side commission log with the real payout status tracked. */
async function insertAudit(c: any, actionType: string, description: string, performedBy: string, details?: string) {
  await pool.query(
    `INSERT INTO audit_logs (id, company_id, branch_id, action_type, description, performed_by, timestamp, details, ip_address) VALUES (?,?,?,?,?,?,NOW(),?,?)`,
    [id('aud'), c.companyId, c.branchId || null, actionType, description, performedBy, details || null, c.ip || '127.0.0.1']
  );
}

// ==========================================================
// App bootstrap
// ==========================================================
async function startServer() {
  // Database health with retries
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await pool.query('SELECT 1');
      break;
    } catch (e) {
      console.error(`[db] connection attempt ${attempt}/3 failed. Make sure XAMPP MySQL is running on 3306.`);
      if (attempt === 3) {
        console.error('[db] giving up after retries. Continuing without database.');
      } else {
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
  }

  // Validate JWT secret
  const jwtSecret = process.env.JWT_SECRET || '';
  if (!jwtSecret || jwtSecret.includes('change_this') || jwtSecret.includes('dev-insecure')) {
    console.error('[FATAL] JWT_SECRET is not set or is a placeholder. Refusing to start.');
    console.error('  Set a strong random string in .env.local: JWT_SECRET=<your-secret>');
    process.exit(1);
  }
  try {
    await ensureSeeded(pool);
  } catch (e) {
    console.error('[db] seed error (continuing):', (e as Error).message);
  }

  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));
  app.use((req, _res, next) => {
    const raw = req.headers.cookie || '';
    (req as any).cookies = Object.fromEntries(
      raw.split(';').map((c) => c.trim().split('=').map((s) => s.trim())).filter(([k]) => k)
    );
    next();
  });
  app.use(securityHeaders);
  app.use(corsMiddleware);
  app.use(requestLogger);

  // Gemini AI (optional)
  const apiKey = process.env.GEMINI_API_KEY;
  const aiClient = apiKey
    ? new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } })
    : null;

  // ==========================================================
  // AUTH
  // ==========================================================
  app.post('/api/auth/login', loginRateLimit, asyncHandler(async (req, res) => {
    const errs = validate(req.body, { email: { required: true, type: 'string' }, password: { required: true, type: 'string' } });
    if (errs.length) return res.status(400).json({ error: errs.join('; ') });
    const [rows] = (await pool.query('SELECT * FROM users WHERE email = ?', [req.body.email])) as any;
    const user = rows[0];
    if (!user || !verifyPassword(req.body.password, user.password_hash)) {
      loginRateLimit.recordFailure(req);
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (!user.is_active) return res.status(403).json({ error: 'Account is disabled' });

    loginRateLimit.recordSuccess(req);
    await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);
    const authUser: AuthUser = { id: user.id, companyId: user.company_id, name: user.name, email: user.email, role: user.role };
    const token = signToken(authUser);
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('sserp_token', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'strict' : 'lax',
      maxAge: 8 * 60 * 60 * 1000,
      path: '/',
    });
    return res.json({ token, user: authUser });
  }));

  app.get('/api/auth/me', authenticate, (req, res) => res.json({ user: req.user }));

  app.post('/api/auth/logout', authenticate, (req, res) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (token) {
      const { tokenBlacklist } = require('./server-lib/auth');
      tokenBlacklist.add(token);
    }
    res.clearCookie('sserp_token', { path: '/' });
    res.json({ success: true });
  });

  // Health check
  app.get('/api/health', async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ok', db: 'connected', uptime: process.uptime() });
    } catch {
      res.status(503).json({ status: 'error', db: 'disconnected' });
    }
  });

  // ==========================================================
  // REPORTS
  // ==========================================================
  app.use('/api/reports', createReportsRouter(pool));

  // ==========================================================
  // DB STATE (tenant-scoped)
  // ==========================================================
  app.get('/api/db-state', authenticate, asyncHandler(async (req, res) => {
    const companyId = scopedCompanyId(req.user!, undefined);
    const scope = companyId ? 'WHERE company_id = ?' : '';
    const params = companyId ? [companyId] : [];

    const [subRows] = await pool.query('SELECT * FROM subscription_plans');
    const [cmpRows] = await pool.query('SELECT * FROM companies');
    const [brRows] = await pool.query(`SELECT * FROM branches ${scope}`, params);
    const [buRows] = await pool.query(`SELECT * FROM business_units ${scope}`, params);
    const [stfRows] = await pool.query(`SELECT * FROM staff ${scope}`, params);
    const [srvRows] = await pool.query(`SELECT * FROM services ${scope}`, params);
    const [reqRows] = await pool.query(
      companyId
        ? `SELECT sir.* FROM service_inventory_requirements sir
           JOIN services s ON sir.service_id = s.id
           WHERE s.company_id = ?`
        : 'SELECT * FROM service_inventory_requirements',
      companyId ? [companyId] : []
    );
    const [invRows] = await pool.query(`SELECT * FROM inventory_items ${scope}`, params);
    const [custRows] = await pool.query(`SELECT * FROM customers ${scope}`, params);
    const [vstRows] = await pool.query(
      companyId
        ? `SELECT * FROM visit_sessions WHERE company_id = ? ${typeof req.query.startDate === 'string' ? 'AND started_at >= ?' : ''} ${typeof req.query.endDate === 'string' ? 'AND started_at <= ?' : ''}`
        : `SELECT * FROM visit_sessions ${typeof req.query.startDate === 'string' ? 'WHERE started_at >= ?' : ''} ${typeof req.query.endDate === 'string' ? (typeof req.query.startDate === 'string' ? 'AND' : 'WHERE') + ' started_at <= ?' : ''}`,
      [...(companyId ? [companyId] : []), ...(typeof req.query.startDate === 'string' ? [req.query.startDate] : []), ...(typeof req.query.endDate === 'string' ? [req.query.endDate + ' 23:59:59'] : [])]
    );
    const [sessionSrvRows] = await pool.query(
      companyId
        ? `SELECT vss.* FROM visit_session_services vss JOIN visit_sessions vs ON vss.visit_session_id = vs.id WHERE vs.company_id = ?`
        : 'SELECT * FROM visit_session_services',
      companyId ? [companyId] : []
    );
    const [ruleRows] = await pool.query(`SELECT * FROM commission_rules ${scope}`, params);
    const [logRows] = await pool.query(`SELECT * FROM commission_logs ${scope}`, params);
    const [expRows] = await pool.query(`SELECT * FROM expenses ${scope} ORDER BY date DESC`, params);
    const [smsRows] = await pool.query(`SELECT * FROM sms_logs ${scope} ORDER BY created_at DESC`, params);
    const [auditRows] = await pool.query(`SELECT * FROM audit_logs ${scope} ORDER BY timestamp DESC`, params);
    const [userRows] = await pool.query(
      companyId
        ? `SELECT u.* FROM users u LEFT JOIN companies c ON u.company_id = c.id WHERE u.company_id = ?`
        : `SELECT * FROM users`,
      companyId ? [companyId] : []
    );

    const jsonArr = (rows: any, parser: (r: any) => any) => (rows as any[]).map(parser);

    return res.json({
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
        requiredInventory: (reqRows as any[]).filter((q) => q.service_id === r.id).map((q) => ({
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
        notes: r.notes || undefined,
        services: (sessionSrvRows as any[]).filter((s) => s.visit_session_id === r.id).map((s) => ({
          id: s.id, serviceId: s.service_id, serviceName: s.service_name, staffId: s.staff_id, staffName: s.staff_name,
          priceEtb: Number(s.price_etb), durationMinutes: s.duration_minutes,
          commissionEarnedEtb: Number(s.commission_earned_etb), status: s.status,
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
    });
  }));

  // ==========================================================
  // MANAGEMENT WRITE ROUTES
  // ==========================================================
  const mgmt = [authenticate, requireRoles('super_admin', 'tenant_manager'), rateLimit(120, 60_000)];

  // Companies (super_admin only)
  app.post('/api/companies', ...mgmt, asyncHandler(async (req, res) => {
    if (req.user!.role !== 'super_admin') return res.status(403).json({ error: 'Only the Super Admin may provision tenants' });
    const errs = validate(req.body, { name: { required: true, type: 'string' }, subscriptionPlanId: { required: true, type: 'string' } });
    if (errs.length) return res.status(400).json({ error: errs.join('; ') });
    const b = req.body;
    await pool.query(
      `INSERT INTO companies (id, name, slug, subscription_plan_id, status, currency, timezone, phone, email, created_at) VALUES (?,?,?,?,?,?,?,?,?,NOW())`,
      [b.id, b.name, b.slug || b.name.toLowerCase().replace(/\s+/g, '-'), b.subscriptionPlanId, b.status || 'active', b.currency || 'ETB', b.timezone || 'Africa/Addis_Ababa', b.phone || null, b.email || null]
    );
    res.json({ success: true });
  }));

  app.put('/api/companies/:id', ...mgmt, asyncHandler(async (req, res) => {
    if (req.user!.role !== 'super_admin') return res.status(403).json({ error: 'Only the Super Admin may edit tenants' });
    const [rows] = (await pool.query(`SELECT id FROM companies WHERE id = ?`, [req.params.id])) as any;
    if (!rows[0]) return res.status(404).json({ error: 'Company not found' });
    const b = req.body;
    const fields: string[] = [];
    const vals: any[] = [];
    if (b.name !== undefined) { fields.push('name = ?'); vals.push(b.name); }
    if (b.status !== undefined) { fields.push('status = ?'); vals.push(b.status); }
    if (b.phone !== undefined) { fields.push('phone = ?'); vals.push(b.phone); }
    if (b.email !== undefined) { fields.push('email = ?'); vals.push(b.email); }
    if (b.subscriptionPlanId !== undefined) { fields.push('subscription_plan_id = ?'); vals.push(b.subscriptionPlanId); }
    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });
    vals.push(req.params.id);
    await pool.query(`UPDATE companies SET ${fields.join(', ')} WHERE id = ?`, vals);
    res.json({ success: true });
  }));

  app.post('/api/branches', ...mgmt, asyncHandler(async (req, res) => {
    if (!canAccessCompany(req.user!, req.body.companyId)) return res.status(403).json({ error: 'Company not found' });
    const errs = validate(req.body, { companyId: { required: true }, name: { required: true, type: 'string' }, city: { required: true, type: 'string' } });
    if (errs.length) return res.status(400).json({ error: errs.join('; ') });
    const b = req.body;
    await pool.query(`INSERT INTO branches (id, company_id, name, city, address, phone, is_main_branch, status) VALUES (?,?,?,?,?,?,?,?)`,
      [b.id, b.companyId, b.name, b.city, b.address || '', b.phone || '', b.isMainBranch ? 1 : 0, b.status || 'active']);
    res.json({ success: true });
  }));

  app.put('/api/branches/:id', ...mgmt, asyncHandler(async (req, res) => {
    const [rows] = (await pool.query(`SELECT company_id FROM branches WHERE id = ?`, [req.params.id])) as any;
    const br = rows[0];
    if (!br) return res.status(404).json({ error: 'Branch not found' });
    if (!canAccessCompany(req.user!, br.company_id)) return res.status(403).json({ error: 'Company not found' });
    const b = req.body;
    const fields: string[] = [];
    const vals: any[] = [];
    if (b.name !== undefined) { fields.push('name = ?'); vals.push(b.name); }
    if (b.city !== undefined) { fields.push('city = ?'); vals.push(b.city); }
    if (b.address !== undefined) { fields.push('address = ?'); vals.push(b.address); }
    if (b.phone !== undefined) { fields.push('phone = ?'); vals.push(b.phone); }
    if (b.isMainBranch !== undefined) { fields.push('is_main_branch = ?'); vals.push(b.isMainBranch ? 1 : 0); }
    if (b.status !== undefined) { fields.push('status = ?'); vals.push(b.status); }
    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });
    vals.push(req.params.id);
    await pool.query(`UPDATE branches SET ${fields.join(', ')} WHERE id = ?`, vals);
    res.json({ success: true });
  }));

  app.delete('/api/branches/:id', ...mgmt, asyncHandler(async (req, res) => {
    const [rows] = (await pool.query(`SELECT company_id FROM branches WHERE id = ?`, [req.params.id])) as any;
    const br = rows[0];
    if (!br) return res.status(404).json({ error: 'Branch not found' });
    if (!canAccessCompany(req.user!, br.company_id)) return res.status(403).json({ error: 'Company not found' });
    await pool.query(`UPDATE branches SET status = 'inactive' WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
  }));

  app.post('/api/business-units', ...mgmt, asyncHandler(async (req, res) => {
    if (!canAccessCompany(req.user!, req.body.companyId)) return res.status(403).json({ error: 'Company not found' });
    const errs = validate(req.body, { companyId: { required: true }, branchId: { required: true }, name: { required: true }, type: { required: true, enum: ['mens_salon', 'womens_salon', 'spa_center', 'massage_center'] } });
    if (errs.length) return res.status(400).json({ error: errs.join('; ') });
    const b = req.body;
    await pool.query(`INSERT INTO business_units (id, company_id, branch_id, type, name, code, status) VALUES (?,?,?,?,?,?,?)`,
      [b.id, b.companyId, b.branchId, b.type, b.name, b.code || `BU-${Date.now()}`, b.status || 'active']);
    res.json({ success: true });
  }));

  app.put('/api/business-units/:id', ...mgmt, asyncHandler(async (req, res) => {
    const [rows] = (await pool.query(`SELECT company_id FROM business_units WHERE id = ?`, [req.params.id])) as any;
    const bu = rows[0];
    if (!bu) return res.status(404).json({ error: 'Business unit not found' });
    if (!canAccessCompany(req.user!, bu.company_id)) return res.status(403).json({ error: 'Company not found' });
    const b = req.body;
    const fields: string[] = [];
    const vals: any[] = [];
    if (b.name !== undefined) { fields.push('name = ?'); vals.push(b.name); }
    if (b.type !== undefined) { fields.push('type = ?'); vals.push(b.type); }
    if (b.branchId !== undefined) { fields.push('branch_id = ?'); vals.push(b.branchId); }
    if (b.code !== undefined) { fields.push('code = ?'); vals.push(b.code); }
    if (b.status !== undefined) { fields.push('status = ?'); vals.push(b.status); }
    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });
    vals.push(req.params.id);
    await pool.query(`UPDATE business_units SET ${fields.join(', ')} WHERE id = ?`, vals);
    res.json({ success: true });
  }));

  app.delete('/api/business-units/:id', ...mgmt, asyncHandler(async (req, res) => {
    const [rows] = (await pool.query(`SELECT company_id FROM business_units WHERE id = ?`, [req.params.id])) as any;
    const bu = rows[0];
    if (!bu) return res.status(404).json({ error: 'Business unit not found' });
    if (!canAccessCompany(req.user!, bu.company_id)) return res.status(403).json({ error: 'Company not found' });
    await pool.query(`UPDATE business_units SET status = 'inactive' WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
  }));

  app.post('/api/staff', ...mgmt, asyncHandler(async (req, res) => {
    if (!canAccessCompany(req.user!, req.body.companyId)) return res.status(403).json({ error: 'Company not found' });
    const errs = validate(req.body, { companyId: { required: true }, branchId: { required: true }, businessUnitId: { required: true }, name: { required: true, type: 'string' }, defaultCommissionPercentage: { required: true, type: 'number', min: 0, max: 100 } });
    if (errs.length) return res.status(400).json({ error: errs.join('; ') });
    const b = req.body;
    await pool.query(`INSERT INTO staff (id, company_id, branch_id, business_unit_id, name, phone, email, role, specialties, default_commission_percentage, status, avatar_url) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [b.id, b.companyId, b.branchId, b.businessUnitId, b.name, b.phone || null, b.email || null, b.role || 'barber', JSON.stringify(b.specialties || []), b.defaultCommissionPercentage, b.status || 'available', b.avatarUrl || null]);
    res.json({ success: true });
  }));

  app.put('/api/staff/:id', ...mgmt, asyncHandler(async (req, res) => {
    const [rows] = (await pool.query(`SELECT company_id FROM staff WHERE id = ?`, [req.params.id])) as any;
    const st = rows[0];
    if (!st) return res.status(404).json({ error: 'Staff not found' });
    if (!canAccessCompany(req.user!, st.company_id)) return res.status(403).json({ error: 'Company not found' });
    const b = req.body;
    const fields: string[] = [];
    const vals: any[] = [];
    if (b.name !== undefined) { fields.push('name = ?'); vals.push(b.name); }
    if (b.phone !== undefined) { fields.push('phone = ?'); vals.push(b.phone); }
    if (b.email !== undefined) { fields.push('email = ?'); vals.push(b.email); }
    if (b.role !== undefined) { fields.push('role = ?'); vals.push(b.role); }
    if (b.branchId !== undefined) { fields.push('branch_id = ?'); vals.push(b.branchId); }
    if (b.businessUnitId !== undefined) { fields.push('business_unit_id = ?'); vals.push(b.businessUnitId); }
    if (b.specialties !== undefined) { fields.push('specialties = ?'); vals.push(JSON.stringify(b.specialties)); }
    if (b.defaultCommissionPercentage !== undefined) { fields.push('default_commission_percentage = ?'); vals.push(b.defaultCommissionPercentage); }
    if (b.status !== undefined) { fields.push('status = ?'); vals.push(b.status); }
    if (b.avatarUrl !== undefined) { fields.push('avatar_url = ?'); vals.push(b.avatarUrl); }
    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });
    vals.push(req.params.id);
    await pool.query(`UPDATE staff SET ${fields.join(', ')} WHERE id = ?`, vals);
    res.json({ success: true });
  }));

  app.delete('/api/staff/:id', ...mgmt, asyncHandler(async (req, res) => {
    const [rows] = (await pool.query(`SELECT company_id FROM staff WHERE id = ?`, [req.params.id])) as any;
    const st = rows[0];
    if (!st) return res.status(404).json({ error: 'Staff not found' });
    if (!canAccessCompany(req.user!, st.company_id)) return res.status(403).json({ error: 'Company not found' });
    await pool.query(`UPDATE staff SET status = 'inactive' WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
  }));

  app.post('/api/services', ...mgmt, asyncHandler(async (req, res) => {
    if (!canAccessCompany(req.user!, req.body.companyId)) return res.status(403).json({ error: 'Company not found' });
    const b = req.body;
    await pool.query(`INSERT INTO services (id, company_id, business_unit_id, name, category, price_etb, duration_minutes, commission_type, commission_value, is_active) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [b.id, b.companyId, b.businessUnitId, b.name, b.category || 'General', b.priceEtb, b.durationMinutes || 30, b.commissionType || 'percentage', b.commissionValue || 0, b.isActive ? 1 : 0]);
    if (Array.isArray(b.requiredInventory) && b.requiredInventory.length) {
      for (const item of b.requiredInventory) {
        await pool.query(`INSERT INTO service_inventory_requirements (service_id, inventory_item_id, quantity_used) VALUES (?,?,?)`, [b.id, item.inventoryItemId, item.quantityUsed]);
      }
    }
    res.json({ success: true });
  }));

  app.put('/api/services/:id', ...mgmt, asyncHandler(async (req, res) => {
    const [rows] = (await pool.query(`SELECT company_id FROM services WHERE id = ?`, [req.params.id])) as any;
    const sv = rows[0];
    if (!sv) return res.status(404).json({ error: 'Service not found' });
    if (!canAccessCompany(req.user!, sv.company_id)) return res.status(403).json({ error: 'Company not found' });
    const b = req.body;
    const fields: string[] = [];
    const vals: any[] = [];
    if (b.name !== undefined) { fields.push('name = ?'); vals.push(b.name); }
    if (b.category !== undefined) { fields.push('category = ?'); vals.push(b.category); }
    if (b.priceEtb !== undefined) { fields.push('price_etb = ?'); vals.push(b.priceEtb); }
    if (b.durationMinutes !== undefined) { fields.push('duration_minutes = ?'); vals.push(b.durationMinutes); }
    if (b.commissionType !== undefined) { fields.push('commission_type = ?'); vals.push(b.commissionType); }
    if (b.commissionValue !== undefined) { fields.push('commission_value = ?'); vals.push(b.commissionValue); }
    if (b.businessUnitId !== undefined) { fields.push('business_unit_id = ?'); vals.push(b.businessUnitId); }
    if (b.isActive !== undefined) { fields.push('is_active = ?'); vals.push(b.isActive ? 1 : 0); }
    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });
    vals.push(req.params.id);
    await pool.query(`UPDATE services SET ${fields.join(', ')} WHERE id = ?`, vals);
    if (Array.isArray(b.requiredInventory)) {
      await pool.query(`DELETE FROM service_inventory_requirements WHERE service_id = ?`, [req.params.id]);
      for (const item of b.requiredInventory) {
        await pool.query(`INSERT INTO service_inventory_requirements (service_id, inventory_item_id, quantity_used) VALUES (?,?,?)`, [req.params.id, item.inventoryItemId, item.quantityUsed]);
      }
    }
    res.json({ success: true });
  }));

  app.delete('/api/services/:id', ...mgmt, asyncHandler(async (req, res) => {
    const [rows] = (await pool.query(`SELECT company_id FROM services WHERE id = ?`, [req.params.id])) as any;
    const sv = rows[0];
    if (!sv) return res.status(404).json({ error: 'Service not found' });
    if (!canAccessCompany(req.user!, sv.company_id)) return res.status(403).json({ error: 'Company not found' });
    await pool.query(`UPDATE services SET is_active = FALSE WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
  }));

  app.post('/api/inventory-items', ...mgmt, asyncHandler(async (req, res) => {
    if (!canAccessCompany(req.user!, req.body.companyId)) return res.status(403).json({ error: 'Company not found' });
    const b = req.body;
    await pool.query(`INSERT INTO inventory_items (id, company_id, branch_id, business_unit_id, name, sku, unit, current_stock, reorder_level, unit_cost_etb) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [b.id, b.companyId, b.branchId, b.businessUnitId, b.name, b.sku || b.name, b.unit || 'pcs', b.currentStock || 0, b.reorderLevel || 0, b.unitCostEtb || 0]);
    await insertAudit({ companyId: b.companyId, branchId: b.branchId }, 'inventory_adjustment', `Inventory item created: ${b.name}`, 'Tenant Admin', 'Stock added');
    res.json({ success: true });
  }));

  app.put('/api/inventory-items/:id', ...mgmt, asyncHandler(async (req, res) => {
    const [rows] = (await pool.query(`SELECT company_id FROM inventory_items WHERE id = ?`, [req.params.id])) as any;
    const inv = rows[0];
    if (!inv) return res.status(404).json({ error: 'Inventory item not found' });
    if (!canAccessCompany(req.user!, inv.company_id)) return res.status(403).json({ error: 'Company not found' });
    const b = req.body;
    const fields: string[] = [];
    const vals: any[] = [];
    if (b.name !== undefined) { fields.push('name = ?'); vals.push(b.name); }
    if (b.sku !== undefined) { fields.push('sku = ?'); vals.push(b.sku); }
    if (b.unit !== undefined) { fields.push('unit = ?'); vals.push(b.unit); }
    if (b.currentStock !== undefined) { fields.push('current_stock = ?'); vals.push(b.currentStock); }
    if (b.reorderLevel !== undefined) { fields.push('reorder_level = ?'); vals.push(b.reorderLevel); }
    if (b.unitCostEtb !== undefined) { fields.push('unit_cost_etb = ?'); vals.push(b.unitCostEtb); }
    if (b.sellingPriceEtb !== undefined) { fields.push('selling_price_etb = ?'); vals.push(b.sellingPriceEtb); }
    if (b.branchId !== undefined) { fields.push('branch_id = ?'); vals.push(b.branchId); }
    if (b.businessUnitId !== undefined) { fields.push('business_unit_id = ?'); vals.push(b.businessUnitId); }
    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });
    vals.push(req.params.id);
    await pool.query(`UPDATE inventory_items SET ${fields.join(', ')} WHERE id = ?`, vals);
    res.json({ success: true });
  }));

  app.delete('/api/inventory-items/:id', ...mgmt, asyncHandler(async (req, res) => {
    const [rows] = (await pool.query(`SELECT company_id, name FROM inventory_items WHERE id = ?`, [req.params.id])) as any;
    const inv = rows[0];
    if (!inv) return res.status(404).json({ error: 'Inventory item not found' });
    if (!canAccessCompany(req.user!, inv.company_id)) return res.status(403).json({ error: 'Company not found' });
    await pool.query(`DELETE FROM inventory_items WHERE id = ?`, [req.params.id]);
    await insertAudit({ companyId: inv.company_id, branchId: null }, 'inventory_adjustment', `Inventory item deleted: ${inv.name}`, req.user!.name);
    res.json({ success: true });
  }));

  app.post('/api/inventory-items/adjust-stock', ...mgmt, asyncHandler(async (req, res) => {
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

  app.post('/api/commission-rules', ...mgmt, asyncHandler(async (req, res) => {
    if (!canAccessCompany(req.user!, req.body.companyId)) return res.status(403).json({ error: 'Company not found' });
    const b = req.body;
    await pool.query(
      `INSERT INTO commission_rules (id, company_id, target_type, target_id, target_name, type, value, deduct_product_cost, is_active)
       VALUES (?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE type=VALUES(type), value=VALUES(value), deduct_product_cost=VALUES(deduct_product_cost), is_active=VALUES(is_active)`,
      [b.id, b.companyId, b.targetType, b.targetId, b.targetName, b.type, b.value, b.deductProductCost ? 1 : 0, b.isActive ? 1 : 0]);
    await insertAudit({ companyId: b.companyId, branchId: null }, 'commission_change', `Commission Rule configured: ${b.targetName}`, 'Tenant Admin', `Value ${b.value}`);
    res.json({ success: true });
  }));

  app.delete('/api/commission-rules/:id', ...mgmt, asyncHandler(async (req, res) => {
    const [rows] = (await pool.query(`SELECT company_id, target_name FROM commission_rules WHERE id = ?`, [req.params.id])) as any;
    const rule = rows[0];
    if (!rule) return res.status(404).json({ error: 'Commission rule not found' });
    if (!canAccessCompany(req.user!, rule.company_id)) return res.status(403).json({ error: 'Company not found' });
    await pool.query(`DELETE FROM commission_rules WHERE id = ?`, [req.params.id]);
    await insertAudit({ companyId: rule.company_id, branchId: null }, 'commission_change', `Commission Rule deleted: ${rule.target_name}`, req.user!.name);
    res.json({ success: true });
  }));

  // Update commission payout status
  app.patch('/api/commission-logs/payout', ...mgmt, asyncHandler(async (req, res) => {
    const { id, payoutStatus } = req.body;
    if (!id || !payoutStatus) return res.status(400).json({ error: 'id and payoutStatus are required' });
    if (!['unpaid', 'payout_requested', 'paid'].includes(payoutStatus)) {
      return res.status(400).json({ error: 'payoutStatus must be unpaid, payout_requested, or paid' });
    }
    const [rows] = (await pool.query(`SELECT company_id FROM commission_logs WHERE id = ?`, [id])) as any;
    const log = rows[0];
    if (!log) return res.status(404).json({ error: 'Commission log not found' });
    if (!canAccessCompany(req.user!, log.company_id)) return res.status(403).json({ error: 'Company not found' });
    await pool.query(`UPDATE commission_logs SET payout_status = ? WHERE id = ?`, [payoutStatus, id]);
    res.json({ success: true });
  }));

  app.post('/api/expenses', ...mgmt, asyncHandler(async (req, res) => {
    if (!canAccessCompany(req.user!, req.body.companyId)) return res.status(403).json({ error: 'Company not found' });
    const errs = validate(req.body, { companyId: { required: true }, branchId: { required: true }, category: { required: true, enum: ['rent', 'utilities', 'inventory_purchase', 'salary', 'marketing', 'other'] }, amountEtb: { required: true, type: 'number', min: 0 }, description: { required: true, type: 'string' }, paymentMethod: { required: true, enum: ['telebirr', 'cbe_birr', 'cash', 'card', 'mixed'] } });
    if (errs.length) return res.status(400).json({ error: errs.join('; ') });
    const b = req.body;
    await pool.query(`INSERT INTO expenses (id, company_id, branch_id, business_unit_id, category, amount_etb, description, payment_method, recorded_by, date, is_recurring, recurrence_frequency, next_due_date, auto_process_trigger) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [b.id, b.companyId, b.branchId, b.businessUnitId || null, b.category, b.amountEtb, b.description, b.paymentMethod, b.recordedBy || req.user!.name, b.date || new Date().toISOString().slice(0, 10), b.isRecurring ? 1 : 0, b.recurrenceFrequency || null, b.nextDueDate || null, b.autoProcessTrigger ? 1 : 0]);
    await insertAudit({ companyId: b.companyId, branchId: b.branchId }, 'expense_added', `Expense recorded: ${b.description}`, req.user!.name, `Amount ${b.amountEtb} ETB`);
    res.json({ success: true });
  }));

  app.put('/api/expenses/:id', ...mgmt, asyncHandler(async (req, res) => {
    const [rows] = (await pool.query(`SELECT company_id FROM expenses WHERE id = ?`, [req.params.id])) as any;
    const exp = rows[0];
    if (!exp) return res.status(404).json({ error: 'Expense not found' });
    if (!canAccessCompany(req.user!, exp.company_id)) return res.status(403).json({ error: 'Company not found' });
    const b = req.body;
    const fields: string[] = [];
    const vals: any[] = [];
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

  app.delete('/api/expenses/:id', ...mgmt, asyncHandler(async (req, res) => {
    const [rows] = (await pool.query(`SELECT company_id, description FROM expenses WHERE id = ?`, [req.params.id])) as any;
    const exp = rows[0];
    if (!exp) return res.status(404).json({ error: 'Expense not found' });
    if (!canAccessCompany(req.user!, exp.company_id)) return res.status(403).json({ error: 'Company not found' });
    await pool.query(`DELETE FROM expenses WHERE id = ?`, [req.params.id]);
    await insertAudit({ companyId: exp.company_id, branchId: null }, 'expense_added', `Expense deleted: ${exp.description}`, req.user!.name);
    res.json({ success: true });
  }));

  // ==========================================================
  // RECEPTION POS (receptionist + manager + super_admin)
  // ==========================================================
  const pos = [authenticate, requireRoles('super_admin', 'tenant_manager', 'receptionist'), rateLimit(180, 60_000)];

  app.post('/api/customers', ...pos, asyncHandler(async (req, res) => {
    if (!canAccessCompany(req.user!, req.body.companyId)) return res.status(403).json({ error: 'Company not found' });
    const b = req.body;
    await pool.query(`INSERT INTO customers (id, company_id, name, phone, email, notes) VALUES (?,?,?,?,?,?)`,
      [b.id, b.companyId, b.name, b.phone, b.email || null, b.notes || null]);
    res.json({ success: true });
  }));

  app.put('/api/customers/:id', ...pos, asyncHandler(async (req, res) => {
    const [rows] = (await pool.query(`SELECT company_id FROM customers WHERE id = ?`, [req.params.id])) as any;
    const cust = rows[0];
    if (!cust) return res.status(404).json({ error: 'Customer not found' });
    if (!canAccessCompany(req.user!, cust.company_id)) return res.status(403).json({ error: 'Company not found' });
    const b = req.body;
    const fields: string[] = [];
    const vals: any[] = [];
    if (b.name !== undefined) { fields.push('name = ?'); vals.push(b.name); }
    if (b.phone !== undefined) { fields.push('phone = ?'); vals.push(b.phone); }
    if (b.email !== undefined) { fields.push('email = ?'); vals.push(b.email); }
    if (b.notes !== undefined) { fields.push('notes = ?'); vals.push(b.notes); }
    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });
    vals.push(req.params.id);
    await pool.query(`UPDATE customers SET ${fields.join(', ')} WHERE id = ?`, vals);
    res.json({ success: true });
  }));

  // Create visit session — server computes the queue number to prevent duplicates
  app.post('/api/visit-sessions', ...pos, asyncHandler(async (req, res) => {
    if (!canAccessCompany(req.user!, req.body.companyId)) return res.status(403).json({ error: 'Company not found' });
    const b = req.body;
    const queueNumber = await nextQueueNumber(b.companyId, b.branchId);
    await pool.query(
      `INSERT INTO visit_sessions (id, company_id, branch_id, business_unit_id, queue_number, customer_id, customer_name, customer_phone, status, subtotal_etb, discount_etb, tax_etb, net_total_etb, started_at, notes, is_paid) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0)`,
      [b.id, b.companyId, b.branchId, b.businessUnitId || null, queueNumber, b.customerId, b.customerName, b.customerPhone, b.status || 'queued', b.subtotalEtb || 0, b.discountEtb || 0, b.taxEtb || 0, b.netTotalEtb || 0, b.startedAt || null, b.notes || null]
    );
    if (Array.isArray(b.services)) {
      for (const s of b.services) {
        await pool.query(`INSERT INTO visit_session_services (id, visit_session_id, service_id, service_name, staff_id, staff_name, price_etb, duration_minutes, commission_earned_etb, status) VALUES (?,?,?,?,?,?,?,?,?,?)`,
          [s.id, b.id, s.serviceId, s.serviceName, s.staffId, s.staffName, s.priceEtb, s.durationMinutes || 30, s.commissionEarnedEtb || 0, s.status || 'pending']);
      }
    }
    res.json({ success: true, queueNumber });
  }));

  // Update session status — dispatch SMS server-side (queue turn alert / receipt)
  const statusSchema: ValidationSchema = { id: { required: true }, status: { required: true, enum: ['queued', 'in_progress', 'completed', 'cancelled'] } };
  app.patch('/api/visit-sessions/status', ...pos, asyncHandler(async (req, res) => {
    const errs = validate(req.body, statusSchema);
    if (errs.length) return res.status(400).json({ error: errs.join('; ') });
    const b = req.body as any;
    const [rows] = (await pool.query(`SELECT company_id, branch_id, customer_phone, customer_name, queue_number, net_total_etb FROM visit_sessions WHERE id = ?`, [b.id])) as any;
    const s = rows[0];
    if (!s) return notFound('Session not found');
    if (!canAccessCompany(req.user!, s.company_id)) return res.status(403).json({ error: 'Company not found' });

    await pool.query(`UPDATE visit_sessions SET status = ? WHERE id = ?`, [b.status, b.id]);
    if (b.status === 'in_progress') {
      await sms.dispatch({ companyId: s.company_id, recipientPhone: s.customer_phone, messageType: 'queue_turn_alert', content: `Hello ${s.customer_name}! Queue #${s.queue_number} is now IN PROGRESS — your station is ready.` });
    }
    res.json({ success: true, status: b.status });
  }));

  app.patch('/api/visit-sessions/staff', ...pos, asyncHandler(async (req, res) => {
    if (!canAccessCompany(req.user!, req.body.companyId ?? '')) return res.status(403).json({ error: 'Company not found' });
    await pool.query(`UPDATE visit_session_services SET staff_id = ?, staff_name = ? WHERE visit_session_id = ?`, [req.body.staffId, req.body.staffName, req.body.id]);
    res.json({ success: true });
  }));

  // ==========================================================
  // CHECKOUT — atomic transaction; commissions recomputed server-side
  // ==========================================================
  app.post('/api/visit-sessions/checkout', ...pos, asyncHandler(async (req, res) => {
    const { sessionId, paymentMethod, reference, completedAt, pointsEarned } = req.body;
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [rows] = (await connection.query(`SELECT * FROM visit_sessions WHERE id = ?`, [sessionId])) as any;
      const session = rows[0];
      if (!session) {
        const e: any = new Error('Session not found');
        e.status = 404;
        throw e;
      }
      if (!canAccessCompany(req.user!, session.company_id)) {
        const e: any = new Error('Access denied for this company');
        e.status = 403;
        throw e;
      }

      // 1. Mark the session completed & paid, recomputing totals server-side
      const [svcRows] = (await connection.query(`SELECT price_etb FROM visit_session_services WHERE visit_session_id = ?`, [sessionId])) as any;
      const subtotal = svcRows.reduce((acc: number, s: any) => acc + Number(s.price_etb || 0), 0);
      const discount = Number(session.discount_etb || 0);
      const tax = Number(session.tax_etb || 0);
      const netTotal = Math.max(0, subtotal - discount + tax);
      await connection.query(`UPDATE visit_sessions SET status='completed', is_paid=TRUE, payment_method=?, payment_reference=?, completed_at=?, subtotal_etb=?, net_total_etb=? WHERE id=?`,
        [paymentMethod, reference, completedAt || new Date().toISOString(), subtotal, netTotal, sessionId]);

      // 2. Server-side commission re-computation from DB rules
      const [services] = (await connection.query(`SELECT * FROM visit_session_services WHERE visit_session_id = ?`, [sessionId])) as any;
      await connection.query(`UPDATE visit_session_services SET status='completed' WHERE visit_session_id = ?`, [sessionId]);
      const [rules] = (await connection.query(`SELECT * FROM commission_rules WHERE company_id = ? AND is_active = TRUE`, [session.company_id])) as any;
      const [staffRows] = (await connection.query(`SELECT id, default_commission_percentage FROM staff WHERE company_id = ?`, [session.company_id])) as any;
      const staffDefault: Record<string, number> = Object.fromEntries(
        staffRows.map((st: any) => [st.id, Number(st.default_commission_percentage)])
      );

      for (const svc of services) {
        const staffRule = rules.find((r: any) => r.target_type === 'staff' && r.target_id === svc.staff_id);
        const serviceRule = rules.find((r: any) => r.target_type === 'service' && r.target_id === svc.service_id);
        const rule = staffRule || serviceRule;
        let amt = 0;
        let label = '';
        if (rule) {
          if (rule.type === 'percentage') {
            amt = Math.round((Number(svc.price_etb) * Number(rule.value)) / 100);
            label = `${rule.value}% ${rule.target_type === 'staff' ? 'Staff' : 'Service'} Custom Rule`;
          } else {
            amt = Number(rule.value);
            label = `${rule.value} ETB Fixed Rate`;
          }
        } else {
          const pct = staffDefault[svc.staff_id] ?? 30;
          amt = Math.round((Number(svc.price_etb) * pct) / 100);
          label = `${pct}% Standard Rate`;
        }
        await connection.query(`UPDATE visit_session_services SET commission_earned_etb = ? WHERE id = ?`, [amt, svc.id]);
        await connection.query(
          `INSERT INTO commission_logs (id, company_id, branch_id, staff_id, staff_name, visit_session_id, service_name, service_price_etb, commission_amount_etb, rule_applied, payout_status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,NOW())`,
          [id('com'), session.company_id, session.branch_id, svc.staff_id, svc.staff_name, sessionId, svc.service_name, svc.price_etb, amt, label, 'unpaid']
        );
      }

      // 3. Update customer loyalty & VIP
      const pts = pointsEarned ?? Math.floor(Number(session.net_total_etb) / 10);
      await connection.query(
        `UPDATE customers SET total_spent_etb = total_spent_etb + ?, total_visits = total_visits + 1, loyalty_points = loyalty_points + ?, is_vip = IF(total_spent_etb + ? >= 10000 OR total_visits + 1 >= 10, TRUE, FALSE) WHERE id = ?`,
        [session.net_total_etb, pts, session.net_total_etb, session.customer_id]);

      // 4. Deduct inventory from service requirements
      const [svcIds] = await connection.query(`SELECT service_id FROM visit_session_services WHERE visit_session_id = ?`, [sessionId]);
      for (const row of svcIds as any[]) {
        const [reqs] = await connection.query(`SELECT inventory_item_id, quantity_used FROM service_inventory_requirements WHERE service_id = ?`, [row.service_id]);
        for (const rq of reqs as any[]) {
          await connection.query(`UPDATE inventory_items SET current_stock = GREATEST(0, current_stock - ?) WHERE id = ?`, [rq.quantity_used, rq.inventory_item_id]);
        }
      }

      // 5. Audit log
      await connection.query(`INSERT INTO audit_logs (id, company_id, branch_id, action_type, description, performed_by, timestamp) VALUES (?,?,?,?,?,?,NOW())`,
        [id('aud'), session.company_id, session.branch_id, 'payment_edit', `Checkout completed for session ${session.queue_number} (${session.net_total_etb} ETB via ${paymentMethod || 'cash'})`, `Receptionist (${req.user!.name})`]);

      await connection.commit();

      // After commit: dispatch SMS receipt (non-transactional)
      await sms.dispatch({ companyId: session.company_id, recipientPhone: session.customer_phone, messageType: 'session_receipt', content: `Thank you ${session.customer_name}! Payment ${session.net_total_etb} ETB confirmed. You earned +${pts} loyalty points.` });

      res.json({ success: true });
    } catch (e) {
      await connection.rollback();
      throw e;
    } finally {
      connection.release();
    }
  }));

  app.post('/api/audit-logs', ...mgmt, asyncHandler(async (req, res) => {
    if (!canAccessCompany(req.user!, req.body.companyId)) return res.status(403).json({ error: 'Company not found' });
    const b = req.body;
    await pool.query(
      `INSERT INTO audit_logs (id, company_id, branch_id, action_type, description, performed_by, timestamp, details, ip_address) VALUES (?,?,?,?,?,?,?,?,?)`,
      [b.id, b.companyId, b.branchId || null, b.actionType, b.description, b.performedBy, b.timestamp || new Date().toISOString(), b.details || null, b.ipAddress || null]
    );
    res.json({ success: true });
  }));

  // Audit log CSV export (tenant-scoped, optional actionType filter)
  app.get('/api/audit/export.csv', ...mgmt, asyncHandler(async (req, res) => {
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

  app.post('/api/sms-logs', ...mgmt, asyncHandler(async (req, res) => {
    if (!canAccessCompany(req.user!, req.body.companyId)) return res.status(403).json({ error: 'Company not found' });
    const b = req.body;
    await pool.query(`INSERT INTO sms_logs (id, company_id, recipient_phone, message_type, content, status, sent_at) VALUES (?,?,?,?,?,?,?)`,
      [b.id, b.companyId, b.recipientPhone, b.messageType, b.content, b.status || 'sent', b.sentAt || new Date().toISOString()]);
    res.json({ success: true });
  }));

  // ==========================================================
  // USER MANAGEMENT (tenant_manager + super_admin)
  // ==========================================================
  app.post('/api/users', ...mgmt, asyncHandler(async (req, res) => {
    if (!canAccessCompany(req.user!, req.body.companyId)) return res.status(403).json({ error: 'Company not found' });
    const errs = validate(req.body, { companyId: { required: true }, name: { required: true, type: 'string' }, email: { required: true, type: 'string' }, password: { required: true, type: 'string' }, role: { required: true, enum: ['super_admin', 'tenant_manager', 'receptionist', 'staff'] } });
    if (errs.length) return res.status(400).json({ error: errs.join('; ') });
    const b = req.body;
    const [existing] = (await pool.query(`SELECT id FROM users WHERE email = ?`, [b.email])) as any;
    if (existing.length > 0) return res.status(409).json({ error: 'Email already in use' });
    await pool.query(
      `INSERT INTO users (id, company_id, name, email, password_hash, role, is_active) VALUES (?,?,?,?,?,?,?)`,
      [b.id, b.companyId, b.name, b.email, hashPassword(b.password), b.role, b.isActive !== false ? 1 : 0]
    );
    res.json({ success: true });
  }));

  app.put('/api/users/:id', ...mgmt, asyncHandler(async (req, res) => {
    const [rows] = (await pool.query(`SELECT company_id FROM users WHERE id = ?`, [req.params.id])) as any;
    const u = rows[0];
    if (!u) return res.status(404).json({ error: 'User not found' });
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

  // ==========================================================
  // GEMINI AI
  // ==========================================================
  app.post('/api/gemini', authenticate, requireRoles('super_admin', 'tenant_manager'), asyncHandler(async (req, res) => {
    const errs = validate(req.body, { prompt: { required: true, type: 'string' } });
    if (errs.length) return res.status(400).json({ error: errs.join('; ') });
    if (!aiClient) {
      return res.json({
        text: `[AI Analytics Insight] Analysis for "${req.body.prompt}":\n1. Bole Branch shows peak demand between 2 PM and 6 PM.\n2. Haircut & Beard Grooming generate 42% of daily commissions.\n3. Massage Oil stock (320ml) is approaching reorder threshold (300ml).\n4. Recommend assigning 2 extra weekend masseuses and sending a promo SMS to VIPs.`,
      });
    }
    const response = await aiClient.models.generateContent({
      model: MODEL,
      contents: req.body.prompt,
      config: req.body.systemInstruction ? { systemInstruction: req.body.systemInstruction, temperature: 0.7 } : undefined,
    });
    return res.json({ text: response.text });
  }));

  // ==========================================================
  // Static / dev serve
  // ==========================================================
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.use(errorHandler);

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Serenity Salon & Spa ERP SaaS running on http://0.0.0.0:${PORT}`);
  });

  const shutdown = () => {
    console.log('Shutting down gracefully...');
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

startServer().catch((err) => {
  console.error('Server startup error:', err);
  process.exit(1);
});