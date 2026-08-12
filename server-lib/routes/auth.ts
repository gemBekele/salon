import { Router } from 'express';
import type { DbPool } from '../db';
import { verifyPassword, signToken, tokenBlacklist, AuthUser } from '../auth';
import { authenticate, loginRateLimit, asyncHandler } from '../middleware';
import { validate } from '../validate';

export function createAuthRouter(pool: DbPool): Router {
  const router = Router();

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

  router.get('/me', authenticate, (req, res) => res.json({ user: req.user }));

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
