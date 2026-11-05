import { Router } from 'express';
import { z } from 'zod';
import {
  CaptionUploadSchema,
  ChaptersSchema,
  IdParamsSchema,
  ObjectIdSchema,
  VideoProgressSchema,
} from '@acet/shared';
import { asyncHandler as h, ok, validate } from '../../lib/http.js';
import { memoryUpload, requireFile } from '../../lib/upload.js';
import { currentUser, requireRole } from '../../middleware/auth.js';
import * as s from './service.js';

const P = { params: IdParamsSchema };
const staff = requireRole('faculty', 'admin');

/** Video learning (feature 3). Mounted at /api/v1. */
export function videoRoutes() {
  const r = Router();
  r.get(
    '/resources/:id/playback',
    validate(P),
    h(async (req, res) => ok(res, await s.playback(currentUser(req), req.params.id))),
  );
  r.post(
    '/resources/:id/captions',
    staff,
    validate(P),
    memoryUpload(1).single('file'),
    h(async (req, res) => {
      const input = CaptionUploadSchema.parse(req.body ?? {});
      ok(res, await s.addCaption(currentUser(req), req.params.id, input, requireFile(req.file)));
    }),
  );
  r.delete(
    '/resources/:id/captions/:lang',
    staff,
    validate({ params: z.object({ id: ObjectIdSchema, lang: CaptionUploadSchema.shape.lang }) }),
    h(async (req, res) =>
      ok(res, await s.removeCaption(currentUser(req), req.params.id, req.params.lang)),
    ),
  );
  r.put(
    '/resources/:id/chapters',
    staff,
    validate({ ...P, body: ChaptersSchema }),
    h(async (req, res) => ok(res, await s.setChapters(currentUser(req), req.params.id, req.body))),
  );
  r.post(
    '/resources/:id/progress',
    requireRole('student'),
    validate({ ...P, body: VideoProgressSchema }),
    h(async (req, res) =>
      ok(res, await s.recordProgress(currentUser(req), req.params.id, req.body)),
    ),
  );
  r.get(
    '/resources/:id/progress/me',
    requireRole('student'),
    validate(P),
    h(async (req, res) => ok(res, await s.myProgress(currentUser(req), req.params.id))),
  );
  return r;
}
