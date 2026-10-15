import { z } from 'zod';
import {
  ContentSourceSchema,
  ContentStatusSchema,
  MaterialKindSchema,
  ResourceKindSchema,
} from '../enums.js';
import { PaginationQuerySchema } from '../api.js';
import { ObjectIdSchema, QueryBoolSchema } from './common.js';

export const CONTENT_ITEM_TYPES = ['resource', 'flashcard', 'question', 'pyq'];
export const ContentItemTypeSchema = z.enum(CONTENT_ITEM_TYPES);

const markdown = z.string().trim().min(1).max(20_000);

export const CreateResourceSchema = z
  .object({
    kind: ResourceKindSchema,
    title: z.string().trim().max(160).optional(),
    body: markdown.optional(),
    url: z.string().trim().url().max(500).optional(),
  })
  // A video may be created with no url and get an uploaded file via POST /resources/:id/file.
  .refine(
    (v) => v.kind === 'video' || v.body !== undefined || v.url !== undefined,
    'body or url is required',
  );
export const UpdateResourceSchema = z
  .object({
    title: z.string().trim().max(160),
    body: markdown,
    url: z.string().trim().url().max(500),
  })
  .partial();

export const CreateFlashcardSchema = z.object({
  front: z.string().trim().min(1).max(500),
  back: z.string().trim().min(1).max(2000),
});
export const UpdateFlashcardSchema = CreateFlashcardSchema.partial();

export const QuestionDifficultySchema = z.enum(['easy', 'medium', 'hard']);

const questionShape = z.object({
  type: z.enum(['mcq', 'curiosity']).default('mcq'),
  stem: z.string().trim().min(3).max(2000),
  options: z.array(z.string().trim().min(1).max(500)).min(2).max(6),
  correctIndex: z.number().int().min(0),
  explanation: z.string().trim().max(2000).default(''),
  optionExplanations: z.array(z.string().trim().max(1000)).max(6).default([]),
  difficulty: QuestionDifficultySchema.default('medium'),
});
export const CreateQuestionSchema = questionShape
  .refine((q) => q.correctIndex < q.options.length, {
    message: 'correctIndex must point to an option',
    path: ['correctIndex'],
  })
  .refine(
    (q) => q.optionExplanations.length === 0 || q.optionExplanations.length === q.options.length,
    {
      message: 'optionExplanations must match options',
      path: ['optionExplanations'],
    },
  );
export const UpdateQuestionSchema = questionShape.partial();

export const SetStatusSchema = z.object({
  status: ContentStatusSchema,
});

export const UploadMaterialSchema = z
  .object({
    kind: MaterialKindSchema,
    topicId: ObjectIdSchema.optional(),
    subjectId: ObjectIdSchema.optional(),
  })
  .refine((v) => v.topicId || v.subjectId, 'topicId or subjectId is required');

export const ListMaterialsQuerySchema = z
  .object({ topicId: ObjectIdSchema.optional(), subjectId: ObjectIdSchema.optional() })
  .refine((v) => v.topicId || v.subjectId, 'topicId or subjectId is required');

/** Review-queue `kind` filter: a resource kind, or flashcard / question / pyq. */
export const ReviewKindSchema = z.union([
  ResourceKindSchema,
  z.enum(['flashcard', 'question', 'pyq']),
]);

export const ReviewQueueQuerySchema = PaginationQuerySchema.extend({
  subjectId: ObjectIdSchema.optional(),
  topicId: ObjectIdSchema.optional(),
  kind: ReviewKindSchema.optional(),
  source: ContentSourceSchema.optional(),
  status: z.enum(['draft', 'inReview']).optional(),
  includeRejected: QueryBoolSchema.default(false),
  needsAttention: QueryBoolSchema.optional(),
});

export const BulkReviewSchema = z.object({
  action: z.enum(['approve', 'publish', 'reject']),
  reason: z.string().trim().max(500).optional(),
  items: z
    .array(z.object({ type: ContentItemTypeSchema, id: ObjectIdSchema }))
    .min(1)
    .max(200),
});
