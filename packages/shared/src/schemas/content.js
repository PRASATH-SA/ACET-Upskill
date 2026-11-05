import { z } from 'zod';
import {
  ContentSourceSchema,
  ContentStatusSchema,
  MaterialKindSchema,
  ResourceKindSchema,
} from '../enums.js';
import { PaginationQuerySchema } from '../api.js';
import { ObjectIdSchema, QueryBoolSchema } from './common.js';

export const CONTENT_ITEM_TYPES = [
  'resource',
  'flashcard',
  'question',
  'pyq',
  'rubric',
  'challenge',
];
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
    /** Video length, measured by the browser when faculty preview the upload. */
    durationSec: z
      .number()
      .positive()
      .max(4 * 3600),
  })
  .partial();

// ---------- video: captions, chapters, watch progress ----------

/** Watch progress is counted per slice of this many seconds (videoProgress.buckets). */
export const VIDEO_BUCKET_SEC = 10;

export const CaptionUploadSchema = z.object({
  lang: z
    .string()
    .trim()
    .regex(/^[a-z]{2,3}(-[A-Za-z]{2,4})?$/, 'use a language code such as en or ta'),
  label: z.string().trim().min(1).max(40),
});

export const ChapterSchema = z.object({
  startSec: z
    .number()
    .min(0)
    .max(4 * 3600),
  title: z.string().trim().min(1).max(80),
});

export const ChaptersSchema = z.object({
  chapters: z
    .array(ChapterSchema)
    .max(50)
    .refine((cs) => cs.every((c, i) => i === 0 || c.startSec > cs[i - 1].startSec), {
      message: 'chapters must be in time order with different start times',
    }),
});

export const VideoProgressSchema = z.object({
  positionSec: z
    .number()
    .min(0)
    .max(4 * 3600),
  /** Bucket indexes (positionSec / VIDEO_BUCKET_SEC) played since the last heartbeat. */
  seenBuckets: z
    .array(
      z
        .number()
        .int()
        .min(0)
        .max((4 * 3600) / VIDEO_BUCKET_SEC),
    )
    .max(400)
    .default([]),
  ended: z.boolean().default(false),
});

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
  /** Questions sharing a concept key are variants of one idea; a quiz uses one per concept. */
  conceptKey: z.string().trim().min(1).max(80).optional(),
  /** Off for questions whose options must stay in order (e.g. "both A and B"). */
  shuffleOptions: z.boolean().default(true),
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

/**
 * The publish rule for questions: an explanation, and one explanation per option, so every
 * answer a student picks can be explained. Returns a problem message or null.
 */
export function questionPublishProblem(q) {
  if (!q.explanation?.trim()) return 'needs an explanation before it can be published';
  const per = q.optionExplanations ?? [];
  if (per.length !== q.options.length || per.some((e) => !e?.trim()))
    return 'needs an explanation for every option before it can be published';
  return null;
}

/** POST /ai/questions/:id/variants — AI drafts new questions on the same concept. */
export const GenerateVariantsSchema = z.object({
  count: z.number().int().min(1).max(5).default(3),
});

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
  z.enum(['flashcard', 'question', 'pyq', 'rubric', 'challenge']),
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

// ---------- content & quiz CSV (import / export per unit, separated by topics) ----------

/** Lesson rows (one resource per kind per topic) and quiz rows of the content CSV. */
export const CONTENT_CSV_LESSON_TYPES = [
  'curiosity',
  'video',
  'easy',
  'tenMark',
  'realWorld',
  'workshop',
];
export const CONTENT_CSV_QUIZ_TYPES = ['curiosity_question', 'flashcard', 'mcq'];
export const CONTENT_CSV_TYPES = [...CONTENT_CSV_LESSON_TYPES, ...CONTENT_CSV_QUIZ_TYPES];

/** Answer letters for option_a … option_f (a question has 2–6 options). */
export const CONTENT_CSV_OPTION_LETTERS = ['a', 'b', 'c', 'd', 'e', 'f'];

/**
 * Columns of the content CSV, in order. Export and import use the same file, so a teacher can
 * download a unit, edit it in a spreadsheet and upload it again. `id` and `status` are filled on
 * export: `id` lets an edited row update its item; `status` is for information only.
 */
export const CONTENT_CSV_COLUMNS = [
  'unit',
  'unit_title',
  'topic',
  'type',
  'id',
  'status',
  'title',
  'url',
  'body',
  'front',
  'back',
  'question',
  ...CONTENT_CSV_OPTION_LETTERS.map((l) => `option_${l}`),
  'correct',
  'explanation',
  ...CONTENT_CSV_OPTION_LETTERS.map((l) => `why_${l}`),
  'difficulty',
];

/** GET /subjects/:id/content.csv — the whole subject, or one unit; `template` adds blank rows. */
export const ContentCsvExportQuerySchema = z.object({
  unitId: ObjectIdSchema.optional(),
  template: QueryBoolSchema.default(false),
});

/** POST /subjects/:id/content-import (multipart `file`) — one unit, or the whole subject. */
export const ContentCsvImportQuerySchema = z.object({
  unitId: ObjectIdSchema.optional(),
  /** Publish every imported item at once (faculty of the subject only), else leave drafts. */
  publish: QueryBoolSchema.default(false),
});
