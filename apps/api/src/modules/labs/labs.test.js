import { describe, expect, it } from 'vitest';
import { api } from '../../../test/helpers.js';
import { dbmsFixture } from '../../../test/fixtures.js';
import { CodeChallenge, CodeSubmission } from '../codelab/model.js';
import { SyllabusVersion } from '../org/model.js';

/** DBMS theory subject plus a lab linked to it, taught by `otherFaculty` only. */
async function labFixture() {
  const f = await dbmsFixture();
  const problem = (topic, title) =>
    CodeChallenge.create({
      topicId: f.id(topic),
      subjectId: f.sid,
      title,
      prompt: 'Write the query.',
      solution: 'SELECT 1;',
      language: 'sql',
      status: 'published',
    });
  const keysA = await problem('keys', 'Find the primary key');
  const keysB = await problem('keys', 'Candidate keys');
  const normal = await problem('normalization', 'Split the table');
  const res = await api()
    .post('/api/v1/subjects')
    .set(f.admin.auth)
    .send({
      syllabusVersionId: String(f.version._id),
      semester: 5,
      code: `LAB${Date.now() % 100000}`,
      name: 'DBMS Lab',
      kind: 'practical',
      theorySubjectId: f.sid,
      facultyIds: [f.otherFaculty.id],
    });
  expect(res.status).toBe(201);
  return { ...f, labId: res.body.data.id, keysA, keysB, normal };
}

const experiment = (f, body, who = f.otherFaculty) =>
  api().post(`/api/v1/subjects/${f.labId}/experiments`).set(who.auth).send(body);

describe('practical subjects (ADR 0012)', () => {
  it('must link a theory subject of the same syllabus version and has no units', async () => {
    const f = await dbmsFixture();
    const base = { syllabusVersionId: String(f.version._id), semester: 5, name: 'Lab' };
    const post = (body) => api().post('/api/v1/subjects').set(f.admin.auth).send(body);
    expect((await post({ ...base, code: 'L1', kind: 'practical' })).status).toBe(400);

    const other = await SyllabusVersion.create({
      university: 'PU',
      regulation: 'R2023',
      branch: `X${Date.now()}`,
      academicYear: '2025-26',
    });
    const cross = await post({
      ...base,
      code: 'L2',
      kind: 'practical',
      theorySubjectId: f.sid,
      syllabusVersionId: String(other._id),
    });
    expect(cross.status).toBe(400);

    const lab = await post({ ...base, code: 'L3', kind: 'practical', theorySubjectId: f.sid });
    expect(lab.status).toBe(201);
    expect(lab.body.data).toMatchObject({ kind: 'practical', theorySubjectId: f.sid });
    // A lab cannot point at another lab, and has no units of its own.
    const chained = await post({
      ...base,
      code: 'L4',
      kind: 'practical',
      theorySubjectId: lab.body.data.id,
    });
    expect(chained.status).toBe(400);
    await api()
      .post(`/api/v1/subjects/${lab.body.data.id}/units`)
      .set(f.admin.auth)
      .send({ number: 1, title: 'Unit' })
      .expect(400);
    // The theory subject cannot be deleted while a lab depends on it.
    await api().delete(`/api/v1/subjects/${f.sid}`).set(f.admin.auth).expect(409);
  });

  it('lab faculty build experiments on the theory roadmap; students see them once published', async () => {
    const f = await labFixture();
    // The lab's faculty does not teach DBMS, yet sees the problems they can link per topic.
    const staffView = await api().get(`/api/v1/subjects/${f.labId}/lab`).set(f.otherFaculty.auth);
    expect(staffView.status).toBe(200);
    expect(staffView.body.data.theorySubject.id).toBe(f.sid);
    // The theory roadmap comes with the lab: lab faculty cannot read the theory subject itself.
    expect(staffView.body.data.roadmap.units.map((u) => u.number)).toEqual([3, 4]);
    expect(staffView.body.data.roadmap.topics).toHaveLength(8);
    await api().get(`/api/v1/subjects/${f.sid}/map`).set(f.otherFaculty.auth).expect(403);
    expect(staffView.body.data.availableChallenges[f.id('keys')]).toHaveLength(2);

    expect(
      (
        await experiment(f, {
          topicId: f.id('keys'),
          title: 'Keys',
          challengeIds: [String(f.normal._id)],
        })
      ).status,
    ).toBe(400); // problem from another topic
    const other = await dbmsFixture();
    expect((await experiment(f, { topicId: other.id('keys'), title: 'Keys' })).status).toBe(400);

    const e1 = await experiment(f, {
      topicId: f.id('keys'),
      title: 'Keys in SQL',
      aim: 'To find keys.',
      challengeIds: [String(f.keysA._id), String(f.keysB._id)],
    });
    expect(e1.status).toBe(201);
    expect(e1.body.data).toMatchObject({ number: 1, status: 'draft' });
    const e2 = await experiment(f, { topicId: f.id('normalization'), title: 'Normalise a table' });
    expect(e2.body.data.number).toBe(2);
    expect((await experiment(f, { topicId: f.id('keys'), title: 'Dup', number: 1 })).status).toBe(
      409,
    );

    // Drafts stay hidden from students; only the lab's faculty publishes (not the HOD).
    let student = await api().get(`/api/v1/subjects/${f.labId}/lab`).set(f.student.auth);
    expect(student.body.data.experiments).toHaveLength(0);
    const publish = (id, who) =>
      api().post(`/api/v1/experiments/${id}/status`).set(who.auth).send({ status: 'published' });
    expect((await publish(e1.body.data.id, f.admin)).status).toBe(403);
    expect((await publish(e1.body.data.id, f.faculty)).status).toBe(403); // theory faculty only
    expect((await publish(e1.body.data.id, f.otherFaculty)).status).toBe(200);
    await publish(e2.body.data.id, f.otherFaculty).expect(200);

    student = await api().get(`/api/v1/subjects/${f.labId}/lab`).set(f.student.auth);
    expect(student.body.data.summary).toEqual({ total: 2, done: 0 });
    expect(student.body.data.availableChallenges).toBeUndefined();
    const [keys] = student.body.data.experiments;
    expect(keys.challenges.map((c) => c.solved)).toEqual([false, false]);
    expect(keys.status).toBeUndefined();
  });

  it('an experiment is done when its problems are solved, or when the student marks it', async () => {
    const f = await labFixture();
    const e1 = await experiment(f, {
      topicId: f.id('keys'),
      title: 'Keys',
      challengeIds: [String(f.keysA._id), String(f.keysB._id)],
    });
    const e2 = await experiment(f, { topicId: f.id('normalization'), title: 'On paper' });
    for (const e of [e1, e2])
      await api()
        .post(`/api/v1/experiments/${e.body.data.id}/status`)
        .set(f.otherFaculty.auth)
        .send({ status: 'published' })
        .expect(200);
    const view = async () =>
      (await api().get(`/api/v1/subjects/${f.labId}/lab`).set(f.student.auth)).body.data;

    const solve = (c) =>
      CodeSubmission.create({
        userId: f.student.id,
        challengeId: c._id,
        topicId: c.topicId,
        subjectId: f.sid,
        code: 'SELECT 1;',
        passed: true,
        verdict: 'accepted',
      });
    await solve(f.keysA);
    expect((await view()).experiments[0].done).toBe(false);
    await solve(f.keysB);
    expect((await view()).experiments[0].done).toBe(true);

    const mark = (done) =>
      api().post(`/api/v1/experiments/${e2.body.data.id}/done`).set(f.student.auth).send({ done });
    await mark(true).expect(200);
    expect((await view()).summary).toEqual({ total: 2, done: 2 });
    await mark(false).expect(200);
    expect((await view()).summary.done).toBe(1);
    await api()
      .post(`/api/v1/experiments/${e2.body.data.id}/done`)
      .set(f.faculty.auth)
      .send({ done: true })
      .expect(403);

    // Labs have no topics, so theory mastery numbers ignore them.
    const progress = await api().get('/api/v1/me/progress').set(f.student.auth);
    expect(progress.body.data.subjects.map((s) => s.subjectId)).not.toContain(f.labId);
  });

  it('students outside the syllabus version cannot open the lab', async () => {
    const f = await labFixture();
    await api().get(`/api/v1/subjects/${f.labId}/lab`).set(f.outsider.auth).expect(403);
    await api().get(`/api/v1/subjects/${f.sid}/lab`).set(f.student.auth).expect(400);
  });
});
