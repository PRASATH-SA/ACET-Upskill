import { Router } from 'express';
import { z } from 'zod';
import {
  CreateQuizSessionSchema,
  IdParamsSchema,
  ObjectIdSchema,
  QuizQuerySchema,
  RateReviewSchema,
  SubmitQuizSchema,
  SubmitQuizSessionSchema,
} from '@acet/shared';
import { assertCanAccessUser } from '../../lib/access.js';
import { asyncHandler as h, created, ok, validate } from '../../lib/http.js';
import { currentUser, requireRole } from '../../middleware/auth.js';
import * as qs from './quizSession.js';
import * as s from './service.js';

const P = { params: IdParamsSchema };
const student = requireRole('student');

/** Quiz, revision, mastery and student map state (B4). Mounted at /api/v1. */
export function practiceRoutes() {
  const r = Router();

  r.post(
    '/topics/:id/open',
    validate(P),
    h(async (req, res) => ok(res, { mastery: await s.openTopic(currentUser(req), req.params.id) })),
  );
  r.get(
    '/topics/:id/quiz',
    validate({ ...P, query: QuizQuerySchema }),
    h(async (req, res) =>
      ok(res, await s.getQuiz(currentUser(req), req.params.id, req.query.limit)),
    ),
  );
  r.post(
    '/quiz/submit',
    student,
    validate({ body: SubmitQuizSchema }),
    h(async (req, res) => ok(res, await s.submitQuiz(currentUser(req), req.body))),
  );

  // Feature 1: question pools, one variant per concept, options shuffled per student.
  r.post(
    '/topics/:id/quiz-sessions',
    validate({ ...P, body: CreateQuizSessionSchema }),
    h(async (req, res) =>
      created(res, await qs.createQuizSession(currentUser(req), req.params.id, req.body)),
    ),
  );
  r.get(
    '/quiz-sessions/:id',
    validate(P),
    h(async (req, res) => ok(res, await qs.getQuizSession(currentUser(req), req.params.id))),
  );
  r.post(
    '/quiz-sessions/:id/submit',
    student,
    validate({ ...P, body: SubmitQuizSessionSchema }),
    h(async (req, res) =>
      ok(res, await qs.submitQuizSession(currentUser(req), req.params.id, req.body)),
    ),
  );

  r.get(
    '/topics/:id/flashcards/deck',
    validate(P),
    h(async (req, res) => ok(res, await s.flashcardDeck(currentUser(req), req.params.id))),
  );

  r.get(
    '/revision/today',
    student,
    h(async (req, res) => ok(res, await s.revisionToday(currentUser(req)))),
  );
  r.post(
    '/revision/:id/rate',
    student,
    validate({ ...P, body: RateReviewSchema }),
    h(async (req, res) =>
      ok(res, await s.rateReview(currentUser(req), req.params.id, req.body.rating)),
    ),
  );

  r.post(
    '/flashcards/:id/rate',
    student,
    validate({ ...P, body: RateReviewSchema }),
    h(async (req, res) =>
      ok(res, await s.rateFlashcard(currentUser(req), req.params.id, req.body.rating)),
    ),
  );

  r.get(
    '/subjects/:id/map/me',
    student,
    validate(P),
    h(async (req, res) => ok(res, await s.studentMap(currentUser(req), req.params.id))),
  );
  r.get(
    '/me/progress',
    student,
    h(async (req, res) => ok(res, await s.progressFor(currentUser(req)))),
  );

  // Staff and mentors viewing one student (ownership-checked and audited).
  const studentParams = z.object({ id: ObjectIdSchema, studentId: ObjectIdSchema });
  r.get(
    '/subjects/:id/map/students/:studentId',
    requireRole('faculty', 'mentor', 'admin'),
    validate({ params: studentParams }),
    h(async (req, res) => {
      await assertCanAccessUser(currentUser(req), req.params.studentId, 'studentMap');
      ok(res, await s.studentMap(await s.studentAsAuthUser(req.params.studentId), req.params.id));
    }),
  );
  r.get(
    '/students/:id/progress',
    requireRole('faculty', 'mentor', 'admin'),
    validate(P),
    h(async (req, res) => {
      await assertCanAccessUser(currentUser(req), req.params.id, 'progress');
      ok(res, await s.progressFor(await s.studentAsAuthUser(req.params.id)));
    }),
  );
  return r;
}
