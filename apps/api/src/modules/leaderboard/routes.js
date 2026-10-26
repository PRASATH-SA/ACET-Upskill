import { Router } from 'express';
import { CohortQuerySchema, IdParamsSchema, LeaderboardQuerySchema } from '@acet/shared';
import { asyncHandler as h, ok, validate } from '../../lib/http.js';
import { currentUser, requireRole } from '../../middleware/auth.js';
import { leaderboard, progressReport, studentReport } from './service.js';

/** Leaderboard (every role, scoped by the service) and staff progress reports (ADR 0013). */
export function leaderboardRoutes() {
  const r = Router();
  r.get(
    '/leaderboard',
    requireRole('student', 'faculty', 'mentor', 'admin'),
    validate({ query: LeaderboardQuerySchema }),
    h(async (req, res) => ok(res, await leaderboard(currentUser(req), req.query))),
  );
  r.get(
    '/reports/progress',
    requireRole('faculty', 'admin'),
    validate({ query: CohortQuerySchema }),
    h(async (req, res) => ok(res, await progressReport(currentUser(req), req.query))),
  );
  r.get(
    '/reports/students/:id',
    requireRole('faculty', 'mentor', 'admin'),
    validate({ params: IdParamsSchema }),
    h(async (req, res) => ok(res, await studentReport(currentUser(req), req.params.id))),
  );
  return r;
}
