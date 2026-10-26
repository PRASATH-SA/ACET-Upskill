import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ApiEnvSchema, env, setEnv } from '../config/env.js';

describe('CORS origins', () => {
  let app;
  let original;
  beforeAll(async () => {
    original = env();
    setEnv({
      ...original,
      WEB_ORIGIN: 'http://localhost:5173, https://demo.example.com/',
      CORS_ORIGIN: 'https://acet-upskill.vercel.app',
    });
    const { createApp } = await import('../app.js');
    app = createApp();
    setEnv(original);
  });
  afterAll(() => setEnv(original));

  const preflight = (origin) =>
    request(app)
      .options('/api/v1/auth/login')
      .set('Origin', origin)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type');

  it('allows every origin in CORS_ORIGIN and WEB_ORIGIN, with credentials', async () => {
    for (const origin of [
      'http://localhost:5173',
      'https://demo.example.com',
      'https://acet-upskill.vercel.app',
    ]) {
      const res = await preflight(origin);
      expect(res.headers['access-control-allow-origin']).toBe(origin);
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    }
  });

  it('refuses to start with neither CORS_ORIGIN nor WEB_ORIGIN', () => {
    const raw = {
      MONGO_URI: 'mongodb://localhost:27017/acet_skillup',
      JWT_ACCESS_SECRET: 'a'.repeat(32),
      JWT_REFRESH_SECRET: 'b'.repeat(32),
    };
    const result = ApiEnvSchema.safeParse({ ...raw, CORS_ORIGIN: '' });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].path).toEqual(['CORS_ORIGIN']);
    expect(ApiEnvSchema.safeParse({ ...raw, CORS_ORIGIN: 'https://a.example.com' }).success).toBe(
      true,
    );
  });

  it('does not allow other origins', async () => {
    const res = await preflight('https://evil.example.com');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
