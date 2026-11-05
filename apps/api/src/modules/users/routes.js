import { Router } from 'express';
import {
  AdminUpdateUserSchema,
  ChangePasswordSchema,
  IdParamsSchema,
  ListUsersQuerySchema,
  SetStudentTermSchema,
  UpdateProfileSchema,
} from '@acet/shared';
import { requireRole } from '../../middleware/auth.js';
import { asyncHandler, validate } from '../../lib/http.js';
import * as c from './controller.js';

export function userRoutes() {
  const r = Router();
  r.patch('/me', validate({ body: UpdateProfileSchema }), asyncHandler(c.updateMe));
  r.post('/me/password', validate({ body: ChangePasswordSchema }), asyncHandler(c.changePassword));
  r.get('/', requireRole('admin'), validate({ query: ListUsersQuerySchema }), asyncHandler(c.list));
  r.post(
    '/term',
    requireRole('admin'),
    validate({ body: SetStudentTermSchema }),
    asyncHandler(c.setTerm),
  );
  r.get('/:id', validate({ params: IdParamsSchema }), asyncHandler(c.get));
  r.patch(
    '/:id',
    requireRole('admin'),
    validate({ params: IdParamsSchema, body: AdminUpdateUserSchema }),
    asyncHandler(c.update),
  );
  r.delete(
    '/:id',
    requireRole('admin'),
    validate({ params: IdParamsSchema }),
    asyncHandler(c.deactivate),
  );
  return r;
}
