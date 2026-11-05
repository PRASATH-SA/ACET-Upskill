import { z } from 'zod';
import { ObjectIdSchema } from './common.js';

/** A3.2: what "Draft with AI" can produce for a topic. */
export const AI_DRAFT_KINDS = ['easy', 'tenMark', 'flashcards', 'mcq', 'curiosity', 'realWorld'];
export const AiDraftKindSchema = z.enum(AI_DRAFT_KINDS);

export const DraftMapSchema = z.object({ materialId: ObjectIdSchema.optional() });

export const DraftContentSchema = z.object({
  kinds: z
    .array(AiDraftKindSchema)
    .min(1)
    .max(AI_DRAFT_KINDS.length)
    .default([...AI_DRAFT_KINDS]),
});

export const TagPyqsSchema = z.object({ subjectId: ObjectIdSchema });

/** A4 tutor request. The answer streams back over SSE. */
export const TutorAskSchema = z.object({
  topicId: ObjectIdSchema,
  question: z.string().trim().min(2).max(2000),
  history: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(4000) }))
    .max(12)
    .default([]),
});
