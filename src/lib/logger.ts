import { getDb } from '../db/index';
import { activity_logs } from '../db/schema';

export type LogLevel = 'info' | 'warn' | 'error' | 'auth' | 'admin';
export type LogCategory = 'AUTH' | 'USER_ACTION' | 'MSARI_SYNC' | 'ADMIN' | 'SYSTEM' | 'API';

export interface LogOptions {
  level?: LogLevel;
  category?: LogCategory;
  action: string;
  message: string;
  userId?: string | null;
  userEmail?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: any;
}

export async function logEvent(options: LogOptions) {
  const level = options.level || 'info';
  const category = options.category || 'SYSTEM';
  const timestamp = new Date().toISOString();

  // Print formatted server console log
  const levelTag = level.toUpperCase().padEnd(5);
  console.log(`[LOG:${levelTag}] [${category}] ${options.action} - ${options.message}`);

  try {
    const db = await getDb();
    const metaString = options.metadata ? (typeof options.metadata === 'string' ? options.metadata : JSON.stringify(options.metadata)) : null;

    await db.insert(activity_logs).values({
      level,
      category,
      action: options.action,
      message: options.message,
      userId: options.userId || null,
      userEmail: options.userEmail || null,
      ipAddress: options.ipAddress || null,
      userAgent: options.userAgent || null,
      metadata: metaString,
    });
  } catch (err: any) {
    console.error('[LOGGER_ERROR] Failed to save log event to database:', err.message || err);
  }
}

export const logger = {
  info: (categoryOrMsg: LogCategory | string, actionOrMsg?: string, message?: string, extra?: Partial<LogOptions>) => {
    if (!actionOrMsg && !message) {
      return logEvent({ level: 'info', category: 'SYSTEM', action: 'INFO', message: String(categoryOrMsg), ...extra });
    }
    return logEvent({ level: 'info', category: categoryOrMsg as LogCategory, action: actionOrMsg || 'INFO', message: message || '', ...extra });
  },

  warn: (categoryOrMsg: LogCategory | string, actionOrMsg?: string, message?: string, extra?: Partial<LogOptions>) => {
    if (!actionOrMsg && !message) {
      return logEvent({ level: 'warn', category: 'SYSTEM', action: 'WARN', message: String(categoryOrMsg), ...extra });
    }
    return logEvent({ level: 'warn', category: categoryOrMsg as LogCategory, action: actionOrMsg || 'WARN', message: message || '', ...extra });
  },

  error: (categoryOrMsg: LogCategory | string, actionOrMsg?: string, message?: string, extra?: Partial<LogOptions>) => {
    if (!actionOrMsg && !message) {
      return logEvent({ level: 'error', category: 'SYSTEM', action: 'ERROR', message: String(categoryOrMsg), ...extra });
    }
    return logEvent({ level: 'error', category: categoryOrMsg as LogCategory, action: actionOrMsg || 'ERROR', message: message || '', ...extra });
  },

  auth: (action: string, message: string, extra?: Partial<LogOptions>) =>
    logEvent({ level: 'auth', category: 'AUTH', action, message, ...extra }),

  admin: (action: string, message: string, extra?: Partial<LogOptions>) =>
    logEvent({ level: 'admin', category: 'ADMIN', action, message, ...extra }),

  sync: (action: string, message: string, extra?: Partial<LogOptions>) =>
    logEvent({ level: 'info', category: 'MSARI_SYNC', action, message, ...extra }),
};
