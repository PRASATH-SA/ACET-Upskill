import { describe, expect, it } from 'vitest';
import { api } from '../../../test/helpers.js';
import { dbmsFixture } from '../../../test/fixtures.js';
import { seedDbmsContent } from '../../db/seedContent.js';
import { CodeChallenge, CodeSubmission } from './model.js';
import { compareResults, normalizeRows } from './service.js';

const res = (columns, rows) => ({ columns, rows, rowCount: rows.length });

describe('code lab grading (pure)', () => {
  it('compares values, not column names, and ignores row order unless asked', () => {
    const a = res(
      ['phone', 'n'],
      [
        ['1', 2],
        ['3', 2],
      ],
    );
    expect(
      compareResults(
        a,
        res(
          ['p', 'count'],
          [
            ['3', 2],
            ['1', 2],
          ],
        ),
        false,
      ).equal,
    ).toBe(true);
    expect(
      compareResults(
        a,
        res(
          ['p', 'count'],
          [
            ['3', 2],
            ['1', 2],
          ],
        ),
        true,
      ).equal,
    ).toBe(false);
    expect(compareResults(a, res(['p'], [['1'], ['3']]), false).reason).toMatch(/column/);
    expect(compareResults(a, res(['p', 'n'], [['1', 2]]), false).reason).toMatch(/row/);
  });

  it('rounds floating point noise', () => {
    expect(normalizeRows([[0.1 + 0.2]], true)).toEqual([[0.3]]);
  });
});

describe('code lab API', () => {
  async function setup() {
    const f = await dbmsFixture();
    await seedDbmsContent({ subjectId: f.subject._id, facultyId: f.faculty.id });
    const list = await api()
      .get(`/api/v1/topics/${f.id('keys')}/code-lab`)
      .set(f.student.auth);
    expect(list.status).toBe(200);
    const phone = list.body.data.find((c) => c.title === 'Can phone be a key?');
    return { f, phone, list: list.body.data };
  }
  const run = (f, id, code, who = f.student) =>
    api().post(`/api/v1/code-lab/${id}/run`).set(who.auth).send({ code });
  const submit = (f, id, code, who = f.student) =>
    api().post(`/api/v1/code-lab/${id}/submit`).set(who.auth).send({ code });

  it('seeds a full topic: video, notes, flashcards, MCQs and problems', async () => {
    const { f, list } = await setup();
    expect(list).toHaveLength(2);
    const page = (
      await api()
        .get(`/api/v1/topics/${f.id('keys')}/page`)
        .set(f.student.auth)
    ).body.data;
    expect(page.video.url).toMatch(/^https:\/\/www\.youtube\.com\/watch\?v=/);
    for (const k of ['curiosity', 'easy', 'tenMark', 'realWorld']) expect(page[k]).toBeDefined();
    expect(page).toMatchObject({ flashcardCount: 5, questionCount: 5, codeChallengeCount: 2 });
    // Idempotent: a second run adds nothing.
    const again = await seedDbmsContent({ subjectId: f.subject._id, facultyId: f.faculty.id });
    expect(Object.values(again).every((n) => n === 0)).toBe(true);
  });

  it('shows the problem and its tables but never the solution, hidden rows or check query', async () => {
    const { f, phone } = await setup();
    const c = (await api().get(`/api/v1/code-lab/${phone.id}`).set(f.student.auth)).body.data;
    expect(c.prompt).toMatch(/phone/);
    expect(c.tables[0]).toMatchObject({ name: 'applicants', rowCount: 6 });
    expect(c.tables[0].columns.map((x) => x.name)).toEqual(['app_no', 'name', 'phone', 'city']);
    const raw = JSON.stringify(c);
    const solution =
      'SELECT phone, count(*) AS n FROM applicants GROUP BY phone HAVING count(*) > 1;';
    for (const secret of ['solution', 'hiddenSql', 'checkSql', 'Farhan', solution])
      expect(raw).not.toContain(secret);
    // Authoring routes stay staff-only.
    expect(
      (
        await api()
          .get(`/api/v1/topics/${f.id('keys')}/code-challenges`)
          .set(f.student.auth)
      ).status,
    ).toBe(403);
  });

  it('runs a query on the sample data and reports SQL errors', async () => {
    const { f, phone } = await setup();
    const ok = (await run(f, phone.id, 'SELECT name FROM applicants ORDER BY app_no LIMIT 2')).body
      .data;
    expect(ok).toMatchObject({ ok: true, columns: ['name'], rows: [['Arun'], ['Anitha']] });
    const bad = (await run(f, phone.id, 'SELEC * FROM applicants')).body.data;
    expect(bad).toMatchObject({ ok: false, stage: 'code' });
    expect(bad.error).toMatch(/syntax error/);
    expect((await run(f, phone.id, '   ')).status).toBe(400);
  });

  it('grades: wrong answer, hard-coded answer, then accepted, and records progress', async () => {
    const { f, phone } = await setup();
    const wrong = (
      await submit(f, phone.id, 'SELECT phone, count(*) FROM applicants GROUP BY phone')
    ).body.data;
    expect(wrong).toMatchObject({ passed: false, verdict: 'wrongAnswer' });
    expect(wrong.cases[0].expected.rows).toHaveLength(2);

    const hardCoded = (
      await submit(f, phone.id, "SELECT '9840011111', 2 UNION ALL SELECT '9840033333', 2")
    ).body.data;
    expect(hardCoded).toMatchObject({ passed: false, verdict: 'hiddenTests' });
    expect(JSON.stringify(hardCoded)).not.toContain('Farhan');

    const good = (
      await submit(
        f,
        phone.id,
        'select phone as p, COUNT(*) from applicants group by phone having count(*) >= 2',
      )
    ).body.data;
    expect(good).toMatchObject({ passed: true, verdict: 'accepted', firstSolve: true });
    expect(
      (
        await submit(
          f,
          phone.id,
          'SELECT phone, count(*) FROM applicants GROUP BY phone HAVING count(*) > 1',
        )
      ).body.data.firstSolve,
    ).toBe(false);

    expect(await CodeSubmission.countDocuments({ userId: f.student.id })).toBe(4);
    const list = (
      await api()
        .get(`/api/v1/topics/${f.id('keys')}/code-lab`)
        .set(f.student.auth)
    ).body.data;
    expect(list.find((c) => c.id === phone.id)).toMatchObject({ solved: true, attempts: 4 });
    const subject = (await api().get(`/api/v1/subjects/${f.sid}/code-lab`).set(f.student.auth)).body
      .data;
    expect(subject).toMatchObject({ total: 16, solved: 1 });
    expect(subject.topics[0].topicTitle).toBe('Relational Model');
  });

  it('explains a hidden-test failure caused only by a missing ORDER BY', async () => {
    const { f } = await setup();
    const list = (
      await api()
        .get(`/api/v1/topics/${f.id('relational')}/code-lab`)
        .set(f.student.auth)
    ).body.data;
    const finals = list.find((c) => c.title === 'Final-year students');
    const r = (await submit(f, finals.id, 'SELECT reg_no, name FROM students WHERE year = 4')).body
      .data;
    expect(r).toMatchObject({ passed: false, verdict: 'hiddenTests' });
    expect(r.cases[1].reason).toMatch(/ORDER BY/);
  });

  it('grades schema tasks with the hidden check query (create an index)', async () => {
    const { f } = await setup();
    const list = (
      await api()
        .get(`/api/v1/topics/${f.id('indexing')}/code-lab`)
        .set(f.student.auth)
    ).body.data;
    const idx = list.find((c) => c.title === 'Index the register number');
    expect((await submit(f, idx.id, 'CREATE INDEX i ON marks (mark)')).body.data.passed).toBe(
      false,
    );
    expect(
      (await submit(f, idx.id, 'create index anything on marks(reg_no);')).body.data.passed,
    ).toBe(true);
  });

  it('stops an endless query and stays usable', async () => {
    const { f, phone } = await setup();
    const loop = (
      await submit(
        f,
        phone.id,
        'WITH RECURSIVE c(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM c) SELECT count(*), 1 FROM c',
      )
    ).body.data;
    expect(loop).toMatchObject({ passed: false, verdict: 'timeout' });
    expect((await run(f, phone.id, 'SELECT 1')).body.data.ok).toBe(true);
  }, 15_000);

  it('drafts are invisible to students; faculty preview them; broken solutions are refused', async () => {
    const { f, phone } = await setup();
    await CodeChallenge.updateOne({ _id: phone.id }, { status: 'draft' });
    expect((await api().get(`/api/v1/code-lab/${phone.id}`).set(f.student.auth)).status).toBe(404);
    expect((await run(f, phone.id, 'SELECT 1')).status).toBe(404);
    const preview = await api().get(`/api/v1/code-lab/${phone.id}`).set(f.faculty.auth);
    expect(preview.body.data).toMatchObject({ preview: true, status: 'draft' });
    expect((await submit(f, phone.id, 'SELECT 1', f.faculty)).body.data.preview).toBe(true);
    expect(await CodeSubmission.countDocuments({ userId: f.faculty.id })).toBe(0);

    const base = {
      title: 'Count students',
      prompt: 'Count the rows of students.',
      setupSql: 'CREATE TABLE students (id INTEGER); INSERT INTO students VALUES (1);',
    };
    const create = (body) =>
      api()
        .post(`/api/v1/topics/${f.id('keys')}/code-challenges`)
        .set(f.faculty.auth)
        .send(body);
    const broken = await create({ ...base, solution: 'SELECT count(*) FROM studnts' });
    expect(broken.status).toBe(400);
    expect(broken.body.error.message).toMatch(/no such table/);
    const created = await create({ ...base, solution: 'SELECT count(*) FROM students' });
    expect(created.status).toBe(201);
    expect(created.body.data.status).toBe('draft');
    const queue = await api().get('/api/v1/review-queue?kind=challenge').set(f.faculty.auth);
    expect(queue.body.data.map((i) => i.preview)).toContain('Count students');
    expect(
      (
        await api()
          .post(`/api/v1/code-challenges/${created.body.data._id ?? created.body.data.id}/status`)
          .set(f.faculty.auth)
          .send({ status: 'published' })
      ).status,
    ).toBe(200);
  });

  it("other students and outsiders cannot reach another version's problems", async () => {
    const { f, phone } = await setup();
    expect((await api().get(`/api/v1/code-lab/${phone.id}`).set(f.outsider.auth)).status).toBe(403);
  });
});
