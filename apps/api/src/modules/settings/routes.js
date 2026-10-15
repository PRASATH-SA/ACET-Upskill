import { Router } from 'express';
import { z } from 'zod';
import { gateway } from '../../ai/gateway/index.js';
import { scheduleReembedIfStale } from '../../ai/pipelines/ingest.js';
import { asyncHandler as h, ok, validate } from '../../lib/http.js';
import { currentUser, requireRole } from '../../middleware/auth.js';
import { jobView } from '../ai/jobs.js';
import { AiJob } from '../ai/model.js';
import { aiSettings, updateAiSettings } from './service.js';

const modelName = z.string().trim().min(1).max(120).nullable();
const UpdateSchema = z
  .object({ chatModel: modelName, embedModel: modelName })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'chatModel or embedModel is required');

/** A5.3 admin AI settings. Mounted at /api/v1. */
export function settingsRoutes() {
  const r = Router();
  const admin = requireRole('admin');

  r.get(
    '/admin/ai',
    admin,
    h(async (_req, res) => {
      const weekAgo = new Date(Date.now() - 7 * 86400_000);
      const [health, settings, queued, running, failures, byType] = await Promise.all([
        gateway().health(),
        aiSettings(),
        AiJob.countDocuments({ status: 'queued' }),
        AiJob.countDocuments({ status: 'running' }),
        AiJob.find({ status: 'failed' }).sort({ finishedAt: -1 }).limit(10).lean(),
        AiJob.aggregate([
          { $match: { createdAt: { $gte: weekAgo } } },
          { $group: { _id: { type: '$type', status: '$status' }, n: { $sum: 1 } } },
        ]),
      ]);
      const lastWeek = {};
      for (const row of byType) {
        lastWeek[row._id.type] ??= {};
        lastWeek[row._id.type][row._id.status] = row.n;
      }
      ok(res, {
        health,
        settings,
        queue: { queued, running },
        recentFailures: failures.map((j) => {
          const v = jobView(j);
          return {
            id: v.id,
            type: v.type,
            error: v.error,
            finishedAt: v.finishedAt,
            model: v.model,
          };
        }),
        lastWeek,
      });
    }),
  );

  r.put(
    '/admin/ai/settings',
    admin,
    validate({ body: UpdateSchema }),
    h(async (req, res) => {
      const user = currentUser(req);
      const health = await gateway().health();
      const result = await updateAiSettings(user, req.body, health.models ?? []);
      // A2.2: a new embedding model means old vectors can't be compared: re-embed them.
      let reembedJobId = null;
      if (result.before.embedModel !== result.after.embedModel) {
        reembedJobId = await scheduleReembedIfStale(user.id);
      }
      ok(res, { settings: await aiSettings(), reembedJobId });
    }),
  );

  return r;
}
