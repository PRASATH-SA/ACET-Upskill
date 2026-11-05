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

/**
 * Ceiling per IP for the whole API (H1). Set high: a college network puts every student
 * behind one public (NAT) address, so a low per-IP limit would block a whole lab. It only
 * stops floods; fairness comes from userLimiter.
 */
export function ipLimiter(perMinute) {
  return rateLimit({
    windowMs: 60_000,
    limit: perMinute,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res, next) => handler(req, res, next),
  });
}

/** Per signed-in user (mounted after requireAuth): every student gets their own budget. */
export function userLimiter(perMinute) {
  return rateLimit({
    windowMs: 60_000,
    limit: perMinute,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req) => `user:${req.user.id}`,
    handler: (req, res, next) => handler(req, res, next),
  });
}
