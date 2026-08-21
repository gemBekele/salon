import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import pg from 'pg';
import type { Express } from 'express';

/**
 * Black-box integration tests against a throwaway PostgreSQL database
 * (`gech_salon_test`). The whole suite skips if PostgreSQL is not reachable,
 * so it is safe to run in CI without a database.
 */

const TEST_DB = 'gech_salon_test';

async function pgAvailable(): Promise<boolean> {
  let client: pg.Client | undefined;
  try {
    client = new pg.Client({
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT) || 5432,
      user: process.env.DB_USERNAME || 'gech',
      password: process.env.DB_PASSWORD || '',
      database: 'postgres',
    });
    await client.connect();
    await client.query('SELECT 1');
    return true;
  } catch {
    return false;
  } finally {
    if (client) await client.end().catch(() => {});
  }
}

async function setup(): Promise<{ app: Express; pool: import('../db').DbPool; clean: () => Promise<void> }> {
  // Reset the test database and apply all migrations.
  const { runMigrations } = await import('../../db/migrate');
  await runMigrations(TEST_DB, { reset: true });

  const { createDbPool } = await import('../db');
  const pool = createDbPool(TEST_DB);

  const { ensureSeeded } = await import('../seed');
  await ensureSeeded(pool);

  const { createSmsService } = await import('../sms');
  const { createApp } = await import('../app');

  const app = createApp(pool, { sms: createSmsService(pool), aiClient: null, geminiModel: 'test' });

  const clean = async () => {
    await pool.end();
    const admin = new pg.Client({
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT) || 5432,
      user: process.env.DB_USERNAME || 'gech',
      password: process.env.DB_PASSWORD || '',
      database: 'postgres',
    });
    await admin.connect();
    await admin.query(`DROP DATABASE IF EXISTS "${TEST_DB}"`).catch(() => {});
    await admin.end();
  };

  return { app, pool, clean };
}

const available = await pgAvailable();

(available ? describe : describe.skip)(`API integration (against PostgreSQL "${TEST_DB}")`, () => {
  let app: Express;
  let pool: import('../db').DbPool;
  let clean: () => Promise<void>;
  let receptionToken: string;
  let superToken: string;
  let ownerToken: string;

  beforeAll(async () => {
    const ctx = await setup();
    app = ctx.app;
    pool = ctx.pool;
    clean = ctx.clean;

    const login = async (email: string, password: string) => {
      const res = await request(app).post('/api/auth/login').send({ email, password });
      return res.body.token as string;
    };
    superToken = await login('admin@serenity.et', 'Admin123!');
    receptionToken = await login('liya@gechsalon.et', 'Staff123!');
    ownerToken = await login('owner@gechsalon.et', 'Owner123!');
    const decode = (i: number) => {
      const part = (receptionToken || '').split('.')[1];
      if (!part) return 'NO-TOKEN';
      const json = JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
      return json.email + ':' + json.role;
    };
    console.log('[debug] superToken present =', !!superToken, '| reception =', decode(0));
  }, 60_000);

  afterAll(async () => {
    if (clean) await clean();
  });

  describe('authentication', () => {
    it('rejects an invalid password', async () => {
      const res = await request(app).post('/api/auth/login').send({ email: 'admin@serenity.et', password: 'Wrong!' });
      expect(res.status).toBe(401);
    });

    it('returns /api/auth/me for a valid token', async () => {
      const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${superToken}`);
      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('super_admin');
    });

    it('rejects requests without a token', async () => {
      const res = await request(app).get('/api/db-state');
      expect(res.status).toBe(401);
    });
  });

  describe('RBAC / tenant isolation', () => {
    it('blocks a receptionist from calling management routes', async () => {
      const res = await request(app)
        .post('/api/branches')
        .set('Authorization', `Bearer ${receptionToken}`)
        .send({ companyId: 'cmp_gech_01', name: 'Nope', city: 'Hawassa' });
      expect(res.status).toBe(403);
    });

    it('blocks a receptionist from creating a user', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${receptionToken}`)
        .send({ companyId: 'cmp_gech_01', name: 'X', email: 'x@x.com', password: 'Pass123!', role: 'staff' });
      expect(res.status).toBe(403);
    });

    it('allows the super admin to create a company', async () => {
      const res = await request(app)
        .post('/api/companies')
        .set('Authorization', `Bearer ${superToken}`)
        .send({ name: 'Integration Tenant', subscriptionPlanId: 'plan_starter' });
      expect(res.status).toBe(200);
      expect(res.body.id).toBeTruthy();
    });
  });

  describe('customer management', () => {
    it('creates a customer and rejects a duplicate phone with 409', async () => {
      const auth = () => ({ Authorization: `Bearer ${receptionToken}` });
      const create = await request(app)
        .post('/api/customers')
        .set(auth())
        .send({ companyId: 'cmp_gech_01', name: 'Ada Test', phone: '+251 90 000 0101', email: 'ada@test.et' });
      expect(create.status).toBe(200);
      const id = create.body.id;

      const dup = await request(app)
        .post('/api/customers')
        .set(auth())
        .send({ companyId: 'cmp_gech_01', name: 'Ada Dup', phone: '+251 90 000 0101' });
      expect(dup.status).toBe(409);

      pool.query(`DELETE FROM customers WHERE id = ?`, [id]);
    });

    it('requires a name and phone', async () => {
      const res = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${receptionToken}`)
        .send({ companyId: 'cmp_gech_01' });
      console.log('[debug] requires-name-and-phone ->', res.status, res.body);
      expect(res.status).toBe(400);
    });
  });

  describe('POS checkout transaction', () => {
    it('checks out a session, computing commissions, deducing inventory and granting loyalty', async () => {
      const auth = () => ({ Authorization: `Bearer ${receptionToken}` });

      // Fresh customer so loyalty assertions are deterministic.
      const cust = await request(app)
        .post('/api/customers')
        .set(auth())
        .send({ companyId: 'cmp_gech_01', name: 'Meri Checkout', phone: '+251 90 000 0202' });
      const customerId = cust.body.id;

      // Session with one service (Hair Coloring srv_amh_28 = 4000 ETB, 28% staff rule).
      const session = await request(app)
        .post('/api/visit-sessions')
        .set(auth())
        .send({
          companyId: 'cmp_gech_01',
          branchId: 'br_female_01',
          businessUnitId: 'bu_female_hair',
          customerId,
          customerName: 'Moe Checkout',
          customerPhone: '+251 90 000 0202',
          services: [{
            serviceId: 'srv_amh_28',
            serviceName: 'Hair Coloring',
            staffId: 'stf_hana_01',
            staffName: 'Hana Abera',
            priceEtb: 4000,
            durationMinutes: 120,
          }],
        });
      expect(session.status).toBe(200);
      if (session.status !== 200) console.log('[debug] visit-session ->', session.status, session.body);
      expect(session.body.queueNumber).toMatch(/^Q-\d+$/);
      const sessionId = session.body.id;

      const [stockBefore] = await pool.query<any>(
        `SELECT current_stock FROM inventory_items WHERE id = 'inv_hair_color'`
      );

      const checkout = await request(app)
        .post('/api/visit-sessions/checkout')
        .set(auth())
        .send({ sessionId, paymentMethod: 'telebirr', reference: 'REF-IT-1' });
      expect(checkout.status).toBe(200);

      // Session completed and paid.
      const [sessionRows] = await pool.query<any>(`SELECT * FROM visit_sessions WHERE id = ?`, [sessionId]);
      expect(sessionRows[0].status).toBe('completed');
      expect(sessionRows[0].is_paid).toBe(true);
      expect(Number(sessionRows[0].net_total_etb)).toBe(4000);

      // Commission log for Hana (28% rule of 4000 = 1120).
      const [comm] = await pool.query<any>(`SELECT * FROM commission_logs WHERE visit_session_id = ?`, [sessionId]);
      expect(comm.length).toBe(1);
      expect(Number(comm[0].commission_amount_etb)).toBe(1120);
      expect(comm[0].staff_id).toBe('stf_hana_01');
      expect(comm[0].payout_status).toBe('unpaid');

      // Payment ledger row written.
      const [payments] = await pool.query<any>(`SELECT * FROM payments WHERE payable_type = 'visit' AND payable_id = ?`, [sessionId]);
      expect(payments.length).toBe(1);
      expect(Number(payments[0].amount_etb)).toBe(4000);
      expect(payments[0].method).toBe('bank');
      expect(payments[0].bank_name).toBe('Telebirr');

      // Inventory deducted by the service requirement (1 unit).
      const [stockAfter] = await pool.query<any>(
        `SELECT current_stock FROM inventory_items WHERE id = 'inv_hair_color'`
      );
      expect(Number(stockAfter[0].current_stock)).toBe(Number(stockBefore[0].current_stock) - 1);

      // Loyalty accrual: +1 pt per 10 ETB on the discount-free net total.
      const [custRow] = await pool.query<any>(`SELECT loyalty_points, total_spent_etb, total_visits FROM customers WHERE id = ?`, [customerId]);
      expect(custRow[0].total_visits).toBe(1);
      expect(Number(custRow[0].total_spent_etb)).toBe(4000);
      expect(Number(custRow[0].loyalty_points)).toBe(400);

      // Idempotence guard: checkout again should NOT re-create commission logs.
      const again = await request(app).post('/api/visit-sessions/checkout').set(auth()).send({ sessionId, paymentMethod: 'cash' });
      expect(again.status).toBe(200);
      const [commAfter] = await pool.query<any>(`SELECT * FROM commission_logs WHERE visit_session_id = ?`, [sessionId]);
      expect(commAfter.length).toBe(1);
    });
  });

  describe('commission payout management', () => {
    it('pays an accepted amount, marking the oldest unpaid logs as paid and leaving the rest unpaid', async () => {
      const auth = () => ({ Authorization: `Bearer ${ownerToken}` });

      // Reuse an existing session id (POS checkout describe above created one) so the FK holds.
      const [sessRows] = await pool.query<any>(
        `SELECT id FROM visit_sessions WHERE company_id = 'cmp_gech_01' ORDER BY created_at DESC LIMIT 1`
      );
      const sessionId = sessRows[0].id;

      // stf_meron_02 has no unpaid logs in the seed, so our two rows are the only ones.
      const logId1 = `cl_paytest_1_${Date.now()}`;
      const logId2 = `cl_paytest_2_${Date.now()}`;
      const rows = [
        [logId1, 'cmp_gech_01', 'br_female_01', 'stf_meron_02', 'Meron Tadesse', sessionId, 'Hair Coloring', 4000, 1120, '28% Hair Coloring Rate', 'unpaid'],
        [logId2, 'cmp_gech_01', 'br_female_01', 'stf_meron_02', 'Meron Tadesse', sessionId, 'Hair Trim', 800, 200, '25% Hair Trim Rate', 'unpaid'],
      ] as const;
      for (const r of rows) {
        await pool.query(
          `INSERT INTO commission_logs (id, company_id, branch_id, staff_id, staff_name, visit_session_id, service_name, service_price_etb, commission_amount_etb, rule_applied, payout_status)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
          [...r]
        );
      }

      // Accepted amount covers only the oldest log (1120); the 200 ETB log stays unpaid.
      const partial = await request(app)
        .patch('/api/commission-logs/payout/batch')
        .set(auth())
        .send({ staffId: 'stf_meron_02', companyId: 'cmp_gech_01', amountAcceptedEtb: 1120, notes: 'partial settlement' });
      expect(partial.status).toBe(200);
      expect(partial.body.logsPaid).toBe(1);
      expect(partial.body.amountPaidEtb).toBe(1120);
      expect(partial.body.payoutId).toMatch(/^pay_/);

      const [afterPartial] = await pool.query<any>(
        `SELECT id, payout_status FROM commission_logs WHERE id IN (?, ?) ORDER BY id`,
        [logId1, logId2]
      );
      expect(afterPartial[0].payout_status).toBe('paid'); // oldest (inserted first, id-sorted)
      expect(afterPartial[1].payout_status).toBe('unpaid'); // remainder stays unpaid

      const [payoutRows] = await pool.query<any>(
        `SELECT id, amount_accepted_etb, logs_paid, notes FROM commission_payouts WHERE staff_id = 'stf_meron_02' ORDER BY created_at DESC LIMIT 1`
      );
      expect(Number(payoutRows[0].amount_accepted_etb)).toBe(1120);
      expect(payoutRows[0].logs_paid).toBe(1);
      expect(payoutRows[0].notes).toBe('partial settlement');
      expect(payoutRows[0].id).toBe(partial.body.payoutId);

      // Now settle the remainder: paying 200 flips the last log and the total is fully paid.
      const rest = await request(app)
        .patch('/api/commission-logs/payout/batch')
        .set(auth())
        .send({ staffId: 'stf_meron_02', companyId: 'cmp_gech_01', amountAcceptedEtb: 200 });
      expect(rest.status).toBe(200);
      expect(rest.body.logsPaid).toBe(1);

      const [afterAll] = await pool.query<any>(
        `SELECT COUNT(*)::int AS n FROM commission_logs WHERE staff_id = 'stf_meron_02' AND payout_status != 'paid' AND company_id = 'cmp_gech_01' AND id IN (?, ?)`,
        [logId1, logId2]
      );
      expect(afterAll[0].n).toBe(0);

      // Nothing left to pay -> 400.
      const nothingLeft = await request(app)
        .patch('/api/commission-logs/payout/batch')
        .set(auth())
        .send({ staffId: 'stf_meron_02', companyId: 'cmp_gech_01', amountAcceptedEtb: 100 });
      expect(nothingLeft.status).toBe(400);

      // Validation guards.
      const badAmount = await request(app)
        .patch('/api/commission-logs/payout/batch')
        .set(auth())
        .send({ staffId: 'stf_meron_02', companyId: 'cmp_gech_01', amountAcceptedEtb: -5 });
      expect(badAmount.status).toBe(400);

      const noStaff = await request(app)
        .patch('/api/commission-logs/payout/batch')
        .set(auth())
        .send({ companyId: 'cmp_gech_01', amountAcceptedEtb: 100 });
      expect(noStaff.status).toBe(400);

      await pool.query(
        `DELETE FROM commission_payouts WHERE staff_id = 'stf_meron_02' AND id IN (?, ?)`,
        [partial.body.payoutId, rest.body.payoutId]
      );
      await pool.query(`DELETE FROM commission_logs WHERE id IN (?, ?)`, [logId1, logId2]);
    });
  });

  describe('retail material sales', () => {
    it('creates a sale at the locked selling price and deducts stock only on payment', async () => {
      const auth = () => ({ Authorization: `Bearer ${receptionToken}` });

      const [stockBefore] = await pool.query<any>(
        `SELECT current_stock FROM inventory_items WHERE id = 'inv_retail_shampoo'`
      );

      const create = await request(app)
        .post('/api/material-sales')
        .set(auth())
        .send({
          companyId: 'cmp_gech_01',
          branchId: 'br_female_01',
          customerName: 'Retail Buyer',
          customerPhone: '+251 90 000 0303',
          items: [{ inventoryItemId: 'inv_retail_shampoo', quantity: 2 }],
        });
      expect(create.status).toBe(200);
      const saleId = create.body.id;
      expect(Number(create.body.subtotalEtb)).toBe(1100);

      // Stock is untouched until payment.
      const [stockMid] = await pool.query<any>(`SELECT current_stock FROM inventory_items WHERE id = 'inv_retail_shampoo'`);
      expect(Number(stockMid[0].current_stock)).toBe(Number(stockBefore[0].current_stock));

      const checkout = await request(app)
        .post('/api/payments/checkout')
        .set(auth())
        .send({ payableType: 'material_sale', payableId: saleId, payments: [{ method: 'cash', amountEtb: 1100 }] });
      expect(checkout.status).toBe(200);

      const [saleRows] = await pool.query<any>(`SELECT * FROM material_sales WHERE id = ?`, [saleId]);
      expect(saleRows[0].status).toBe('completed');
      expect(saleRows[0].is_paid).toBe(true);
      expect(Number(saleRows[0].net_total_etb)).toBe(1100);

      const [itemRows] = await pool.query<any>(`SELECT * FROM material_sale_items WHERE material_sale_id = ?`, [saleId]);
      expect(Number(itemRows[0].unit_price_etb)).toBe(550);

      const [payments] = await pool.query<any>(`SELECT * FROM payments WHERE payable_type = 'material_sale' AND payable_id = ?`, [saleId]);
      expect(payments.length).toBe(1);
      expect(payments[0].method).toBe('cash');

      const [stockAfter] = await pool.query<any>(`SELECT current_stock FROM inventory_items WHERE id = 'inv_retail_shampoo'`);
      expect(Number(stockAfter[0].current_stock)).toBe(Number(stockBefore[0].current_stock) - 2);

      const list = await request(app).get(`/api/material-sales?companyId=cmp_gech_01&branchId=br_female_01`).set(auth());
      expect(list.status).toBe(200);
      const found = (list.body as any[]).find((s) => s.id === saleId);
      expect(found).toBeTruthy();
      expect(found.isPaid).toBe(true);
    });

    it('rejects a sale quantity beyond available stock', async () => {
      const auth = () => ({ Authorization: `Bearer ${receptionToken}` });
      const res = await request(app)
        .post('/api/material-sales')
        .set(auth())
        .send({
          companyId: 'cmp_gech_01',
          branchId: 'br_female_01',
          items: [{ inventoryItemId: 'inv_retail_shampoo', quantity: 9999 }],
        });
      expect(res.status).toBe(409);
    });
  });

  describe('banks (payment channels)', () => {
    it('lets a tenant owner manage banks while reception can only list them', async () => {
      const ownerAuth = () => ({ Authorization: `Bearer ${ownerToken}` });
      const receptionAuth = () => ({ Authorization: `Bearer ${receptionToken}` });

      const create = await request(app)
        .post('/api/payments/banks')
        .set(ownerAuth())
        .send({ companyId: 'cmp_gech_01', name: 'Test Bank', code: 'TESTB' });
      expect(create.status).toBe(200);
      const bankId = create.body.id;

      // Not visible to a different scope; visible to the same company.
      const list = await request(app).get('/api/payments/banks').set(receptionAuth());
      expect(list.status).toBe(200);
      const found = (list.body as any[]).find((b) => b.id === bankId);
      expect(found).toBeTruthy();

      // Reception must not create/rename/remove banks (mgmt-only).
      const forbidden = await request(app)
        .post('/api/payments/banks')
        .set(receptionAuth())
        .send({ companyId: 'cmp_gech_01', name: 'Nope', code: 'NOPE' });
      expect(forbidden.status).toBe(403);

      const rename = await request(app)
        .patch(`/api/payments/banks/${bankId}`)
        .set(ownerAuth())
        .send({ name: 'Test Bank Renamed', code: 'TESTB2' });
      expect(rename.status).toBe(200);

      const after = await request(app).get('/api/payments/banks').set(ownerAuth());
      const updated = (after.body as any[]).find((b) => b.id === bankId);
      expect(updated.name).toBe('Test Bank Renamed');
      expect(updated.code).toBe('TESTB2');

      const deactivate = await request(app)
        .patch(`/api/payments/banks/${bankId}`)
        .set(ownerAuth())
        .send({ isActive: false });
      expect(deactivate.status).toBe(200);
      const afterDeact = await request(app).get('/api/payments/banks').set(ownerAuth());
      expect((afterDeact.body as any[]).some((b) => b.id === bankId)).toBe(false);

      const del = await request(app)
        .delete(`/api/payments/banks/${bankId}`)
        .set(ownerAuth());
      expect(del.status).toBe(200);
    });

    it('requires a non-empty name and code', async () => {
      const res = await request(app)
        .post('/api/payments/banks')
        .set('Authorization', `Bearer ${superToken}`)
        .send({ companyId: 'cmp_gech_01', name: '', code: '' });
      expect(res.status).toBe(400);
    });
  });

  describe('payments ledger + reports channel breakdown (split-payment aware)', () => {
    it('lists payment lines per payable and as a scoped/filterable ledger', async () => {
      const auth = () => ({ Authorization: `Bearer ${receptionToken}` });

      const cust = await request(app)
        .post('/api/customers')
        .set(auth())
        .send({ companyId: 'cmp_gech_01', name: 'Ledger Split', phone: '+251 90 000 0404' });
      const session = await request(app)
        .post('/api/visit-sessions')
        .set(auth())
        .send({
          companyId: 'cmp_gech_01',
          branchId: 'br_female_01',
          businessUnitId: 'bu_female_hair',
          customerId: cust.body.id,
          customerName: 'Ledger Splitter',
          customerPhone: '+251 90 000 0404',
          services: [{
            serviceId: 'srv_amh_41',
            serviceName: 'Hair Treatment',
            staffId: 'stf_meron_02',
            staffName: 'Meron Tadesse',
            priceEtb: 400,
            durationMinutes: 30,
          }],
        });
      const sessionId = session.body.id;

      const checkout = await request(app)
        .post('/api/payments/checkout')
        .set(auth())
        .send({
          payableType: 'visit',
          payableId: sessionId,
          payments: [
            { method: 'cash', amountEtb: 160 },
            { method: 'bank', bankName: 'CBE Birr', amountEtb: 240 },
          ],
        });
      expect(checkout.status).toBe(200);
      expect(checkout.body.netTotal).toBe(400);

      // Per-payable listing returns both lines.
      const perPayable = await request(app)
        .get(`/api/payments?payableType=visit&payableId=${sessionId}`)
        .set(auth());
      expect(perPayable.status).toBe(200);
      expect(perPayable.body).toHaveLength(2);
      const cashLine = perPayable.body.find((p: any) => p.method === 'cash');
      const bankLine = perPayable.body.find((p: any) => p.method === 'bank');
      expect(Number(cashLine.amount_etb)).toBe(160);
      expect(Number(bankLine.amount_etb)).toBe(240);
      expect(bankLine.bank_name).toBe('CBE Birr');

      // Company-scoped ledger: fetch-all includes both lines; method filter narrows.
      const ledger = await request(app).get(`/api/payments`).set(auth());
      expect(ledger.status).toBe(200);
      const mine = (ledger.body as any[]).filter((p) => p.payable_id === sessionId);
      expect(mine).toHaveLength(2);

      const onlyCash = await request(app)
        .get(`/api/payments?method=cash&from=${'2000-01-01'}&to=${'2099-12-31'}`)
        .set(auth());
      expect(onlyCash.body.every((p: any) => p.method === 'cash')).toBe(true);

      // Channel report aggregates split lines and keeps the true cash/bank split.
      const channels = await request(app)
        .get('/api/reports/payments?branchId=br_female_01')
        .set(auth());
      expect(channels.status).toBe(200);
      const cash = (channels.body as any[]).find((c) => c.method === 'cash');
      const bank = (channels.body as any[]).find((c) => c.channel === 'CBE Birr');
      expect(Number(cash?.amount || 0)).toBeGreaterThanOrEqual(160);
      expect(Number(bank?.amount || 0)).toBeGreaterThanOrEqual(240);
    });

    it('payment summary reports today cash/bank totals and outstanding credit', async () => {
      const auth = () => ({ Authorization: `Bearer ${receptionToken}` });

      // Baseline before the new checkout.
      const before = await request(app)
        .get('/api/reports/payment-summary?branchId=br_female_01')
        .set(auth());
      expect(before.status).toBe(200);
      expect(typeof before.body.cashEtb).toBe('number');
      expect(typeof before.body.outstandingTotalEtb).toBe('number');

      // Complete + pay a session fully in cash.
      const cust = await request(app)
        .post('/api/customers')
        .set(auth())
        .send({ companyId: 'cmp_gech_01', name: 'Summary Cash', phone: '+251 90 000 0505' });
      const session = await request(app)
        .post('/api/visit-sessions')
        .set(auth())
        .send({
          companyId: 'cmp_gech_01',
          branchId: 'br_female_01',
          businessUnitId: 'bu_female_hair',
          customerId: cust.body.id,
          customerName: 'Summary Cash',
          customerPhone: '+251 90 000 0505',
          services: [{
            serviceId: 'srv_amh_41',
            serviceName: 'Hair Treatment',
            staffId: 'stf_meron_02',
            staffName: 'Meron Tadesse',
            priceEtb: 250,
            durationMinutes: 30,
          }],
        });
      const checkout = await request(app)
        .post('/api/payments/checkout')
        .set(auth())
        .send({ payableType: 'visit', payableId: session.body.id, discountEtb: 50, payments: [{ method: 'cash', amountEtb: 200 }] });
      expect(checkout.status).toBe(200);

      const after = await request(app)
        .get('/api/reports/payment-summary?branchId=br_female_01')
        .set(auth());
      expect(after.status).toBe(200);
      expect(after.body.totalCollectedEtb).toBeCloseTo(before.body.totalCollectedEtb + 200, 2);
      expect(after.body.discountsEtb).toBeGreaterThanOrEqual(50);
      expect(after.body.outstandingVisitCount).toBeGreaterThanOrEqual(0);
      expect(after.body.outstandingTotalEtb).toBeCloseTo(
        after.body.outstandingVisitsEtb + after.body.outstandingRetailEtb, 2
      );

      // Unauthenticated access is rejected.
      const anon = await request(app).get('/api/reports/payment-summary');
      expect(anon.status).toBe(401);
    });
  });

  describe('queue numbering, reassign guard and role rework', () => {
    it('assigns daily sequential queue numbers per branch', async () => {
      const auth = () => ({ Authorization: `Bearer ${receptionToken}` });
      const makeSession = async (phone: string) => {
        const cust = await request(app)
          .post('/api/customers')
          .set(auth())
          .send({ companyId: 'cmp_gech_01', name: 'Queue T', phone });
        return request(app)
          .post('/api/visit-sessions')
          .set(auth())
          .send({
            companyId: 'cmp_gech_01',
            branchId: 'br_mens_01',
            businessUnitId: 'bu_mens_hair',
            customerId: cust.body.id,
            customerName: 'Queue T',
            customerPhone: phone,
            services: [{
              serviceId: 'srv_amh_01',
              serviceName: 'Hair Wash',
              staffId: 'stf_bereket_06',
              staffName: 'Bereket Shimelis',
              priceEtb: 150,
              durationMinutes: 30,
            }],
          });
      };
      const a = await makeSession('+251 90 000 0511');
      const b = await makeSession('+251 90 000 0512');
      expect(a.status).toBe(200);
      expect(b.status).toBe(200);
      expect(a.body.queueNumber).toMatch(/^Q-\d{3}$/);
      const nA = Number(a.body.queueNumber.slice(2));
      expect(Number(b.body.queueNumber.slice(2))).toBe(nA + 1);
    });

    it('allows reassigning an open session but rejects a completed one with 409', async () => {
      const auth = () => ({ Authorization: `Bearer ${receptionToken}` });

      const create = async (phone: string) => {
        const cust = await request(app)
          .post('/api/customers')
          .set(auth())
          .send({ companyId: 'cmp_gech_01', name: 'Reassign T', phone });
        return request(app)
          .post('/api/visit-sessions')
          .set(auth())
          .send({
            companyId: 'cmp_gech_01',
            branchId: 'br_female_01',
            businessUnitId: 'bu_female_hair',
            customerId: cust.body.id,
            customerName: 'Reassign T',
            customerPhone: phone,
            services: [{
              serviceId: 'srv_amh_28',
              serviceName: 'Hair Coloring',
              staffId: 'stf_hana_01',
              staffName: 'Hana Abera',
              priceEtb: 4000,
              durationMinutes: 120,
            }],
          });
      };

      const open = await create('+251 90 000 0611');
      const openId = open.body.id;
      const reassignOpen = await request(app)
        .patch('/api/visit-sessions/staff')
        .set(auth())
        .send({ companyId: 'cmp_gech_01', id: openId, staffId: 'stf_meron_02', staffName: 'Meron Tadesse' });
      expect(reassignOpen.status).toBe(200);

      const done = await create('+251 90 000 0612');
      const doneId = done.body.id;
      await request(app).post('/api/visit-sessions/checkout').set(auth()).send({ sessionId: doneId, paymentMethod: 'cash' });

      const reassignDone = await request(app)
        .patch('/api/visit-sessions/staff')
        .set(auth())
        .send({ companyId: 'cmp_gech_01', id: doneId, staffId: 'stf_meron_02', staffName: 'Meron Tadesse' });
      expect(reassignDone.status).toBe(409);
    });

    it('recognises the owner role for mgmt access', async () => {
      const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${ownerToken}`);
      expect(res.status).toBe(200);
      expect(['owner', 'super_admin']).toContain(res.body.user.role);

      const create = await request(app)
        .post('/api/payments/banks')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ companyId: 'cmp_gech_01', name: 'Owner Bank', code: 'OWNER' });
      expect(create.status).toBe(200);

      await request(app)
        .delete(`/api/payments/banks/${create.body.id}`)
        .set('Authorization', `Bearer ${ownerToken}`);
    });
  });

  describe('walk-in tablet registration + feedback (plan.md §8/§9)', () => {
    const PHONE = '+251 91 555 2026';

    it('walk-in without a service issues a big Q-XXX ticket', async () => {
      const res = await request(app)
        .post('/api/public/tablet/walkins')
        .send({
          companyId: 'cmp_gech_01',
          branchId: 'br_mens_01',
          customerPhone: PHONE,
          customerName: 'Tablet Test',
        });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.queueNumber).toMatch(/^Q-\d{3}$/);
      expect(res.body.customerName).toBe('Tablet Test');
    });

    it('accepts a walk-in without a customer name (defaults to Walk-in)', async () => {
      const res = await request(app)
        .post('/api/public/tablet/walkins')
        .send({
          companyId: 'cmp_gech_01',
          branchId: 'br_mens_01',
          customerPhone: '+251 91 555 2041',
        });
      expect(res.status).toBe(200);
      expect(res.body.customerName).toBe('Walk-in');
    });

    it('rejects a walk-in without a phone number', async () => {
      const res = await request(app)
        .post('/api/public/tablet/walkins')
        .send({ companyId: 'cmp_gech_01', branchId: 'br_mens_01', customerName: 'No Phone' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('customerPhone is required');
    });

    it('reuses an existing customer found by phone', async () => {
      const first = await request(app)
        .post('/api/public/tablet/walkins')
        .send({
          companyId: 'cmp_gech_01',
          branchId: 'br_female_01',
          customerPhone: PHONE,
          customerName: 'Tablet Repeat',
        });
      expect(first.status).toBe(200);

      const second = await request(app)
        .post('/api/public/tablet/walkins')
        .send({
          companyId: 'cmp_gech_01',
          branchId: 'br_female_01',
          customerPhone: PHONE,
          customerName: 'Tablet Repeat',
        });
      expect(second.status).toBe(200);
      expect(second.body.customerId).toBe(first.body.customerId);
      expect(second.body.queueNumber).toMatch(/^Q-\d{3}$/);
    });

    it('walks in with a service + staff and that service line is attached', async () => {
      const res = await request(app)
        .post('/api/public/tablet/walkins')
        .send({
          companyId: 'cmp_gech_01',
          branchId: 'br_mens_01',
          customerPhone: '+251 91 555 2027',
          customerName: 'Service Pick',
          serviceId: 'srv_amh_01',
          staffId: 'stf_bereket_06',
        });
      expect(res.status).toBe(200);

      const visits = await request(app).get('/api/public/tablet/visits')
        .query({ companyId: 'cmp_gech_01', branchId: 'br_mens_01', phone: '+251 91 555 2027' });
      expect(visits.status).toBe(200);
      expect(visits.body.visits.length).toBeGreaterThan(0);
      const svc = visits.body.visits[0].services.find((s: any) => s.serviceName);
      expect(svc).toBeTruthy();
    });

    it('lists recent visits for a phone', async () => {
      const res = await request(app).get('/api/public/tablet/visits')
        .query({ companyId: 'cmp_gech_01', branchId: 'br_mens_01', phone: PHONE });
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.visits)).toBe(true);
    });

    it('requires companyId, branchId and phone for visit lookup', async () => {
      const res = await request(app).get('/api/public/tablet/visits').query({ companyId: 'cmp_gech_01' });
      expect(res.status).toBe(400);
    });

    it('accepts per-visit feedback with rating 1-5 and a complaint', async () => {
      const walkin = await request(app)
        .post('/api/public/tablet/walkins')
        .send({ companyId: 'cmp_gech_01', branchId: 'br_mens_01', customerPhone: '+251 91 555 2028', customerName: 'Feedback T' });
      expect(walkin.status).toBe(200);

      const res = await request(app)
        .post('/api/public/tablet/feedback')
        .send({
          companyId: 'cmp_gech_01',
          branchId: 'br_mens_01',
          visitSessionId: walkin.body.id,
          customerId: walkin.body.customerId,
          rating: 2,
          complaint: 'The wait was too long',
          isAnonymous: false,
        });
      expect(res.status).toBe(200);
      expect(res.body.id).toBeTruthy();

      const list = await request(app)
        .get('/api/feedback')
        .query({ companyId: 'cmp_gech_01' })
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(list.status).toBe(200);
      const fb = list.body.feedback.find((f: any) => f.id === res.body.id);
      expect(fb).toBeTruthy();
      expect(fb.rating).toBe(2);
      expect(fb.complaint).toBe('The wait was too long');
      expect(fb.queueNumber).toBe(walkin.body.queueNumber);
      expect(fb.customerPhone).toBe('+251 91 555 2028');
    });

    it('rejects a rating outside 1-5 and a missing rating', async () => {
      const bad = await request(app)
        .post('/api/public/tablet/feedback')
        .send({ companyId: 'cmp_gech_01', branchId: 'br_mens_01', rating: 6 });
      expect(bad.status).toBe(400);
      expect(bad.body.error).toContain('rating');

      const missing = await request(app)
        .post('/api/public/tablet/feedback')
        .send({ companyId: 'cmp_gech_01', branchId: 'br_mens_01', complaint: 'x' });
      expect(missing.status).toBe(400);
      expect(missing.body.error).toContain('rating is required');
    });

    it('marks anonymous feedback without exposing the customer', async () => {
      const walkin = await request(app)
        .post('/api/public/tablet/walkins')
        .send({ companyId: 'cmp_gech_01', branchId: 'br_mens_01', customerPhone: '+251 91 555 2029', customerName: 'Anon T' });
      const res = await request(app)
        .post('/api/public/tablet/feedback')
        .send({
          companyId: 'cmp_gech_01',
          branchId: 'br_mens_01',
          visitSessionId: walkin.body.id,
          rating: 5,
          complaint: 'Great hair cut',
          isAnonymous: true,
        });
      expect(res.status).toBe(200);

      const list = await request(app)
        .get('/api/feedback')
        .query({ companyId: 'cmp_gech_01' })
        .set('Authorization', `Bearer ${ownerToken}`);
      const fb = list.body.feedback.find((f: any) => f.id === res.body.id);
      expect(fb.isAnonymous).toBe(true);
      expect(fb.customerName).toBeUndefined();
      expect(fb.customerPhone).toBeUndefined();
    });

    it('blocks a receptionist from reviewing feedback (mgmtOnly)', async () => {
      const res = await request(app)
        .get('/api/feedback')
        .query({ companyId: 'cmp_gech_01' })
        .set('Authorization', `Bearer ${receptionToken}`);
      expect(res.status).toBe(403);
    });

    it('serves the public catalog (services + staff) for a branch', async () => {
      const res = await request(app)
        .get('/api/public/tablet/catalog')
        .query({ companyId: 'cmp_gech_01', branchId: 'br_mens_01' });
      expect(res.status).toBe(200);
      expect(res.body.services.length).toBeGreaterThan(0);
      const names = res.body.services.map((s: any) => s.name);
      expect(names).toContain('የፀጉር መቁረጥ');
      expect(res.body.staff.length).toBeGreaterThan(0);
      const roles = res.body.staff.map((s: any) => s.role);
      expect(roles).not.toContain('reception');
      expect(roles).not.toContain('manager');

      const missing = await request(app)
        .get('/api/public/tablet/catalog')
        .query({ companyId: 'cmp_gech_01' });
      expect(missing.status).toBe(400);
    });
  });
});
