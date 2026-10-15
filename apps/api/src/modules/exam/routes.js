import { Router } from 'express';
import {
  BulkCreatePyqsSchema,
  CreatePyqSchema,
  ExamPrepQuerySchema,
  IdParamsSchema,
  ObjectIdSchema,
  SetStatusSchema,
  UpdatePyqSchema,
} from '@acet/shared';
import { asyncHandler as h, created, ok, validate } from '../../lib/http.js';
import { currentUser, requireRole } from '../../middleware/auth.js';
import { changeStatus } from '../content/status.js';
import * as s from './service.js';

const P = { params: IdParamsSchema };
const staff = requireRole('faculty', 'admin');

/** Previous-year questions and exam prep (B5.1). */
export function examRoutes() {
  const r = Router();
  r.get(
    '/subjects/:id/pyqs',
    validate(P),
    h(async (req, res) => ok(res, await s.listPyqs(currentUser(req), req.params.id))),
  );
  r.post(
    '/subjects/:id/pyqs',
    staff,
    validate({ ...P, body: CreatePyqSchema.extend({ materialId: ObjectIdSchema.optional() }) }),
    h(async (req, res) => {
      const { materialId, ...item } = req.body;
      const [doc] = await s.createPyqs(currentUser(req), req.params.id, [item], materialId);
      created(res, doc);
    }),
  );
  r.post(
    '/subjects/:id/pyqs/bulk',
    staff,
    validate({
      ...P,
      body: BulkCreatePyqsSchema.extend({ materialId: ObjectIdSchema.optional() }),
    }),
    h(async (req, res) => {
      created(
        res,
        await s.createPyqs(currentUser(req), req.params.id, req.body.items, req.body.materialId),
      );
    }),
  );
  r.patch(
    '/pyqs/:id',
    staff,
    validate({ ...P, body: UpdatePyqSchema }),
    h(async (req, res) => ok(res, await s.updatePyq(currentUser(req), req.params.id, req.body))),
  );
  r.delete(
    '/pyqs/:id',
    staff,
    validate(P),
    h(async (req, res) => {
      await s.deletePyq(currentUser(req), req.params.id);
      ok(res, { deleted: true });
    }),
  );
  r.post(
    '/pyqs/:id/status',
    staff,
    validate({ ...P, body: SetStatusSchema }),
    h(async (req, res) =>
      ok(
        res,
        await changeStatus(currentUser(req), [{ type: 'pyq', id: req.params.id }], {
          to: req.body.status,
        }),
      ),
    ),
  );
  r.get(
    '/subjects/:id/exam-prep',
    validate({ ...P, query: ExamPrepQuerySchema }),
    h(async (req, res) => ok(res, await s.examPrep(currentUser(req), req.params.id, req.query))),
  );
  return r;
}
