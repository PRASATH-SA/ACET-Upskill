import { Router } from 'express';
import {
  CreateLinkSchema,
  CreateSubjectSchema,
  CreateTopicSchema,
  CreateUnitSchema,
  IdParamsSchema,
  ListSubjectsQuerySchema,
  SaveMapSchema,
  UpdateLinkSchema,
  UpdateSubjectSchema,
  UpdateTopicSchema,
  UpdateUnitSchema,
} from '@acet/shared';
import { requireRole } from '../../middleware/auth.js';
import { asyncHandler as h, validate } from '../../lib/http.js';
import * as c from './controller.js';

const P = { params: IdParamsSchema };
const staff = requireRole('faculty', 'admin');

/** Subjects, units, topics, links and the concept map (B2). Mounted at /api/v1. */
export function syllabusRoutes() {
  const r = Router();

  r.get('/subjects', validate({ query: ListSubjectsQuerySchema }), h(c.listSubjects));
  r.post(
    '/subjects',
    requireRole('admin'),
    validate({ body: CreateSubjectSchema }),
    h(c.createSubject),
  );
  r.get('/subjects/:id', validate(P), h(c.getSubject));
  r.patch(
    '/subjects/:id',
    requireRole('admin'),
    validate({ ...P, body: UpdateSubjectSchema }),
    h(c.updateSubject),
  );
  r.delete('/subjects/:id', requireRole('admin'), validate(P), h(c.deleteSubject));

  r.get('/subjects/:id/map', validate(P), h(c.getMap));
  r.patch('/subjects/:id/map', staff, validate({ ...P, body: SaveMapSchema }), h(c.saveMap));
  r.patch('/subjects/:id/map/approve', staff, validate(P), h(c.approveMap));
  r.get('/subjects/:id/learning-order', validate(P), h(c.learningOrder));
  r.get('/subjects/:id/cross-unit-links', validate(P), h(c.crossUnitLinks));

  r.get('/subjects/:id/units', validate(P), h(c.listUnits));
  r.post('/subjects/:id/units', staff, validate({ ...P, body: CreateUnitSchema }), h(c.createUnit));
  r.patch('/units/:id', staff, validate({ ...P, body: UpdateUnitSchema }), h(c.updateUnit));
  r.delete('/units/:id', staff, validate(P), h(c.deleteUnit));

  r.post('/units/:id/topics', staff, validate({ ...P, body: CreateTopicSchema }), h(c.createTopic));
  r.patch('/topics/:id', staff, validate({ ...P, body: UpdateTopicSchema }), h(c.updateTopic));
  r.delete('/topics/:id', staff, validate(P), h(c.deleteTopic));
  r.get('/topics/:id/prerequisites', validate(P), h(c.prerequisites));
  r.get('/topics/:id/unlocks', validate(P), h(c.unlocks));

  r.post('/subjects/:id/links', staff, validate({ ...P, body: CreateLinkSchema }), h(c.createLink));
  r.patch('/links/:id', staff, validate({ ...P, body: UpdateLinkSchema }), h(c.updateLink));
  r.delete('/links/:id', staff, validate(P), h(c.deleteLink));

  return r;
}
