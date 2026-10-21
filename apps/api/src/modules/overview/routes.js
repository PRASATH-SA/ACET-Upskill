import { Router } from 'express';
import { IdParamsSchema, SetStatusSchema, SubjectOverviewSchema } from '@acet/shared';
import { asyncHandler as h, ok, validate } from '../../lib/http.js';
import { currentUser, requireRole } from '../../middleware/auth.js';
import { changeStatus } from '../content/status.js';
import * as s from './service.js';

const P = { params: IdParamsSchema };
const staff = requireRole('faculty', 'admin');

/** Subject root page. Mounted at /api/v1. AI draft: POST /ai/subjects/:id/draft-overview. */
export function overviewRoutes() {
  const r = Router();
  r.get(
    '/subjects/:id/overview',
    validate(P),
    h(async (req, res) => ok(res, await s.getOverview(currentUser(req), req.params.id))),
  );
  r.put(
    '/subjects/:id/overview',
    staff,
    validate({ ...P, body: SubjectOverviewSchema }),
    h(async (req, res) => ok(res, await s.saveOverview(currentUser(req), req.params.id, req.body))),
  );
  r.post(
    '/subject-overviews/:id/status',
    staff,
    validate({ ...P, body: SetStatusSchema }),
    h(async (req, res) =>
      ok(
        res,
        await changeStatus(currentUser(req), [{ type: 'overview', id: req.params.id }], {
          to: req.body.status,
        }),
      ),
    ),
  );
  return r;
}
