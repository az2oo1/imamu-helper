import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../lib/config';
import { getDb } from '../db/index';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

export interface AuthUser {
  id?: number;
  uid?: string;
  email?: string;
  isAdmin?: boolean;
  role?: string;
  isBanned?: boolean;
  [key: string]: any;
}

export interface AuthRequest extends Request {
  user?: any;
}

// Bounded in-memory TTL cache to avoid hitting the database on every micro-request
interface CachedUserStatus {
  isBanned: boolean;
  isAdmin: boolean;
  expiresAt: number;
}

const userStatusCache = new Map<string, CachedUserStatus>();
const CACHE_TTL_MS = 10000; // 10 seconds

// Evict expired entries every 2 minutes
if (typeof setInterval !== 'undefined') {
  const evictionTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, val] of userStatusCache.entries()) {
      if (now > val.expiresAt) {
        userStatusCache.delete(key);
      }
    }
  }, 2 * 60 * 1000);
  if (evictionTimer.unref) evictionTimer.unref();
}

export function invalidateUserStatusCache(identifier?: string) {
  if (identifier) {
    userStatusCache.delete(identifier);
  } else {
    userStatusCache.clear();
  }
}

async function verifyAccountStatus(decoded: any): Promise<{ isBanned: boolean; isAdmin: boolean } | null> {
  const identifier = decoded.uid || decoded.email || (decoded.id ? String(decoded.id) : null);
  if (!identifier) return null;

  const now = Date.now();
  const cached = userStatusCache.get(identifier);
  if (cached && now < cached.expiresAt) {
    return cached;
  }

  try {
    const db = await getDb();
    if (!db) return null;

    const condition = decoded.uid
      ? eq(users.uid, decoded.uid)
      : decoded.email
      ? eq(users.email, decoded.email)
      : decoded.id
      ? eq(users.id, Number(decoded.id))
      : null;

    if (!condition) return null;

    const records = await db.select({
      id: users.id,
      isBanned: users.isBanned,
      isAdmin: users.isAdmin,
    }).from(users).where(condition).limit(1);

    const userRecord = records[0];
    if (!userRecord) return null;

    const status: CachedUserStatus = {
      isBanned: !!userRecord.isBanned,
      isAdmin: !!userRecord.isAdmin,
      expiresAt: now + CACHE_TTL_MS,
    };

    if (userStatusCache.size > 5000) {
      userStatusCache.clear();
    }
    userStatusCache.set(identifier, status);
    return status;
  } catch (e) {
    // If DB lookup fails during network glitch, fallback gracefully to token claims
    return {
      isBanned: false,
      isAdmin: !!decoded.isAdmin || decoded.role === 'ADMIN',
    };
  }
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split('Bearer ')[1];
  } else if ((req as any).cookies && (req as any).cookies.token) {
    token = (req as any).cookies.token;
  } else if (req.headers.cookie) {
    const match = req.headers.cookie.match(/(?:^|;\s*)token=([^;]*)/);
    if (match) {
      token = decodeURIComponent(match[1]);
    }
  }

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  try {
    const decodedToken = jwt.verify(token, JWT_SECRET) as any;
    const status = await verifyAccountStatus(decodedToken);

    if (status?.isBanned) {
      return res.status(403).json({ error: 'حسابك موقوف، يرجى التواصل مع الإدارة' });
    }

    req.user = {
      ...decodedToken,
      isAdmin: status ? status.isAdmin : !!decodedToken.isAdmin,
      role: (status ? status.isAdmin : !!decodedToken.isAdmin) ? 'ADMIN' : (decodedToken.role || 'USER'),
    };
    next();
  } catch (error) {
    console.error('Error verifying JWT token:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

export const requireAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  return requireAuth(req, res, () => {
    if (!req.user?.isAdmin && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden - Admin access required' });
    }
    next();
  });
};

export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split('Bearer ')[1];
  } else if ((req as any).cookies && (req as any).cookies.token) {
    token = (req as any).cookies.token;
  } else if (req.headers.cookie) {
    const match = req.headers.cookie.match(/(?:^|;\s*)token=([^;]*)/);
    if (match) {
      token = decodeURIComponent(match[1]);
    }
  }

  if (token) {
    try {
      const decodedToken = jwt.verify(token, JWT_SECRET) as any;
      const status = await verifyAccountStatus(decodedToken);
      if (!status?.isBanned) {
        req.user = {
          ...decodedToken,
          isAdmin: status ? status.isAdmin : !!decodedToken.isAdmin,
          role: (status ? status.isAdmin : !!decodedToken.isAdmin) ? 'ADMIN' : (decodedToken.role || 'USER'),
        };
      }
    } catch (error) {
      // Token invalid or expired - proceed as unauthenticated
    }
  }
  next();
};
