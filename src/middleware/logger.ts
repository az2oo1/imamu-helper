import { Request, Response, NextFunction } from 'express';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    // Skip static assets noise like Next.js internal files
    if (!req.path.startsWith('/_next/') && !req.path.startsWith('/favicon.ico')) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [HTTP] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
    }
  });

  next();
}

export const logger = {
  info: (msg: string, ...args: any[]) => {
    console.log(`[${new Date().toISOString()}] [INFO] ${msg}`, ...args);
  },
  warn: (msg: string, ...args: any[]) => {
    console.warn(`[${new Date().toISOString()}] [WARN] ${msg}`, ...args);
  },
  error: (msg: string, ...args: any[]) => {
    console.error(`[${new Date().toISOString()}] [ERROR] ${msg}`, ...args);
  },
};
