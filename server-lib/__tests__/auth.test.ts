import { describe, it, expect } from 'vitest';
import { verifyPassword, hashPassword, signToken, verifyToken } from '../auth';

describe('Auth utilities', () => {
  it('should hash and verify passwords correctly', () => {
    const password = 'Admin123!';
    const hash = hashPassword(password);
    expect(hash).toContain(':');
    expect(verifyPassword(password, hash)).toBe(true);
    expect(verifyPassword('wrong', hash)).toBe(false);
  });

  it('should generate unique hashes for same password', () => {
    const h1 = hashPassword('test');
    const h2 = hashPassword('test');
    expect(h1).not.toBe(h2);
    expect(verifyPassword('test', h1)).toBe(true);
    expect(verifyPassword('test', h2)).toBe(true);
  });

  it('should sign and verify JWT tokens', () => {
    const user = { id: 'u1', companyId: 'c1', name: 'Test', email: 'test@test.com', role: 'tenant_manager' as const };
    const token = signToken(user);
    expect(token.split('.')).toHaveLength(3);
    const decoded = verifyToken(token);
    expect(decoded.id).toBe('u1');
    expect(decoded.email).toBe('test@test.com');
    expect(decoded.role).toBe('tenant_manager');
    expect(decoded.companyId).toBe('c1');
  });

  it('should reject invalid token signatures', () => {
    const user = { id: 'u1', companyId: 'c1', name: 'Test', email: 'test@test.com', role: 'staff' as const };
    const token = signToken(user);
    const parts = token.split('.');
    const tampered = `${parts[0]}.${parts[1]}.invalid_signature`;
    expect(() => verifyToken(tampered)).toThrow();
  });
});
