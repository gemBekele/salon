/**
 * Seed runner — inserts reference data + RBAC users.
 * Usage: npm run db:seed
 */
import * as dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import { ensureSeeded } from '../server-lib/seed';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'gech_salon_db',
    connectionLimit: 2,
  });

  await ensureSeeded(pool);
  await pool.end();
}

main().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});