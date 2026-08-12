/**
 * Database migration runner (PostgreSQL).
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
import pg from 'pg';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const reset = process.argv.includes('--reset') || process.env.DB_RESET === '1';
const MIGRATIONS_DIR = path.join(process.cwd(), 'db', 'migrations');

const DB_NAME = process.env.DB_DATABASE || 'gech_salon_db';

function connect(db: string): pg.Client {
  return new pg.Client({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USERNAME || 'gech',
    password: process.env.DB_PASSWORD || '',
    database: db,
  });
}

/**
 * Split a SQL script into individual statements, respecting single-quoted
 * strings, line/block comments, and `$tag$` dollar-quoted strings (needed for
 * the plpgsql trigger function inside migration 001).
 */
export function splitStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let i = 0;
  const n = sql.length;

  function flush() {
    if (current.trim()) statements.push(current.trim());
    current = '';
  }

  while (i < n) {
    const ch = sql[i];

    if (ch === '-' && sql[i + 1] === '-') {
      const nl = sql.indexOf('\n', i);
      i = nl === -1 ? n : nl + 1;
      continue;
    }

    if (ch === '/' && sql[i + 1] === '*') {
      const end = sql.indexOf('*/', i + 2);
      i = end === -1 ? n : end + 2;
      continue;
    }

    if (ch === "'") {
      current += ch;
      i++;
      while (i < n) {
        if (sql[i] === "'" && sql[i + 1] === "'") {
          current += "''";
          i += 2;
          continue;
        }
        current += sql[i];
        if (sql[i] === "'") {
          i++;
          break;
        }
        i++;
      }
      continue;
    }

    if (ch === '$') {
      const tagMatch = /^\$[A-Za-z_0-9]*\$/.exec(sql.slice(i));
      if (tagMatch) {
        const tag = tagMatch[0];
        const end = sql.indexOf(tag, i + tag.length);
        current += sql.slice(i, end === -1 ? n : end + tag.length);
        i = end === -1 ? n : end + tag.length;
        continue;
      }
    }

    if (ch === ';') {
      flush();
      i++;
      continue;
    }

    current += ch;
    i++;
  }
  flush();
  return statements;
}

/**
 * Apply (or reset and re-apply) all migrations for the given database.
 * Exported so scripts and integration tests can share the same logic.
 *
 * @returns the names of the migration files applied in this run.
 */
export async function runMigrations(dbName: string, opts: { reset?: boolean } = {}): Promise<string[]> {
  const admin = connect('postgres');
  await admin.connect();

  try {
    if (opts.reset) {
      await admin.query(`DROP DATABASE IF EXISTS "${dbName}"`);
      console.log(`[migrate] dropped database "${dbName}"`);
    }
    const exists = await admin.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);
    if (exists.rowCount === 0) {
      await admin.query(`CREATE DATABASE "${dbName}"`);
      console.log(`[migrate] created database "${dbName}"`);
    }
  } finally {
    await admin.end();
  }

  const conn = connect(dbName);
  await conn.connect();
  try {
    await conn.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name VARCHAR(255) NOT NULL PRIMARY KEY,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    const appliedRes = await conn.query(`SELECT name FROM schema_migrations`);
    const applied = new Set(appliedRes.rows.map((r) => r.name));

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    const ran: string[] = [];
    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      for (const statement of splitStatements(sql)) {
        await conn.query(statement);
      }
      await conn.query(`INSERT INTO schema_migrations (name) VALUES ($1)`, [file]);
      console.log(`[migrate] applied ${file}`);
      ran.push(file);
    }

    console.log(`[migrate] ${ran.length} migration(s) applied. Database "${dbName}" is up to date.`);
    return ran;
  } finally {
    await conn.end();
  }
}

async function main() {
  await runMigrations(DB_NAME, { reset });
}

main().catch((err) => {
  console.error('[migrate] failed:', err);
  process.exit(1);
});
