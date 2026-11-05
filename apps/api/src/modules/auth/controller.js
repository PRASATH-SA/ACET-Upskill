import { ImportStudentsSchema } from '@acet/shared';
import { env } from '../../config/env.js';
import { currentUser } from '../../middleware/auth.js';
import { badRequest } from '../../lib/errors.js';
import { created, ok } from '../../lib/http.js';
import { User, toPublicUser } from '../users/model.js';
import * as auth from './service.js';
import { REFRESH_COOKIE, REFRESH_COOKIE_PATH } from './tokens.js';

function cookieOptions(expires) {
  return {
    httpOnly: true,
    secure: env().COOKIE_SECURE,
    sameSite: 'strict',
    path: REFRESH_COOKIE_PATH,
    ...(expires ? { expires } : {}),
  };
}

function readRefreshCookie(req) {
  const v = req.cookies?.[REFRESH_COOKIE];
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

export async function register(req, res) {
  created(res, await auth.registerUser(req.body, currentUser(req)));
}

export async function importStudents(req, res) {
  const csv = req.file
    ? req.file.buffer.toString('utf8')
    : typeof req.body?.csv === 'string'
      ? req.body.csv
      : '';
  if (!csv.trim())
    throw badRequest('Upload a CSV file in the "file" field or send { csv } as text');
  const defaults = ImportStudentsSchema.parse({
    departmentId: req.body?.departmentId || undefined,
    syllabusVersionId: req.body?.syllabusVersionId || undefined,
    batch: req.body?.batch || undefined,
    mentorId: req.body?.mentorId || undefined,
    yearOfStudy: req.body?.yearOfStudy || undefined,
    semester: req.body?.semester || undefined,
  });
  ok(res, await auth.importStudents(csv, defaults, currentUser(req)));
}

export async function login(req, res) {
  const s = await auth.login(req.body, { ip: req.ip, userAgent: req.get('user-agent') });
  res.cookie(REFRESH_COOKIE, s.refreshToken, cookieOptions(s.refreshExpiresAt));
  ok(res, { accessToken: s.accessToken, expiresIn: s.expiresIn, user: s.user });
}

export async function refresh(req, res) {
  try {
    const s = await auth.refresh(readRefreshCookie(req), { userAgent: req.get('user-agent') });
    res.cookie(REFRESH_COOKIE, s.refreshToken, cookieOptions(s.refreshExpiresAt));
    ok(res, { accessToken: s.accessToken, expiresIn: s.expiresIn, user: s.user });
  } catch (err) {
    res.clearCookie(REFRESH_COOKIE, cookieOptions());
    throw err;
  }
}

export async function logout(req, res) {
  await auth.logout(readRefreshCookie(req));
  res.clearCookie(REFRESH_COOKIE, cookieOptions());
  ok(res, { loggedOut: true });
}

export async function me(req, res) {
  const user = await User.findById(currentUser(req).id).lean();
  ok(res, toPublicUser(user));
}
