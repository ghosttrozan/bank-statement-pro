import { Request } from 'express';
import { rateLimit, ipKeyGenerator } from "express-rate-limit";

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
  windowMs: 15 * 600 * 1000,
  max: 999999,

  keyGenerator: (req) => ipKeyGenerator(req.ip!),
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
