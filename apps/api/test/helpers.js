import request from 'supertest';

import { createApp } from '../src/app.js';
import { hashPassword } from '../src/modules/auth/service.js';
import { signAccessToken } from '../src/modules/auth/tokens.js';
import { User } from '../src/modules/users/model.js';

export const app = createApp();
export const api = () => request(app);
export const PASSWORD = 'Password123';

let counter = 0;

/** Creates a user directly in the DB and returns a valid access token for it. */
export async function makeUser(role, overrides = {}) {
  counter += 1;
  const email = overrides.email ?? `${role}${counter}-${Date.now()}@acet.test`;
  const user = await User.create({
    name: `${role} ${counter}`,
    email,
    role,
    passwordHash: await hashPassword(PASSWORD),
    ...overrides,
  });
  const token = signAccessToken(String(user._id), role).token;
  return { id: String(user._id), email, role, token, auth: { Authorization: `Bearer ${token}` } };
}

/** Extracts the refresh cookie value from a Set-Cookie header. */
export function refreshCookie(res) {
  const raw = res.headers['set-cookie'];
  const c = raw?.find((v) => v.startsWith('acet_rt='));
  return c?.split(';')[0];
}
