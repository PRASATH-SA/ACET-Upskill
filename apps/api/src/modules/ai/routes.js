import { Router } from 'express';
import { z } from 'zod';
import {
  DraftContentSchema,
  DraftMapSchema,
  IdParamsSchema,
  ObjectIdSchema,
  TagPyqsSchema,
} from '@acet/shared';
import { AIOfflineError } from '../../ai/gateway/errors.js';
import { DRAFT_CONTENT_JOB } from '../../ai/pipelines/draftContent.js';
import { DRAFT_MAP_JOB } from '../../ai/pipelines/draftMap.js';
import { TAG_PYQS_JOB } from '../../ai/pipelines/tagPyqs.js';
import { audit } from '../audit/service.js';
import { gateway } from '../../ai/gateway/index.js';
import { asyncHandler as h, ok, validate } from '../../lib/http.js';
import { openSse } from '../../lib/sse.js';
import { currentUser, requireRole } from '../../middleware/auth.js';
import { REEMBED_JOB } from '../../ai/pipelines/ingest.js';
import { hasEnoughMaterial, retrieve } from '../../ai/rag/retrieve.js';
import { loadSubject, loadTopic } from '../../lib/access.js';
import { cancelJob, createJob, jobView, listJobs, loadJobFor } from './jobs.js';

const RetrieveSchema = z
  .object({
    query: z.string().trim().min(2).max(500),
    topicId: ObjectIdSchema.optional(),
    subjectId: ObjectIdSchema.optional(),
    k: z.number().int().min(1).max(20).optional(),
    allowSubjectFallback: z.boolean().default(false),
  })
  .refine((v) => v.topicId || v.subjectId, 'topicId or subjectId is required');
import { AiJob, TERMINAL_STATUSES } from './model.js';

const P = { params: IdParamsSchema };
const POLL_MS = 1000;
const HEARTBEAT_MS = 15_000;

/** AI health and job tracking (A1.5, A1.6). Mounted at /api/v1/ai. */
export function aiRoutes() {
  const r = Router();

  // Any signed-in user: the UI shows "AI service offline" from this (A.7.8).
  r.get(
    '/health',
    h(async (_req, res) => ok(res, await gateway().health())),
  );

  r.get(
    '/jobs',
    requireRole('faculty', 'admin'),
    validate({
      query: z.object({
        subjectId: ObjectIdSchema.optional(),
        limit: z.coerce.number().int().min(1).max(100).default(20),
      }),
    }),
    h(async (req, res) => ok(res, await listJobs(currentUser(req), req.query))),
  );
  r.get(
    '/jobs/:id',
    validate(P),
    h(async (req, res) => ok(res, jobView(await loadJobFor(currentUser(req), req.params.id)))),
  );
  r.post(
    '/jobs/:id/cancel',
    requireRole('faculty', 'admin'),
    validate(P),
    h(async (req, res) => ok(res, await cancelJob(currentUser(req), req.params.id))),
  );

  // ---------- A3 generation: each returns 202 { jobId } ----------

  /** Fails fast while the circuit breaker says the model server is down (A.7.8). */
  const assertOnline = () => {
    if (gateway().breaker.isOpen) {
      throw new AIOfflineError('AI service offline. Try again in a minute.');
    }
  };
  const accepted = (res, job) => res.status(202).json({ data: { jobId: String(job._id) } });

  r.post(
    '/subjects/:id/draft-map',
    requireRole('faculty', 'admin'),
    validate({ ...P, body: DraftMapSchema }),
    h(async (req, res) => {
      const user = currentUser(req);
      const subject = await loadSubject(user, req.params.id, 'write');
      assertOnline();
      const job = await createJob({
        type: DRAFT_MAP_JOB,
        input: { subjectId: req.params.id, materialId: req.body.materialId },
        createdBy: user.id,
        subjectId: subject._id,
      });
      accepted(res, job);
    }),
  );

  r.post(
    '/topics/:id/draft-content',
    requireRole('faculty', 'admin'),
    validate({ ...P, body: DraftContentSchema }),
    h(async (req, res) => {
      const user = currentUser(req);
      const { topic } = await loadTopic(user, req.params.id, 'write');
      assertOnline();
      const job = await createJob({
        type: DRAFT_CONTENT_JOB,
        input: { topicId: req.params.id, kinds: req.body.kinds },
        createdBy: user.id,
        subjectId: topic.subjectId,
        topicId: topic._id,
      });
      await audit({
        actorId: user.id,
        action: 'ai.draftContent',
        target: { type: 'topic', id: req.params.id },
        meta: { kinds: req.body.kinds },
      });
      accepted(res, job);
    }),
  );

  r.post(
    '/pyqs/tag',
    requireRole('faculty', 'admin'),
    validate({ body: TagPyqsSchema }),
    h(async (req, res) => {
      const user = currentUser(req);
      const subject = await loadSubject(user, req.body.subjectId, 'write');
      assertOnline();
      const job = await createJob({
        type: TAG_PYQS_JOB,
        input: { subjectId: req.body.subjectId },
        createdBy: user.id,
        subjectId: subject._id,
      });
      accepted(res, job);
    }),
  );

  // A2: retrieval preview for faculty (what the AI would ground a draft on).
  r.post(
    '/retrieve',
    requireRole('faculty', 'admin'),
    validate({ body: RetrieveSchema }),
    h(async (req, res) => {
      const { topicId, subjectId, query, k, allowSubjectFallback } = req.body;
      if (topicId) await loadTopic(currentUser(req), topicId, 'write');
      else await loadSubject(currentUser(req), subjectId, 'write');
      ok(res, await retrieve({ query, topicId, subjectId, k, allowSubjectFallback }));
    }),
  );
  r.get(
    '/topics/:id/coverage',
    requireRole('faculty', 'admin'),
    validate(P),
    h(async (req, res) => {
      await loadTopic(currentUser(req), req.params.id, 'write');
      ok(res, await hasEnoughMaterial(req.params.id));
    }),
  );
  // A2.2: re-embed chunks made with another embedding model. Admin only.
  r.post(
    '/reembed',
    requireRole('admin'),
    h(async (req, res) => {
      const job = await createJob({ type: REEMBED_JOB, createdBy: currentUser(req).id });
      res.status(202).json({ data: { jobId: String(job._id) } });
    }),
  );

  /**
   * SSE progress stream. Sends `snapshot` once (so a refreshed page can resume), then
   * `progress` with changes and new log lines, then `done` when the job ends.
   */
  r.get(
    '/jobs/:id/events',
    validate(P),
    h(async (req, res) => {
      const first = await loadJobFor(currentUser(req), req.params.id);
      const sse = openSse(req, res);
      sse.send('snapshot', jobView(first));
      if (TERMINAL_STATUSES.includes(first.status)) {
        sse.send('done', jobView(first));
        sse.close();
        return;
      }
      let last = {
        status: first.status,
        progress: first.progress,
        step: first.step,
        logs: first.logs?.length ?? 0,
      };
      let sinceBeat = 0;
      const tick = async () => {
        if (sse.closed) return;
        const j = await AiJob.findById(req.params.id).lean();
        if (!j) return sse.close();
        const view = jobView(j);
        const changed =
          j.status !== last.status ||
          j.progress !== last.progress ||
          j.step !== last.step ||
          (j.logs?.length ?? 0) !== last.logs;
        if (changed) {
          sse.send('progress', { ...view, logs: view.logs.slice(last.logs) });
          last = {
            status: j.status,
            progress: j.progress,
            step: j.step,
            logs: j.logs?.length ?? 0,
          };
          sinceBeat = 0;
        } else if ((sinceBeat += POLL_MS) >= HEARTBEAT_MS) {
          sse.comment();
          sinceBeat = 0;
        }
        if (TERMINAL_STATUSES.includes(j.status)) {
          sse.send('done', view);
          return sse.close();
        }
        setTimeout(() => tick().catch(() => sse.close()), POLL_MS);
      };
      setTimeout(() => tick().catch(() => sse.close()), POLL_MS);
    }),
  );

  return r;
}
