import { z } from 'zod';
import { ObjectIdSchema } from './common.js';

const pyqShape = z.object({
  text: z.string().trim().min(5).max(4000),
  examDate: z.coerce.date(),
  marks: z.number().int().min(1).max(100),
  topicIds: z.array(ObjectIdSchema).max(20).default([]),
});
export const CreatePyqSchema = pyqShape;
export const BulkCreatePyqsSchema = z.object({ items: z.array(pyqShape).min(1).max(200) });
export const UpdatePyqSchema = pyqShape.partial();

export const ExamPrepQuerySchema = z.object({
  unitId: ObjectIdSchema.optional(),
  marks: z.coerce.number().int().min(1).max(100).optional(),
  minFrequency: z.coerce.number().int().min(1).optional(),
  years: z.coerce.number().int().min(1).max(20).default(5),
});

export const CreateWorkshopSchema = z.object({
  brief: z.string().trim().min(10).max(10_000),
  dueAt: z.coerce.date(),
});
export const UpdateWorkshopSchema = CreateWorkshopSchema.partial();
export const SubmitWorkshopSchema = z.object({ text: z.string().trim().max(20_000).optional() });
export const GradeSubmissionSchema = z.object({
  score: z.number().min(0).max(100),
  feedback: z.string().trim().max(5000).default(''),
});

export const CreateMentorNoteSchema = z.object({
  note: z.string().trim().min(1).max(5000),
  followUpAt: z.coerce.date().optional(),
});
export const UpdateMentorNoteSchema = z
  .object({
    note: z.string().trim().min(1).max(5000),
    followUpAt: z.coerce.date().nullable(),
    done: z.boolean(),
  })
  .partial();

export const PoMappingSchema = z.object({
  po: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^(PO|PSO)\d{1,2}$/, 'use PO1..PO12 or PSO1..PSO3'),
  level: z.number().int().min(1).max(3),
});
export const CreateCourseOutcomeSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^CO\d{1,2}$/, 'use CO1, CO2, ...'),
  text: z.string().trim().min(5).max(1000),
  poMappings: z.array(PoMappingSchema).max(20).default([]),
});
export const UpdateCourseOutcomeSchema = CreateCourseOutcomeSchema.partial();
export const SetCoTopicsSchema = z.object({ topicIds: z.array(ObjectIdSchema).max(200) });

export const AttainmentQuerySchema = z.object({
  threshold: z.coerce.number().min(1).max(100).optional(),
});

/**
 * GET /leaderboard and GET /reports/progress (ADR 0013). The API scopes the cohort by role:
 * a student always sees their own class; `departmentId` is honoured for the coordinator only.
 */
export const CohortQuerySchema = z.object({
  subjectId: ObjectIdSchema.optional(),
  departmentId: ObjectIdSchema.optional(),
  semester: z.coerce.number().int().min(1).max(8).optional(),
  batch: z.string().trim().min(1).max(40).optional(),
});
export const LeaderboardQuerySchema = CohortQuerySchema.extend({
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
