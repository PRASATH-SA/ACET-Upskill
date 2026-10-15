/**
 * A.3 / A.7 / A.9 — environment schemas. Each app validates its env once at startup and fails fast.
 * Model names always come from env, never from code.
 */
import { z } from 'zod';
import { LLMProviderSchema } from './enums.js';

export const LlmEnvSchema = z.object({
  LLM_PROVIDER: LLMProviderSchema.default('ollama'),
  LLM_BASE_URL: z.string().url().default('http://localhost:11434'),
  LLM_CHAT_MODEL: z.string().min(1).default('qwen2.5:7b-instruct'),
  LLM_EMBED_MODEL: z.string().min(1).default('nomic-embed-text'),
  LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(120_000),
  LLM_MAX_CONCURRENCY: z.coerce.number().int().min(1).max(16).default(2),
});

export const ServerEnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
    API_PORT: z.coerce.number().int().positive().default(4000),
    WEB_ORIGIN: z.string().url(),
    MONGO_URI: z.string().min(1),
    JWT_ACCESS_SECRET: z.string().min(16, 'must be at least 16 characters'),
    JWT_REFRESH_SECRET: z.string().min(16, 'must be at least 16 characters'),
    JWT_ACCESS_TTL: z.string().default('15m'),
    JWT_REFRESH_TTL: z.string().default('7d'),
    UPLOAD_DIR: z.string().default('./uploads'),
    UPLOAD_MAX_MB: z.coerce.number().int().positive().max(100).default(25),
  })
  .merge(LlmEnvSchema);

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
