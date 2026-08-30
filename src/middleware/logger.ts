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

export { logger } from '../lib/logger';
