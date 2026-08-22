import express from 'express';
import path from 'path';
import type { DbPool } from './db';
import type { GoogleGenAI } from '@google/genai';
import {
  securityHeaders,
  corsMiddleware,
  requestLogger,
  errorHandler,
} from './middleware';
import type { SmsService } from './sms';
import { createReportsRouter } from './reports';
import { createAuthRouter } from './routes/auth';
import { createEntitiesRouter } from './routes/entities';
import { createStaffRouter } from './routes/staff';
import { createFinanceRouter } from './routes/finance';
import { createPosRouter } from './routes/pos';
import { createPaymentsRouter } from './routes/payments';
import { createMaterialSalesRouter } from './routes/materialSales';
import { createAdminRouter } from './routes/admin';
import { createGeminiRouter } from './routes/gemini';

export interface AppOptions {
  sms: SmsService;
  aiClient: GoogleGenAI | null;
  geminiModel: string;
}

/**
 * Build the Express application from an existing DB pool.
 *
 * Static asset serving / listening / shutdown are intentionally left to the
 * entrypoint so the app can be reused by tests against any pool.
 */
export function createApp(pool: DbPool, opts: AppOptions): express.Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));

  // Minimal cookie parser (used by `authenticate` to read the httpOnly token).
  app.use((req, _res, next) => {
    const raw = req.headers.cookie || '';
    (req as any).cookies = Object.fromEntries(
      raw.split(';').map((c) => c.trim().split('=').map((s) => s.trim())).filter(([k]) => k)
    );
    next();
  });

  app.use(securityHeaders);
  app.use(corsMiddleware);
  app.use(requestLogger);

  // API responses must never be cached — browsers otherwise replay 304s with
  // empty bodies for XHR GETs, which the client cannot parse.
  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    next();
  });

  // Receipt proof images (client-compressed uploads, served back to the app).
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  app.use('/api/auth', createAuthRouter(pool));
  app.use('/api/staff', createStaffRouter(pool));
  app.use('/api/reports', createReportsRouter(pool));
  app.use('/api', createEntitiesRouter(pool));
  app.use('/api', createFinanceRouter(pool));
  app.use('/api', createPosRouter(pool, opts.sms));
  app.use('/api/payments', createPaymentsRouter(pool, opts.sms));
  app.use('/api', createMaterialSalesRouter(pool));
  app.use('/api', createAdminRouter(pool));
  app.use('/api/gemini', createGeminiRouter(opts.aiClient, opts.geminiModel));

  app.use(errorHandler);
  return app;
}