import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

type CachedResponse = {
  status: number;
  body: unknown;
  headers: Record<string, string>;
  expiresAt: number;
};

const CACHE_TTL_MS = 60_000;
const MAX_ENTRIES = 2_000;
const completed = new Map<string, CachedResponse>();
const pending = new Map<string, Promise<CachedResponse>>();

function hash(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function getKey(req: Request): string | null {
  const submissionId = req.header('X-Submission-ID')?.trim();
  const authorization = req.header('Authorization')?.trim();
  if (!submissionId && !authorization) return null;

  const identity = hash(authorization || 'anonymous');
  const operation = submissionId || hash(JSON.stringify(req.body ?? null));
  return `${identity}:${req.method}:${req.originalUrl}:${operation}`;
}

function replay(res: Response, cached: CachedResponse): void {
  Object.entries(cached.headers).forEach(([name, value]) => res.setHeader(name, value));
  res.status(cached.status).send(cached.body);
}

export function idempotencyMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!['POST', 'PUT', 'PATCH'].includes(req.method) || !req.path.startsWith('/api/')) {
    next();
    return;
  }

  const key = getKey(req);
  if (!key) {
    next();
    return;
  }

  const now = Date.now();
  const cached = completed.get(key);
  if (cached && cached.expiresAt > now) {
    replay(res, cached);
    return;
  }
  completed.delete(key);

  const active = pending.get(key);
  if (active) {
    void active.then(result => replay(res, result)).catch(next);
    return;
  }

  let resolvePending!: (result: CachedResponse) => void;
  let rejectPending!: (error: unknown) => void;
  const responsePromise = new Promise<CachedResponse>((resolve, reject) => {
    resolvePending = resolve;
    rejectPending = reject;
  });
  pending.set(key, responsePromise);
  res.setHeader('X-Submission-ID', req.header('X-Submission-ID') || hash(key).slice(0, 24));

  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);
  let finished = false;
  const finish = (body: unknown): void => {
    if (finished) return;
    finished = true;
    const result: CachedResponse = {
      status: res.statusCode,
      body,
      headers: Object.fromEntries(
        Object.entries(res.getHeaders()).map(([name, value]) => [name, String(value)])
      ),
      expiresAt: Date.now() + CACHE_TTL_MS
    };
    completed.set(key, result);
    while (completed.size > MAX_ENTRIES) {
      completed.delete(completed.keys().next().value!);
    }
    pending.delete(key);
    resolvePending(result);
  };

  res.json = ((body: unknown) => {
    finish(body);
    return originalJson(body);
  }) as Response['json'];
  res.send = ((body: unknown) => {
    finish(body);
    return originalSend(body);
  }) as Response['send'];

  try {
    next();
  } catch (error) {
    pending.delete(key);
    rejectPending(error);
    next(error);
  }
}
