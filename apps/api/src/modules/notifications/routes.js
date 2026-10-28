import { Router } from 'express';
import { IdParamsSchema, NotificationsQuerySchema } from '@acet/shared';
import { asyncHandler as h, ok, validate } from '../../lib/http.js';
import { currentUser } from '../../middleware/auth.js';
import { listNotifications, markAllRead, markRead } from './service.js';

/** The signed-in user's own notifications (ADR 0015). */
export function notificationRoutes() {
  const r = Router();
  r.get(
    '/notifications',
    validate({ query: NotificationsQuerySchema }),
    h(async (req, res) => ok(res, await listNotifications(currentUser(req), req.query))),
  );
  r.post(
    '/notifications/read-all',
    h(async (req, res) => ok(res, await markAllRead(currentUser(req)))),
  );
  r.post(
    '/notifications/:id/read',
    validate({ params: IdParamsSchema }),
    h(async (req, res) => ok(res, await markRead(currentUser(req), req.params.id))),
  );
  return r;
}
