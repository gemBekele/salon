import { Router } from 'express';
import type { DbPool } from '../db';
import { verifyPassword, signToken, tokenBlacklist, isValidPin, AuthUser } from '../auth';
import { authenticate, loginRateLimit, asyncHandler } from '../middleware';
import { validate } from '../validate';
import { checkStaffPin } from '../pins';

export function createAuthRouter(pool: DbPool): Router {
  const router = Router();

  /** Public list of staff who can sign in with a PIN (names only, no hashes). */
  router.get('/staff-login-options', asyncHandler(async (_req, res) => {
    const [cmpRows] = (await pool.query(`SELECT id, name FROM companies ORDER BY name`)) as any;
    const [stfRows] = (await pool.query(
      `SELECT s.id, s.company_id, s.name, s.branch_id, b.name AS branch_name
       FROM staff s LEFT JOIN branches b ON b.id = s.branch_id
       WHERE s.pin_hash IS NOT NULL AND s.status <> 'off_shift'
       ORDER BY s.name`
    )) as any;
    const byCompany = new Map<string, { companyId: string; companyName: string; staff: any[] }>();
    for (const c of cmpRows) {
      byCompany.set(c.id, { companyId: c.id, companyName: c.name, staff: [] });
    }
    for (const s of stfRows) {
      const group = byCompany.get(s.company_id);
      if (group) group.staff.push({ id: s.id, name: s.name, branchId: s.branch_id, branchName: s.branch_name || '' });
    }
    return res.json({ companies: [...byCompany.values()] });
  }));

  /** Staff sign-in with a 4-digit PIN (staff pick their name from the list). */
  router.post('/staff-login', loginRateLimit, asyncHandler(async (req, res) => {
    const errs = validate(req.body, {
      staffId: { required: true, type: 'string' },
      pin: { required: true, type: 'string' },
    });
    if (errs.length) return res.status(400).json({ error: errs.join('; ') });

    const { staffId, pin } = req.body;
    if (!isValidPin(String(pin))) return res.status(400).json({ error: 'PIN must be exactly 4 digits' });

    const result = await checkStaffPin(pool, staffId, String(pin));
    if (!result.ok) {
      loginRateLimit.recordFailure(req);
      const status = result.locked ? 429 : 401;
      return res.status(status).json({ error: result.error });
    }
    loginRateLimit.recordSuccess(req);

    const s = result.staff;
    if (!s.email) await pool.query(`UPDATE users SET last_login_at = NOW() WHERE email = ?`, [s.email]);
    const authUser: AuthUser = {
      id: s.id,
      companyId: s.company_id,
      name: s.name,
      email: s.email || '',
      role: 'staff',
      pinChanged: Boolean(s.pin_changed),
    };
    const token = signToken(authUser);
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('sserp_token', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'strict' : 'lax',
      maxAge: 8 * 60 * 60 * 1000,
      path: '/',
    });
    return res.json({ token, user: authUser, pinChanged: Boolean(s.pin_changed) });
  }));

  router.post('/login', loginRateLimit, asyncHandler(async (req, res) => {
    const errs = validate(req.body, {
      email: { required: true, type: 'string' },
      password: { required: true, type: 'string' },
    });
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
    const authUser: AuthUser = {
      id: user.id,
      companyId: user.company_id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
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

  router.get('/me', authenticate, asyncHandler(async (req, res) => {
    const user = req.user!;
    let pinChanged: boolean | undefined;
    if (user.role === 'staff') {
      const [rows] = (await pool.query(
        `SELECT pin_changed FROM staff WHERE id = ? UNION SELECT pin_changed FROM staff WHERE email = ?`,
        [user.id, user.email]
      )) as any;
      pinChanged = rows[0] ? Boolean(rows[0].pin_changed) : true;
    }
    return res.json({ user: { ...user, pinChanged } });
  }));

  router.post('/logout', authenticate, (req, res) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (token) tokenBlacklist.add(token);
    res.clearCookie('sserp_token', { path: '/' });
    res.json({ success: true });
  });

  router.get('/health', async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ok', db: 'connected', uptime: process.uptime() });
    } catch {
      res.status(503).json({ status: 'error', db: 'disconnected' });
    }
  });

  return router;
}
