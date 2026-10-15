import { z } from 'zod';
import { ServerEnvSchema, parseEnv } from '@acet/shared';

/**
 * API configuration. The shared ServerEnvSchema covers A.3/A.7 variables; this adds
 * API-only tunables (mastery thresholds, report thresholds, cookie settings).
 */
export const ApiEnvSchema = ServerEnvSchema.extend({
  APP_VERSION: z.string().default('0.1.0'),
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  LOGIN_RATE_LIMIT_PER_MIN: z.coerce.number().int().min(1).default(5),
  API_RATE_LIMIT_PER_MIN: z.coerce.number().int().min(10).default(300),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
  /** B4 mastery thresholds */
  MASTERY_CONFIDENT_SCORE: z.coerce.number().min(1).max(100).default(80),
  MASTERY_MIN_REVISIONS_PASSED: z.coerce.number().int().min(0).default(1),
  MASTERY_OVERDUE_DAYS: z.coerce.number().min(0).default(3),
  /** B5 report thresholds */
  CO_ATTAINMENT_THRESHOLD: z.coerce.number().min(1).max(100).default(60),
  MENTOR_INACTIVE_DAYS: z.coerce.number().int().min(1).default(7),
  MENTOR_RISK_NEEDS_REVISION: z.coerce.number().int().min(1).default(3),
});

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
export const WorkerEnvSchema = ApiEnvSchema.partial({
  WEB_ORIGIN: true,
  JWT_ACCESS_SECRET: true,
  JWT_REFRESH_SECRET: true,
});
