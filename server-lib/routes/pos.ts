import { Router } from 'express';
import type { DbPool, DbConnection } from '../db';
import type { SmsService } from '../sms';
import { posOnly, asyncHandler } from '../middleware';
import { validate, ValidationSchema } from '../validate';
import { uid, canAccessCompany, notFound } from '../core';
import { createPaymentService } from '../payments';

/**
 * Receptionist POS: customers, live visit sessions and the atomic checkout
 * transaction (commissions, loyalty and inventory are all server-side).
 */
export function createPosRouter(pool: DbPool, sms: SmsService): Router {
  const router = Router();

  // ==========================================================
  // Public Customer Appointments (Unauthenticated)
  // ==========================================================
  router.post('/public/appointments', asyncHandler(async (req, res) => {
    const errs = validate(req.body, {
      companyId: { required: true },
      branchId: { required: true },
      customerName: { required: true, type: 'string' },
      customerPhone: { required: true, type: 'string' },
    });
    if (errs.length) return res.status(400).json({ error: errs.join('; ') });

    const b = req.body;

    // Find or create customer by phone
    let customerId = b.customerId;
    if (!customerId && b.customerPhone) {
      const [existing] = (await pool.query(
        `SELECT id FROM customers WHERE company_id = ? AND phone = ? LIMIT 1`,
        [b.companyId, b.customerPhone]
      )) as any;
      if (existing && existing[0]) {
        customerId = existing[0].id;
      } else {
        customerId = uid('cust');
        await pool.query(
          `INSERT INTO customers (id, company_id, name, phone, email, notes) VALUES (?,?,?,?,?,?)`,
          [customerId, b.companyId, b.customerName, b.customerPhone, b.customerEmail || null, 'Registered via Online Appointment Website']
        );
      }
    }

    const id = uid('vst');
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      let businessUnitId = b.businessUnitId;
      if (!businessUnitId) {
        const [bus] = (await connection.query(
          `SELECT id FROM business_units WHERE branch_id = ? LIMIT 1`,
          [b.branchId]
        )) as any;
        businessUnitId = bus && bus[0] ? bus[0].id : 'bu_mens_hair';
      }

      const queueNumber = await nextQueueNumber(connection, b.companyId, b.branchId);
      const bookingNotes = b.appointmentDate && b.appointmentTime
        ? `[Online Booking] Date: ${b.appointmentDate} at ${b.appointmentTime}. ${b.notes || ''}`
        : b.notes || '[Online Booking]';

      const subtotal = Number(b.subtotalEtb || 0);
      const discount = Number(b.discountEtb || 0);
      const tax = Number(b.taxEtb || 0);
      const netTotal = Number(b.netTotalEtb || subtotal - discount + tax);

      await connection.query(
        `INSERT INTO visit_sessions (id, company_id, branch_id, business_unit_id, queue_number, customer_id, customer_name, customer_phone, status, subtotal_etb, discount_etb, tax_etb, net_total_etb, started_at, notes, is_paid)
         VALUES (?,?,?,?,?,?,?,?,'queued',?,?,?,?,?,?,FALSE)`,
        [id, b.companyId, b.branchId, businessUnitId, queueNumber, customerId, b.customerName, b.customerPhone, subtotal, discount, tax, netTotal, new Date().toISOString(), bookingNotes]
      );

      if (Array.isArray(b.services) && b.services.length > 0) {
        for (const s of b.services) {
          let serviceId = s.serviceId || 'srv_m_haircut';
          const [checkSvc] = (await connection.query(
            `SELECT id FROM services WHERE id = ? LIMIT 1`,
            [serviceId]
          )) as any;
          if (!checkSvc || checkSvc.length === 0) {
            serviceId = 'srv_m_haircut';
          }

          let staffId = s.staffId || null;
          if (staffId) {
            const [checkStf] = (await connection.query(
              `SELECT id FROM staff WHERE id = ? LIMIT 1`,
              [staffId]
            )) as any;
            if (!checkStf || checkStf.length === 0) {
              staffId = null;
            }
          }

          await connection.query(
            `INSERT INTO visit_session_services (id, visit_session_id, service_id, service_name, staff_id, staff_name, price_etb, duration_minutes, commission_earned_etb, status) VALUES (?,?,?,?,?,?,?,?,?,?)`,
            [uid('vss'), id, serviceId, s.serviceName || 'Haircut', staffId, s.staffName || 'Any Barber', s.priceEtb || 400, s.durationMinutes || 30, 0, 'pending']
          );
        }
      }

      await connection.commit();

      try {
        await sms.dispatch({
          companyId: b.companyId,
          recipientPhone: b.customerPhone,
          messageType: 'queue_turn_alert',
          content: `Hello ${b.customerName}! Your appointment at Gech Barbershop is confirmed. Ticket #${queueNumber}. Time: ${b.appointmentDate || 'Today'} ${b.appointmentTime || ''}.`
        });
      } catch (err) {
        console.warn('SMS dispatch warning:', err);
      }

      res.json({ success: true, id, queueNumber, customerId });
    } catch (e: any) {
      await connection.rollback();
      console.error('API /public/appointments error:', e);
      return res.status(500).json({ error: e?.message || 'Appointment creation failed' });
    } finally {
      connection.release();
    }
  }));

  // ==========================================================
  // Public Walk-in Tablet (Unauthenticated) — plan.md §8/§9
  // ==========================================================
  router.post('/public/tablet/walkins', asyncHandler(async (req, res) => {
    const errs = validate(req.body, {
      companyId: { required: true },
      branchId: { required: true },
      customerPhone: { required: true, type: 'string' },
    });
    if (errs.length) return res.status(400).json({ error: errs.join('; ') });

    const b = req.body;

    // Find or create customer by phone (phone required, name optional).
    let customerId = b.customerId;
    if (!customerId && b.customerPhone) {
      const [existing] = (await pool.query(
        `SELECT id, name FROM customers WHERE company_id = ? AND phone = ? LIMIT 1`,
        [b.companyId, b.customerPhone]
      )) as any;
      if (existing && existing[0]) {
        customerId = existing[0].id;
      } else {
        customerId = uid('cust');
        await pool.query(
          `INSERT INTO customers (id, company_id, name, phone, email, notes) VALUES (?,?,?,?,?,?)`,
          [customerId, b.companyId, b.customerName || 'Walk-in', b.customerPhone, b.customerEmail || null, 'Registered via Walk-in Tablet']
        );
      }
    }

    const id = uid('vst');
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      let businessUnitId = b.businessUnitId;
      if (!businessUnitId) {
        const [bus] = (await connection.query(
          `SELECT id FROM business_units WHERE branch_id = ? LIMIT 1`,
          [b.branchId]
        )) as any;
        businessUnitId = bus && bus[0] ? bus[0].id : 'bu_mens_hair';
      }

      const queueNumber = await nextQueueNumber(connection, b.companyId, b.branchId);

      // Optional single service + staff; verify both exist (fall back like appointments).
      let serviceId: string | null = b.serviceId || null;
      let serviceName = 'Haircut';
      let priceEtb = 400;
      let durationMinutes = 30;
      if (serviceId) {
        const [svc] = (await connection.query(
          `SELECT id, name, price_etb, duration_minutes FROM services WHERE id = ? LIMIT 1`,
          [serviceId]
        )) as any;
        if (!svc || svc.length === 0) {
          serviceId = null;
        } else {
          serviceName = svc[0].name;
          priceEtb = Number(svc[0].price_etb || 400);
          durationMinutes = Number(svc[0].duration_minutes || 30);
        }
      }

      let staffId: string | null = b.staffId || null;
      let staffName: string | null = null;
      if (staffId) {
        const [stf] = (await connection.query(
          `SELECT id, name FROM staff WHERE id = ? LIMIT 1`,
          [staffId]
        )) as any;
        if (!stf || stf.length === 0) {
          staffId = null;
        } else {
          staffName = stf[0].name;
        }
      }

      // If a service+staff was picked and that staff is free right now
      // (no queued/in-progress line today), the service can start immediately.
      let status = 'queued';
      let svcStatus = 'pending';
      if (staffId) {
        const [busy] = (await connection.query(
          `SELECT vss.id FROM visit_session_services vss
           JOIN visit_sessions vs ON vss.visit_session_id = vs.id
           WHERE vss.staff_id = ? AND vs.branch_id = ?
             AND vs.status IN ('queued', 'in_progress')
             AND COALESCE(vs.started_at, vs.created_at) >= CURRENT_DATE
           LIMIT 1`,
          [staffId, b.branchId]
        )) as any;
        if (!busy || busy.length === 0) {
          status = 'in_progress';
          svcStatus = 'in_progress';
        }
      }

      const netTotal = serviceId ? priceEtb : 0;
      await connection.query(
        `INSERT INTO visit_sessions (id, company_id, branch_id, business_unit_id, queue_number, customer_id, customer_name, customer_phone, status, subtotal_etb, discount_etb, tax_etb, net_total_etb, started_at, notes, is_paid)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,FALSE)`,
        [id, b.companyId, b.branchId, businessUnitId, queueNumber, customerId, b.customerName || 'Walk-in', b.customerPhone, status, netTotal, 0, 0, netTotal, new Date().toISOString(), '[Walk-in Tablet]']
      );

      if (serviceId) {
        await connection.query(
          `INSERT INTO visit_session_services (id, visit_session_id, service_id, service_name, staff_id, staff_name, price_etb, duration_minutes, commission_earned_etb, status)
           VALUES (?,?,?,?,?,?,?,?,?,?)`,
          [uid('vss'), id, serviceId, serviceName, staffId, staffName, priceEtb, durationMinutes, 0, svcStatus]
        );
      }

      await connection.commit();

      try {
        await sms.dispatch({
          companyId: b.companyId,
          recipientPhone: b.customerPhone,
          messageType: 'queue_turn_alert',
          content: `Hello ${b.customerName || 'Customer'}! Your ticket at Gech is #${queueNumber}. ${status === 'in_progress' ? 'Your service can start now.' : 'Thank you for waiting.'}`
        });
      } catch (err) {
        console.warn('SMS dispatch warning:', err);
      }

      res.json({ success: true, id, queueNumber, customerId, customerName: b.customerName || 'Walk-in', status });
    } catch (e: any) {
      await connection.rollback();
      console.error('API /public/tablet/walkins error:', e);
      return res.status(500).json({ error: e?.message || 'Walk-in registration failed' });
    } finally {
      connection.release();
    }
  }));

  // Recent visit sessions for a phone (feedback pick-any-visit).
  router.get('/public/tablet/visits', asyncHandler(async (req, res) => {
    const { companyId, branchId, phone } = req.query as Record<string, string>;
    if (!companyId || !branchId || !phone) {
      return res.status(400).json({ error: 'companyId, branchId and phone are required' });
    }
    const [rows] = (await pool.query(
      `SELECT vs.id, vs.queue_number, vs.customer_name, vs.customer_phone, vs.status, vs.started_at, vs.created_at,
              COALESCE((
                SELECT json_agg(json_build_object('id', s.id, 'serviceName', s.service_name, 'staffName', s.staff_name) ORDER BY s.created_at)
                FROM visit_session_services s WHERE s.visit_session_id = vs.id
              ), '[]') AS services
       FROM visit_sessions vs
       WHERE vs.company_id = ? AND vs.branch_id = ? AND vs.customer_phone = ?
       ORDER BY COALESCE(vs.started_at, vs.created_at) DESC
       LIMIT 10`,
      [companyId, branchId, phone]
    )) as any;
    res.json({
      visits: (rows as any[]).map((r) => ({
        id: r.id,
        queueNumber: r.queue_number,
        customerName: r.customer_name,
        customerPhone: r.customer_phone,
        status: r.status,
        startedAt: r.started_at,
        createdAt: r.created_at || r.started_at,
        services: typeof r.services === 'string' ? JSON.parse(r.services) : r.services || [],
      })),
    });
  }));

  // Per-visit feedback + complaint (public tablet / website).
  router.post('/public/tablet/feedback', asyncHandler(async (req, res) => {
    const errs = validate(req.body, {
      companyId: { required: true },
      branchId: { required: true },
      rating: { required: true, type: 'number', min: 1, max: 5 },
    });
    if (errs.length) return res.status(400).json({ error: errs.join('; ') });

    const b = req.body;
    const id = uid('fb_');
    await pool.query(
      `INSERT INTO feedback (id, company_id, branch_id, visit_session_id, customer_id, rating, complaint, is_anonymous, created_at)
       VALUES (?,?,?,?,?,?,?,?,NOW())`,
      [id, b.companyId, b.branchId, b.visitSessionId || null, b.customerId || null, b.rating, b.complaint || null, Boolean(b.isAnonymous)]
    );
    res.json({ success: true, id });
  }));

  // Active services + serving staff catalog for the kiosk (public).
  // Services are branch-scoped via their business unit; staff is branch-scoped
  // directly and excludes non-serving roles. No auth required.
  router.get('/public/tablet/catalog', asyncHandler(async (req, res) => {
    const { companyId, branchId } = req.query as Record<string, string>;
    if (!companyId || !branchId) {
      return res.status(400).json({ error: 'companyId and branchId are required' });
    }
    const [svc] = (await pool.query(
      `SELECT s.id, s.company_id, s.business_unit_id, s.name, s.category, s.price_etb, s.duration_minutes
       FROM services s
       JOIN business_units bu ON bu.id = s.business_unit_id
       WHERE s.company_id = ? AND bu.branch_id = ? AND s.is_active = TRUE
       ORDER BY s.name ASC`,
      [companyId, branchId]
    )) as any;
    const [staffRows] = (await pool.query(
      `SELECT id, company_id, branch_id, business_unit_id, name, role, specialties
       FROM staff
       WHERE company_id = ? AND branch_id = ? AND status IN ('available','busy')
         AND role NOT IN ('reception','receptionist','manager')
       ORDER BY name ASC`,
      [companyId, branchId]
    )) as any;
    res.json({
      services: (svc || []).map((r: any) => ({
        id: r.id,
        companyId: r.company_id,
        businessUnitId: r.business_unit_id,
        name: r.name,
        category: r.category,
        priceEtb: Number(r.price_etb),
        durationMinutes: Number(r.duration_minutes || 0),
      })),
      staff: (staffRows || []).map((r: any) => ({
        id: r.id,
        companyId: r.company_id,
        branchId: r.branch_id,
        businessUnitId: r.business_unit_id,
        name: r.name,
        role: r.role,
        specialties: r.specialties ? (typeof r.specialties === 'string' ? JSON.parse(r.specialties) : r.specialties) : [],
      })),
    });
  }));

  router.use(['/customers', '/visit-sessions'], ...posOnly);

  /**
   * Derive the next queue number for a branch for the current calendar day
   * (e.g. Q-001). The counter resets daily *per branch* — the sequence is
   * derived from tickets already issued today, so two days never share numbers
   * and concurrent check-ins are serialized via a row lock on the branch.
   */
  async function nextQueueNumber(conn: DbConnection, companyId: string, branchId: string): Promise<string> {
    await conn.query(`SELECT id FROM branches WHERE id = ? FOR UPDATE`, [branchId]);
    const [rows] = (await conn.query(
      `SELECT queue_number FROM visit_sessions
       WHERE branch_id = ? AND COALESCE(started_at, created_at) >= CURRENT_DATE AND COALESCE(started_at, created_at) < CURRENT_DATE + INTERVAL '1 day'
       ORDER BY queue_number DESC LIMIT 1`,
      [branchId]
    )) as any;
    const last = rows[0]?.queue_number as string | undefined;
    const current = last ? parseInt(last.replace(/[^0-9]/g, ''), 10) || 0 : 0;
    return `Q-${String(current + 1).padStart(3, '0')}`;
  }

  // ==========================================================
  // Customers
  // ==========================================================
  router.post('/customers', asyncHandler(async (req, res) => {
    if (!canAccessCompany(req.user!, req.body.companyId)) return res.status(403).json({ error: 'Company not found' });
    const errs = validate(req.body, {
      companyId: { required: true },
      name: { required: true, type: 'string' },
      phone: { required: true, type: 'string' },
    });
    if (errs.length) return res.status(400).json({ error: errs.join('; ') });

    const b = req.body;
    // Honor a client-supplied id (e.g. an optimistic `cust_<timestamp>`) so the
    // subsequent session insert can reference it; regenerate on collision.
    let id = b.id && String(b.id).length <= 50 ? String(b.id) : uid('cust');
    const [existing] = (await pool.query(`SELECT id FROM customers WHERE id = ?`, [id])) as any;
    if (existing && existing[0]) id = uid('cust');

    await pool.query(`INSERT INTO customers (id, company_id, name, phone, email, notes) VALUES (?,?,?,?,?,?)`,
      [id, b.companyId, b.name, b.phone, b.email || null, b.notes || null]);
    res.json({ success: true, id });
  }));

  router.put('/customers/:id', asyncHandler(async (req, res) => {
    const [rows] = (await pool.query(`SELECT company_id FROM customers WHERE id = ?`, [req.params.id])) as any;
    const cust = rows[0];
    if (!cust) return notFound('Customer not found');
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

  // ==========================================================
  // Visit sessions
  // ==========================================================
  router.post('/visit-sessions', asyncHandler(async (req, res) => {
    if (!canAccessCompany(req.user!, req.body.companyId)) return res.status(403).json({ error: 'Company not found' });
    const errs = validate(req.body, {
      companyId: { required: true },
      branchId: { required: true },
      customerName: { required: true, type: 'string' },
    });
    if (errs.length) return res.status(400).json({ error: errs.join('; ') });

    const b = req.body;
    const id = uid('vst');

    // Every service must reference an existing staff member (fk_vss_staff).
    if (Array.isArray(b.services)) {
      for (const s of b.services) {
        if (!s.staffId) {
          return res.status(400).json({ error: `Service "${s.serviceName || 'Unknown service'}" must have an assigned staff member.` });
        }
        const [staffRows] = (await pool.query(`SELECT id FROM staff WHERE id = ?`, [s.staffId])) as any;
        if (!staffRows[0]) {
          return res.status(400).json({ error: `Assigned staff member for "${s.serviceName || 'Unknown service'}" does not exist.` });
        }
      }
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const queueNumber = await nextQueueNumber(connection, b.companyId, b.branchId);
      await connection.query(
        `INSERT INTO visit_sessions (id, company_id, branch_id, business_unit_id, queue_number, customer_id, customer_name, customer_phone, status, subtotal_etb, discount_etb, tax_etb, net_total_etb, started_at, notes, is_paid)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,FALSE)`,
        [id, b.companyId, b.branchId, b.businessUnitId || null, queueNumber, b.customerId, b.customerName, b.customerPhone, b.status || 'queued', b.subtotalEtb || 0, b.discountEtb || 0, b.taxEtb || 0, b.netTotalEtb || 0, b.startedAt || null, b.notes || null]
      );
      if (Array.isArray(b.services)) {
        for (const s of b.services) {
          await connection.query(`INSERT INTO visit_session_services (id, visit_session_id, service_id, service_name, staff_id, staff_name, price_etb, duration_minutes, commission_earned_etb, status) VALUES (?,?,?,?,?,?,?,?,?,?)`,
            [uid('vss'), id, s.serviceId, s.serviceName, s.staffId, s.staffName, s.priceEtb, s.durationMinutes || 30, s.commissionEarnedEtb || 0, s.status || 'pending']);
        }
      }
      await connection.commit();
      res.json({ success: true, id, queueNumber });
    } catch (e) {
      await connection.rollback();
      throw e;
    } finally {
      connection.release();
    }
  }));

  const statusSchema: ValidationSchema = {
    id: { required: true },
    status: { required: true, enum: ['queued', 'in_progress', 'completed', 'cancelled'] },
  };
  router.patch('/visit-sessions/status', asyncHandler(async (req, res) => {
    const errs = validate(req.body, statusSchema);
    if (errs.length) return res.status(400).json({ error: errs.join('; ') });

    const b = req.body as any;

    // Synthetic demo sessions bypass backend DB lookup
    if (String(b.id).startsWith('synth_')) {
      return res.json({ success: true, status: b.status });
    }

    const [rows] = (await pool.query(`SELECT company_id, branch_id, customer_phone, customer_name, queue_number, net_total_etb FROM visit_sessions WHERE id = ?`, [b.id])) as any;
    const s = rows[0];
    if (!s) return notFound('Session not found');
    if (!canAccessCompany(req.user!, s.company_id)) return res.status(403).json({ error: 'Company not found' });

    await pool.query(`UPDATE visit_sessions SET status = ?, completed_at = CASE WHEN ? = 'completed' THEN COALESCE(completed_at, ?) ELSE completed_at END WHERE id = ?`, [b.status, b.status, new Date().toISOString(), b.id]);
    if (b.status === 'in_progress') {
      await sms.dispatch({ companyId: s.company_id, recipientPhone: s.customer_phone, messageType: 'queue_turn_alert', content: `Hello ${s.customer_name}! Queue #${s.queue_number} is now IN PROGRESS — your station is ready.` });
    }
    res.json({ success: true, status: b.status });
  }));

  router.patch('/visit-sessions/staff', asyncHandler(async (req, res) => {
    if (!canAccessCompany(req.user!, req.body.companyId ?? '')) return res.status(403).json({ error: 'Company not found' });
    const [rows] = (await pool.query(`SELECT company_id FROM visit_sessions WHERE id = ?`, [req.body.id])) as any;
    const session = rows[0];
    if (!session) return notFound('Session not found');

    // A service that has already been completed is frozen — reassigning it
    // would rewrite completed work and its posted commission.
    const [done] = (await pool.query(
      `SELECT COUNT(*) AS c FROM visit_session_services WHERE visit_session_id = ? AND status = 'completed'`,
      [req.body.id]
    )) as any;
    if (Number(done[0]?.c || 0) > 0) {
      return res.status(409).json({ error: 'Cannot reassign staff: a service on this session has already been completed.' });
    }
    await pool.query(`UPDATE visit_session_services SET staff_id = ?, staff_name = ? WHERE visit_session_id = ?`, [req.body.staffId, req.body.staffName, req.body.id]);
    res.json({ success: true });
  }));

  // Add service to existing session
  router.patch('/visit-sessions/services', asyncHandler(async (req, res) => {
    const { sessionId, service } = req.body;
    if (!sessionId || !service) return res.status(400).json({ error: 'sessionId and service required' });
    if (!service.staffId) return res.status(400).json({ error: 'Service must have an assigned staff member.' });
    const [staffRows] = (await pool.query(`SELECT id FROM staff WHERE id = ?`, [service.staffId])) as any;
    if (!staffRows[0]) return res.status(400).json({ error: 'Assigned staff member does not exist.' });

    const [rows] = (await pool.query(`SELECT company_id FROM visit_sessions WHERE id = ?`, [sessionId])) as any;
    const session = rows[0];
    if (!session) return notFound('Session not found');
    if (!canAccessCompany(req.user!, session.company_id)) return res.status(403).json({ error: 'Company not found' });

    const id = uid('vss');
    await pool.query(
      `INSERT INTO visit_session_services (id, visit_session_id, service_id, service_name, staff_id, staff_name, price_etb, duration_minutes, commission_earned_etb, status) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [id, sessionId, service.serviceId, service.serviceName, service.staffId, service.staffName, service.priceEtb, service.durationMinutes || 30, service.commissionEarnedEtb || 0, service.status || 'in_progress']
    );

    // Recompute totals
    const [svcs] = (await pool.query(`SELECT SUM(price_etb) as subtotal, SUM(commission_earned_etb) as total_commission FROM visit_session_services WHERE visit_session_id = ?`, [sessionId])) as any;
    const subtotal = Number(svcs[0]?.subtotal || 0);
    await pool.query(`UPDATE visit_sessions SET subtotal_etb = ?, net_total_etb = subtotal_etb - discount_etb + tax_etb WHERE id = ?`, [subtotal, sessionId]);

    res.json({ success: true, id });
  }));

  // ==========================================================
  // Queue management: per-service status transitions (staff)
  // ==========================================================
  router.patch('/visit-sessions/services/:id/status', asyncHandler(async (req, res) => {
    const errs = validate(req.body, {
      status: { required: true, enum: ['in_progress', 'completed'] },
    });
    if (errs.length) return res.status(400).json({ error: errs.join('; ') });

    const b = req.body as any;
    const [rows] = (await pool.query(
      `SELECT vss.id, vss.visit_session_id, vss.status, vss.staff_id, vss.staff_name, vss.service_name,
              vs.company_id, vs.branch_id, vs.status AS session_status
       FROM visit_session_services vss
       JOIN visit_sessions vs ON vs.id = vss.visit_session_id
       WHERE vss.id = ?`,
      [req.params.id]
    )) as any;
    const svc = rows[0];
    if (!svc) return notFound('Service not found');
    if (!canAccessCompany(req.user!, svc.company_id)) return res.status(403).json({ error: 'Company not found' });
    if (svc.session_status === 'cancelled') return res.status(409).json({ error: 'Session is cancelled' });

    if (b.status === 'in_progress') {
      // A client can only be served at one station at a time.
      const [busy] = (await pool.query(
        `SELECT id, service_name, staff_name FROM visit_session_services
         WHERE visit_session_id = ? AND status = 'in_progress' AND id <> ?`,
        [svc.visit_session_id, svc.id]
      )) as any;
      if (busy.length > 0) {
        return res.status(409).json({
          error: `Client is already being served: ${busy[0].service_name} (${busy[0].staff_name})`,
        });
      }
      await pool.query(`UPDATE visit_session_services SET status = 'in_progress' WHERE id = ?`, [svc.id]);
      await pool.query(`UPDATE visit_sessions SET status = 'in_progress' WHERE id = ?`, [svc.visit_session_id]);
      await sms.dispatch({
        companyId: svc.company_id, recipientPhone: '', messageType: 'queue_turn_alert',
        content: `Service "${svc.service_name}" started by ${svc.staff_name}.`,
      });
      return res.json({ success: true, status: 'in_progress' });
    }

    // completed
    await pool.query(`UPDATE visit_session_services SET status = 'completed' WHERE id = ?`, [svc.id]);
    const [remaining] = (await pool.query(
      `SELECT COUNT(*) AS c FROM visit_session_services
       WHERE visit_session_id = ? AND status IN ('pending', 'in_progress')`,
      [svc.visit_session_id]
    )) as any;
    if (Number(remaining[0]?.c || 0) === 0) {
      await pool.query(`UPDATE visit_sessions SET status = 'completed', completed_at = COALESCE(completed_at, ?) WHERE id = ?`, [new Date().toISOString(), svc.visit_session_id]);
    }
    return res.json({ success: true, status: 'completed', sessionCompleted: Number(remaining[0]?.c || 0) === 0 });
  }));

  // Soft-cancel a whole queue entry (receptionist "delete a queue")
  router.delete('/visit-sessions/:id', asyncHandler(async (req, res) => {
    const [rows] = (await pool.query(`SELECT id, company_id, branch_id, queue_number, customer_name FROM visit_sessions WHERE id = ?`, [req.params.id])) as any;
    const s = rows[0];
    if (!s) return notFound('Session not found');
    if (!canAccessCompany(req.user!, s.company_id)) return res.status(403).json({ error: 'Company not found' });

    await pool.query(`UPDATE visit_sessions SET status = 'cancelled' WHERE id = ?`, [req.params.id]);
    await pool.query(`UPDATE visit_session_services SET status = 'cancelled' WHERE visit_session_id = ? AND status <> 'completed'`, [req.params.id]);
    await pool.query(
      `INSERT INTO audit_logs (id, company_id, branch_id, action_type, description, performed_by, timestamp) VALUES (?,?,?,?,?,?,NOW())`,
      [uid('aud'), s.company_id, s.branch_id, 'queue_cancel', `Removed ${s.customer_name} (${s.queue_number}) from queue. Reason: ${req.body?.reason || 'not provided'}`, `Receptionist (${req.user!.name})`]
    );
    res.json({ success: true });
  }));

  // Remove a single service from a queued client
  router.delete('/visit-sessions/:id/services/:sid', asyncHandler(async (req, res) => {
    const [rows] = (await pool.query(`SELECT id, company_id, branch_id, queue_number, customer_name FROM visit_sessions WHERE id = ?`, [req.params.id])) as any;
    const s = rows[0];
    if (!s) return notFound('Session not found');
    if (!canAccessCompany(req.user!, s.company_id)) return res.status(403).json({ error: 'Company not found' });

    const [svcRows] = (await pool.query(`SELECT service_name, staff_name FROM visit_session_services WHERE id = ? AND visit_session_id = ?`, [req.params.sid, req.params.id])) as any;
    const svc = svcRows[0];
    if (!svc) return notFound('Service not found');

    await pool.query(`DELETE FROM visit_session_services WHERE id = ? AND visit_session_id = ?`, [req.params.sid, req.params.id]);
    const [svcs] = (await pool.query(`SELECT SUM(price_etb) AS subtotal FROM visit_session_services WHERE visit_session_id = ?`, [req.params.id])) as any;
    const subtotal = Number(svcs[0]?.subtotal || 0);
    await pool.query(`UPDATE visit_sessions SET subtotal_etb = ?, net_total_etb = subtotal_etb - discount_etb + tax_etb WHERE id = ?`, [subtotal, req.params.id]);
    await pool.query(
      `INSERT INTO audit_logs (id, company_id, branch_id, action_type, description, performed_by, timestamp) VALUES (?,?,?,?,?,?,NOW())`,
      [uid('aud'), s.company_id, s.branch_id, 'service_remove', `Removed service "${svc.service_name}" (${svc.staff_name}) from ${s.customer_name} (${s.queue_number})`, `Receptionist (${req.user!.name})`]
    );
    res.json({ success: true });
  }));

  // ==========================================================
  // Checkout — delegates to the shared payment service: atomic transaction,
  // commissions recomputed server-side, split payments, cashback, receipts.
  // Legacy clients may pass { paymentMethod, reference }; the frontend passes
  // the richer { payments: [...] } payload.
  // ==========================================================
  router.post('/visit-sessions/checkout', asyncHandler(async (req, res) => {
    const { sessionId, paymentMethod, reference, completedAt, pointsEarned, discountEtb, payments } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });

    const svc = createPaymentService({ pool, sms });
    const payload: any = {
      payableType: 'visit',
      payableId: sessionId,
      completedAt,
      pointsEarned,
    };
    if (discountEtb !== undefined) payload.discountEtb = discountEtb;
    if (Array.isArray(payments)) payload.payments = payments;
    else if (paymentMethod) payload.legacy = { method: paymentMethod, reference };

    const result = await svc.checkout(req.user!, payload);
    res.json(result);
  }));

  return router;
}
