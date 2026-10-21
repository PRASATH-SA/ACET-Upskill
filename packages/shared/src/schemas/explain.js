/** Explain-it-back: teacher rubrics, student answers (voice or text) and teacher spot-checks. */
import { z } from 'zod';
import { PaginationQuerySchema } from '../api.js';
import { ObjectIdSchema, QueryBoolSchema } from './common.js';

/** Limits shown in the UI and enforced by the API. */
export const EXPLAIN_LIMITS = {
  minChars: 80,
  maxChars: 600,
  maxVoiceSec: 30,
  /** 30 s of compressed speech is far below this; it only stops abuse. */
  maxAudioBytes: 1_500_000,
  /** Attempts per student per topic in 24 hours. */
  maxPerDay: 5,
};

export const RubricCriterionSchema = z.object({
  id: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{1,40}$/, 'use lower-case letters, digits and dashes'),
  text: z.string().trim().min(3).max(300),
  points: z.number().int().min(1).max(10),
  /** Ideas a good answer mentions. They guide the scorer; students see only `text`. */
  keyIdeas: z.array(z.string().trim().min(1).max(120)).max(8).default([]),
});

const rubricShape = z.object({
  /** What the student is asked, e.g. "Explain normalisation to a friend who missed class." */
  prompt: z.string().trim().min(10).max(300),
  criteria: z.array(RubricCriterionSchema).min(1).max(6),
  passScore: z.number().int().min(0),
});

const rubricRules = (r, ctx) => {
  if (r.criteria) {
    const ids = r.criteria.map((c) => c.id);
    if (new Set(ids).size !== ids.length)
      ctx.addIssue({ code: 'custom', path: ['criteria'], message: 'criterion ids must be unique' });
    const max = r.criteria.reduce((n, c) => n + c.points, 0);
    if (r.passScore !== undefined && r.passScore > max)
      ctx.addIssue({
        code: 'custom',
        path: ['passScore'],
        message: `passScore cannot exceed the total points (${max})`,
      });
  }
};

export const CreateRubricSchema = rubricShape.superRefine(rubricRules);
export const UpdateRubricSchema = rubricShape.partial().superRefine(rubricRules);

/** Text answers (voice answers are multipart: `audio` file + `durationSec`). */
export const ExplainTextSchema = z.object({
  text: z
    .string()
    .trim()
    .min(EXPLAIN_LIMITS.minChars, `write at least ${EXPLAIN_LIMITS.minChars} characters`)
    .max(EXPLAIN_LIMITS.maxChars),
});

export const ExplainVoiceFieldsSchema = z.object({
  durationSec: z.coerce
    .number()
    .min(1)
    .max(EXPLAIN_LIMITS.maxVoiceSec + 5),
});

export const SpotCheckSchema = z
  .object({
    agree: z.boolean(),
    perCriterion: z
      .array(z.object({ criterionId: z.string().min(1).max(40), score: z.number().int().min(0) }))
      .max(6)
      .optional(),
    note: z.string().trim().max(1000).default(''),
  })
  .refine((v) => v.agree || v.perCriterion?.length, {
    message: 'Give per-criterion scores when you disagree',
    path: ['perCriterion'],
  });

export const ExplanationsQuerySchema = PaginationQuerySchema.extend({
  subjectId: ObjectIdSchema.optional(),
  topicId: ObjectIdSchema.optional(),
  flagged: QueryBoolSchema.optional(),
  checked: QueryBoolSchema.optional(),
});
