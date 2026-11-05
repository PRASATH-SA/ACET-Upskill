import { Router } from 'express';
import {
  EXPLAIN_LIMITS,
  ExplanationsQuerySchema,
  IdParamsSchema,
  SpotCheckSchema,
} from '@acet/shared';
import { asyncHandler as h, ok, pageMeta, validate } from '../../lib/http.js';
import { memoryUpload } from '../../lib/upload.js';
import { currentUser, requireRole } from '../../middleware/auth.js';
import * as s from './service.js';

const P = { params: IdParamsSchema };
const staff = requireRole('faculty', 'admin');
const audioUpload = memoryUpload(Math.ceil(EXPLAIN_LIMITS.maxAudioBytes / (1024 * 1024)));

/** Explain-it-back (feature 13). Mounted at /api/v1. Rubric CRUD lives in the content module. */
export function explainRoutes() {
  const r = Router();
  r.get(
    '/topics/:id/explain',
    validate(P),
    h(async (req, res) => ok(res, await s.explainHome(currentUser(req), req.params.id))),
  );
  // JSON { text } or multipart { audio, durationSec }. Scoring runs as an AI job (202).
  r.post(
    '/topics/:id/explanations',
    requireRole('student'),
    validate(P),
    audioUpload.single('audio'),
    h(async (req, res) => {
      const out = await s.submitExplanation(currentUser(req), req.params.id, req.body, req.file);
      res.status(202).json({ data: out });
    }),
  );
  r.get(
    '/explanations',
    staff,
    validate({ query: ExplanationsQuerySchema }),
    h(async (req, res) => {
      const { items, total } = await s.listExplanations(currentUser(req), req.query);
      ok(res, items, pageMeta(req.query.page, req.query.limit, total));
    }),
  );
  r.get(
    '/explanations/:id',
    validate(P),
    h(async (req, res) => ok(res, await s.getExplanation(currentUser(req), req.params.id))),
  );
  r.get(
    '/explanations/:id/audio-url',
    validate(P),
    h(async (req, res) => ok(res, await s.audioUrl(currentUser(req), req.params.id))),
  );
  r.post(
    '/explanations/:id/spot-check',
    requireRole('faculty'),
    validate({ ...P, body: SpotCheckSchema }),
    h(async (req, res) => ok(res, await s.spotCheck(currentUser(req), req.params.id, req.body))),
  );
  return r;
}
