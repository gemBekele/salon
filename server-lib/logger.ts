/**
 * Structured JSON logger with leveled output. In production this writes a
 * single JSON object per line (log-aggregator friendly); in development it
 * writes human-readable text. Errors and warnings are always emitted.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogFields {
  [key: string]: unknown;
}

const isProd = process.env.NODE_ENV === 'production';
const levelRank: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || (isProd ? 'info' : 'debug');

function emit(level: LogLevel, message: string, fields?: LogFields) {
  if (levelRank[level] < levelRank[currentLevel]) return;
  const entry = {
    ts: new Date().toISOString(),
    level,
    msg: message,
    ...fields,
  };
  const line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (msg: string, fields?: LogFields) => emit('debug', msg, fields),
  info: (msg: string, fields?: LogFields) => emit('info', msg, fields),
  warn: (msg: string, fields?: LogFields) => emit('warn', msg, fields),
  error: (msg: string, fields?: LogFields) => emit('error', msg, fields),
};
