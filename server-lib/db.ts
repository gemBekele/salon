/**
 * PostgreSQL connection adapter.
 *
 * Exposes a `mysql2`-compatible surface (`pool.query` -> `[rows]`,
 * `pool.getConnection()` with beginTransaction/commit/rollback/release) so the
 * route modules only differ from MySQL by their SQL syntax. `?` placeholders
 * are rewritten to `$1, $2, ...` before hitting the pg driver.
 */
import { Pool as PgPool, PoolClient } from 'pg';

export interface DbConnection {
  query<T = any>(sql: string, params?: any[]): Promise<[T[], any?]>;
  beginTransaction(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  release(): void;
}

export interface DbPool {
  query<T = any>(sql: string, params?: any[]): Promise<[T[], any?]>;
  getConnection(): Promise<DbConnection>;
  end(): Promise<void>;
}

function toPg(sql: string, params: any[]): { text: string; values: any[] } {
  let out = '';
  let idx = 0;
  let inStr = false;
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (inStr) {
      out += ch;
      if (ch === "'") {
        if (sql[i + 1] === "'") {
          out += sql[i + 1];
          i++;
        } else {
          inStr = false;
        }
      }
      continue;
    }
    if (ch === "'") {
      inStr = true;
      out += ch;
      continue;
    }
    if (ch === '?') {
      out += `$${++idx}`;
      continue;
    }
    out += ch;
  }
  return { text: out, values: params };
}

function makeQuery(client: PgPool | PoolClient) {
  return async <T = any>(sql: string, params: any[] = []): Promise<[T[], any?]> => {
    const { text, values } = toPg(sql, params);
    const result = await client.query(text, values);
    return [result.rows as T[], undefined];
  };
}

export function createDbPool(dbName?: string): DbPool {
  const pool = new PgPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USERNAME || 'gech',
    password: process.env.DB_PASSWORD || '',
    database: dbName || process.env.DB_DATABASE || 'gech_salon_db',
    max: 10,
    idleTimeoutMillis: 30000,
  });

  return {
    query: makeQuery(pool),
    async getConnection(): Promise<DbConnection> {
      const client = await pool.connect();
      return {
        query: makeQuery(client),
        beginTransaction: async () => { await client.query('BEGIN'); },
        commit: async () => { await client.query('COMMIT'); },
        rollback: async () => { await client.query('ROLLBACK'); },
        release: () => client.release(),
      };
    },
    end: () => pool.end(),
  };
}
