import { Router } from 'express';
import type { DbPool, DbConnection } from '../db';
import type { SmsService } from '../sms';
import { posOnly, asyncHandler } from '../middleware';
import { validate, ValidationSchema } from '../validate';
import { uid, canAccessCompany, notFound } from '../core';

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

  router.use(['/customers', '/visit-sessions'], ...posOnly);

  /**
   * Derive the next queue number for a branch (e.g. Q-104). Must be called
   * inside a transaction that holds a row lock on the branch so two concurrent
   * check-ins can never receive the same number.
   */
  async function nextQueueNumber(conn: DbConnection, companyId: string, branchId: string): Promise<string> {
    await conn.query(`SELECT id FROM branches WHERE id = ? FOR UPDATE`, [branchId]);
    const [rows] = (await conn.query(
      `SELECT queue_number FROM visit_sessions WHERE company_id = ? AND branch_id = ? ORDER BY started_at DESC LIMIT 1`,
      [companyId, branchId]
    )) as any;
    const last = rows[0]?.queue_number as string | undefined;
    const current = last ? parseInt(last.replace(/[^0-9]/g, ''), 10) || 100 : 100;
    return `Q-${current + 1}`;
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

    await pool.query(`UPDATE visit_sessions SET status = ? WHERE id = ?`, [b.status, b.id]);
    if (b.status === 'in_progress') {
      await sms.dispatch({ companyId: s.company_id, recipientPhone: s.customer_phone, messageType: 'queue_turn_alert', content: `Hello ${s.customer_name}! Queue #${s.queue_number} is now IN PROGRESS — your station is ready.` });
    }
    res.json({ success: true, status: b.status });
  }));

  router.patch('/visit-sessions/staff', asyncHandler(async (req, res) => {
    if (!canAccessCompany(req.user!, req.body.companyId ?? '')) return res.status(403).json({ error: 'Company not found' });
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
      await pool.query(`UPDATE visit_sessions SET status = 'completed' WHERE id = ?`, [svc.visit_session_id]);
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
  // Checkout — atomic transaction; commissions recomputed server-side
  // ==========================================================
  router.post('/visit-sessions/checkout', asyncHandler(async (req, res) => {
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

      // Idempotence guard: already-paid sessions are never re-processed
      // (would duplicate commissions and double-deduct inventory/loyalty).
      if (session.is_paid) {
        await connection.commit();
        return res.json({ success: true, alreadyCompleted: true });
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
          [uid('com'), session.company_id, session.branch_id, svc.staff_id, svc.staff_name, sessionId, svc.service_name, svc.price_etb, amt, label, 'unpaid']
        );
      }

      // 3. Update customer loyalty & VIP
      const pts = pointsEarned ?? Math.floor(Number(netTotal) / 10);
      await connection.query(
        `UPDATE customers SET total_spent_etb = total_spent_etb + ?, total_visits = total_visits + 1, loyalty_points = loyalty_points + ?,
         is_vip = CASE WHEN total_spent_etb + ? >= 10000 OR total_visits + 1 >= 10 THEN TRUE ELSE FALSE END WHERE id = ?`,
        [netTotal, pts, netTotal, session.customer_id]);

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
        [uid('aud'), session.company_id, session.branch_id, 'payment_edit', `Checkout completed for session ${session.queue_number} (${session.net_total_etb} ETB via ${paymentMethod || 'cash'})`, `Receptionist (${req.user!.name})`]);

      await connection.commit();

      // After commit: dispatch SMS receipt (non-transactional)
      await sms.dispatch({ companyId: session.company_id, recipientPhone: session.customer_phone, messageType: 'session_receipt', content: `Thank you ${session.customer_name}! Payment ${netTotal} ETB confirmed. You earned +${pts} loyalty points.` });

      res.json({ success: true });
    } catch (e) {
      await connection.rollback();
      throw e;
    } finally {
      connection.release();
    }
  }));

  return router;
}
