/**
 * Seed runner — inserts reference data + RBAC users.
 * Usage: npm run db:seed
 */
import * as dotenv from 'dotenv';
import { createDbPool } from '../server-lib/db';
import { ensureSeeded } from '../server-lib/seed';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

async function main() {
  const pool = createDbPool();
  await ensureSeeded(pool);
  await pool.end();
}

main().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
