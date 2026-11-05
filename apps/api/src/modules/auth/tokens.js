import { createHash, randomBytes, randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';

import { env } from '../../config/env.js';
import { AppError, unauthorized } from '../../lib/errors.js';

const ISSUER = 'acet-skillup';
const AUDIENCE = 'acet-skillup-api';

/** Parses durations like 15m, 7d, 3600 (seconds) into seconds. */
export function durationToSeconds(value) {
  const m = /^(\d+)\s*([smhd]?)$/.exec(value.trim());
  if (!m) throw new Error(`Invalid duration: ${value}`);
  const n = Number(m[1]);
  const mult = { '': 1, s: 1, m: 60, h: 3600, d: 86400 }[m[2]];
  return n * mult;
}

export function signAccessToken(userId, role) {
  const expiresIn = durationToSeconds(env().JWT_ACCESS_TTL);
  const token = jwt.sign({ role }, env().JWT_ACCESS_SECRET, {
    subject: userId,
    expiresIn,
    issuer: ISSUER,
    audience: AUDIENCE,
    algorithm: 'HS256',
  });
  return { token, expiresIn };
}

export function verifyAccessToken(token) {
  try {
    const decoded = jwt.verify(token, env().JWT_ACCESS_SECRET, {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ['HS256'],
    });
    if (!decoded.sub || typeof decoded.role !== 'string') throw unauthorized('Invalid token');
    return { sub: decoded.sub, role: decoded.role };
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new AppError('UNAUTHORIZED', 'Access token expired', { reason: 'expired' });
    }
    if (err instanceof AppError) throw err;
    throw unauthorized('Invalid token');
  }
}

/** A new opaque refresh token. Only its hash is stored. */
export function newRefreshToken() {
  const token = randomBytes(48).toString('base64url');
  return { token, hash: hashToken(token) };
}

export function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

export const newFamilyId = () => randomUUID();

export const REFRESH_COOKIE = 'acet_rt';
export const REFRESH_COOKIE_PATH = '/api/v1/auth';
