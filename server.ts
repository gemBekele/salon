import path from 'path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

import { createApp } from './server-lib/app';
import { createSmsService } from './server-lib/sms';
import { ensureSeeded } from './server-lib/seed';
import { createDbPool } from './server-lib/db';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

// PostgreSQL connection pool (shared by every route module).
const pool = createDbPool();

async function startServer() {
  // Database health with retries (warns, does not hard-fail).
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await pool.query('SELECT 1');
      break;
    } catch {
      console.error(`[db] connection attempt ${attempt}/3 failed. Make sure PostgreSQL is running on 5432.`);
      if (attempt === 3) {
        console.error('[db] giving up after retries. Continuing without database.');
      } else {
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
  }

  // Refuse to boot on a placeholder JWT secret.
  const jwtSecret = process.env.JWT_SECRET || '';
  if (!jwtSecret || jwtSecret.includes('change_this') || jwtSecret.includes('dev-insecure')) {
    console.error('[FATAL] JWT_SECRET is not set or is a placeholder. Refusing to start.');
    console.error('  Set a strong random string in .env.local: JWT_SECRET=<your-secret>');
    process.exit(1);
  }

  try {
    await ensureSeeded(pool);
  } catch (e) {
    console.error('[db] seed error (continuing):', (e as Error).message);
  }

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const apiKey = process.env.GEMINI_API_KEY;
  const aiClient = apiKey
    ? new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } })
    : null;
  const sms = createSmsService(pool);

  const app = createApp(pool, { sms, aiClient, geminiModel: model });
  const PORT = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Serenity salon ERP SaaS running on http://0.0.0.0:${PORT}`);
  });

  const shutdown = () => {
    console.log('Shutting down gracefully...');
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

startServer().catch((err) => {
  console.error('Server startup error:', err);
  process.exit(1);
});