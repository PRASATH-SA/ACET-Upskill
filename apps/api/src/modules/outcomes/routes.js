import { Router } from 'express';
import { z } from 'zod';
import {
  AttainmentQuerySchema,
  CreateCourseOutcomeSchema,
  IdParamsSchema,
  SetCoTopicsSchema,
  UpdateCourseOutcomeSchema,
} from '@acet/shared';
import { asyncHandler as h, created, ok, validate } from '../../lib/http.js';
import { currentUser, requireRole } from '../../middleware/auth.js';
import { audit } from '../audit/service.js';
import * as s from './service.js';

const P = { params: IdParamsSchema };
const staff = requireRole('faculty', 'admin');

/** Course outcomes, topic mapping and CO–PO attainment reports (B5.5). */
export function outcomeRoutes() {
  const r = Router();
  r.get(
    '/subjects/:id/course-outcomes',
    staff,
    validate(P),
    h(async (req, res) => ok(res, await s.listCos(currentUser(req), req.params.id))),
  );
  r.post(
    '/subjects/:id/course-outcomes',
    staff,
    validate({ ...P, body: CreateCourseOutcomeSchema }),
    h(async (req, res) =>
      created(res, await s.createCo(currentUser(req), req.params.id, req.body)),
    ),
  );
  r.patch(
    '/course-outcomes/:id',
    staff,
    validate({ ...P, body: UpdateCourseOutcomeSchema }),
    h(async (req, res) => ok(res, await s.updateCo(currentUser(req), req.params.id, req.body))),
  );
  r.delete(
    '/course-outcomes/:id',
    staff,
    validate(P),
    h(async (req, res) => {
      await s.deleteCo(currentUser(req), req.params.id);
      ok(res, { deleted: true });
    }),
  );
  r.put(
    '/course-outcomes/:id/topics',
    staff,
    validate({ ...P, body: SetCoTopicsSchema }),
    h(async (req, res) =>
      ok(res, await s.setCoTopics(currentUser(req), req.params.id, req.body.topicIds)),
    ),
  );

  r.get(
    '/subjects/:id/co-attainment',
    staff,
    validate({ ...P, query: AttainmentQuerySchema }),
    h(async (req, res) =>
      ok(res, await s.attainment(currentUser(req), req.params.id, req.query.threshold)),
    ),
  );
  r.get(
    '/subjects/:id/co-attainment/export',
    staff,
    validate({
      ...P,
      query: AttainmentQuerySchema.extend({ format: z.enum(['csv', 'pdf']).default('csv') }),
    }),
    h(async (req, res) => {
      const user = currentUser(req);
      const report = await s.attainment(user, req.params.id, req.query.threshold);
      await audit({
        actorId: user.id,
        action: 'report.coAttainmentExport',
        target: { type: 'subject', id: req.params.id },
        meta: { format: req.query.format },
      });
      const name = `co-attainment-${report.subject.code.replace(/[^A-Za-z0-9-]+/g, '_')}`;
      if (req.query.format === 'pdf') {
        const pdf = await s.toPdf(report);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${name}.pdf"`);
        return res.send(pdf);
      }
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${name}.csv"`);
      res.send(s.toCsv(report));
    }),
  );
  return r;
}
