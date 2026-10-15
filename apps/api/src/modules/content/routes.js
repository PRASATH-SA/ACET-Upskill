import { Router } from 'express';
import { z } from 'zod';
import {
  BulkReviewSchema,
  ContentStatusSchema,
  CreateFlashcardSchema,
  CreateQuestionSchema,
  CreateResourceSchema,
  IdParamsSchema,
  ListMaterialsQuerySchema,
  ResourceKindSchema,
  ReviewQueueQuerySchema,
  SetStatusSchema,
  UpdateFlashcardSchema,
  UpdateQuestionSchema,
  UpdateResourceSchema,
} from '@acet/shared';
import { requireRole } from '../../middleware/auth.js';
import { asyncHandler as h, validate } from '../../lib/http.js';
import { memoryUpload } from '../../lib/upload.js';
import * as c from './controller.js';

const P = { params: IdParamsSchema };
const staff = requireRole('faculty', 'admin');
const listQuery = z.object({
  status: ContentStatusSchema.optional(),
  kind: ResourceKindSchema.optional(),
  type: z.enum(['mcq', 'curiosity']).optional(),
});

/** Registers CRUD routes for one content type under /topics/:id/<plural> and /<plural>/:id. */
function itemRoutes(r, type, plural, createSchema, updateSchema) {
  const hs = c.itemHandlers(type);
  r.get(`/topics/:id/${plural}`, validate({ ...P, query: listQuery }), h(hs.list));
  r.post(`/topics/:id/${plural}`, staff, validate({ ...P, body: createSchema }), h(hs.create));
  r.get(`/${plural}/:id`, staff, validate(P), h(hs.get));
  r.patch(`/${plural}/:id`, staff, validate({ ...P, body: updateSchema }), h(hs.update));
  r.delete(`/${plural}/:id`, staff, validate(P), h(hs.remove));
  r.post(
    `/${plural}/:id/status`,
    staff,
    validate({ ...P, body: SetStatusSchema }),
    h(hs.setStatus),
  );
}

/** Topic content, materials, review queue and the student topic page (B3). */
export function contentRoutes() {
  const r = Router();
  itemRoutes(r, 'resource', 'resources', CreateResourceSchema, UpdateResourceSchema);
  itemRoutes(r, 'flashcard', 'flashcards', CreateFlashcardSchema, UpdateFlashcardSchema);
  itemRoutes(r, 'question', 'questions', CreateQuestionSchema, UpdateQuestionSchema);

  r.post(
    '/resources/:id/file',
    staff,
    validate(P),
    memoryUpload().single('file'),
    h(c.uploadResourceFile),
  );
  r.get('/resources/:id/file', validate(P), h(c.getResourceFile));

  r.post('/materials', staff, memoryUpload().single('file'), h(c.uploadMaterial));
  r.get('/materials', staff, validate({ query: ListMaterialsQuerySchema }), h(c.listMaterials));
  r.get('/materials/:id', staff, validate(P), h(c.getMaterial));
  r.get('/materials/:id/file', staff, validate(P), h(c.getMaterialFile));
  r.delete('/materials/:id', staff, validate(P), h(c.deleteMaterial));

  r.get('/review-queue', staff, validate({ query: ReviewQueueQuerySchema }), h(c.reviewQueue));
  r.post('/review-queue/bulk', staff, validate({ body: BulkReviewSchema }), h(c.bulkReview));

  r.get('/topics/:id/page', validate(P), h(c.topicPage));
  return r;
}
