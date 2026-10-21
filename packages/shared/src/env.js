/**
 * A.3 / A.7 / A.9 — environment schemas. Each app validates its env once at startup and fails fast.
 * Model names always come from env, never from code.
 */
import { z } from 'zod';
import { LLMProviderSchema, SttProviderSchema } from './enums.js';

export const LlmEnvSchema = z.object({
  LLM_PROVIDER: LLMProviderSchema.default('ollama'),
  LLM_BASE_URL: z.string().url().default('http://localhost:11434'),
  LLM_CHAT_MODEL: z.string().min(1).default('qwen2.5:7b-instruct'),
  LLM_EMBED_MODEL: z.string().min(1).default('nomic-embed-text'),
  LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(120_000),
  LLM_MAX_CONCURRENCY: z.coerce.number().int().min(1).max(16).default(2),
});

/** Local speech-to-text (Whisper) for explain-it-back voice answers. Off by default. */
export const SttEnvSchema = z.object({
  STT_PROVIDER: SttProviderSchema.default('none'),
  STT_BASE_URL: z.string().url().default('http://localhost:8080'),
  STT_MODEL: z.string().min(1).default('whisper-small'),
  STT_LANGUAGE: z.string().min(2).max(10).default('en'),
  STT_TIMEOUT_MS: z.coerce.number().int().positive().default(60_000),
});

export const ServerEnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
    API_PORT: z.coerce.number().int().positive().default(4000),
    /** Allowed browser origin(s) for CORS; several may be given, comma-separated. */
    WEB_ORIGIN: z
      .string()
      .refine(
        (v) => v.split(',').every((o) => z.string().url().safeParse(o.trim()).success),
        'WEB_ORIGIN must be one or more comma-separated URLs',
      ),
    MONGO_URI: z.string().min(1),
    JWT_ACCESS_SECRET: z.string().min(16, 'must be at least 16 characters'),
    JWT_REFRESH_SECRET: z.string().min(16, 'must be at least 16 characters'),
    JWT_ACCESS_TTL: z.string().default('15m'),
    JWT_REFRESH_TTL: z.string().default('7d'),
    UPLOAD_DIR: z.string().default('./uploads'),
    UPLOAD_MAX_MB: z.coerce.number().int().positive().max(100).default(25),
    /** Topic videos stream from disk, so they may be larger than other uploads. */
    VIDEO_MAX_MB: z.coerce.number().int().positive().max(2000).default(200),
  })
  .merge(LlmEnvSchema)
  .merge(SttEnvSchema);

/** Parses env and throws one readable error that lists every problem. */
export function parseEnv(schema, source) {
  const result = schema.safeParse(source);
  if (!result.success) {
    const lines = result.error.issues.map(
      (issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`,
    );
    throw new Error(`Invalid environment configuration:\n${lines.join('\n')}`);
  }
  return result.data;
}
