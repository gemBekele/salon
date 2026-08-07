import type { Request, Response, NextFunction, RequestHandler, ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { tokenBlacklist, verifyToken } from './auth';
import { logger } from './logger';

declare global {
  namespace Express {
    interface Request {
      user?: import('./auth').AuthUser;
    }
  }
}

export interface LoginLimiter extends RequestHandler {
  recordFailure(req: Request): void;
  recordSuccess(req: Request): void;
}

/** Wrap async route handlers so thrown errors reach the error handler. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

/** Central error handler — must keep the full 4-arg Express signature. */
export const errorHandler: ErrorRequestHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  const status = Number(err?.status) || 500;
  if (res.headersSent) return;
  if (status >= 500) {
    logger.error('api-error', { message: err?.message, stack: err?.stack });
    res.status(status).json({ error: 'Internal server error' });
  } else {
    res.status(status).json({ error: err?.message || 'Bad request' });
  }
};

export const securityHeaders: RequestHandler = helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
  crossOriginEmbedderPolicy: false,
});

export const corsMiddleware: RequestHandler = cors({
  origin(origin, callback) {
    if (!origin || process.env.CORS_ORIGINS?.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
});

export const requestLogger: RequestHandler = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info('request', {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      ms: Date.now() - start,
      ip: req.ip,
    });
  });
  next();
};

/** Sliding-window IP rate limiter factory. */
export function rateLimit(max: number, windowMs: number): RequestHandler {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return (req, res, next) => {
    const ip = req.ip || 'unknown';
    const now = Date.now();
    const entry = hits.get(ip);
    if (!entry || entry.resetAt <= now) {
      hits.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }
    entry.count += 1;
    if (entry.count > max) {
      logger.warn('rate-limited', { ip });
      res.setHeader('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return res.status(429).json({ error: 'Too many requests, please slow down.' });
    }
    return next();
  };
}

const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();

const loginHandler: RequestHandler = (req, res, next) => {
  const key = `${req.ip || 'unknown'}:${String((req.body as any)?.email || '').toLowerCase()}`;
  const now = Date.now();
  const rec = loginAttempts.get(key);
  const lockedUntil = rec && rec.lockedUntil > now ? rec.lockedUntil : 0;
  if (lockedUntil) {
    res.setHeader('Retry-After', String(Math.ceil((lockedUntil - now) / 1000)));
    return res.status(429).json({ error: 'Too many failed attempts. Try again later.' });
  }
  (req as any).loginKey = key;
  return next();
};

export const loginRateLimit = loginHandler as LoginLimiter;
loginRateLimit.recordFailure = (req) => {
  const key = (req as any).loginKey;
  if (!key) return;
  const now = Date.now();
  const rec = loginAttempts.get(key) || { count: 0, lockedUntil: 0 };
  rec.count += 1;
  rec.lockedUntil = now + Math.min(900_000, 30_000 * Math.pow(2, rec.count - 1));
  loginAttempts.set(key, rec);
};
loginRateLimit.recordSuccess = (req) => {
  const key = (req as any).loginKey;
  if (key) loginAttempts.delete(key);
};

/** Require a valid Bearer JWT; attaches the user to req.user. */
export const authenticate: RequestHandler = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  if (tokenBlacklist.has(token)) return res.status(401).json({ error: 'Session has been terminated' });
  try {
    req.user = verifyToken(token);
    return next();
  } catch (e: any) {
    return res.status(401).json({ error: e?.message || 'Invalid or expired token' });
  }
};

/** Require the current user to have one of the given roles. */
export function requireRoles(...roles: string[]): RequestHandler {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission to perform this action' });
    }
    return next();
  };
}