import { describe, expect, it } from 'vitest';
import { api, makeUser } from '../../../test/helpers.js';
import { dbmsFixture } from '../../../test/fixtures.js';
import { AuditLog } from '../audit/model.js';
import { Department } from '../org/model.js';
import { Mastery } from '../practice/model.js';
import { rank } from './service.js';

let deptN = 0;
const makeDept = () => {
  deptN += 1;
  return Department.create({ name: `Dept ${deptN}`, code: `D${deptN}${Date.now()}` });
};

/**
 * A DBMS class in one department: `top` masters two topics, `mid` is learning one, `idle` has
 * done nothing; `away` follows the same syllabus but sits in another department.
 */
async function classFixture() {
  const f = await dbmsFixture();
  const [dept, otherDept] = await Promise.all([makeDept(), makeDept()]);
  const inClass = { syllabusVersionId: f.version._id, departmentId: dept._id, semester: 5 };
  const [top, mid, idle, away, hod, otherHod] = await Promise.all([
    makeUser('student', { ...inClass, name: 'Asha', batch: '2023-27' }),
    makeUser('student', { ...inClass, name: 'Bala', batch: '2023-27' }),
    makeUser('student', { ...inClass, name: 'Chitra', batch: '2024-28' }),
    makeUser('student', { ...inClass, departmentId: otherDept._id, name: 'Deepa' }),
    makeUser('admin', { departmentId: dept._id }),
    makeUser('admin', { departmentId: otherDept._id }),
  ]);
  const m = (u, key, state, score = null) => ({
    userId: u.id,
    topicId: f.id(key),
    subjectId: f.subject._id,
    state,
    score,
  });
  await Mastery.insertMany([
    m(top, 'relational', 'confident', 90),
    m(top, 'keys', 'confident', 80),
    m(mid, 'relational', 'learning', 40),
    m(away, 'relational', 'confident', 100),
  ]);
  return { ...f, dept, otherDept, top, mid, idle, away, hod, otherHod };
}

describe('rank', () => {
  it('orders by XP then mastered, and gives tied students the same rank', () => {
    const rows = rank([
      { name: 'C', xp: 50, mastered: 1, averageScore: null },
      { name: 'A', xp: 100, mastered: 2, averageScore: 70 },
      { name: 'B', xp: 50, mastered: 1, averageScore: 90 },
      { name: 'D', xp: 10, mastered: 0, averageScore: 40 },
    ]);
    expect(rows.map((r) => [r.name, r.rank])).toEqual([
      ['A', 1],
      ['B', 2],
      ['C', 2],
      ['D', 4],
    ]);
  });
});

describe('leaderboard', () => {
  it('a student sees their class ranked by XP, with only public fields', async () => {
    const f = await classFixture();
    const res = await api().get('/api/v1/leaderboard').set(f.mid.auth);
    expect(res.status).toBe(200);
    const { rows, me, scope } = res.body.data;
    // Same department and semester only: Deepa (other department) is not listed.
    expect(rows.map((r) => r.name)).toEqual(['Asha', 'Bala', 'Chitra']);
    expect(rows[0]).toMatchObject({ rank: 1, xp: 100, mastered: 2, isMe: false });
    expect(me).toMatchObject({ name: 'Bala', rank: 2, xp: 10, isMe: true });
    // Every row carries department, year (from the semester when not set) and level.
    expect(rows[0]).toMatchObject({
      department: f.dept.name,
      yearOfStudy: 3,
      levelTitle: 'Apprentice',
    });
    expect(scope.cohortSize).toBe(3);
    expect(rows[0]).not.toHaveProperty('email');
    expect(rows[0]).not.toHaveProperty('averageScore');
  });

  it('keeps the student in `me` when they fall outside the top rows', async () => {
    const f = await classFixture();
    const res = await api().get('/api/v1/leaderboard?limit=1').set(f.idle.auth);
    expect(res.body.data.rows.map((r) => r.name)).toEqual(['Asha']);
    expect(res.body.data.me).toMatchObject({ name: 'Chitra', rank: 3 });
  });

  it('faculty see students of their subjects with full detail; others are refused', async () => {
    const f = await classFixture();
    const res = await api().get(`/api/v1/leaderboard?subjectId=${f.sid}`).set(f.faculty.auth);
    expect(res.status).toBe(200);
    const names = res.body.data.rows.map((r) => r.name);
    // Every student following the subject, whatever their department.
    expect(names.slice(0, 3)).toEqual(['Asha', 'Deepa', 'Bala']);
    expect(names).toHaveLength(5);
    expect(res.body.data.rows[0]).toMatchObject({ averageScore: 85, masteryPct: 25 });
    expect(res.body.data.rows[0].email).toBeDefined();
    await api().get(`/api/v1/leaderboard?subjectId=${f.sid}`).set(f.otherFaculty.auth).expect(403);
  });

  it('a HOD ranks only their department; the coordinator can pick a department', async () => {
    const f = await classFixture();
    const hod = await api().get('/api/v1/leaderboard').set(f.hod.auth);
    expect(hod.body.data.rows.map((r) => r.name)).toEqual(['Asha', 'Bala', 'Chitra']);
    const coordinator = await makeUser('coordinator');
    const other = await api()
      .get(`/api/v1/leaderboard?departmentId=${f.otherDept._id}`)
      .set(coordinator.auth);
    expect(other.body.data.rows.map((r) => r.name)).toEqual(['Deepa']);
    // A HOD cannot widen their scope with departmentId.
    const widened = await api()
      .get(`/api/v1/leaderboard?departmentId=${f.otherDept._id}`)
      .set(f.hod.auth);
    expect(widened.body.data.rows.map((r) => r.name)).toEqual(['Asha', 'Bala', 'Chitra']);
    const noDept = await makeUser('admin');
    await api().get('/api/v1/leaderboard').set(noDept.auth).expect(403);
  });
});

describe('progress reports', () => {
  it('summarises a department by subject, semester and batch', async () => {
    const f = await classFixture();
    const res = await api().get('/api/v1/reports/progress').set(f.hod.auth);
    expect(res.status).toBe(200);
    const { summary, bySubject, bySemester, byBatch, students } = res.body.data;
    expect(summary).toMatchObject({ students: 3, averageXp: round(110 / 3) });
    expect(summary.states.confident).toBe(2);
    expect(summary.states.learning).toBe(1);
    expect(bySubject).toHaveLength(1);
    expect(bySubject[0]).toMatchObject({ code: f.subject.code, students: 3, totalTopics: 8 });
    expect(bySemester).toEqual([expect.objectContaining({ semester: 5, students: 3 })]);
    expect(byBatch.map((b) => [b.batch, b.students])).toEqual([
      ['2023-27', 2],
      ['2024-28', 1],
    ]);
    expect(students[0]).toMatchObject({ name: 'Asha', rank: 1 });
    expect(students[2].risk.level).not.toBe('none'); // never active
  });

  it('is for staff only, and faculty only for their own subjects', async () => {
    const f = await classFixture();
    await api().get('/api/v1/reports/progress').set(f.top.auth).expect(403);
    const mine = await api().get('/api/v1/reports/progress').set(f.faculty.auth);
    expect(mine.body.data.bySubject.map((s) => s.subjectId)).toEqual([f.sid]);
    const other = await api().get('/api/v1/reports/progress').set(f.otherFaculty.auth);
    expect(other.body.data.summary.students).toBe(0);
  });

  it('one student: progress and standing for staff who may see them, audited', async () => {
    const f = await classFixture();
    const res = await api().get(`/api/v1/reports/students/${f.top.id}`).set(f.faculty.auth);
    expect(res.status).toBe(200);
    expect(res.body.data.student.name).toBe('Asha');
    expect(res.body.data.progress.subjects[0].counts.confident).toBe(2);
    expect(res.body.data.standing).toMatchObject({ xp: 100, averageScore: 85 });
    expect(res.body.data.mySubjectIds).toEqual([f.sid]);
    expect(await AuditLog.exists({ actorId: f.faculty.id, 'target.id': f.top.id })).toBeTruthy();

    await api().get(`/api/v1/reports/students/${f.top.id}`).set(f.hod.auth).expect(200);
    await api().get(`/api/v1/reports/students/${f.top.id}`).set(f.otherHod.auth).expect(403);
    await api().get(`/api/v1/reports/students/${f.outsider.id}`).set(f.faculty.auth).expect(403);
    await api().get(`/api/v1/reports/students/${f.mid.id}`).set(f.top.auth).expect(403);
  });
});

function round(n) {
  return Math.round(n * 10) / 10;
}
