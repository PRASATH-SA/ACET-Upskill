import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { CODE_LAB_LIMITS, IdParamsSchema, RunCodeSchema, SubmitCodeSchema } from '@acet/shared';
import { asyncHandler as h, ok, validate } from '../../lib/http.js';
import { AppError } from '../../lib/errors.js';
import { currentUser } from '../../middleware/auth.js';
import * as s from './service.js';

const P = { params: IdParamsSchema };

/** Runs and submits per user per minute: each one occupies a sandbox worker. */
const sandboxLimiter = () =>
  rateLimit({
    windowMs: 60_000,
    limit: CODE_LAB_LIMITS.perMinute,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req) => `codelab:${currentUser(req).id}`,
    handler: (_req, _res, next) =>
      next(new AppError('RATE_LIMITED', 'Slow down a little: too many runs this minute.')),
  });

/**
 * Code lab (LeetCode-style SQL practice). Mounted at /api/v1. Challenge authoring uses the
 * content routes (/topics/:id/code-challenges, /code-challenges/:id …).
 */
export function codeLabRoutes() {
  const r = Router();
  const limited = sandboxLimiter();
  r.get(
    '/topics/:id/code-lab',
    validate(P),
    h(async (req, res) => ok(res, await s.listForTopic(currentUser(req), req.params.id))),
  );
  r.get(
    '/subjects/:id/code-lab',
    validate(P),
    h(async (req, res) => ok(res, await s.listForSubject(currentUser(req), req.params.id))),
  );
  r.get(
    '/code-lab/:id',
    validate(P),
    h(async (req, res) => ok(res, await s.getChallenge(currentUser(req), req.params.id))),
  );
  r.post(
    '/code-lab/:id/run',
    limited,
    validate({ ...P, body: RunCodeSchema }),
    h(async (req, res) => ok(res, await s.runCode(currentUser(req), req.params.id, req.body))),
  );
  r.post(
    '/code-lab/:id/submit',
    limited,
    validate({ ...P, body: SubmitCodeSchema }),
    h(async (req, res) => ok(res, await s.submitCode(currentUser(req), req.params.id, req.body))),
  );
  return r;
}
