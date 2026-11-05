/**
 * Subject overview (the subject root page): why the subject matters, what to know first, the
 * journey through its units and what students can do afterwards. Faculty content with the
 * usual draft → published review; the unit map itself is computed from the syllabus.
 */
import { z } from 'zod';
import { ObjectIdSchema } from './common.js';

const text = (max) => z.string().trim().max(max).default('');
const line = (max) => z.string().trim().min(1).max(max);

export const OverviewUnitSchema = z.object({
  unitId: ObjectIdSchema,
  /** What this unit is about, in one or two sentences. */
  summary: text(300),
  /** "After this unit you can …" */
  youWillBeAbleTo: text(240),
  /** Why this unit leads to the next one. */
  leadsTo: text(240),
});

export const SubjectOverviewSchema = z.object({
  /** One line under the subject name: the big idea. */
  tagline: text(160),
  /** Why learn this subject (markdown, short). */
  why: text(2000),
  /** What students should know first, and why. */
  prerequisites: z
    .array(z.object({ title: line(80), why: text(240) }))
    .max(8)
    .default([]),
  /** Skills students will have after the subject. */
  outcomes: z.array(line(200)).max(10).default([]),
  /** Where it is used in the real world. */
  applications: z
    .array(z.object({ title: line(80), description: text(240) }))
    .max(8)
    .default([]),
  /** Roles that use it. */
  careers: z.array(line(80)).max(8).default([]),
  units: z.array(OverviewUnitSchema).max(20).default([]),
});
