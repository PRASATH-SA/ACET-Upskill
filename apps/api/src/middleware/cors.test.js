import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { env, setEnv } from '../config/env.js';

describe('CORS origins', () => {
  let app;
  let original;
  beforeAll(async () => {
    original = env();
    setEnv({ ...original, WEB_ORIGIN: 'http://localhost:5173, https://demo.example.com/' });
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

  it('allows every origin in the comma-separated WEB_ORIGIN, with credentials', async () => {
    for (const origin of ['http://localhost:5173', 'https://demo.example.com']) {
      const res = await preflight(origin);
      expect(res.headers['access-control-allow-origin']).toBe(origin);
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    }
  });

  it('does not allow other origins', async () => {
    const res = await preflight('https://evil.example.com');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
