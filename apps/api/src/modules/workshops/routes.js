import { Router } from 'express';
import {
  CreateWorkshopSchema,
  GradeSubmissionSchema,
  IdParamsSchema,
  SubmitWorkshopSchema,
  UpdateWorkshopSchema,
} from '@acet/shared';
import { asyncHandler as h, created, ok, validate } from '../../lib/http.js';
import { memoryUpload } from '../../lib/upload.js';
import { currentUser, requireRole } from '../../middleware/auth.js';
import * as s from './service.js';

const P = { params: IdParamsSchema };
const staff = requireRole('faculty', 'admin');

function sendFile(res, { stream, size, mimeType, fileName }) {
  res.setHeader('Content-Type', mimeType ?? 'application/octet-stream');
  res.setHeader('Content-Length', String(size));
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${encodeURIComponent(fileName ?? 'submission')}"`,
  );
  stream.pipe(res);
}

/** Workshops and submissions (B5.2). */
export function workshopRoutes() {
  const r = Router();
  r.get(
    '/topics/:id/workshops',
    validate(P),
    h(async (req, res) => ok(res, await s.listWorkshops(currentUser(req), req.params.id))),
  );
  r.post(
    '/topics/:id/workshops',
    staff,
    validate({ ...P, body: CreateWorkshopSchema }),
    h(async (req, res) =>
      created(res, await s.createWorkshop(currentUser(req), req.params.id, req.body)),
    ),
  );
  r.patch(
    '/workshops/:id',
    staff,
    validate({ ...P, body: UpdateWorkshopSchema }),
    h(async (req, res) =>
      ok(res, await s.updateWorkshop(currentUser(req), req.params.id, req.body)),
    ),
  );
  r.delete(
    '/workshops/:id',
    staff,
    validate(P),
    h(async (req, res) => {
      await s.deleteWorkshop(currentUser(req), req.params.id);
      ok(res, { deleted: true });
    }),
  );

  r.post(
    '/workshops/:id/submissions',
    requireRole('student'),
    validate(P),
    memoryUpload().single('file'),
    h(async (req, res) => {
      const body = SubmitWorkshopSchema.parse({ text: req.body?.text || undefined });
      created(res, await s.submit(currentUser(req), req.params.id, body, req.file));
    }),
  );
  r.get(
    '/workshops/:id/submissions',
    staff,
    validate(P),
    h(async (req, res) => ok(res, await s.listSubmissions(currentUser(req), req.params.id))),
  );
  r.get(
    '/me/submissions',
    requireRole('student'),
    h(async (req, res) => ok(res, await s.mySubmissions(currentUser(req)))),
  );
  r.get(
    '/submissions/:id/file',
    validate(P),
    h(async (req, res) =>
      sendFile(res, await s.openSubmissionFile(currentUser(req), req.params.id)),
    ),
  );
  r.patch(
    '/submissions/:id/grade',
    staff,
    validate({ ...P, body: GradeSubmissionSchema }),
    h(async (req, res) => ok(res, await s.grade(currentUser(req), req.params.id, req.body))),
  );
  return r;
}
