import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { env, setEnv } from '../config/env.js';
import { makeUser } from '../../test/helpers.js';

/**
 * H1: a campus NAT puts every student on one public IP. Limits must be per user so one lab
 * full of students is not blocked, while one noisy client still is.
 */
describe('rate limits (H1)', () => {
  let app;
  let original;
  beforeAll(async () => {
    original = env();
    setEnv({ ...original, API_RATE_LIMIT_PER_MIN: 10, API_IP_RATE_LIMIT_PER_MIN: 1000 });
    const { createApp } = await import('../app.js');
    app = createApp(); // built with the low limits
    setEnv(original);
  });
  afterAll(() => setEnv(original));

  const hit = (u) => request(app).get('/api/v1/subjects').set(u.auth);

  it('gives every user on the same IP their own budget', async () => {
    const students = await Promise.all(Array.from({ length: 5 }, () => makeUser('student')));
    for (let round = 0; round < 8; round++) {
      const res = await Promise.all(students.map(hit));
      expect(res.map((r) => r.status)).toEqual(students.map(() => 200));
    }
  });

  it('limits one noisy user without affecting the others', async () => {
    const [noisy, quiet] = await Promise.all([makeUser('student'), makeUser('student')]);
    const statuses = [];
    for (let i = 0; i < 12; i++) statuses.push((await hit(noisy)).status);
    expect(statuses.slice(0, 10).every((s) => s === 200)).toBe(true);
    const limited = await hit(noisy);
    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe('RATE_LIMITED');
    expect((await hit(quiet)).status).toBe(200);
  });
});
