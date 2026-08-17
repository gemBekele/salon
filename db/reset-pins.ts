/**
 * PIN reset runner — sets every staff member's PIN to 7788.
 * Usage: npm run db:reset-pins
 */
import * as dotenv from 'dotenv';
import { createDbPool } from '../server-lib/db';
import { hashPassword } from '../server-lib/auth';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

async function main() {
  const pool = createDbPool();
  const [rows] = (await pool.query(`SELECT id FROM staff WHERE pin_hash IS NOT NULL`)) as any;
  const pinHash = hashPassword('7788');

  for (const r of rows) {
    await pool.query(
      `UPDATE staff SET pin_hash = ?, pin_changed = TRUE, pin_failed_attempts = 0, pin_locked_until = NULL WHERE id = ?`,
      [pinHash, r.id]
    );
    console.log(`[reset-pins] ${r.id} -> 7788`);
  }

  console.log(`[reset-pins] done. ${rows.length} staff PINs reset to 7788.`);
  await pool.end();
}

main().catch((err) => {
  console.error('[reset-pins] failed:', err);
  process.exit(1);
});
