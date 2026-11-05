import { z } from 'zod';
import {
  FlashcardResultSchema,
  LearningStepSchema,
  ReviewRatingSchema,
  SIMPLE_RATINGS,
} from '../enums.js';
import { ObjectIdSchema } from './common.js';

export const QuizQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(30).default(10),
});

/** A quiz question as sent to students: no correctIndex and no explanations. */
export const QuizQuestionSchema = z.object({
  id: z.string(),
  stem: z.string(),
  options: z.array(z.string()),
  difficulty: z.string(),
});

export const SubmitQuizSchema = z.object({
  topicId: ObjectIdSchema,
  answers: z
    .array(z.object({ questionId: ObjectIdSchema, selectedIndex: z.number().int().min(0).max(5) }))
    .min(1)
    .max(30),
});

/** POST /topics/:id/quiz-sessions — one question per concept, options shuffled per student. */
export const CreateQuizSessionSchema = z.object({
  limit: z.number().int().min(1).max(30).default(10),
});

/** POST /quiz-sessions/:id/submit — `selectedIndex` is the option position the student saw. */
export const SubmitQuizSessionSchema = z.object({
  answers: z
    .array(z.object({ questionId: ObjectIdSchema, selectedIndex: z.number().int().min(0).max(5) }))
    .min(1)
    .max(30),
});

/**
 * A revision rating: either the full FSRS `rating`, or the two-button `result`
 * ("knew" / "didnt"), which maps to good / again. Handlers always receive `{ rating }`.
 */
export const RateReviewSchema = z
  .object({ rating: ReviewRatingSchema.optional(), result: FlashcardResultSchema.optional() })
  .refine((v) => Boolean(v.rating) !== Boolean(v.result), 'Send either rating or result')
  .transform((v) => ({ rating: v.rating ?? SIMPLE_RATINGS[v.result] }));

/**
 * PUT /topics/:id/steps — where a student is on a topic's six-step page, so it resumes there on
 * any device. `done` steps are added (never removed); `last` is the step they were reading.
 */
export const TopicStepsSchema = z
  .object({
    done: z.array(LearningStepSchema).max(6).optional(),
    last: LearningStepSchema.optional(),
    /** Pixels scrolled into the `last` step's section, to return to the exact spot. */
    offset: z.number().int().min(0).max(200000).optional(),
  })
  .refine((v) => v.done?.length || v.last, 'send done steps or the last step');

/** Stars a student can give a topic once its steps are done. */
export const TOPIC_RATING_MAX = 3;

/**
 * PUT /topics/:id/feedback — the student's rating of a finished topic (1–3 stars) with optional
 * remarks. Sending it again replaces the earlier rating.
 */
export const TopicFeedbackSchema = z.object({
  rating: z.number().int().min(1).max(TOPIC_RATING_MAX),
  remarks: z.string().trim().max(1000).default(''),
});
