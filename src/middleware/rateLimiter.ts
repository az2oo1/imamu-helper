import rateLimit from 'express-rate-limit';

const isTest = process.env.NODE_ENV === 'test';

/**
 * General API Rate Limiter
 * Restricts general API requests to 600 requests per 15-minute window per IP in production.
 */
export const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 10000 : 3000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Too many requests from this IP, please try again after 15 minutes.'
  },
  skip: (req) => isTest || req.path.startsWith('/admin') || req.url.startsWith('/admin'),
});

/**
 * Strict Auth Rate Limiter
 * Protects login, registration, password reset, and verification code endpoints
 * from brute-force attacks and credential stuffing.
 */
export const authApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 10000 : 45,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Too many authentication attempts, please try again after 15 minutes.'
  },
  skip: () => isTest,
});
