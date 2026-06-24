import rateLimit from 'express-rate-limit';
import { Request } from 'express';

// ── Login rate limiter (disabled limit) ──
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 999999,
  message: { message: 'Too many login attempts, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Refresh token rate limiter (disabled limit) ──
export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 999999,
  message: { message: 'Too many token refresh attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Statement limit (disabled limit) ──
export const statementLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 999999,
  keyGenerator: (req: Request): string => {
    return req.user ? req.user._id.toString() : (req.ip || 'anonymous');
  },
  message: { message: 'Too many statement operations, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── General API rate limiter (disabled limit) ──
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 999999,
  message: { message: 'Too many requests, please slow down and try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});
