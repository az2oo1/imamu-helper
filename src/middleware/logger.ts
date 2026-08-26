import { Request, Response, NextFunction } from 'express';
import { logEvent, LogCategory, LogLevel } from '../lib/logger';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const path = req.originalUrl || req.path;

    // Skip static internal Next.js assets noise
    if (!path.startsWith('/_next/') && !path.startsWith('/favicon.ico') && !path.endsWith('.png') && !path.endsWith('.ico')) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [HTTP] ${req.method} ${path} ${res.statusCode} - ${duration}ms`);

      // Log significant API calls or errors to database
      if (path.startsWith('/api/') || res.statusCode >= 400) {
        let level: LogLevel = 'info';
        if (res.statusCode >= 500) level = 'error';
        else if (res.statusCode >= 400) level = 'warn';

        let category: LogCategory = 'API';
        if (path.startsWith('/api/auth/')) category = 'AUTH';
        else if (path.startsWith('/api/admin/')) category = 'ADMIN';

        const user = (req as any).user;

        logEvent({
          level,
          category,
          action: `${req.method} ${path}`,
          message: `HTTP ${res.statusCode} (${duration}ms)`,
          userId: user?.uid || null,
          userEmail: user?.email || null,
          ipAddress: req.ip || (req.headers['x-forwarded-for'] as string) || null,
          userAgent: req.headers['user-agent'] || null,
          metadata: { statusCode: res.statusCode, durationMs: duration, query: req.query },
        }).catch(() => {});
      }
    }
  });

  next();
}

export const logger = {
  info: (msg: string, ...args: any[]) => {
    console.log(`[${new Date().toISOString()}] [INFO] ${msg}`, ...args);
    logEvent({ level: 'info', category: 'SYSTEM', action: 'INFO', message: msg, metadata: args }).catch(() => {});
  },

  warn: (msg: string, ...args: any[]) => {
    console.warn(`[${new Date().toISOString()}] [WARN] ${msg}`, ...args);
    logEvent({ level: 'warn', category: 'SYSTEM', action: 'WARN', message: msg, metadata: args }).catch(() => {});
  },

  error: (msg: string, ...args: any[]) => {
    console.error(`[${new Date().toISOString()}] [ERROR] ${msg}`, ...args);
    logEvent({ level: 'error', category: 'SYSTEM', action: 'ERROR', message: msg, metadata: args }).catch(() => {});
  },

  auth: (action: string, msg: string, user?: { uid?: string; email?: string }, extra?: any) => {
    console.log(`[${new Date().toISOString()}] [AUTH] ${action} - ${msg}`);
    logEvent({
      level: 'auth',
      category: 'AUTH',
      action,
      message: msg,
      userId: user?.uid,
      userEmail: user?.email,
      metadata: extra,
    }).catch(() => {});
  },

  admin: (action: string, msg: string, user?: { uid?: string; email?: string }, extra?: any) => {
    console.log(`[${new Date().toISOString()}] [ADMIN] ${action} - ${msg}`);
    logEvent({
      level: 'admin',
      category: 'ADMIN',
      action,
      message: msg,
      userId: user?.uid,
      userEmail: user?.email,
      metadata: extra,
    }).catch(() => {});
  },

  sync: (action: string, msg: string, extra?: any) => {
    console.log(`[${new Date().toISOString()}] [SYNC] ${action} - ${msg}`);
    logEvent({
      level: 'info',
      category: 'MSARI_SYNC',
      action,
      message: msg,
      metadata: extra,
    }).catch(() => {});
  },
};
