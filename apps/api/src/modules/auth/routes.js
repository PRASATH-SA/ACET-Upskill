import { Router } from 'express';
import { LoginSchema, RegisterUserSchema } from '@acet/shared';
import { env } from '../../config/env.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { loginLimiter } from '../../middleware/rateLimit.js';
import { asyncHandler, validate } from '../../lib/http.js';
import { memoryUpload } from '../../lib/upload.js';
import * as c from './controller.js';

/** OAuth (college Google/Microsoft) adapter: see ./oauth.ts. Not implemented in v1. */
export function authRoutes() {
  const r = Router();
  r.post(
    '/login',
    loginLimiter(env().LOGIN_RATE_LIMIT_PER_MIN),
    validate({ body: LoginSchema }),
    asyncHandler(c.login),
  );
  r.post('/refresh', asyncHandler(c.refresh));
  r.post('/logout', asyncHandler(c.logout));
  r.get('/me', requireAuth, asyncHandler(c.me));
  r.post(
    '/register',
    requireAuth,
    requireRole('admin'),
    validate({ body: RegisterUserSchema }),
    asyncHandler(c.register),
  );
  r.post(
    '/import-students',
    requireAuth,
    requireRole('admin'),
    memoryUpload(2).single('file'),
    asyncHandler(c.importStudents),
  );
  return r;
}
