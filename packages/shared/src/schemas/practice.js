import { z } from 'zod';
import { ReviewRatingSchema } from '../enums.js';
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

export const RateReviewSchema = z.object({ rating: ReviewRatingSchema });
