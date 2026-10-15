import bcrypt from 'bcryptjs';
import { parse as parseCsv } from 'csv-parse/sync';
import { randomBytes } from 'node:crypto';
import { StudentCsvRowSchema } from '@acet/shared';
import { env } from '../../config/env.js';
import { AppError, badRequest, conflict, unauthorized } from '../../lib/errors.js';
import { audit } from '../audit/service.js';
import { User, toPublicUser } from '../users/model.js';
import { RefreshToken } from './model.js';
import {
  durationToSeconds,
  hashToken,
  newFamilyId,
  newRefreshToken,
  signAccessToken,
} from './tokens.js';

export async function hashPassword(password) {
  return bcrypt.hash(password, env().BCRYPT_ROUNDS);
}

/** Admin-only user creation. */
export async function registerUser(input, actorId) {
  if (await User.exists({ email: input.email })) throw conflict('Email is already registered');
  const { password, ...rest } = input;
  const user = await User.create({ ...rest, passwordHash: await hashPassword(password) });
  await audit({
    actorId,
    action: 'user.create',
    target: { type: 'user', id: String(user._id) },
    meta: { role: user.role },
  });
  return toPublicUser(user.toObject());
}

/**
 * Bulk student import from CSV with header `name,email[,password][,batch]`.
 * Rows without a password get a generated temporary one, returned once in the response.
 * Valid rows are created; invalid or duplicate rows are reported and skipped.
 */
export async function importStudents(csv, defaults, actorId) {
  let rows;
  try {
    rows = parseCsv(csv, {
      columns: (h) => h.map((c) => c.trim().toLowerCase()),
      skip_empty_lines: true,
      trim: true,
      bom: true,
    });
  } catch (err) {
    throw badRequest(`Could not read CSV: ${err.message}`);
  }
  if (rows.length === 0) throw badRequest('CSV has no rows');
  if (rows.length > 2000)
    throw badRequest('CSV has more than 2000 rows; split it into smaller files');

  const created = [];
  const errors = [];
  const seen = new Set();

  for (const [i, raw] of rows.entries()) {
    const rowNo = i + 2; // header is row 1
    const parsed = StudentCsvRowSchema.safeParse({
      name: raw.name,
      email: raw.email,
      password: raw.password || undefined,
      batch: raw.batch || undefined,
    });
    if (!parsed.success) {
      errors.push({
        row: rowNo,
        email: raw.email,
        message: parsed.error.issues.map((x) => `${x.path.join('.')}: ${x.message}`).join('; '),
      });
      continue;
    }
    const r = parsed.data;
    if (seen.has(r.email) || (await User.exists({ email: r.email }))) {
      errors.push({ row: rowNo, email: r.email, message: 'Email is already registered' });
      continue;
    }
    seen.add(r.email);
    const temporaryPassword = r.password
      ? undefined
      : `Acet-${randomBytes(6).toString('base64url')}9`;
    const user = await User.create({
      name: r.name,
      email: r.email,
      role: 'student',
      passwordHash: await hashPassword(r.password ?? temporaryPassword),
      departmentId: defaults.departmentId ?? null,
      syllabusVersionId: defaults.syllabusVersionId ?? null,
      mentorId: defaults.mentorId ?? null,
      batch: r.batch ?? defaults.batch ?? null,
    });
    created.push({
      row: rowNo,
      user: toPublicUser(user.toObject()),
      ...(temporaryPassword ? { temporaryPassword } : {}),
    });
  }
  await audit({
    actorId,
    action: 'user.import',
    target: { type: 'user' },
    meta: { created: created.length, failed: errors.length },
  });
  return {
    created,
    errors,
    summary: { total: rows.length, created: created.length, failed: errors.length },
  };
}

async function issueSession(user, familyId, userAgent) {
  const { token: accessToken, expiresIn } = signAccessToken(String(user._id), user.role);
  const { token: refreshToken, hash } = newRefreshToken();
  const refreshExpiresAt = new Date(Date.now() + durationToSeconds(env().JWT_REFRESH_TTL) * 1000);
  await RefreshToken.create({
    userId: user._id,
    tokenHash: hash,
    familyId,
    expiresAt: refreshExpiresAt,
    userAgent,
  });
  return { accessToken, expiresIn, refreshToken, refreshExpiresAt };
}

// A fixed hash so a login for an unknown email takes as long as a real check.
const DUMMY_HASH = bcrypt.hashSync('timing-equaliser-password-1', 10);

export async function login(input, ctx) {
  const user = await User.findOne({ email: input.email }).select('+passwordHash').lean();
  const valid = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) {
    await audit({
      actorId: user ? String(user._id) : null,
      action: 'auth.loginFailed',
      target: { type: 'user', id: user ? String(user._id) : null },
      meta: { ip: ctx.ip },
    });
    throw unauthorized('Email or password is incorrect');
  }
  if (!user.isActive) throw new AppError('FORBIDDEN', 'This account has been deactivated');
  const session = await issueSession(user, newFamilyId(), ctx.userAgent);
  await User.updateOne(
    { _id: user._id },
    { $set: { lastLoginAt: new Date(), lastActiveAt: new Date() } },
  );
  await audit({
    actorId: String(user._id),
    action: 'auth.login',
    target: { type: 'user', id: String(user._id) },
    meta: { ip: ctx.ip },
  });
  return { ...session, user: toPublicUser(user) };
}

/**
 * Rotates a refresh token. Reusing an already-rotated token revokes the whole family,
 * which logs out a thief and the real user alike (standard rotation with reuse detection).
 */
export async function refresh(token, ctx) {
  if (!token) throw unauthorized('No refresh token');
  const stored = await RefreshToken.findOne({ tokenHash: hashToken(token) });
  if (!stored) throw unauthorized('Invalid refresh token');
  if (stored.revokedAt) {
    await RefreshToken.updateMany(
      { familyId: stored.familyId, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
    await audit({
      actorId: String(stored.userId),
      action: 'auth.refreshReuse',
      target: { type: 'user', id: String(stored.userId) },
    });
    throw unauthorized('Refresh token was already used; please log in again');
  }
  if (stored.expiresAt.getTime() <= Date.now()) throw unauthorized('Refresh token expired');

  const user = await User.findById(stored.userId).lean();
  if (!user || !user.isActive) throw unauthorized('Account not found or deactivated');

  const session = await issueSession(user, stored.familyId, ctx.userAgent);
  // Conditional update guards against two concurrent refreshes with the same token.
  const res = await RefreshToken.updateOne(
    { _id: stored._id, revokedAt: null },
    { $set: { revokedAt: new Date(), replacedByHash: hashToken(session.refreshToken) } },
  );
  if (res.modifiedCount === 0) {
    await RefreshToken.updateMany(
      { familyId: stored.familyId, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
    throw unauthorized('Refresh token was already used; please log in again');
  }
  return { ...session, user: toPublicUser(user) };
}

export async function logout(token) {
  if (!token) return;
  const stored = await RefreshToken.findOne({ tokenHash: hashToken(token) });
  if (!stored) return;
  await RefreshToken.updateMany(
    { familyId: stored.familyId, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
}

export async function revokeAllSessions(userId) {
  await RefreshToken.updateMany({ userId, revokedAt: null }, { $set: { revokedAt: new Date() } });
}
