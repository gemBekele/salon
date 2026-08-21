import { Router } from 'express';
import type { DbPool } from '../db';
import { authenticate, asyncHandler } from '../middleware';
import { validate } from '../validate';
import { hashPassword, isValidPin, defaultPinForPhone } from '../auth';
import { checkStaffPin } from '../pins';

/**
 * Staff PIN operations:
 *  - POST /staff/verify-pin   → check a PIN (used by "Switch Active Employee")
 *  - POST /staff/change-pin   → set a new PIN (self-service + manager override)
 *  - POST /staff/:id/reset-pin→ manager regenerates a default PIN
 */
export function createStaffRouter(pool: DbPool): Router {
  const router = Router();

  router.post('/verify-pin', authenticate, asyncHandler(async (req, res) => {
    const errs = validate(req.body, {
      staffId: { required: true, type: 'string' },
      pin: { required: true, type: 'string' },
    });
    if (errs.length) return res.status(400).json({ error: errs.join('; ') });
    if (!isValidPin(String(req.body.pin))) return res.status(400).json({ error: 'PIN must be exactly 4 digits' });

    const result = await checkStaffPin(pool, String(req.body.staffId), String(req.body.pin));
    if (!result.ok) {
      return res.status(result.locked ? 429 : 401).json({ error: result.error });
    }
    return res.json({ success: true, pinChanged: Boolean(result.pinChanged) });
  }));

  router.post('/change-pin', authenticate, asyncHandler(async (req, res) => {
    const errs = validate(req.body, {
      staffId: { required: true, type: 'string' },
      currentPin: { required: true, type: 'string' },
      newPin: { required: true, type: 'string' },
    });
    if (errs.length) return res.status(400).json({ error: errs.join('; ') });

    const { staffId, currentPin, newPin } = req.body;
    if (!isValidPin(String(newPin))) return res.status(400).json({ error: 'New PIN must be exactly 4 digits' });

    const isSelf = req.user!.id === staffId;
    const isManager = ['super_admin', 'owner', 'manager'].includes(req.user!.role);
    if (!isSelf && !isManager) {
      return res.status(403).json({ error: 'You can only change your own PIN' });
    }

    const result = await checkStaffPin(pool, String(staffId), String(currentPin));
    if (!result.ok) {
      return res.status(result.locked ? 429 : 401).json({ error: 'Current PIN is incorrect' });
    }

    await pool.query(
      `UPDATE staff SET pin_hash = ?, pin_changed = TRUE, pin_failed_attempts = 0, pin_locked_until = NULL WHERE id = ?`,
      [hashPassword(String(newPin)), staffId]
    );
    return res.json({ success: true, pinChanged: true });
  }));

  router.post('/:id/reset-pin', authenticate, asyncHandler(async (req, res) => {
    if (!['super_admin', 'owner', 'manager'].includes(req.user!.role)) {
      return res.status(403).json({ error: 'Only managers can reset staff PINs' });
    }
    const [rows] = (await pool.query(`SELECT phone FROM staff WHERE id = ?`, [req.params.id])) as any;
    if (!rows[0]) return res.status(404).json({ error: 'Staff not found' });

    const defaultPin = defaultPinForPhone(rows[0].phone);
    await pool.query(
      `UPDATE staff SET pin_hash = ?, pin_changed = FALSE, pin_failed_attempts = 0, pin_locked_until = NULL WHERE id = ?`,
      [hashPassword(defaultPin), req.params.id]
    );
    return res.json({ success: true, defaultPin });
  }));

  return router;
}
