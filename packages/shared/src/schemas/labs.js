import { z } from 'zod';
import { ObjectIdSchema } from './common.js';

/**
 * Lab experiments (ADR 0012). An experiment belongs to a practical subject and sits on one topic
 * of the linked theory subject's roadmap. Linked code-lab problems are its graded practice.
 */
const experimentShape = z.object({
  topicId: ObjectIdSchema,
  number: z.number().int().min(1).max(200),
  title: z.string().trim().min(2).max(200),
  aim: z.string().trim().max(2000).default(''),
  /** Procedure, algorithm or sample output, in markdown. */
  procedure: z.string().trim().max(20_000).default(''),
  challengeIds: z.array(ObjectIdSchema).max(20).default([]),
});

export const CreateExperimentSchema = experimentShape.extend({
  number: experimentShape.shape.number.optional(),
});
export const UpdateExperimentSchema = experimentShape.partial();

/** Experiments are drafted by staff and published by the lab's faculty. */
export const ExperimentStatusSchema = z.object({ status: z.enum(['draft', 'published']) });

/** A student marks an experiment done (or not) when it was completed outside the code lab. */
export const ExperimentDoneSchema = z.object({ done: z.boolean() });
