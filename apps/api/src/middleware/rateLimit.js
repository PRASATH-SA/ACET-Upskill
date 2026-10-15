import { rateLimit } from 'express-rate-limit';
import { AppError } from '../lib/errors.js';

const handler = (_req, _res, next) =>
  next(new AppError('RATE_LIMITED', 'Too many requests, please try again later'));

/** Login limit: N attempts per minute per IP + email (B1). */
export function loginLimiter(perMinute) {
  return rateLimit({
    windowMs: 60_000,
    limit: perMinute,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req) => {
      const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
      return `${req.ip}|${email}`;
    },
    handler: (req, res, next) => handler(req, res, next),
  });
}

/** General API limit per IP. */
export function apiLimiter(perMinute) {
  return rateLimit({
    windowMs: 60_000,
    limit: perMinute,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res, next) => handler(req, res, next),
  });
}
