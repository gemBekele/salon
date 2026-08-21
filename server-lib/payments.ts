/**
 * Payments service — unified checkout for visit sessions, material sales and
 * group bookings, plus the payments ledger and receipt uploads.
 *
 * Every checkout is a single server-side transaction:
 *   - recomputes the net total from line items and the session discount
 *   - validates the payment lines (split cash/bank, cashback)
 *   - marks the payable paid and records `payments` rows
 *   - for visits: recomputes commissions (service rule first), deducts
 *     inventory, grants loyalty, writes audit + SMS receipt
 *   - for material sales: deducts stock, writes audit + SMS receipt
 *   - for groups: finalizes every member session (commissions/inventory) and
 *     the group bill itself
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { DbPool, DbConnection } from './db';
import type { SmsService } from './sms';
import type { AuthUser } from './auth';
import { uid, canAccessCompany } from './core';

export interface CheckoutPaymentLine {
  method: 'cash' | 'bank';
  bankId?: string;
  bankName?: string;
  txnReference?: string;
  amountEtb: number;
  cashbackEtb?: number;
  receiptPath?: string;
}

export interface CheckoutPayload {
  payableType: 'visit' | 'material_sale' | 'group';
  payableId: string;
  discountEtb?: number;
  paidAmountOverride?: number; // unused placeholder for flexibility
  pointsEarned?: number;
  completedAt?: string;
  payments?: CheckoutPaymentLine[];
  legacy?: { method: string; reference?: string };
}

export interface LedgerFilters {
  companyId?: string | null;
  branchId?: string | null;
  method?: 'cash' | 'bank' | null;
  bankId?: string | null;
  from?: string | null;
  to?: string | null;
}

export interface PaymentService {
  checkout(user: AuthUser, payload: CheckoutPayload): Promise<{
    success: boolean;
    alreadyCompleted?: boolean;
    netTotal?: number;
    discount?: number;
    payments?: CheckoutPaymentLine[];
  }>;
  listPayments(user: AuthUser, payableType: string, payableId: string): Promise<any[]>;
  listLedger(user: AuthUser, filters: LedgerFilters): Promise<any[]>;
  saveReceipt(data: string | null | undefined, filename?: string): Promise<string | null>;
}

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const buildUploadsDir = () => {
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
};

/** Legacy payment method -> cash/bank + human label (keeps old clients working). */
function legacyToLine(legacy: { method: string; reference?: string }): CheckoutPaymentLine | null {
  const m = legacy.method;
  if (m === 'cash') return { method: 'cash', txnReference: legacy.reference, amountEtb: 0 };
  if (['telebirr', 'cbe_birr', 'card', 'mixed'].includes(m)) {
    const label =
      m === 'telebirr' ? 'Telebirr' : m === 'cbe_birr' ? 'CBE Birr' : m === 'card' ? 'Card' : 'Mixed';
    return { method: 'bank', bankName: label, txnReference: legacy.reference, amountEtb: 0 };
  }
  return null;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

async function loadPayable(pool: DbConnection | DbPool, type: string, id: string): Promise<any | null> {
  const table = type === 'visit' ? 'visit_sessions' : type === 'material_sale' ? 'material_sales' : 'group_visits';
  const [rows] = (await pool.query(`SELECT * FROM ${table} WHERE id = ?`, [id])) as any;
  return rows[0] || null;
}

export function createPaymentService(opts: { pool: DbPool; sms: SmsService }): PaymentService {
  const { pool, sms } = opts;

  async function saveReceipt(data: string | null | undefined, filename?: string): Promise<string | null> {
    if (!data) return null;
    const match = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(data);
    if (!match) {
      const b64 = /^([A-Za-z0-9+/=]+)$/.exec(data);
      if (!b64) return null;
      return writeReceiptData(b64[1], filename);
    }
    const ext = match[1].split('/')[1] === 'jpeg' ? 'jpg' : match[1].split('/')[1];
    return writeReceiptData(match[2], filename ? `${filename}.${ext}` : undefined, ext);
  }

  function writeReceiptData(base64: string, filename?: string, ext?: string): string {
    const buf = Buffer.from(base64, 'base64');
    if (buf.length === 0 || buf.length > 5 * 1024 * 1024) {
      const e: any = new Error('Receipt image is empty or exceeds the 5MB limit');
      e.status = 400;
      throw e;
    }
    buildUploadsDir();
    const name = filename && /^[a-zA-Z0-9_.-]+$/.test(filename) ? filename : `rec_${uid('rec')}`;
    const finalName = ext && !name.toLowerCase().endsWith(`.${ext}`) ? `${name}.${ext}` : name;
    fs.writeFileSync(path.join(UPLOADS_DIR, finalName), buf);
    return `/uploads/${finalName}`;
  }

  async function checkout(user: AuthUser, payload: CheckoutPayload) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const payable = await loadPayable(connection, payload.payableType, payload.payableId);
      if (!payable) {
        const e: any = new Error('Payable not found');
        e.status = 404;
        throw e;
      }
      if (!canAccessCompany(user, payable.company_id)) {
        const e: any = new Error('Access denied for this company');
        e.status = 403;
        throw e;
      }
      if (payable.is_paid) {
        await connection.commit();
        return { success: true, alreadyCompleted: true };
      }

      let payments: CheckoutPaymentLine[] = [];
      if (Array.isArray(payload.payments)) {
        payments = payload.payments.map((p) => ({
          method: p.method === 'bank' ? 'bank' : 'cash',
          bankId: p.bankId || null,
          bankName: p.bankName || null,
          txnReference: p.txnReference || null,
          amountEtb: round2(Number(p.amountEtb) || 0),
          cashbackEtb: round2(Number(p.cashbackEtb) || 0),
          receiptPath: p.receiptPath || null,
        }));
      } else if (payload.legacy) {
        const line = legacyToLine(payload.legacy);
        if (!line) {
          const e: any = new Error('Unsupported payment method');
          e.status = 400;
          throw e;
        }
        payments = [line];
      } else {
        const e: any = new Error('payments array is required');
        e.status = 400;
        throw e;
      }

      let result: any;
      if (payload.payableType === 'visit') {
        result = await doVisit(connection, user, payable, payments, payload);
      } else if (payload.payableType === 'material_sale') {
        result = await doMaterial(connection, user, payable, payments, payload);
      } else {
        result = await doGroup(connection, user, payable, payments, payload);
      }

      // Insert payment ledger rows
      for (const p of result.payments) {
        await connection.query(
          `INSERT INTO payments (id, company_id, branch_id, payable_type, payable_id, visit_session_id, method, bank_id, bank_name, txn_reference, amount_etb, cashback_etb, receipt_path, created_by, created_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW())`,
          [
            uid('pay'), payable.company_id, result.branchId, payload.payableType, payload.payableId,
            payload.payableType === 'visit' ? payload.payableId : null,
            p.method, p.bankId, p.bankName, p.txnReference, p.amountEtb, p.cashbackEtb, p.receiptPath,
            user?.name || 'system',
          ]
        );
      }

      await connection.commit();

      // After commit: SMS receipts (non-transactional)
      try {
        const recipient = result.smsRecipient;
        if (recipient?.phone) {
          await sms.dispatch({
            companyId: payable.company_id,
            recipientPhone: recipient.phone,
            messageType: 'session_receipt',
            content: `Thank you ${recipient.name || 'valued client'}! Payment ${result.netTotal} ETB confirmed at Gech Salon.${result.giftPoints ? ` You earned +${result.giftPoints} loyalty points.` : ''}`,
          });
        }
      } catch (err) {
        console.warn('SMS receipt warning:', err);
      }

      return {
        success: true,
        netTotal: result.netTotal,
        discount: result.discount,
        payments: result.payments,
      };
    } catch (e) {
      await connection.rollback();
      throw e;
    } finally {
      connection.release();
    }
  }

  // ---- visit session checkout ------------------------------------------
  async function doVisit(connection: DbConnection, user: AuthUser, session: any, payments: CheckoutPaymentLine[], payload: CheckoutPayload) {
    const [svcRows] = (await connection.query(`SELECT * FROM visit_session_services WHERE visit_session_id = ?`, [session.id])) as any;
    const subtotal = svcRows.reduce((acc: number, s: any) => acc + Number(s.price_etb || 0), 0);
    const discount = round2(payload.discountEtb !== undefined ? Number(payload.discountEtb) : Number(session.discount_etb || 0));
    const tax = Number(session.tax_etb || 0);
    const netTotal = Math.max(0, round2(subtotal - discount + tax));

    const { payments: finalPayments, totalCashback } = finalizeAmounts(payments, netTotal);

    await connection.query(
      `UPDATE visit_sessions SET status='completed', is_paid=TRUE, completed_at=?, subtotal_etb=?, discount_etb=?, net_total_etb=?, payment_method=?, payment_reference=? WHERE id=?`,
      [
        payload.completedAt || new Date().toISOString(),
        round2(subtotal), discount, netTotal,
        finalPayments[0]?.method === 'cash' ? 'cash' : (finalPayments[0]?.bankName || 'bank'),
        finalPayments[0]?.txnReference || null,
        session.id,
      ]
    );

    // Commission recomputation: service rule wins, then staff rule, then staff default.
    const [rules] = (await connection.query(`SELECT * FROM commission_rules WHERE company_id = ? AND is_active = TRUE`, [session.company_id])) as any;
    const [staffRows] = (await connection.query(`SELECT id, default_commission_percentage FROM staff WHERE company_id = ?`, [session.company_id])) as any;
    const staffDefault: Record<string, number> = Object.fromEntries(
      staffRows.map((st: any) => [st.id, Number(st.default_commission_percentage)])
    );

    await connection.query(`UPDATE visit_session_services SET status='completed' WHERE visit_session_id = ?`, [session.id]);
    for (const svc of svcRows) {
      const serviceRule = rules.find((r: any) => r.target_type === 'service' && r.target_id === svc.service_id);
      const staffRule = rules.find((r: any) => r.target_type === 'staff' && r.target_id === svc.staff_id);
      const rule = serviceRule || staffRule;
      let amt = 0;
      let label = '';
      if (rule) {
        if (rule.type === 'percentage') {
          amt = Math.round((Number(svc.price_etb) * Number(rule.value)) / 100);
          label = `${rule.value}% ${rule.target_type === 'service' ? 'Service' : 'Staff'} Custom Rule`;
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
        [uid('com'), session.company_id, session.branch_id, svc.staff_id, svc.staff_name, session.id, svc.service_name, svc.price_etb, amt, label, 'unpaid']
      );
    }

    // Loyalty & VIP
    const pts = payload.pointsEarned ?? Math.floor(Number(netTotal) / 10);
    await connection.query(
      `UPDATE customers SET total_spent_etb = total_spent_etb + ?, total_visits = total_visits + 1, loyalty_points = loyalty_points + ?,
       is_vip = CASE WHEN total_spent_etb + ? >= 10000 OR total_visits + 1 >= 10 THEN TRUE ELSE FALSE END WHERE id = ?`,
      [netTotal, pts, netTotal, session.customer_id]
    );

    // Inventory deduction
    for (const row of svcRows) {
      const [reqs] = await connection.query(`SELECT inventory_item_id, quantity_used FROM service_inventory_requirements WHERE service_id = ?`, [row.service_id]);
      for (const rq of reqs as any[]) {
        await connection.query(`UPDATE inventory_items SET current_stock = GREATEST(0, current_stock - ?) WHERE id = ?`, [rq.quantity_used, rq.inventory_item_id]);
      }
    }

    await insertAudit(connection, session.company_id, session.branch_id, 'payment_edit',
      `Checkout completed for session ${session.queue_number} (${netTotal} ETB, ${finalPayments.length} payment line(s))`, `Receptionist (${user?.name || 'system'})`);

    return {
      branchId: session.branch_id,
      netTotal,
      discount,
      payments: finalPayments,
      totalCashback,
      giftPoints: pts,
      smsRecipient: { phone: session.customer_phone, name: session.customer_name },
    };
  }

  // ---- material sale checkout -------------------------------------------
  async function doMaterial(connection: DbConnection, user: AuthUser, sale: any, payments: CheckoutPaymentLine[], payload: CheckoutPayload) {
    const [items] = (await connection.query(`SELECT * FROM material_sale_items WHERE material_sale_id = ?`, [sale.id])) as any;
    const subtotal = items.reduce((acc: number, i: any) => acc + round2(Number(i.total_etb || i.quantity * i.unit_price_etb || 0)), 0);
    const discount = round2(payload.discountEtb !== undefined ? Number(payload.discountEtb) : Number(sale.discount_etb || 0));
    const netTotal = Math.max(0, round2(subtotal - discount));

    const { payments: finalPayments } = finalizeAmounts(payments, netTotal);

    await connection.query(`UPDATE material_sales SET status='completed', is_paid=TRUE, paid_at=?, subtotal_etb=?, discount_etb=?, net_total_etb=? WHERE id=?`,
      [payload.completedAt || new Date().toISOString(), round2(subtotal), discount, netTotal, sale.id]);

    // Deduct stock per sold item
    for (const item of items) {
      await connection.query(`UPDATE inventory_items SET current_stock = GREATEST(0, current_stock - ?) WHERE id = ?`, [item.quantity, item.inventory_item_id]);
    }

    await insertAudit(connection, sale.company_id, sale.branch_id, 'payment_edit',
      `Material sale ${sale.id.slice(-6).toUpperCase()} completed (${netTotal} ETB, ${finalPayments.length} payment line(s))`, `Receptionist (${user?.name || 'system'})`);

    return {
      branchId: sale.branch_id,
      netTotal,
      discount,
      payments: finalPayments,
      smsRecipient: sale.customer_phone ? { phone: sale.customer_phone, name: sale.customer_name } : null,
    };
  }

  // ---- group checkout ---------------------------------------------------
  async function doGroup(connection: DbConnection, user: AuthUser, group: any, payments: CheckoutPaymentLine[], payload: CheckoutPayload) {
    const [memberRows] = (await connection.query(
      `SELECT vs.id, vs.company_id, vs.branch_id, vs.customer_id, vs.customer_phone, vs.customer_name, vs.net_total_etb, vs.subtotal_etb, vs.queue_number
       FROM group_visit_members gvm JOIN visit_sessions vs ON vs.id = gvm.visit_session_id WHERE gvm.group_id = ?`,
      [group.id]
    )) as any;
    const subtotal = memberRows.reduce((acc: number, m: any) => acc + Number(m.subtotal_etb || 0), 0);
    const discount = round2(payload.discountEtb !== undefined ? Number(payload.discountEtb) : Number(group.discount_etb || 0));
    const tax = Number(group.tax_etb || 0);
    const netTotal = Math.max(0, round2(subtotal - discount + tax));

    const { payments: finalPayments } = finalizeAmounts(payments, netTotal);

    await connection.query(`UPDATE group_visits SET status='completed', is_paid=TRUE, completed_at=?, subtotal_etb=?, discount_etb=?, tax_etb=?, net_total_etb=? WHERE id=?`,
      [payload.completedAt || new Date().toISOString(), round2(subtotal), discount, tax, netTotal, group.id]);

    // Finalize each member session like a normal visit (commissions + inventory),
    // but do not re-accrue loyalty or re-run the whole per-session payment audit.
    for (const member of memberRows) {
      await connection.query(`UPDATE visit_sessions SET is_paid=TRUE, status='completed' WHERE id = ?`, [member.id]);
      const [svcRows] = (await connection.query(`SELECT * FROM visit_session_services WHERE visit_session_id = ?`, [member.id])) as any;
      const [rules] = (await connection.query(`SELECT * FROM commission_rules WHERE company_id = ? AND is_active = TRUE`, [member.company_id])) as any;
      const [staffRows] = (await connection.query(`SELECT id, default_commission_percentage FROM staff WHERE company_id = ?`, [member.company_id])) as any;
      const staffDefault: Record<string, number> = Object.fromEntries(staffRows.map((st: any) => [st.id, Number(st.default_commission_percentage)]));
      for (const svc of svcRows) {
        const serviceRule = rules.find((r: any) => r.target_type === 'service' && r.target_id === svc.service_id);
        const staffRule = rules.find((r: any) => r.target_type === 'staff' && r.target_id === svc.staff_id);
        const rule = serviceRule || staffRule;
        let amt = 0;
        let label = '';
        if (rule) {
          amt = rule.type === 'percentage'
            ? Math.round((Number(svc.price_etb) * Number(rule.value)) / 100)
            : Number(rule.value);
          label = `${rule.value}${rule.type === 'percentage' ? '%' : ' ETB Fixed'} ${rule.target_type} Rule`;
        } else {
          const pct = staffDefault[svc.staff_id] ?? 30;
          amt = Math.round((Number(svc.price_etb) * pct) / 100);
          label = `${pct}% Standard Rate`;
        }
        await connection.query(`UPDATE visit_session_services SET status='completed', commission_earned_etb = ? WHERE id = ?`, [amt, svc.id]);
        await connection.query(
          `INSERT INTO commission_logs (id, company_id, branch_id, staff_id, staff_name, visit_session_id, service_name, service_price_etb, commission_amount_etb, rule_applied, payout_status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,NOW())`,
          [uid('com'), member.company_id, member.branch_id, svc.staff_id, svc.staff_name, member.id, svc.service_name, svc.price_etb, amt, label, 'unpaid']
        );
        const [reqs] = await connection.query(`SELECT inventory_item_id, quantity_used FROM service_inventory_requirements WHERE service_id = ?`, [svc.service_id]);
        for (const rq of reqs as any[]) {
          await connection.query(`UPDATE inventory_items SET current_stock = GREATEST(0, current_stock - ?) WHERE id = ?`, [rq.quantity_used, rq.inventory_item_id]);
        }
      }
    }

    await insertAudit(connection, group.company_id, group.branch_id, 'payment_edit',
      `Group "${group.name}" checkout completed (${netTotal} ETB, ${finalPayments.length} payment line(s), ${memberRows.length} members)`, `Receptionist (${user?.name || 'system'})`);

    return {
      branchId: group.branch_id,
      netTotal,
      discount,
      payments: finalPayments,
      smsRecipient: null,
    };
  }

  async function listPayments(user: AuthUser, payableType: string, payableId: string): Promise<any[]> {
    const [rows] = (await pool.query(
      `SELECT * FROM payments WHERE payable_type = ? AND payable_id = ? ORDER BY created_at ASC`,
      [payableType, payableId]
    )) as any;
    return rows;
  }

  async function listLedger(user: AuthUser, filters: LedgerFilters): Promise<any[]> {
    const conditions: string[] = [];
    const values: any[] = [];
    const companyId = user.role === 'super_admin' && filters.companyId ? filters.companyId : user.companyId;
    if (companyId) { conditions.push('company_id = ?'); values.push(companyId); }
    if (filters.branchId) { conditions.push('branch_id = ?'); values.push(filters.branchId); }
    if (filters.method) { conditions.push('method = ?'); values.push(filters.method); }
    if (filters.bankId) { conditions.push('bank_id = ?'); values.push(filters.bankId); }
    if (filters.from) { conditions.push('DATE(created_at) >= ?'); values.push(filters.from); }
    if (filters.to) { conditions.push('DATE(created_at) <= ?'); values.push(filters.to); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows] = (await pool.query(`SELECT * FROM payments ${where} ORDER BY created_at ASC`, values)) as any;
    return rows;
  }

  return { checkout, listPayments, listLedger, saveReceipt };
}

/** Assure the payment lines' amounts cover the net total; returns normalized lines + total cashback. */
function finalizeAmounts(payments: CheckoutPaymentLine[], netTotal: number): { payments: CheckoutPaymentLine[]; totalCashback: number } {
  const lines = payments.map((p) => ({
    method: p.method,
    bankId: p.bankId || null,
    bankName: p.bankName || null,
    txnReference: p.txnReference || null,
    amountEtb: round2(Number(p.amountEtb) || 0),
    cashbackEtb: round2(Number(p.cashbackEtb) || 0),
    receiptPath: p.receiptPath || null,
  }));

  for (const p of lines) {
    if (p.cashbackEtb > p.amountEtb) {
      const e: any = new Error('Cashback cannot exceed the payment amount');
      e.status = 400;
      throw e;
    }
  }

  // Backward-compatible single line with amount 0 => auto-fill the net total.
  if (lines.length === 1 && lines[0].amountEtb <= 0) lines[0].amountEtb = netTotal;

  const totalPaid = round2(lines.reduce((a, p) => a + p.amountEtb, 0));
  const totalCashback = round2(lines.reduce((a, p) => a + p.cashbackEtb, 0));
  if (totalPaid < netTotal || totalPaid - totalCashback !== netTotal) {
    const e: any = new Error(`Payment total mismatch: bill is ${netTotal} ETB but payments net ${round2(totalPaid - totalCashback)} ETB`);
    e.status = 400;
    throw e;
  }
  return { payments: lines, totalCashback };
}

async function insertAudit(connection: DbConnection, companyId: string, branchId: string | null, actionType: string, description: string, performedBy: string): Promise<void> {
  await connection.query(
    `INSERT INTO audit_logs (id, company_id, branch_id, action_type, description, performed_by, timestamp) VALUES (?,?,?,?,?,?,NOW())`,
    [uid('aud'), companyId, branchId || null, actionType, description, performedBy]
  );
}