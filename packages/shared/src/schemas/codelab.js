/**
 * Code lab: LeetCode-style practice per topic, graded in server-side sandboxes.
 * SQL problems run on SQLite (sql.js); Python problems run on CPython in WebAssembly (Pyodide).
 */
import { z } from 'zod';
import { QuestionDifficultySchema as DifficultySchema } from './content.js';

export const CODE_LAB_LIMITS = {
  /** Longest student program or query accepted. */
  maxCodeChars: 5000,
  /** Rows returned to the browser from one SQL run. */
  maxRows: 200,
  /** Wall-clock limit per SQL run; the worker is killed after this. */
  timeoutMs: 2000,
  /** Wall-clock limit per Python run (one test case); the process is killed after this. */
  pythonTimeoutMs: 3000,
  /** Characters of program output kept per Python run. */
  maxOutputChars: 65_536,
  /** Longest stdin for one Python test case or custom run. */
  maxInputChars: 2000,
  /** SQL sandbox worker threads per API process. */
  workers: 2,
  /** Python sandbox processes per API process (each holds an interpreter, ~70 MB). */
  pythonWorkers: 1,
  /** Python processes stop after this long without work and start again on demand. */
  pythonIdleMs: 10 * 60_000,
  /** Test cases per Python problem. */
  maxTests: 10,
  /** Runs + submits per student per minute. */
  perMinute: 40,
};

export const CODE_LANGUAGES = ['sql', 'python'];
export const CodeLanguageSchema = z.enum(CODE_LANGUAGES);

const text = (max) => z.string().max(max);

/** One Python test: what the program reads from input(). Hidden tests are never shown. */
export const CodeTestSchema = z.object({
  input: text(CODE_LAB_LIMITS.maxInputChars).default(''),
  hidden: z.boolean().default(false),
});

const challengeShape = z.object({
  title: z.string().trim().min(3).max(120),
  /** Markdown problem statement shown to students. */
  prompt: z.string().trim().min(10).max(4000),
  difficulty: DifficultySchema.default('easy'),
  language: CodeLanguageSchema.default('sql'),
  /** SQL: schema and sample rows. Students see it and every Run uses it. */
  setupSql: text(20_000).trim().default(''),
  /** SQL: extra rows added only when grading, so a hard-coded answer fails. Never shown. */
  hiddenSql: text(20_000).default(''),
  starterCode: text(CODE_LAB_LIMITS.maxCodeChars).default(''),
  /** The reference answer (query or program). Never shown to students. */
  solution: text(CODE_LAB_LIMITS.maxCodeChars).trim().min(1),
  /**
   * SQL: optional query run after the student's code, for tasks that change the schema
   * (e.g. "create an index"): its result is compared instead of the code's own output.
   */
  checkSql: text(5000).default(''),
  /** SQL: when false, rows are compared as a set (any order). */
  orderMatters: z.boolean().default(false),
  /** Python: stdin per test case. Expected output comes from running the solution. */
  tests: z.array(CodeTestSchema).max(CODE_LAB_LIMITS.maxTests).default([]),
  hints: z.array(z.string().trim().min(1).max(300)).max(5).default([]),
});

/** Language-specific rules, also applied to the merged document on update (service). */
export function codeChallengeProblems(c) {
  const problems = [];
  if (c.language === 'python') {
    if (!c.tests?.length) problems.push('Add at least one test case');
    else if (!c.tests.some((t) => !t.hidden))
      problems.push('At least one test must be visible as an example');
  } else if (!c.setupSql?.trim())
    problems.push('Tables and sample rows (setupSql) are required for SQL');
  return problems;
}

export const CreateCodeChallengeSchema = challengeShape.superRefine((c, ctx) => {
  for (const message of codeChallengeProblems(c)) ctx.addIssue({ code: 'custom', message });
});
export const UpdateCodeChallengeSchema = challengeShape.partial();

export const RunCodeSchema = z.object({
  code: z
    .string()
    .max(CODE_LAB_LIMITS.maxCodeChars)
    .refine((s) => s.trim().length > 0, 'write some code first'),
  /** Python: custom stdin for a Run (defaults to the first example). */
  input: text(CODE_LAB_LIMITS.maxInputChars).optional(),
});
export const SubmitCodeSchema = z.object({ code: RunCodeSchema.shape.code });
