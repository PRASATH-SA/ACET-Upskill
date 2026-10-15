import { AppError, forbidden, unauthorized } from '../lib/errors.js';
import { verifyAccessToken } from '../modules/auth/tokens.js';
import { User } from '../modules/users/model.js';

/**
 * The signed-in user attached to `req.user` by requireAuth.
 * @typedef {object} AuthUser
 * @property {string} id
 * @property {'student'|'faculty'|'mentor'|'admin'} role
 * @property {string} name
 * @property {string} email
 * @property {string|null} departmentId
 * @property {string|null} syllabusVersionId
 * @property {string|null} mentorId
 * @property {string|null} batch
 */

const ACTIVITY_WRITE_INTERVAL_MS = 5 * 60 * 1000;

/** Requires a valid, unexpired Bearer access token for an active user. */
export async function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw unauthorized();
    const payload = verifyAccessToken(header.slice(7));
    const user = await User.findById(payload.sub).lean();
    if (!user || !user.isActive) throw unauthorized('Account not found or deactivated');
    req.user = {
      id: String(user._id),
      role: user.role,
      name: user.name,
      email: user.email,
      departmentId: user.departmentId ? String(user.departmentId) : null,
      syllabusVersionId: user.syllabusVersionId ? String(user.syllabusVersionId) : null,
      mentorId: user.mentorId ? String(user.mentorId) : null,
      batch: user.batch ?? null,
    };
    const now = Date.now();
    if (
      !user.lastActiveAt ||
      now - new Date(user.lastActiveAt).getTime() > ACTIVITY_WRITE_INTERVAL_MS
    ) {
      void User.updateOne({ _id: user._id }, { $set: { lastActiveAt: new Date(now) } }).exec();
    }
    next();
  } catch (err) {
    next(err instanceof AppError ? err : unauthorized());
  }
}

/** Allows only the listed roles. Must run after requireAuth. */
export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden());
    next();
  };
}

/** Returns the authenticated user or throws 401. For use inside handlers. */
export function currentUser(req) {
  if (!req.user) throw unauthorized();
  return req.user;
}
