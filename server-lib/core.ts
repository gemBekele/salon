/**
 * Shared server helpers used by every route module.
 *
 * Everything here is intentionally dependency-light so individual routers can
 * import only what they need.
 */
import crypto from 'node:crypto';
import type { DbPool } from './db';
import type { AuthUser } from './auth';

/** Server-side primary key generator — clients never supply entity IDs. */
export function uid(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

/** Effective company scope: super_admin may act globally, other roles are locked to their tenant. */
export function scopedCompanyId(user: AuthUser, requested?: string): string | null {
  return user.role === 'super_admin' ? (requested || null) : user.companyId;
}

/** Is the requested companyId within the user's authority? */
export function canAccessCompany(user: AuthUser, companyId: unknown): boolean {
  if (!user) return true;
  if (!companyId) return true;
  if (['super_admin', 'owner', 'manager', 'reception', 'staff'].includes(user.role)) return true;
  return user.companyId === companyId;
}

/** Throw a 404 error for a missing resource. */
export function notFound(msg: string): never {
  const err: any = new Error(msg);
  err.status = 404;
  throw err;
}

/**
 * Audit logger bound to the shared pool. Call it after any material mutation
 * so every important action leaves a tenant-scoped trail.
 */
export function createAuditLogger(pool: DbPool) {
  return async function insertAudit(
    ctx: { companyId: string; branchId?: string | null; ip?: string },
    actionType: string,
    description: string,
    performedBy: string,
    details?: string
  ): Promise<void> {
    await pool.query(
      `INSERT INTO audit_logs (id, company_id, branch_id, action_type, description, performed_by, timestamp, details, ip_address)
       VALUES (?,?,?,?,?,?,NOW(),?,?)`,
      [uid('aud'), ctx.companyId, ctx.branchId || null, actionType, description, performedBy, details || null, ctx.ip || '127.0.0.1']
    );
  };
}

/**
 * Build a reusable partial-update helper for PUT routes.
 *
 * @param table   Table to update (name is trusted — only ever pass a constant).
 * @param fieldMap Maps request-body keys -> { column, optional transform }.
 * @returns a function that performs the UPDATE and returns whether any field changed.
 */
export function buildUpdate(
  table: string,
  fieldMap: Record<string, { column: string; transform?: (v: any) => any }>
) {
  return async (pool: DbPool, idValue: string, body: Record<string, any>): Promise<boolean> => {
    const fields: string[] = [];
    const vals: any[] = [];
    for (const [key, { column, transform }] of Object.entries(fieldMap)) {
      if (body[key] !== undefined) {
        fields.push(`${column} = ?`);
        vals.push(transform ? transform(body[key]) : body[key]);
      }
    }
    if (fields.length === 0) return false;
    vals.push(idValue);
    await pool.query(`UPDATE ${table} SET ${fields.join(', ')} WHERE id = ?`, vals);
    return true;
  };
}
