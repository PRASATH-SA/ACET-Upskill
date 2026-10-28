import { Router } from 'express';
import {
  AddCollaboratorSchema,
  CreateFormSchema,
  FormCollaboratorParamsSchema,
  FormFileParamsSchema,
  FormResponseParamsSchema,
  GradeFormResponseSchema,
  IdParamsSchema,
  UpdateFormSchema,
} from '@acet/shared';
import { badRequest } from '../../lib/errors.js';
import { asyncHandler as h, created, ok, validate } from '../../lib/http.js';
import { memoryUpload } from '../../lib/upload.js';
import { currentUser, requireRole } from '../../middleware/auth.js';
import * as s from './service.js';

const P = { params: IdParamsSchema };
const staff = requireRole('faculty', 'admin');

/** Multipart answers arrive as one JSON field, `answers`; JSON bodies send them directly. */
function readAnswers(body) {
  if (typeof body?.answers !== 'string') return body?.answers ?? {};
  try {
    return JSON.parse(body.answers);
  } catch {
    throw badRequest('answers must be JSON');
  }
}

/** Form Studio and form responses (ADR 0015). */
export function formRoutes() {
  const r = Router();
  const me = (fn) => h(async (req, res) => ok(res, await fn(currentUser(req), req)));

  // Studio (faculty, HOD, coordinator)
  r.get(
    '/forms',
    staff,
    me((u) => s.listForms(u)),
  );
  r.post(
    '/forms',
    staff,
    validate({ body: CreateFormSchema }),
    h(async (req, res) => created(res, await s.createForm(currentUser(req), req.body))),
  );
  r.get(
    '/forms/:id',
    staff,
    validate(P),
    me((u, req) => s.getForm(u, req.params.id)),
  );
  r.put(
    '/forms/:id',
    staff,
    validate({ ...P, body: UpdateFormSchema }),
    me((u, req) => s.updateForm(u, req.params.id, req.body)),
  );
  r.delete(
    '/forms/:id',
    staff,
    validate(P),
    h(async (req, res) => {
      await s.deleteForm(currentUser(req), req.params.id);
      ok(res, { deleted: true });
    }),
  );
  r.post(
    '/forms/:id/publish',
    staff,
    validate(P),
    me((u, req) => s.publishForm(u, req.params.id)),
  );
  r.post(
    '/forms/:id/unpublish',
    staff,
    validate(P),
    me((u, req) => s.unpublishForm(u, req.params.id)),
  );
  r.post(
    '/forms/:id/duplicate',
    staff,
    validate(P),
    h(async (req, res) => created(res, await s.duplicateForm(currentUser(req), req.params.id))),
  );
  r.post(
    '/forms/:id/collaborators',
    staff,
    validate({ ...P, body: AddCollaboratorSchema }),
    me((u, req) => s.addCollaborator(u, req.params.id, req.body)),
  );
  r.delete(
    '/forms/:id/collaborators/:userId',
    staff,
    validate({ params: FormCollaboratorParamsSchema }),
    me((u, req) => s.removeCollaborator(u, req.params.id, req.params.userId)),
  );
  r.get(
    '/forms/:id/responses',
    staff,
    validate(P),
    me((u, req) => s.listResponses(u, req.params.id)),
  );
  r.delete(
    '/forms/:id/responses',
    staff,
    validate(P),
    me((u, req) => s.deleteAllResponses(u, req.params.id)),
  );
  r.get(
    '/forms/:id/export',
    staff,
    validate(P),
    h(async (req, res) => {
      const { csv, fileName } = await s.exportResponses(currentUser(req), req.params.id);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(fileName)}"`,
      );
      res.send(csv);
    }),
  );
  r.post(
    '/forms/:id/release-scores',
    staff,
    validate(P),
    me((u, req) => s.releaseScores(u, req.params.id)),
  );
  r.delete(
    '/forms/:id/responses/:responseId',
    staff,
    validate({ params: FormResponseParamsSchema }),
    h(async (req, res) => {
      await s.deleteResponse(currentUser(req), req.params.id, req.params.responseId);
      ok(res, { deleted: true });
    }),
  );
  r.patch(
    '/forms/:id/responses/:responseId/grade',
    staff,
    validate({ params: FormResponseParamsSchema, body: GradeFormResponseSchema }),
    me((u, req) => s.gradeResponse(u, req.params.id, req.params.responseId, req.body)),
  );

  // Respondents (and editors previewing). Access is checked per form in the service.
  r.get(
    '/forms/:id/view',
    validate(P),
    me((u, req) => s.viewForm(u, req.params.id)),
  );
  r.get(
    '/forms/:id/summary',
    validate(P),
    me((u, req) => s.respondentSummary(u, req.params.id)),
  );
  r.post(
    '/forms/:id/responses',
    requireRole('student'),
    validate(P),
    memoryUpload(undefined, 25).any(),
    h(async (req, res) => {
      const out = await s.submitResponse(
        currentUser(req),
        req.params.id,
        readAnswers(req.body),
        req.files,
      );
      (out.edited ? ok : created)(res, out);
    }),
  );
  r.get(
    '/forms/:id/responses/:responseId/files/:fileId',
    validate({ params: FormFileParamsSchema }),
    h(async (req, res) => {
      const { stream, size, mimeType, fileName } = await s.openResponseFile(
        currentUser(req),
        req.params.id,
        req.params.responseId,
        req.params.fileId,
      );
      res.setHeader('Content-Type', mimeType ?? 'application/octet-stream');
      res.setHeader('Content-Length', String(size));
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(fileName ?? 'file')}"`,
      );
      stream.pipe(res);
    }),
  );
  r.get(
    '/me/forms',
    requireRole('student'),
    me((u) => s.myForms(u)),
  );
  return r;
}
