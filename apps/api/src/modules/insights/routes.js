import { Router } from 'express';
import { z } from 'zod';
import { IdParamsSchema, ObjectIdSchema, PaginationQuerySchema } from '@acet/shared';
import { asyncHandler as h, ok, pageMeta, validate } from '../../lib/http.js';
import { currentUser, requireRole } from '../../middleware/auth.js';
import { AuditLog } from '../audit/model.js';
import { adminUsage, subjectInsights } from './service.js';

/** Faculty insights and admin overviews (B5.3, B5.6). */
export function insightRoutes() {
  const r = Router();
  r.get(
    '/subjects/:id/insights',
    requireRole('faculty', 'admin'),
    validate({ params: IdParamsSchema }),
    h(async (req, res) => ok(res, await subjectInsights(currentUser(req), req.params.id))),
  );

  r.get(
    '/admin/usage',
    requireRole('admin'),
    h(async (_req, res) => ok(res, await adminUsage())),
  );
  r.get(
    '/admin/audit-logs',
    requireRole('admin'),
    validate({
      query: PaginationQuerySchema.extend({
        action: z.string().max(80).optional(),
        actorId: ObjectIdSchema.optional(),
        targetId: z.string().max(40).optional(),
      }),
    }),
    h(async (req, res) => {
      const { page, limit, action, actorId, targetId } = req.query;
      const filter = {
        ...(action ? { action } : {}),
        ...(actorId ? { actorId } : {}),
        ...(targetId ? { 'target.id': targetId } : {}),
      };
      const [items, total] = await Promise.all([
        AuditLog.find(filter)
          .sort({ at: -1 })
          .skip((page - 1) * limit)
          .limit(limit),
        AuditLog.countDocuments(filter),
      ]);
      ok(res, items, pageMeta(page, limit, total));
    }),
  );
  return r;
}
