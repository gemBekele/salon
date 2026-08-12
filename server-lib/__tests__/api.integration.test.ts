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

      // Session with one service (Hair Coloring = 2500 ETB, 28% staff rule).
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
            serviceId: 'srv_f_color',
            serviceName: 'Hair Coloring & Highlights',
            staffId: 'stf_hana_01',
            staffName: 'Hana Abera',
            priceEtb: 2500,
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
      expect(Number(sessionRows[0].net_total_etb)).toBe(2500);

      // Commission log for Hana (28% rule of 2500 = 700).
      const [comm] = await pool.query<any>(`SELECT * FROM commission_logs WHERE visit_session_id = ?`, [sessionId]);
      expect(comm.length).toBe(1);
      expect(Number(comm[0].commission_amount_etb)).toBe(700);
      expect(comm[0].staff_id).toBe('stf_hana_01');
      expect(comm[0].payout_status).toBe('unpaid');

      // Inventory deducted by the service requirement (1 unit).
      const [stockAfter] = await pool.query<any>(
        `SELECT current_stock FROM inventory_items WHERE id = 'inv_hair_color'`
      );
      expect(Number(stockAfter[0].current_stock)).toBe(Number(stockBefore[0].current_stock) - 1);

      // Loyalty accrual: +1 pt per 10 ETB on the discount-free net total.
      const [custRow] = await pool.query<any>(`SELECT loyalty_points, total_spent_etb, total_visits FROM customers WHERE id = ?`, [customerId]);
      expect(custRow[0].total_visits).toBe(1);
      expect(Number(custRow[0].total_spent_etb)).toBe(2500);
      expect(Number(custRow[0].loyalty_points)).toBe(250);

      // Idempotence guard: checkout again should NOT re-create commission logs.
      const again = await request(app).post('/api/visit-sessions/checkout').set(auth()).send({ sessionId, paymentMethod: 'cash' });
      expect(again.status).toBe(200);
      const [commAfter] = await pool.query<any>(`SELECT * FROM commission_logs WHERE visit_session_id = ?`, [sessionId]);
      expect(commAfter.length).toBe(1);
    });
  });
});
