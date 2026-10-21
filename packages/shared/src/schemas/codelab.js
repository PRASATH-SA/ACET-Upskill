/** Code lab: LeetCode-style SQL practice per topic, graded in a server-side sandbox. */
import { z } from 'zod';
import { QuestionDifficultySchema as DifficultySchema } from './content.js';

export const CODE_LAB_LIMITS = {
  /** Longest student query accepted. */
  maxCodeChars: 5000,
  /** Rows returned to the browser from one run. */
  maxRows: 200,
  /** Wall-clock limit per run; the worker is killed after this. */
  timeoutMs: 2000,
  /** Sandbox worker threads per API process. */
  workers: 2,
  /** Runs + submits per student per minute. */
  perMinute: 40,
};

export const CODE_LANGUAGES = ['sql'];
export const CodeLanguageSchema = z.enum(CODE_LANGUAGES);

const sql = (max) => z.string().max(max);

const challengeShape = z.object({
  title: z.string().trim().min(3).max(120),
  /** Markdown problem statement shown to students. */
  prompt: z.string().trim().min(10).max(4000),
  difficulty: DifficultySchema.default('easy'),
  language: CodeLanguageSchema.default('sql'),
  /** Schema and sample rows. Students see it and every Run uses it. */
  setupSql: sql(20_000).trim().min(1),
  /** Extra rows added only when grading, so a hard-coded answer fails. Never shown. */
  hiddenSql: sql(20_000).default(''),
  starterCode: sql(CODE_LAB_LIMITS.maxCodeChars).default(''),
  /** The reference answer. Never shown to students. */
  solution: sql(CODE_LAB_LIMITS.maxCodeChars).trim().min(1),
  /**
   * Optional query run after the student's code, for tasks that change the schema
   * (e.g. "create an index"): its result is compared instead of the code's own output.
   */
  checkSql: sql(5000).default(''),
  /** When false, rows are compared as a set (any order). */
  orderMatters: z.boolean().default(false),
  hints: z.array(z.string().trim().min(1).max(300)).max(5).default([]),
});

export const CreateCodeChallengeSchema = challengeShape;
export const UpdateCodeChallengeSchema = challengeShape.partial();

export const RunCodeSchema = z.object({
  code: z
    .string()
    .max(CODE_LAB_LIMITS.maxCodeChars)
    .refine((s) => s.trim().length > 0, 'write a query first'),
});
export const SubmitCodeSchema = RunCodeSchema;
