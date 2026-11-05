import { z } from 'zod';

/** In-app notifications (ADR 0015): the top-bar bell. */
export const NOTIFICATION_TYPES = ['form.published', 'form.scoreReleased'];

export const NotificationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
