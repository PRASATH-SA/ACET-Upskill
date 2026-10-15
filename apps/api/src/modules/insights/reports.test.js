import { describe, expect, it } from 'vitest';
import { api, makeUser } from '../../../test/helpers.js';
import { dbmsFixture } from '../../../test/fixtures.js';
import { AuditLog } from '../audit/model.js';
import { Flashcard, Question } from '../content/model.js';
import { Pyq } from '../exam/model.js';
import { Attempt, Mastery } from '../practice/model.js';
import { Topic } from '../syllabus/model.js';
import { User } from '../users/model.js';
import { riskFor } from './service.js';

const yearsAgo = (n) => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - n);
  return d;
};

describe('exam prep', () => {
  it('ranks topics by how often they were asked, with unit, marks and frequency filters', async () => {
    const f = await dbmsFixture();
    const mk = (text, marks, topics, when) => ({
      text,
      marks,
      examDate: when.toISOString(),
      topicIds: topics.map((k) => f.id(k)),
    });
    const created = await api()
      .post(`/api/v1/subjects/${f.sid}/pyqs/bulk`)
      .set(f.faculty.auth)
      .send({
        items: [
          mk('Explain 3NF with an example.', 16, ['nf123', 'normalization'], yearsAgo(1)),
          mk('Define normalization.', 2, ['normalization'], yearsAgo(2)),
          mk('Why normalize? Give anomalies.', 16, ['normalization', 'anomalies'], yearsAgo(3)),
          mk('What is a B+ tree index?', 16, ['indexing'], yearsAgo(1)),
          mk('Old question on normalization', 16, ['normalization'], yearsAgo(9)),
          mk('Untagged question about DBMS', 2, [], yearsAgo(1)),
        ],
      });
    expect(created.status).toBe(201);
    // Students only see published PYQs: before publishing, nothing.
    const before = await api().get(`/api/v1/subjects/${f.sid}/exam-prep`).set(f.student.auth);
    expect(before.body.data.topics.every((t) => t.frequency === 0)).toBe(true);

    await api()
      .post('/api/v1/review-queue/bulk')
      .set(f.faculty.auth)
      .send({ action: 'publish', items: created.body.data.map((p) => ({ type: 'pyq', id: p.id })) })
      .expect(200);

    const res = await api().get(`/api/v1/subjects/${f.sid}/exam-prep?years=5`).set(f.student.auth);
    expect(res.status).toBe(200);
    const [top] = res.body.data.topics;
    expect(top).toMatchObject({
      title: 'Normalization',
      frequency: 3,
      marksBreakdown: { 2: 1, 16: 2 },
    });
    expect(res.body.data.untaggedCount).toBe(1);

    const unit4 = await api()
      .get(`/api/v1/subjects/${f.sid}/exam-prep?unitId=${f.units[4]._id}`)
      .set(f.student.auth);
    expect(unit4.body.data.topics.map((t) => t.title)).toEqual(['Indexing']);
    const twoMark = await api()
      .get(`/api/v1/subjects/${f.sid}/exam-prep?marks=2`)
      .set(f.student.auth);
    expect(twoMark.body.data.topics[0]).toMatchObject({ title: 'Normalization', frequency: 1 });
    const frequent = await api()
      .get(`/api/v1/subjects/${f.sid}/exam-prep?minFrequency=2`)
      .set(f.student.auth);
    expect(frequent.body.data.topics.map((t) => t.title)).toEqual(['Normalization']);

    // The topic page shows the published PYQs for that topic.
    const page = await api()
      .get(`/api/v1/topics/${f.id('normalization')}/page`)
      .set(f.student.auth);
    expect(page.body.data.pyqs).toHaveLength(4);
  });

  it('rejects topic tags from another subject', async () => {
    const f = await dbmsFixture();
    const g = await dbmsFixture();
    const res = await api()
      .post(`/api/v1/subjects/${f.sid}/pyqs`)
      .set(f.faculty.auth)
      .send({ text: 'Define keys.', marks: 2, examDate: '2025-05-01', topicIds: [g.id('keys')] });
    expect(res.status).toBe(400);
  });
});

describe('workshops', () => {
  it('faculty create, students submit text, faculty grade', async () => {
    const f = await dbmsFixture();
    const w = await api()
      .post(`/api/v1/topics/${f.id('normalization')}/workshops`)
      .set(f.faculty.auth)
      .send({
        brief: 'Normalize the hostel mess billing table to 3NF.',
        dueAt: new Date(Date.now() + 86400000).toISOString(),
      });
    expect(w.status).toBe(201);
    const sub = await api()
      .post(`/api/v1/workshops/${w.body.data.id}/submissions`)
      .set(f.student.auth)
      .field('text', 'Split into Student, Meal and Bill tables.');
    expect(sub.status).toBe(201);
    expect(sub.body.data.late).toBe(false);

    const list = await api()
      .get(`/api/v1/workshops/${w.body.data.id}/submissions`)
      .set(f.faculty.auth);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].student.id).toBe(f.student.id);
    await api()
      .get(`/api/v1/workshops/${w.body.data.id}/submissions`)
      .set(f.otherFaculty.auth)
      .expect(403);

    const graded = await api()
      .patch(`/api/v1/submissions/${sub.body.data.id}/grade`)
      .set(f.faculty.auth)
      .send({ score: 85, feedback: 'Good split; name the keys.' });
    expect(graded.status).toBe(200);
    const mine = await api().get('/api/v1/me/submissions').set(f.student.auth);
    expect(mine.body.data[0]).toMatchObject({ score: 85, feedback: 'Good split; name the keys.' });
    // A graded submission cannot be replaced.
    await api()
      .post(`/api/v1/workshops/${w.body.data.id}/submissions`)
      .set(f.student.auth)
      .field('text', 'changed')
      .expect(403);
    const page = await api()
      .get(`/api/v1/topics/${f.id('normalization')}/page`)
      .set(f.student.auth);
    expect(page.body.data.workshops).toHaveLength(1);
  });
});

describe('faculty insights', () => {
  it('responds in under 500 ms for 500 students × 30 topics', async () => {
    const f = await dbmsFixture();
    const extra = await Topic.insertMany(
      Array.from({ length: 22 }, (_, i) => ({
        unitId: f.units[3]._id,
        subjectId: f.subject._id,
        title: `Extra topic ${i + 1}`,
        order: 10 + i,
        status: 'approved',
      })),
    );
    const topics = [...Object.values(f.topics), ...extra];
    expect(topics).toHaveLength(30);
    const students = await User.insertMany(
      Array.from({ length: 500 }, (_, i) => ({
        name: `Student ${i}`,
        email: `perf${i}-${Date.now()}@acet.test`,
        role: 'student',
        passwordHash: 'x',
        syllabusVersionId: f.version._id,
        batch: '2023-27',
      })),
    );
    const states = ['notStarted', 'learning', 'practicing', 'confident', 'needsRevision'];
    const mastery = [];
    const attempts = [];
    const q = await Question.create({
      topicId: topics[0]._id,
      subjectId: f.subject._id,
      stem: 'perf?',
      options: ['a', 'b'],
      correctIndex: 0,
      status: 'published',
    });
    students.forEach((s, si) => {
      topics.forEach((t, ti) => {
        const state = states[(si + ti) % states.length];
        if (state === 'notStarted') return;
        mastery.push({
          userId: s._id,
          topicId: t._id,
          subjectId: f.subject._id,
          state,
          score: state === 'learning' ? null : (si * 7 + ti * 13) % 101,
        });
        attempts.push({
          userId: s._id,
          questionId: q._id,
          topicId: t._id,
          subjectId: f.subject._id,
          selectedIndex: 0,
          correct: (si + ti) % 3 !== 0,
        });
      });
    });
    await Mastery.insertMany(mastery, { ordered: false });
    await Attempt.insertMany(attempts, { ordered: false });

    await api().get(`/api/v1/subjects/${f.sid}/insights`).set(f.faculty.auth).expect(200); // warm up
    const t0 = performance.now();
    const res = await api().get(`/api/v1/subjects/${f.sid}/insights`).set(f.faculty.auth);
    const ms = performance.now() - t0;
    expect(res.status).toBe(200);
    expect(res.body.data.studentCount).toBe(501); // 500 + the fixture student
    expect(res.body.data.topics).toHaveLength(30);
    expect(res.body.data.weakestTopics).toHaveLength(5);
    expect(res.body.data.studentsNeedingRevision.length).toBeGreaterThan(0);
    const first = res.body.data.topics[0];
    expect(first.notStartedPercent).toBeGreaterThan(0);
    expect(ms).toBeLessThan(500);
  }, 120_000);

  it('only the owning faculty or an admin can see insights', async () => {
    const f = await dbmsFixture();
    await api().get(`/api/v1/subjects/${f.sid}/insights`).set(f.otherFaculty.auth).expect(403);
    await api().get(`/api/v1/subjects/${f.sid}/insights`).set(f.student.auth).expect(403);
    await api().get(`/api/v1/subjects/${f.sid}/insights`).set(f.admin.auth).expect(200);
  });
});

describe('mentor', () => {
  it('a mentor sees only assigned students, with risk signals and notes', async () => {
    const f = await dbmsFixture();
    const mentor = await makeUser('mentor');
    const other = await makeUser('mentor');
    const mine = await makeUser('student', {
      mentorId: mentor.id,
      syllabusVersionId: f.version._id,
      lastActiveAt: new Date(),
    });
    const idle = await makeUser('student', {
      mentorId: mentor.id,
      syllabusVersionId: f.version._id,
      lastActiveAt: new Date(Date.now() - 10 * 86400000),
    });
    const notMine = await makeUser('student', { mentorId: other.id });

    const list = await api().get('/api/v1/mentor/students').set(mentor.auth);
    expect(list.status).toBe(200);
    expect(list.body.data.map((s) => s.id).sort()).toEqual([mine.id, idle.id].sort());
    expect(list.body.data[0]).toMatchObject({ id: idle.id, risk: { level: 'medium' } });

    await api().get(`/api/v1/mentor/students/${notMine.id}`).set(mentor.auth).expect(403);
    const detail = await api().get(`/api/v1/mentor/students/${mine.id}`).set(mentor.auth);
    expect(detail.status).toBe(200);
    expect(
      await AuditLog.exists({
        action: 'user.dataAccess',
        actorId: mentor.id,
        'target.id': mine.id,
      }),
    ).toBeTruthy();

    const note = await api()
      .post(`/api/v1/mentor/students/${mine.id}/notes`)
      .set(mentor.auth)
      .send({
        note: 'Discussed DBMS revision plan.',
        followUpAt: new Date(Date.now() + 86400000).toISOString(),
      });
    expect(note.status).toBe(201);
    await api()
      .post(`/api/v1/mentor/students/${notMine.id}/notes`)
      .set(mentor.auth)
      .send({ note: 'x' })
      .expect(403);
    await api()
      .patch(`/api/v1/mentor/notes/${note.body.data.id}`)
      .set(other.auth)
      .send({ done: true })
      .expect(403);
    const fu = await api().get('/api/v1/mentor/follow-ups').set(mentor.auth);
    expect(fu.body.data).toHaveLength(1);
    await api()
      .patch(`/api/v1/mentor/notes/${note.body.data.id}`)
      .set(mentor.auth)
      .send({ done: true })
      .expect(200);
    expect((await api().get('/api/v1/mentor/follow-ups').set(mentor.auth)).body.data).toHaveLength(
      0,
    );

    await api().get('/api/v1/mentor/students').set(f.student.auth).expect(403);
  });

  it('computes risk from needsRevision count and inactivity', () => {
    const now = new Date('2026-03-10T00:00:00Z');
    expect(riskFor({ needsRevision: 0, lastActiveAt: new Date('2026-03-09') }, now).level).toBe(
      'none',
    );
    expect(riskFor({ needsRevision: 3, lastActiveAt: new Date('2026-03-09') }, now).level).toBe(
      'medium',
    );
    expect(riskFor({ needsRevision: 5, lastActiveAt: new Date('2026-02-20') }, now)).toMatchObject({
      level: 'high',
      reasons: ['5 topics need revision', 'No activity for 18 days'],
    });
    expect(riskFor({ needsRevision: 0, lastActiveAt: null }, now).reasons).toEqual([
      'Has never been active',
    ]);
  });
});

describe('CO–PO attainment endpoints', () => {
  it('maps topics to COs, reports attainment, and exports CSV and PDF', async () => {
    const f = await dbmsFixture();
    const co = await api()
      .post(`/api/v1/subjects/${f.sid}/course-outcomes`)
      .set(f.faculty.auth)
      .send({
        code: 'CO3',
        text: 'Apply normalization to remove anomalies.',
        poMappings: [{ po: 'PO1', level: 3 }],
      });
    expect(co.status).toBe(201);
    await api()
      .put(`/api/v1/course-outcomes/${co.body.data.id}/topics`)
      .set(f.faculty.auth)
      .send({ topicIds: [f.id('normalization'), f.id('nf123')] })
      .expect(200);

    const q = await Question.create({
      topicId: f.topics.normalization._id,
      subjectId: f.subject._id,
      stem: 'q',
      options: ['a', 'b'],
      correctIndex: 0,
      status: 'published',
    });
    const s2 = await makeUser('student', { syllabusVersionId: f.version._id });
    await Attempt.create([
      {
        userId: f.student.id,
        questionId: q._id,
        topicId: f.topics.normalization._id,
        subjectId: f.subject._id,
        selectedIndex: 0,
        correct: true,
      },
      {
        userId: s2.id,
        questionId: q._id,
        topicId: f.topics.normalization._id,
        subjectId: f.subject._id,
        selectedIndex: 1,
        correct: false,
      },
    ]);
    const rep = await api().get(`/api/v1/subjects/${f.sid}/co-attainment`).set(f.faculty.auth);
    expect(rep.status).toBe(200);
    expect(rep.body.data.cos[0]).toMatchObject({
      code: 'CO3',
      studentsAssessed: 2,
      studentsAttained: 1,
      attainmentPercent: 50,
      level: 1,
    });
    expect(rep.body.data.pos).toEqual([{ po: 'PO1', attainment: 1 }]);

    const csv = await api()
      .get(`/api/v1/subjects/${f.sid}/co-attainment/export?format=csv`)
      .set(f.faculty.auth);
    expect(csv.status).toBe(200);
    expect(csv.headers['content-type']).toMatch(/text\/csv/);
    expect(csv.text).toContain('CO3,Apply normalization to remove anomalies.,2,2,1,50,1,PO1:3');

    const pdf = await api()
      .get(`/api/v1/subjects/${f.sid}/co-attainment/export?format=pdf`)
      .set(f.admin.auth)
      .buffer(true)
      .parse((res, cb) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => cb(null, Buffer.concat(chunks)));
      });
    expect(pdf.status).toBe(200);
    expect(pdf.headers['content-type']).toBe('application/pdf');
    expect(pdf.body.subarray(0, 4).toString()).toBe('%PDF');
    expect(
      await AuditLog.countDocuments({ action: 'report.coAttainmentExport', 'target.id': f.sid }),
    ).toBe(2);

    await api().get(`/api/v1/subjects/${f.sid}/co-attainment`).set(f.otherFaculty.auth).expect(403);
  });
});

describe('admin usage', () => {
  it('reports activity, publishing and AI draft outcomes', async () => {
    const f = await dbmsFixture();
    const base = {
      topicId: f.topics.keys._id,
      subjectId: f.subject._id,
      source: 'ai',
      aiMeta: { promptVersion: 'flashcards.v1' },
    };
    await Flashcard.insertMany([
      { ...base, front: 'a', back: 'a', status: 'published' },
      { ...base, front: 'b', back: 'b', status: 'approved', editedAfterAi: true },
      { ...base, front: 'c', back: 'c', status: 'draft', rejectedAt: new Date() },
      { ...base, front: 'd', back: 'd', status: 'draft' },
    ]);
    await Pyq.create({
      subjectId: f.subject._id,
      text: 'ai pyq',
      marks: 2,
      examDate: new Date(),
      source: 'ai',
      status: 'draft',
      aiMeta: { promptVersion: 'pyq.tag.v1' },
    });
    const q = await Question.create({
      topicId: f.topics.keys._id,
      subjectId: f.subject._id,
      stem: 'q',
      options: ['a', 'b'],
      correctIndex: 0,
      status: 'published',
    });
    await Attempt.create({
      userId: f.student.id,
      questionId: q._id,
      topicId: f.topics.keys._id,
      subjectId: f.subject._id,
      selectedIndex: 0,
      correct: true,
    });

    const res = await api().get('/api/v1/admin/usage').set(f.admin.auth);
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d.weeklyActiveStudents).toBeGreaterThanOrEqual(1);
    expect(d.weeklyActivity).toHaveLength(8);
    const fc = d.aiDrafts.byPromptVersion.find((r) => r.promptVersion === 'flashcards.v1');
    expect(fc).toMatchObject({ total: 4, approved: 2, rejected: 1, edited: 1, pending: 1 });
    await api().get('/api/v1/admin/usage').set(f.faculty.auth).expect(403);
    const logs = await api().get('/api/v1/admin/audit-logs?limit=5').set(f.admin.auth);
    expect(logs.status).toBe(200);
    expect(logs.body.meta.limit).toBe(5);
  });
});
