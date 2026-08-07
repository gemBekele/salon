import crypto from 'node:crypto';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  tokenBlacklist,
  AuthUser,
} from '../auth';

const testUser: AuthUser = {
  id: 'user_test_001',
  companyId: 'comp_test_001',
  name: 'Test User',
  email: 'test@test.com',
  role: 'staff',
};

describe('Auth – additional', () => {
  beforeEach(() => {
    tokenBlacklist.clear();
  });

  describe('token expiry', () => {
    it('rejects token with exp in the past', () => {
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({
        sub: testUser.id,
        name: testUser.name,
        email: testUser.email,
        role: testUser.role,
        companyId: testUser.companyId,
        iat: Math.floor(Date.now() / 1000) - 10000,
        exp: Math.floor(Date.now() / 1000) - 5000,
      })).toString('base64url');
      const sig = crypto.createHmac('sha256', process.env.JWT_SECRET || 'dev-insecure-secret-change-me')
        .update(`${header}.${payload}`)
        .digest('base64url');
      const token = `${header}.${payload}.${sig}`;
      expect(() => verifyToken(token)).toThrow('Token expired');
    });
  });

  describe('blacklist', () => {
    it('verifyToken does not check blacklist (middleware does)', () => {
      const token = signToken(testUser);
      tokenBlacklist.add(token);
      expect(() => verifyToken(token)).not.toThrow();
    });

    it('blacklist is a mutable Set that middleware checks', () => {
      tokenBlacklist.add('fake-token');
      expect(tokenBlacklist.has('fake-token')).toBe(true);
      tokenBlacklist.delete('fake-token');
      expect(tokenBlacklist.has('fake-token')).toBe(false);
    });
  });

  describe('roles', () => {
    it('preserves role in token', () => {
      const admin: AuthUser = { ...testUser, role: 'super_admin' };
      const token = signToken(admin);
      const decoded = verifyToken(token);
      expect(decoded.role).toBe('super_admin');
    });

    it('preserves companyId null for super_admin', () => {
      const admin: AuthUser = { ...testUser, role: 'super_admin', companyId: null };
      const token = signToken(admin);
      const decoded = verifyToken(token);
      expect(decoded.companyId).toBeNull();
    });
  });

  describe('password edge cases', () => {
    it('handles unicode passwords', () => {
      const hash = hashPassword('密码密码密码');
      expect(verifyPassword('密码密码密码', hash)).toBe(true);
      expect(verifyPassword('密码密码', hash)).toBe(false);
    });

    it('handles empty string password', () => {
      const hash = hashPassword('');
      expect(verifyPassword('', hash)).toBe(true);
      expect(verifyPassword(' ', hash)).toBe(false);
    });

    it('handles long password (256 chars)', () => {
      const longPw = 'a'.repeat(256);
      const hash = hashPassword(longPw);
      expect(verifyPassword(longPw, hash)).toBe(true);
    });
  });
});
