import { Router } from 'express';
import {
  CreateExperimentSchema,
  ExperimentDoneSchema,
  ExperimentStatusSchema,
  IdParamsSchema,
  UpdateExperimentSchema,
} from '@acet/shared';
import { currentUser, requireRole } from '../../middleware/auth.js';
import { asyncHandler as h, created, ok, validate } from '../../lib/http.js';
import * as s from './service.js';

const P = { params: IdParamsSchema };
const staff = requireRole('faculty', 'admin');

/** Practical (lab) subjects and their experiments (ADR 0012). */
export function labRoutes() {
  const r = Router();
  r.get(
    '/subjects/:id/lab',
    validate(P),
    h(async (req, res) => ok(res, await s.getLab(currentUser(req), req.params.id))),
  );
  r.post(
    '/subjects/:id/experiments',
    staff,
    validate({ ...P, body: CreateExperimentSchema }),
    h(async (req, res) =>
      created(res, await s.createExperiment(currentUser(req), req.params.id, req.body)),
    ),
  );
  r.patch(
    '/experiments/:id',
    staff,
    validate({ ...P, body: UpdateExperimentSchema }),
    h(async (req, res) =>
      ok(res, await s.updateExperiment(currentUser(req), req.params.id, req.body)),
    ),
  );
  r.delete(
    '/experiments/:id',
    staff,
    validate(P),
    h(async (req, res) => {
      await s.deleteExperiment(currentUser(req), req.params.id);
      ok(res, { deleted: true });
    }),
  );
  r.post(
    '/experiments/:id/status',
    staff,
    validate({ ...P, body: ExperimentStatusSchema }),
    h(async (req, res) =>
      ok(res, await s.setExperimentStatus(currentUser(req), req.params.id, req.body)),
    ),
  );
  r.post(
    '/experiments/:id/done',
    requireRole('student'),
    validate({ ...P, body: ExperimentDoneSchema }),
    h(async (req, res) =>
      ok(res, await s.markExperimentDone(currentUser(req), req.params.id, req.body)),
    ),
  );
  return r;
}
