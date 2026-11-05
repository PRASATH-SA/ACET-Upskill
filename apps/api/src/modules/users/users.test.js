import { describe, expect, it } from 'vitest';
import { api, makeUser } from '../../../test/helpers.js';
import { Department, SyllabusVersion } from '../org/model.js';
import { Subject } from '../syllabus/model.js';
import { User } from './model.js';

let n = 0;
async function dept() {
  n += 1;
  return Department.create({ name: `Dept ${n}`, code: `D${n}${Date.now() % 10000}` });
}

/** Two departments, a HOD of the first, a coordinator, and a student in each. */
async function setup() {
  const [a, b] = [await dept(), await dept()];
  const hod = await makeUser('admin', { departmentId: a._id });
  const coordinator = await makeUser('coordinator');
  const mine = await makeUser('student', { departmentId: a._id });
  const theirs = await makeUser('student', { departmentId: b._id });
  return { a, b, hod, coordinator, mine, theirs };
}

describe('HOD scope and the Academic Coordinator', () => {
  it('a HOD lists only their department; the coordinator lists everyone', async () => {
    const s = await setup();
    const hodList = await api().get('/api/v1/users?limit=100').set(s.hod.auth).expect(200);
    const hodIds = hodList.body.data.map((u) => u.id);
    expect(hodIds).toContain(s.mine.id);
    expect(hodIds).not.toContain(s.theirs.id);
    expect(hodIds).not.toContain(s.coordinator.id);

    const all = await api()
      .get('/api/v1/users?limit=100&role=student')
      .set(s.coordinator.auth)
      .expect(200);
    const allIds = all.body.data.map((u) => u.id);
    expect(allIds).toEqual(expect.arrayContaining([s.mine.id, s.theirs.id]));
  });

  it('a HOD without a department is told to ask the coordinator', async () => {
    const hod = await makeUser('admin');
    const res = await api().get('/api/v1/users').set(hod.auth).expect(403);
    expect(res.body.error.message).toMatch(/Academic Coordinator/);
  });

  it('a HOD cannot edit users of another department or create HODs', async () => {
    const s = await setup();
    await api()
      .patch(`/api/v1/users/${s.theirs.id}`)
      .set(s.hod.auth)
      .send({ batch: '2024-28' })
      .expect(403);
    await api().delete(`/api/v1/users/${s.theirs.id}`).set(s.hod.auth).expect(403);
    await api()
      .patch(`/api/v1/users/${s.mine.id}`)
      .set(s.hod.auth)
      .send({ departmentId: String(s.b._id) })
      .expect(403);
    await api()
      .post('/api/v1/auth/register')
      .set(s.hod.auth)
      .send({
        name: 'Another HOD',
        email: `hod${Date.now()}@acet.test`,
        password: 'Secret123',
        role: 'admin',
      })
      .expect(403);
  });

  it("a HOD's new users land in the HOD's department", async () => {
    const s = await setup();
    const res = await api()
      .post('/api/v1/auth/register')
      .set(s.hod.auth)
      .send({
        name: 'New Student',
        email: `ns${Date.now()}@acet.test`,
        password: 'Secret123',
        role: 'student',
        yearOfStudy: 2,
        semester: 3,
      })
      .expect(201);
    expect(res.body.data).toMatchObject({
      departmentId: String(s.a._id),
      yearOfStudy: 2,
      semester: 3,
    });
  });

  it('the coordinator can create a HOD for any department and manage them', async () => {
    const s = await setup();
    const res = await api()
      .post('/api/v1/auth/register')
      .set(s.coordinator.auth)
      .send({
        name: 'HOD ECE',
        email: `hodece${Date.now()}@acet.test`,
        password: 'Secret123',
        role: 'admin',
        departmentId: String(s.b._id),
      })
      .expect(201);
    expect(res.body.data).toMatchObject({ role: 'admin', departmentId: String(s.b._id) });
    // The HOD of department A may not touch the new HOD; the coordinator may.
    await api()
      .patch(`/api/v1/users/${res.body.data.id}`)
      .set(s.hod.auth)
      .send({ name: 'Renamed' })
      .expect(403);
    await api()
      .patch(`/api/v1/users/${res.body.data.id}`)
      .set(s.coordinator.auth)
      .send({ name: 'Renamed' })
      .expect(200);
  });

  it('only the coordinator manages departments', async () => {
    const s = await setup();
    await api()
      .post('/api/v1/departments')
      .set(s.hod.auth)
      .send({ name: 'Mechanical', code: `ME${n}` })
      .expect(403);
    await api()
      .post('/api/v1/departments')
      .set(s.coordinator.auth)
      .send({ name: 'Mechanical', code: `ME${n}` })
      .expect(201);
  });
});

describe('year of study and semester', () => {
  it('rejects a semester outside the year of study', async () => {
    const s = await setup();
    await api()
      .patch(`/api/v1/users/${s.mine.id}`)
      .set(s.hod.auth)
      .send({ yearOfStudy: 3, semester: 2 })
      .expect(400);
    await api()
      .patch(`/api/v1/users/${s.mine.id}`)
      .set(s.hod.auth)
      .send({ yearOfStudy: 3, semester: 5 })
      .expect(200);
    // Changing only the semester is checked against the stored year.
    await api()
      .patch(`/api/v1/users/${s.mine.id}`)
      .set(s.hod.auth)
      .send({ semester: 1 })
      .expect(400);
  });

  it('the HOD sets the term of many students, skipping other departments', async () => {
    const s = await setup();
    const res = await api()
      .post('/api/v1/users/term')
      .set(s.hod.auth)
      .send({ userIds: [s.mine.id, s.theirs.id], yearOfStudy: 2, semester: 4 })
      .expect(200);
    expect(res.body.data).toEqual({ updated: 1, skipped: 1 });
    expect(await User.findById(s.mine.id).lean()).toMatchObject({ yearOfStudy: 2, semester: 4 });
    expect((await User.findById(s.theirs.id).lean()).semester).toBeNull();
  });

  it("a student's subjects and progress follow the semester the HOD set", async () => {
    const version = await SyllabusVersion.create({
      university: 'PU',
      regulation: 'R2023',
      branch: `SEM-${Date.now()}`,
      academicYear: '2025-26',
    });
    const code = Date.now() % 10000;
    const sem1 = await Subject.create({
      syllabusVersionId: version._id,
      semester: 1,
      code: `PY${code}`,
      name: 'Python',
    });
    const sem5 = await Subject.create({
      syllabusVersionId: version._id,
      semester: 5,
      code: `DB${code}`,
      name: 'DBMS',
    });
    const student = await makeUser('student', { syllabusVersionId: version._id });

    // No semester set yet: every subject of the version, as before.
    let res = await api().get('/api/v1/subjects').set(student.auth).expect(200);
    expect(res.body.data.map((x) => x.id).sort()).toEqual(
      [String(sem1._id), String(sem5._id)].sort(),
    );

    await User.updateOne({ _id: student.id }, { $set: { yearOfStudy: 3, semester: 5 } });
    res = await api().get('/api/v1/subjects').set(student.auth).expect(200);
    expect(res.body.data.map((x) => x.id)).toEqual([String(sem5._id)]);
    const progress = await api().get('/api/v1/me/progress').set(student.auth).expect(200);
    expect(progress.body.data.subjects.map((x) => x.subjectId)).toEqual([String(sem5._id)]);

    // Earlier semesters stay reachable on request.
    res = await api().get('/api/v1/subjects?semester=1').set(student.auth).expect(200);
    expect(res.body.data.map((x) => x.id)).toEqual([String(sem1._id)]);
  });
});

describe('create:coordinator script', () => {
  it('creates a coordinator with a temporary password, or promotes an existing user', async () => {
    const { createCoordinator } = await import('../../db/createCoordinator.js');
    const email = `coord${Date.now()}@acet.test`;
    const created = await createCoordinator(email);
    expect(created.user.role).toBe('coordinator');
    expect(created.temporaryPassword).toMatch(/^Acet-/);
    await api()
      .post('/api/v1/auth/login')
      .send({ email, password: created.temporaryPassword })
      .expect(200);

    const hod = await makeUser('admin');
    const promoted = await createCoordinator(hod.email);
    expect(promoted).toMatchObject({ promoted: true });
    expect((await User.findById(hod.id).lean()).role).toBe('coordinator');
  });
});
