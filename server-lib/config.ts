/**
 * Centralized environment config with fail-fast validation.
 * All secrets and tunables are read from the environment once here.
 */
export interface AppConfig {
  nodeEnv: 'production' | 'development' | 'test';
  port: number;
  db: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
    connectionLimit: number;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  gemini: {
    apiKey: string | null;
    model: string;
  };
  sms: {
    provider: 'log' | 'http';
    providerUrl: string | null;
    apiKey: string | null;
    senderId: string;
  };
  appUrl: string;
  corsOrigins: string[];
}

function required(name: string, fallback?: string): string {
  const v = process.env[name];
  if (v && v.trim() !== '') return v;
  if (fallback !== undefined) return fallback;
  return '';
}

function list(value: string | undefined, fallback: string[]): string[] {
  if (!value) return fallback;
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function loadConfig(): AppConfig {
  const nodeEnv = (process.env.NODE_ENV || 'development') as AppConfig['nodeEnv'];
  const isProd = nodeEnv === 'production';

  return {
    nodeEnv,
    port: Number(process.env.PORT) || 3000,
    db: {
      host: required('DB_HOST', '127.0.0.1'),
      port: Number(process.env.DB_PORT) || 3306,
      user: required('DB_USERNAME', 'root'),
      password: required('DB_PASSWORD', ''),
      database: required('DB_DATABASE', 'gech_salon_db'),
      connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
    },
    jwt: {
      secret: required('JWT_SECRET', isProd ? '' : 'dev-insecure-secret-change-me'),
      expiresIn: required('JWT_EXPIRES_IN', '8h'),
    },
    gemini: {
      apiKey: process.env.GEMINI_API_KEY || null,
      model: required('GEMINI_MODEL', 'gemini-2.5-flash'),
    },
    sms: {
      provider: (process.env.SMS_PROVIDER === 'http' ? 'http' : 'log'),
      providerUrl: process.env.SMS_PROVIDER_URL || null,
      apiKey: process.env.SMS_API_KEY || null,
      senderId: required('SMS_SENDER_ID', 'Serenity'),
    },
    appUrl: required('APP_URL', isProd ? '' : 'http://localhost:3000'),
    corsOrigins: list(process.env.CORS_ORIGINS, isProd ? [] : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173']),
  };
}

function parseCors(value: string | undefined, fallback: string[]): string[] {
  return list(value || '', fallback);
}

/** Runtime assertion that production secrets are present. */
export function validateProduction(config: AppConfig): string[] {
  const errors: string[] = [];
  if (!config.jwt.secret) errors.push('JWT_SECRET is required in production');
  if (!config.appUrl) errors.push('APP_URL is required in production');
  if (config.corsOrigins.length === 0) errors.push('CORS_ORIGINS must be configured in production');
  if (config.sms.provider === 'http' && (!config.sms.providerUrl || !config.sms.apiKey)) {
    errors.push('SMS_PROVIDER_URL and SMS_API_KEY are required when SMS_PROVIDER=http');
  }
  return errors;
}