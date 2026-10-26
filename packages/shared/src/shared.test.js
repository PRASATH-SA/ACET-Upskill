import { describe, expect, it } from 'vitest';
import {
  ApiErrorSchema,
  apiSuccessSchema,
  canTransition,
  BRAND_COLORS,
  COLORS,
  CONTENT_STATUSES,
  ERROR_CODES,
  ERROR_HTTP_STATUS,
  JobAcceptedSchema,
  LEARNING_STEPS,
  LlmEnvSchema,
  PaginationQuerySchema,
  paginatedSchema,
  parseEnv,
  ServerEnvSchema,
} from './index.js';
import { z } from 'zod';

describe('content status lifecycle (A.5)', () => {
  it('follows draft → inReview → approved → published', () => {
    expect(CONTENT_STATUSES).toEqual(['draft', 'inReview', 'approved', 'published']);
    expect(canTransition('draft', 'inReview')).toBe(true);
    expect(canTransition('inReview', 'approved')).toBe(true);
    expect(canTransition('approved', 'published')).toBe(true);
  });

  it('never jumps straight from draft to published', () => {
    expect(canTransition('draft', 'published')).toBe(false);
  });

  it('allows every non-draft status to go back to draft', () => {
    for (const s of CONTENT_STATUSES.filter((s) => s !== 'draft')) {
      expect(canTransition(s, 'draft')).toBe(true);
    }
  });
});

describe('learning steps (A.1)', () => {
  it('has the six steps in order', () => {
    expect(LEARNING_STEPS).toEqual([
      'curiosity',
      'understand',
      'prepare',
      'remember',
      'practice',
      'apply',
    ]);
  });
});

describe('API conventions (A.6)', () => {
  it('defaults pagination and caps limit at 100', () => {
    expect(PaginationQuerySchema.parse({})).toEqual({ page: 1, limit: 20 });
    expect(PaginationQuerySchema.parse({ page: '2', limit: '50' })).toEqual({ page: 2, limit: 50 });
    expect(PaginationQuerySchema.safeParse({ limit: '101' }).success).toBe(false);
  });

  it('validates the error envelope', () => {
    const ok = ApiErrorSchema.safeParse({
      error: { code: 'NOT_FOUND', message: 'Topic not found' },
    });
    expect(ok.success).toBe(true);
    const bad = ApiErrorSchema.safeParse({ error: { code: 'NOPE', message: 'x' } });
    expect(bad.success).toBe(false);
  });

  it('maps every error code to an HTTP status', () => {
    for (const code of ERROR_CODES) {
      expect(ERROR_HTTP_STATUS[code]).toBeGreaterThanOrEqual(400);
    }
  });

  it('validates the success envelope', () => {
    const plain = apiSuccessSchema(z.object({ status: z.literal('ok') }));
    expect(plain.safeParse({ data: { status: 'ok' } }).success).toBe(true);
    expect(plain.safeParse({ data: { status: 'ok' }, meta: { x: 1 } }).success).toBe(false);
    const withMeta = apiSuccessSchema(z.string(), z.object({ total: z.number() }));
    expect(withMeta.safeParse({ data: 'x', meta: { total: 3 } }).success).toBe(true);
  });

  it('validates paginated lists and 202 job responses', () => {
    const list = paginatedSchema(z.object({ id: z.string() }));
    expect(
      list.safeParse({ data: [{ id: 'a' }], meta: { page: 1, limit: 20, total: 1 } }).success,
    ).toBe(true);
    expect(JobAcceptedSchema.safeParse({ data: { jobId: 'job_1' } }).success).toBe(true);
  });
});

describe('env validation (A.3, A.7, A.9)', () => {
  it('applies the local-LLM defaults', () => {
    const env = LlmEnvSchema.parse({});
    expect(env.LLM_PROVIDER).toBe('ollama');
    expect(env.LLM_CHAT_MODEL).toBe('qwen2.5:7b-instruct');
    expect(env.LLM_EMBED_MODEL).toBe('nomic-embed-text');
  });

  it('rejects an unknown provider', () => {
    expect(LlmEnvSchema.safeParse({ LLM_PROVIDER: 'cloud' }).success).toBe(false);
  });

  it('fails fast with every missing server variable listed', () => {
    expect(() => parseEnv(ServerEnvSchema, {})).toThrowError(/WEB_ORIGIN[\s\S]*MONGO_URI/);
  });

  it('parses a complete server env', () => {
    const env = parseEnv(ServerEnvSchema, {
      WEB_ORIGIN: 'http://localhost:5173',
      MONGO_URI: 'mongodb://localhost:27017/acet_skillup',
      JWT_ACCESS_SECRET: 'a'.repeat(32),
      JWT_REFRESH_SECRET: 'b'.repeat(32),
      LLM_TIMEOUT_MS: '60000',
    });
    expect(env.API_PORT).toBe(4000);
    expect(env.LLM_TIMEOUT_MS).toBe(60000);
  });
});

describe('design tokens (ADR 0010)', () => {
  it('maps the A.8 names onto the Achariya logo palette', () => {
    expect(COLORS).toMatchObject({
      navy: '#22355E',
      red: '#D92D20',
      blue: '#C81D78',
      gold: '#F2C014',
      text: '#5B6478',
      border: '#F1E4CC',
      surface: '#FFF8EC',
      card: '#FFFFFF',
    });
    expect(BRAND_COLORS.brandLogo).toBe('#E02888');
    expect(BRAND_COLORS.brand).toBe(COLORS.blue);
  });
});

describe('roles and student term (ADR 0011)', () => {
  it('lets the coordinator pass admin checks only', async () => {
    const { roleAllows } = await import('./enums.js');
    expect(roleAllows('coordinator', ['admin'])).toBe(true);
    expect(roleAllows('coordinator', ['faculty', 'admin'])).toBe(true);
    expect(roleAllows('coordinator', ['mentor'])).toBe(false);
    expect(roleAllows('admin', ['coordinator'])).toBe(false);
  });

  it('accepts a semester only inside its year of study', async () => {
    const { AdminUpdateUserSchema, SetStudentTermSchema } = await import('./schemas/users.js');
    expect(AdminUpdateUserSchema.safeParse({ yearOfStudy: 3, semester: 5 }).success).toBe(true);
    expect(AdminUpdateUserSchema.safeParse({ yearOfStudy: 3, semester: 4 }).success).toBe(false);
    expect(AdminUpdateUserSchema.safeParse({ yearOfStudy: null, semester: null }).success).toBe(
      true,
    );
    const id = 'a'.repeat(24);
    expect(
      SetStudentTermSchema.safeParse({ userIds: [id], yearOfStudy: 1, semester: 2 }).success,
    ).toBe(true);
    expect(
      SetStudentTermSchema.safeParse({ userIds: [id], yearOfStudy: 1, semester: 3 }).success,
    ).toBe(false);
  });
});
