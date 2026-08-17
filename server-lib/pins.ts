import type { DbPool } from './db';
import { verifyPassword } from './auth';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

export interface PinCheckResult {
  ok: boolean;
  staff?: any;
  pinChanged?: boolean;
  locked?: boolean;
  error?: string;
}

/**
 * Verify a staff member's 4-digit PIN against the stored scrypt hash.
 *
 * - Locks the account for 15 minutes after 5 consecutive failures.
 * - Resets the failure counter on a successful match.
 * - Never reveals the stored hash; failures return a generic message.
 */
export async function checkStaffPin(
  pool: DbPool,
  staffId: string,
  pin: string
): Promise<PinCheckResult> {
  const [rows] = (await pool.query(
    `SELECT id, company_id, branch_id, business_unit_id, name, phone, email, role,
            pin_hash, pin_changed, pin_failed_attempts, pin_locked_until, status
     FROM staff WHERE id = ?`,
    [staffId]
  )) as any;
  const s = rows?.[0];
  if (!s || !s.pin_hash) {
    return { ok: false, error: 'Staff member not found' };
  }

  if (s.pin_locked_until) {
    const lockedUntil = new Date(s.pin_locked_until).getTime();
    if (lockedUntil > Date.now()) {
      return { ok: false, locked: true, error: 'Too many failed attempts. PIN is locked. Try again later.' };
    }
  }

  if (!verifyPassword(pin, s.pin_hash)) {
    const attempts = Number(s.pin_failed_attempts || 0) + 1;
    if (attempts >= MAX_FAILED_ATTEMPTS) {
      await pool.query(
        `UPDATE staff SET pin_failed_attempts = 0, pin_locked_until = NOW() + INTERVAL '${LOCK_MINUTES} minutes' WHERE id = ?`,
        [staffId]
      );
      return { ok: false, locked: true, error: 'Too many failed attempts. PIN is locked for 15 minutes.' };
    }
    await pool.query(`UPDATE staff SET pin_failed_attempts = ? WHERE id = ?`, [attempts, staffId]);
    return { ok: false, error: 'Incorrect PIN' };
  }

  await pool.query(`UPDATE staff SET pin_failed_attempts = 0, pin_locked_until = NULL WHERE id = ?`, [staffId]);
  return { ok: true, staff: s, pinChanged: Boolean(s.pin_changed) };
}
