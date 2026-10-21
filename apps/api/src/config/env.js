import { z } from 'zod';
import { ServerEnvSchema, parseEnv } from '@acet/shared';

/**
 * API configuration. The shared ServerEnvSchema covers A.3/A.7 variables; this adds
 * API-only tunables (mastery thresholds, report thresholds, cookie settings).
 */
const ApiEnvBase = ServerEnvSchema.extend({
  APP_VERSION: z.string().default('0.1.0'),
  /** API processes: 1 = single, 0 = one per CPU core (production), n = n (H1 load). */
  API_WORKERS: z.coerce.number().int().min(0).max(64).default(1),
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  LOGIN_RATE_LIMIT_PER_MIN: z.coerce.number().int().min(1).default(5),
  /** Requests per minute per signed-in user. */
  API_RATE_LIMIT_PER_MIN: z.coerce.number().int().min(10).default(300),
  /** Requests per minute per IP. High on purpose: campus NAT shares one IP across students. */
  API_IP_RATE_LIMIT_PER_MIN: z.coerce.number().int().min(10).default(20_000),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
  /** B4 mastery thresholds */
  MASTERY_CONFIDENT_SCORE: z.coerce.number().min(1).max(100).default(80),
  MASTERY_MIN_REVISIONS_PASSED: z.coerce.number().int().min(0).default(1),
  MASTERY_OVERDUE_DAYS: z.coerce.number().min(0).default(3),
  /** B5 report thresholds */
  CO_ATTAINMENT_THRESHOLD: z.coerce.number().min(1).max(100).default(60),
  MENTOR_INACTIVE_DAYS: z.coerce.number().int().min(1).default(7),
  MENTOR_RISK_NEEDS_REVISION: z.coerce.number().int().min(1).default(3),
  /** A1–A3: where AI jobs run. `agenda` = the worker; `inline` = in this process (tests, e2e). */
  AI_JOB_RUNNER: z.enum(['agenda', 'inline']).default('agenda'),
  /** Versioned prompt templates (A.7.6). Defaults to <repo>/prompts. */
  PROMPTS_DIR: z.string().optional(),
  /** A2 retrieval thresholds */
  RAG_TOP_K: z.coerce.number().int().min(1).max(20).default(6),
  RAG_MIN_SCORE: z.coerce.number().min(0).max(1).default(0.35),
  RAG_MIN_CHUNKS: z.coerce.number().int().min(1).default(1),
  RAG_MIN_WORDS: z.coerce.number().int().min(1).default(150),
  /** A4 tutor */
  TUTOR_RATE_LIMIT_PER_HOUR: z.coerce.number().int().min(1).default(20),
  TUTOR_MAX_QUESTION_CHARS: z.coerce.number().int().min(20).max(2000).default(500),
  /** Cosine similarity below which a question counts as off-topic (if it also shares no words). Tune per embedding model. */
  TUTOR_MIN_RELEVANCE: z.coerce.number().min(0).max(1).default(0.35),
  /** Passages at or above this similarity count as grounding for an answer. */
  TUTOR_MIN_PASSAGE_SCORE: z.coerce.number().min(0).max(1).default(0.3),
  /** Signed media links (video, captions, voice answers) stay valid this long. */
  MEDIA_URL_TTL_SEC: z.coerce
    .number()
    .int()
    .min(60)
    .max(24 * 3600)
    .default(900),
  /** Explain-it-back: voice recordings are deleted after this many days (transcripts stay). */
  AUDIO_RETENTION_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  /** Share of AI-scored answers sent to the teacher at random for a spot-check (0–1). */
  EXPLAIN_SPOT_CHECK_RATE: z.coerce.number().min(0).max(1).default(0.1),
});

const noMockInProduction = [
  (e) => !(e.NODE_ENV === 'production' && (e.LLM_PROVIDER === 'mock' || e.STT_PROVIDER === 'mock')),
  {
    message: 'mock AI providers are for tests only and cannot be used in production',
    path: ['LLM_PROVIDER'],
  },
];

export const ApiEnvSchema = ApiEnvBase.refine(...noMockInProduction);

let cached;

/** Loads and validates env once. Fails fast with every problem listed. */
export function loadEnv(source = process.env, schema = ApiEnvSchema) {
  if (!cached) cached = parseEnv(schema, source);
  return cached;
}

/** Test helper: replace the cached config. */
export function setEnv(env) {
  cached = env;
}

export function env() {
  return cached ?? loadEnv();
}

/**
 * The worker shares the API's config but never issues tokens or serves the web app,
 * so those variables are optional there.
 */
export const WorkerEnvSchema = ApiEnvBase.partial({
  WEB_ORIGIN: true,
  JWT_ACCESS_SECRET: true,
  JWT_REFRESH_SECRET: true,
}).refine(...noMockInProduction);
