/**
 * Signed media links. A `<video>`, `<audio>` or `<track>` element cannot send a Bearer header,
 * so after the normal access checks the API hands out a short-lived link to one file:
 * GET /api/v1/media/:token. The token names the file key, its type and the user it was issued to,
 * and expires after MEDIA_URL_TTL_SEC. Responses honour HTTP Range so players can seek.
 */
import { createHmac } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { API_BASE_PATH } from '@acet/shared';
import { env } from '../config/env.js';
import { AppError } from './errors.js';
import { storage } from './storage.js';

const AUDIENCE = 'acet-media';

/** A key derived from the access-token secret, so a media token can never pass as an access token. */
const mediaKey = () => createHmac('sha256', env().JWT_ACCESS_SECRET).update('media-url').digest();

/**
 * @param {{ key: string, mimeType: string, userId: string }} file
 * @returns {{ url: string, expiresAt: string }}
 */
export function signMediaUrl({ key, mimeType, userId }) {
  const ttl = env().MEDIA_URL_TTL_SEC;
  const token = jwt.sign({ k: key, m: mimeType }, mediaKey(), {
    subject: userId,
    audience: AUDIENCE,
    expiresIn: ttl,
    algorithm: 'HS256',
  });
  return {
    url: `${API_BASE_PATH}/media/${token}`,
    expiresAt: new Date(Date.now() + ttl * 1000).toISOString(),
  };
}

export function verifyMediaToken(token) {
  try {
    const p = jwt.verify(token, mediaKey(), { audience: AUDIENCE, algorithms: ['HS256'] });
    return { key: p.k, mimeType: p.m, userId: p.sub };
  } catch {
    throw new AppError('NOT_FOUND', 'This media link has expired. Reload the page.');
  }
}

/**
 * Parses a single-range `Range` header. Returns null for "whole file", or
 * { start, end } (inclusive), or 'invalid'. Multi-range requests get the whole file.
 * @param {string|undefined} header
 * @param {number} size
 */
export function parseRange(header, size) {
  if (!header) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m) return null;
  let start;
  let end;
  if (m[1] === '' && m[2] === '') return 'invalid';
  if (m[1] === '') {
    // Suffix range: the last N bytes.
    const n = Number(m[2]);
    if (n === 0) return 'invalid';
    start = Math.max(0, size - n);
    end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1);
  }
  if (start >= size || start > end) return 'invalid';
  return { start, end };
}

/** Streams a stored file, with 206 partial responses for Range requests. */
export async function sendStoredFile(req, res, { key, mimeType }) {
  const size = await storage().size(key);
  if (size === null) throw new AppError('NOT_FOUND', 'File not found');
  const range = parseRange(req.headers.range, size);
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Content-Type', mimeType ?? 'application/octet-stream');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, max-age=300');
  // The token is the permission; let the web app's origin embed the file.
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  if (range === 'invalid') {
    res.setHeader('Content-Range', `bytes */${size}`);
    res.status(416).end();
    return;
  }
  if (range) {
    const { stream } = await storage().read(key, range);
    res.status(206);
    res.setHeader('Content-Range', `bytes ${range.start}-${range.end}/${size}`);
    res.setHeader('Content-Length', String(range.end - range.start + 1));
    stream.pipe(res);
    return;
  }
  const { stream } = await storage().read(key);
  res.setHeader('Content-Length', String(size));
  stream.pipe(res);
}
