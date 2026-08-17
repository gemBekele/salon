/**
 * Authentication helpers: password hashing (scrypt) and JWT signing/verifying
 * implemented with Node's built-in crypto — no external dependencies.
 *
 * Secrets/expo are read from the environment so these helpers can be used
 * directly by route handlers.
 */
import crypto from 'node:crypto';

export type UserRole = 'super_admin' | 'tenant_manager' | 'receptionist' | 'staff';

export interface AuthUser {
  id: string;
  companyId: string | null;
  name: string;
  email: string;
  role: UserRole;
  pinChanged?: boolean;
}

function jwtSecret(): string {
  return process.env.JWT_SECRET || 'dev-insecure-secret-change-me';
}

function expiresInSeconds(): number {
  const dur = process.env.JWT_EXPIRES_IN || '8h';
  const match = /^(\d+)([smhd])$/.exec(dur);
  if (!match) return 8 * 3600;
  const n = Number(match[1]);
  switch (match[2]) {
    case 's':
      return n;
    case 'm':
      return n * 60;
    case 'h':
      return n * 3600;
    case 'd':
      return n * 86400;
    default:
      return n;
  }
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

/** Sign an HS256 JWT for a user. */
export function signToken(user: AuthUser): string {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const payload = b64url(
    JSON.stringify({
      sub: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      iat: now,
      exp: now + expiresInSeconds(),
    })
  );
  const signature = crypto
    .createHmac('sha256', jwtSecret())
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${signature}`;
}

/** Verify an HS256 JWT and return the embedded user. Throws on any failure. */
export function verifyToken(token: string): AuthUser {
  const [header, payload, signature] = token.split('.');
  if (!header || !payload || !signature) throw new Error('Malformed token');

  const expected = crypto
    .createHmac('sha256', jwtSecret())
    .update(`${header}.${payload}`)
    .digest('base64url');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    throw new Error('Invalid token signature');
  }

  const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  const now = Math.floor(Date.now() / 1000);
  if (decoded.exp && decoded.exp < now) throw new Error('Token expired');

  return {
    id: decoded.sub,
    name: decoded.name,
    email: decoded.email,
    role: decoded.role,
    companyId: typeof decoded.companyId === 'string' ? decoded.companyId : null,
  };
}

/** Hash a password with scrypt; returns "<salt-hex>:<hash-hex>". */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

/** Constant-time password comparison against a stored hash. */
export function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(':');
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(password, salt, expected.length);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

/** In-memory access token blacklist for logout (resets on restart). */
export const tokenBlacklist = new Set<string>();

/** A staff PIN is always exactly 4 numeric digits. */
export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

/**
 * Generate the default PIN for a staff member: the universal default code 7788.
 */
export function defaultPinForPhone(_phone: string | null | undefined): string {
  return '7788';
}