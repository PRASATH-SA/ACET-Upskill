import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';
import { api, makeUser, PASSWORD, refreshCookie } from '../../../test/helpers.js';
import { env } from '../../config/env.js';
import { AuditLog } from '../audit/model.js';
import { Department, SyllabusVersion } from '../org/model.js';
import { Subject } from '../syllabus/model.js';

describe('health', () => {
  it('reports api and mongo ok', async () => {
    const res = await api().get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: 'ok', mongo: 'ok' });
  });

  it('returns the A.6 error shape for unknown routes', async () => {
    const u = await makeUser('student');
    const res = await api().get('/api/v1/nope').set(u.auth);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('does not reveal routes to anonymous callers', async () => {
    const res = await api().get('/api/v1/nope');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});

describe('login, refresh and logout', () => {
  it('logs in, sets an httpOnly strict cookie, and returns the user without the hash', async () => {
    const u = await makeUser('student');
    const res = await api().post('/api/v1/auth/login').send({ email: u.email, password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTypeOf('string');
    expect(res.body.data.user).toMatchObject({ email: u.email, role: 'student' });
    expect(res.body.data.user.passwordHash).toBeUndefined();
    const raw = res.headers['set-cookie'].join(';');
    expect(raw).toMatch(/HttpOnly/i);
    expect(raw).toMatch(/SameSite=Strict/i);
    expect(raw).toMatch(/Secure/i);
    expect(await AuditLog.exists({ action: 'auth.login', 'target.id': u.id })).toBeTruthy();
  });

  it('rejects a wrong password with 401', async () => {
    const u = await makeUser('student');
    const res = await api()
      .post('/api/v1/auth/login')
      .send({ email: u.email, password: 'Wrong1234' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('expired access token gets 401, then refresh issues a working token', async () => {
    const u = await makeUser('student');
    const login = await api()
      .post('/api/v1/auth/login')
      .send({ email: u.email, password: PASSWORD });
    const cookie = refreshCookie(login);

    const expired = jwt.sign({ role: 'student' }, env().JWT_ACCESS_SECRET, {
      subject: u.id,
      expiresIn: -10,
      issuer: 'acet-skillup',
      audience: 'acet-skillup-api',
    });
    const denied = await api().get('/api/v1/auth/me').set('Authorization', `Bearer ${expired}`);
    expect(denied.status).toBe(401);
    expect(denied.body.error.details).toEqual({ reason: 'expired' });

    const refreshed = await api().post('/api/v1/auth/refresh').set('Cookie', cookie);
    expect(refreshed.status).toBe(200);
    const me = await api()
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${refreshed.body.data.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.data.email).toBe(u.email);
  });

  it('rotates refresh tokens and revokes the family when an old token is reused', async () => {
    const u = await makeUser('faculty');
    const login = await api()
      .post('/api/v1/auth/login')
      .send({ email: u.email, password: PASSWORD });
    const first = refreshCookie(login);

    const r1 = await api().post('/api/v1/auth/refresh').set('Cookie', first);
    expect(r1.status).toBe(200);
    const second = refreshCookie(r1);
    expect(second).not.toBe(first);

    // Reusing the rotated token is treated as theft: 401 and the whole family is revoked.
    const reuse = await api().post('/api/v1/auth/refresh').set('Cookie', first);
    expect(reuse.status).toBe(401);
    const afterReuse = await api().post('/api/v1/auth/refresh').set('Cookie', second);
    expect(afterReuse.status).toBe(401);
  });

  it('logout revokes the refresh token', async () => {
    const u = await makeUser('student');
    const login = await api()
      .post('/api/v1/auth/login')
      .send({ email: u.email, password: PASSWORD });
    const cookie = refreshCookie(login);
    await api().post('/api/v1/auth/logout').set('Cookie', cookie).expect(200);
    const res = await api().post('/api/v1/auth/refresh').set('Cookie', cookie);
    expect(res.status).toBe(401);
  });

  it('rate-limits login to 5 per minute per IP + email', async () => {
    const email = `limited-${Date.now()}@acet.test`;
    const codes = [];
    for (let i = 0; i < 6; i++) {
      const res = await api().post('/api/v1/auth/login').send({ email, password: 'Wrong1234' });
      codes.push(res.status);
    }
    expect(codes.slice(0, 5).every((c) => c === 401)).toBe(true);
    expect(codes[5]).toBe(429);
    // A different email from the same IP is not blocked.
    const other = await api()
      .post('/api/v1/auth/login')
      .send({ email: `x${email}`, password: 'Wrong1234' });
    expect(other.status).toBe(401);
  });

  it('deactivated users cannot use their access token', async () => {
    const dept = await Department.create({ name: 'Deact Dept', code: `DD${Date.now() % 100000}` });
    const admin = await makeUser('admin', { departmentId: dept._id });
    const s = await makeUser('student', { departmentId: dept._id });
    await api().delete(`/api/v1/users/${s.id}`).set(admin.auth).expect(200);
    const res = await api().get('/api/v1/auth/me').set(s.auth);
    expect(res.status).toBe(401);
  });
});

describe('role guard', () => {
  it('a student calling an admin route gets 403', async () => {
    const s = await makeUser('student');
    const res = await api().get('/api/v1/users').set(s.auth);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('no token gets 401', async () => {
    const res = await api().get('/api/v1/users');
    expect(res.status).toBe(401);
  });

  it('admin can register users and change roles (audited)', async () => {
    const dept = await Department.create({ name: 'Auth Dept', code: `AD${Date.now() % 100000}` });
    const admin = await makeUser('admin', { departmentId: dept._id });
    const created = await api()
      .post('/api/v1/auth/register')
      .set(admin.auth)
      .send({
        name: 'New Faculty',
        email: `nf${Date.now()}@acet.test`,
        password: 'Secret123',
        role: 'student',
      });
    expect(created.status).toBe(201);
    const id = created.body.data.id;
    const patched = await api()
      .patch(`/api/v1/users/${id}`)
      .set(admin.auth)
      .send({ role: 'faculty' });
    expect(patched.status).toBe(200);
    expect(patched.body.data.role).toBe('faculty');
    expect(await AuditLog.exists({ action: 'user.roleChange', 'target.id': id })).toBeTruthy();
  });

  it('validates request bodies with the shared zod schemas', async () => {
    const admin = await makeUser('admin');
    const res = await api()
      .post('/api/v1/auth/register')
      .set(admin.auth)
      .send({ name: 'x', email: 'bad', password: 'short', role: 'king' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.length).toBeGreaterThanOrEqual(3);
  });
});

describe('ownership guard', () => {
  async function setup() {
    const v1 = await SyllabusVersion.create({
      university: 'PU',
      regulation: 'R2023',
      branch: `CSE-${Date.now()}`,
      academicYear: '2025-26',
    });
    const v2 = await SyllabusVersion.create({
      university: 'PU',
      regulation: 'R2023',
      branch: `ECE-${Date.now()}`,
      academicYear: '2025-26',
    });
    const faculty = await makeUser('faculty');
    await Subject.create({
      syllabusVersionId: v1._id,
      semester: 5,
      code: `CS${Date.now() % 10000}`,
      name: 'DBMS',
      facultyIds: [faculty.id],
    });
    const inBatch = await makeUser('student', { syllabusVersionId: v1._id });
    const outOfBatch = await makeUser('student', { syllabusVersionId: v2._id });
    return { faculty, inBatch, outOfBatch };
  }

  it("faculty can read a student in their subject's batch, and the access is audited", async () => {
    const { faculty, inBatch } = await setup();
    const res = await api().get(`/api/v1/users/${inBatch.id}`).set(faculty.auth);
    expect(res.status).toBe(200);
    expect(
      await AuditLog.exists({
        action: 'user.dataAccess',
        actorId: faculty.id,
        'target.id': inBatch.id,
      }),
    ).toBeTruthy();
  });

  it('faculty cannot read a student outside their subjects', async () => {
    const { faculty, outOfBatch } = await setup();
    const res = await api().get(`/api/v1/users/${outOfBatch.id}`).set(faculty.auth);
    expect(res.status).toBe(403);
  });

  it('a student can read only themselves', async () => {
    const { inBatch, outOfBatch } = await setup();
    await api().get(`/api/v1/users/${inBatch.id}`).set(inBatch.auth).expect(200);
    await api().get(`/api/v1/users/${outOfBatch.id}`).set(inBatch.auth).expect(403);
  });

  it('a mentor can read only assigned students', async () => {
    const mentor = await makeUser('mentor');
    const mine = await makeUser('student', { mentorId: mentor.id });
    const other = await makeUser('student');
    await api().get(`/api/v1/users/${mine.id}`).set(mentor.auth).expect(200);
    await api().get(`/api/v1/users/${other.id}`).set(mentor.auth).expect(403);
  });
});

describe('profile and password', () => {
  it('changes password and revokes other sessions', async () => {
    const u = await makeUser('student');
    const login = await api()
      .post('/api/v1/auth/login')
      .send({ email: u.email, password: PASSWORD });
    const cookie = refreshCookie(login);
    await api()
      .post('/api/v1/users/me/password')
      .set(u.auth)
      .send({ currentPassword: PASSWORD, newPassword: 'NewSecret99' })
      .expect(200);
    await api().post('/api/v1/auth/refresh').set('Cookie', cookie).expect(401);
    await api()
      .post('/api/v1/auth/login')
      .send({ email: u.email, password: 'NewSecret99' })
      .expect(200);
  });

  it('updates own name', async () => {
    const u = await makeUser('student');
    const res = await api().patch('/api/v1/users/me').set(u.auth).send({ name: 'Priya S' });
    expect(res.body.data.name).toBe('Priya S');
  });
});

describe('bulk CSV import', () => {
  it('creates valid students, reports bad rows, and returns temporary passwords', async () => {
    const dept = await Department.create({ name: 'CSV Dept', code: `CV${Date.now() % 100000}` });
    const admin = await makeUser('admin', { departmentId: dept._id });
    const stamp = Date.now();
    const csv = [
      'name,email,password,batch',
      `Asha K,asha${stamp}@acet.test,Secret123,2023-27`,
      `Bala R,bala${stamp}@acet.test,,`,
      `X,not-an-email,,`,
      `Asha Dup,asha${stamp}@acet.test,Secret123,`,
    ].join('\n');
    const res = await api()
      .post('/api/v1/auth/import-students')
      .set(admin.auth)
      .field('batch', '2023-27')
      .attach('file', Buffer.from(csv), { filename: 'students.csv', contentType: 'text/csv' });
    expect(res.status).toBe(200);
    expect(res.body.data.summary).toEqual({ total: 4, created: 2, failed: 2 });
    const bala = res.body.data.created.find((c) => c.user.email.startsWith('bala'));
    expect(bala.temporaryPassword).toBeTypeOf('string');
    expect(bala.user.batch).toBe('2023-27');
    // A HOD's imports always land in the HOD's department.
    expect(bala.user.departmentId).toBe(String(dept._id));
    await api()
      .post('/api/v1/auth/login')
      .send({ email: `bala${stamp}@acet.test`, password: bala.temporaryPassword })
      .expect(200);
  });
});
