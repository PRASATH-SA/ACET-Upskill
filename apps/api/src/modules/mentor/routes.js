import { Router } from 'express';
import { z } from 'zod';
import {
  isAdminRole,
  CreateMentorNoteSchema,
  IdParamsSchema,
  ObjectIdSchema,
  UpdateMentorNoteSchema,
} from '@acet/shared';
import { asyncHandler as h, created, ok, validate } from '../../lib/http.js';
import { currentUser, requireRole } from '../../middleware/auth.js';
import { mentorStudents } from '../insights/service.js';
import * as s from './service.js';

const P = { params: IdParamsSchema };
const mentorOrAdmin = requireRole('mentor', 'admin');

/** Mentor dashboard: assigned students with risk signals, notes and follow-ups (B5.4). */
export function mentorRoutes() {
  const r = Router();
  r.use(mentorOrAdmin);
  r.get(
    '/students',
    validate({ query: z.object({ mentorId: ObjectIdSchema.optional() }) }),
    h(async (req, res) => {
      const user = currentUser(req);
      ok(
        res,
        await mentorStudents(
          user,
          isAdminRole(user.role) && req.query.mentorId ? req.query.mentorId : user.id,
        ),
      );
    }),
  );
  r.get(
    '/students/:id',
    validate(P),
    h(async (req, res) => ok(res, await s.studentDetail(currentUser(req), req.params.id))),
  );
  r.get(
    '/students/:id/notes',
    validate(P),
    h(async (req, res) => ok(res, await s.listNotes(currentUser(req), req.params.id))),
  );
  r.post(
    '/students/:id/notes',
    requireRole('mentor'),
    validate({ ...P, body: CreateMentorNoteSchema }),
    h(async (req, res) =>
      created(res, await s.createNote(currentUser(req), req.params.id, req.body)),
    ),
  );
  r.patch(
    '/notes/:id',
    requireRole('mentor'),
    validate({ ...P, body: UpdateMentorNoteSchema }),
    h(async (req, res) => ok(res, await s.updateNote(currentUser(req), req.params.id, req.body))),
  );
  r.delete(
    '/notes/:id',
    requireRole('mentor'),
    validate(P),
    h(async (req, res) => {
      await s.deleteNote(currentUser(req), req.params.id);
      ok(res, { deleted: true });
    }),
  );
  r.get(
    '/follow-ups',
    requireRole('mentor'),
    validate({ query: z.object({ before: z.coerce.date().optional() }) }),
    h(async (req, res) => ok(res, await s.followUps(currentUser(req), req.query))),
  );
  return r;
}
