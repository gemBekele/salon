/**
 * Database migration runner.
 *
 * Usage:
 *   npm run db:migrate            # apply pending migrations
 *   npm run db:reset              # drop the database and re-apply ALL migrations
 *
 * Migrations are applied in filename order and tracked in the
 * `schema_migrations` table so each runs exactly once.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const reset = process.argv.includes('--reset') || process.env.DB_RESET === '1';
const MIGRATIONS_DIR = path.join(process.cwd(), 'db', 'migrations');

async function getConnection(): Promise<mysql.Connection> {
  return mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
    charset: 'utf8mb4',
  });
}

async function main() {
  const dbName = process.env.DB_DATABASE || 'gech_salon_db';
  const conn = await getConnection();

  try {
    if (reset) {
      await conn.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
      await conn.query(`CREATE DATABASE \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      console.log(`[migrate] dropped and recreated database "${dbName}"`);
    } else {
      await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    }
    await conn.query(`USE \`${dbName}\``);

    await conn.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
        name VARCHAR(255) NOT NULL PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    );

    const [appliedRows] = (await conn.query(`SELECT name FROM schema_migrations`)) as any;
    const applied = new Set(appliedRows.map((r: any) => r.name));

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    let ran = 0;
    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      await conn.query(sql);
      await conn.query(`INSERT INTO schema_migrations (name) VALUES (?)`, [file]);
      console.log(`[migrate] applied ${file}`);
      ran++;
    }

    console.log(`[migrate] ${ran} migration(s) applied. Database "${dbName}" is up to date.`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('[migrate] failed:', err);
  process.exit(1);
});