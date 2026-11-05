import { describe, expect, it } from 'vitest';
import { CONTENT_CSV_COLUMNS } from '@acet/shared';
import { api } from '../../../test/helpers.js';
import { dbmsFixture } from '../../../test/fixtures.js';
import { createBiologySubject } from '../../db/biologySyllabus.js';
import { seedSubjectContent } from '../../db/seedContent.js';
import { Flashcard, Question, Resource } from '../content/model.js';
import { normaliseType, parseUnit, readRows, rowToItem, writeCsv } from './csv.js';

/** A CSV from rows keyed by column name (missing columns are empty). */
const csvOf = (rows) => writeCsv(rows);

const MCQ = {
  type: 'mcq',
  question: 'Which key uniquely identifies a row?',
  option_a: 'Foreign key',
  option_b: 'Primary key',
  option_c: 'Composite attribute',
  correct: 'B',
  explanation: 'A primary key is unique and not null.',
  why_a: 'A foreign key refers to another table.',
  why_b: 'Correct.',
  why_c: 'An attribute is not a key by itself.',
  difficulty: 'easy',
};

const upload = (f, csv, query = {}, who = f.faculty) =>
  api()
    .post(`/api/v1/subjects/${f.sid}/content-import`)
    .query(query)
    .set(who.auth)
    .attach('file', Buffer.from(csv), { filename: 'content.csv', contentType: 'text/csv' });

const download = (f, query = {}, who = f.faculty) =>
  api()
    .get(`/api/v1/subjects/${f.sid}/content.csv`)
    .query(query)
    .set(who.auth)
    .buffer(true)
    .parse((res, cb) => {
      let s = '';
      res.on('data', (c) => (s += c));
      res.on('end', () => cb(null, s));
    });

describe('content CSV format', () => {
  it('round-trips markdown, quotes, newlines and formula-looking text', () => {
    const body = '- point one\n- "quoted", with comma\n=SUM(A1)';
    const rows = readRows(csvOf([{ topic: 'Keys', type: 'easy', body }]));
    expect(rows).toHaveLength(1);
    expect(rows[0].body).toBe(body);
    expect(rows[0]._row).toBe(2);
    expect(Object.keys(rows[0])).toEqual(expect.arrayContaining(CONTENT_CSV_COLUMNS));
  });

  it('reads type spellings and unit numbers teachers are likely to type', () => {
    expect(normaliseType('Ten Mark')).toBe('tenMark');
    expect(normaliseType('real-world')).toBe('realWorld');
    expect(normaliseType('Quiz')).toBe('mcq');
    expect(normaliseType('Curiosity Question')).toBe('curiosity_question');
    expect(normaliseType('poem')).toBeNull();
    expect(parseUnit('III')).toBe(3);
    expect(parseUnit('Unit 4')).toBe(4);
    expect(parseUnit('')).toBeNull();
    expect(parseUnit('three')).toBeNaN();
  });

  it('turns an MCQ row into a validated question', () => {
    const item = rowToItem(MCQ, 'mcq');
    expect(item.model).toBe('question');
    expect(item.data).toMatchObject({
      options: ['Foreign key', 'Primary key', 'Composite attribute'],
    });
    expect(item.data.correctIndex).toBe(1);
    expect(item.data.optionExplanations).toHaveLength(3);
    expect(() => rowToItem({ ...MCQ, correct: 'D' }, 'mcq')).toThrow(/correctIndex/);
    expect(() => rowToItem({ ...MCQ, option_b: '' }, 'mcq')).toThrow(/in order/);
    expect(() => rowToItem({ type: 'easy' }, 'easy')).toThrow(/body/);
  });
});

describe('content CSV import / export', () => {
  it('imports one unit separated by topics, as drafts, then updates on re-import', async () => {
    const f = await dbmsFixture();
    const unit3 = String(f.units[3]._id);
    const csv = csvOf([
      { unit: 3, topic: 'Keys', type: 'easy', body: 'A key identifies a row.' },
      {
        unit: 3,
        topic: 'Keys',
        type: 'video',
        title: 'Keys',
        url: 'https://www.youtube.com/watch?v=abcdefghijk',
      },
      {
        unit: 3,
        topic: 'Keys',
        type: 'flashcard',
        front: 'Primary key?',
        back: 'Unique, not null.',
      },
      { unit: 3, topic: 'Keys', ...MCQ },
      {
        unit: 'III',
        topic: 'bcnf',
        type: 'Ten Mark',
        body: '## BCNF\nEvery determinant is a key.',
      },
      { unit: 3, topic: 'Normalization', type: 'mcq' }, // blank template row: skipped
    ]);
    const res = await upload(f, csv, { unitId: unit3 });
    expect(res.status).toBe(200);
    expect(res.body.data.summary).toMatchObject({
      created: 5,
      updated: 0,
      skipped: 1,
      published: 0,
    });
    expect(await Resource.countDocuments({ topicId: f.id('keys'), status: 'draft' })).toBe(2);
    const q = await Question.findOne({ topicId: f.id('keys') }).lean();
    expect(q).toMatchObject({ correctIndex: 1, status: 'draft', source: 'faculty' });

    // Same file again: nothing new. Changed text: updated in place, no duplicate.
    const again = await upload(f, csv, { unitId: unit3 });
    expect(again.body.data.summary).toMatchObject({ created: 0, unchanged: 5 });
    const edited = csv.replace('Unique, not null.', 'Unique and never null.');
    const third = await upload(f, edited, { unitId: unit3 });
    expect(third.body.data.summary).toMatchObject({ created: 0, updated: 1, unchanged: 4 });
    expect(await Flashcard.countDocuments({ topicId: f.id('keys') })).toBe(1);
  });

  it('exports the whole subject in one file that imports back unchanged', async () => {
    const f = await dbmsFixture();
    await upload(
      f,
      csvOf([
        { topic: 'Indexing', type: 'easy', body: 'An index speeds up lookups.' },
        { topic: 'Keys', ...MCQ },
      ]),
    ).expect(200);

    const out = await download(f);
    expect(out.status).toBe(200);
    expect(out.headers['content-type']).toMatch(/text\/csv/);
    expect(out.headers['content-disposition']).toMatch(/CS\d+-content\.csv/);
    const rows = readRows(out.body);
    // Every topic of both units appears, in unit order; items carry their id and status.
    expect([...new Set(rows.map((r) => r.unit))]).toEqual(['3', '4']);
    expect(new Set(rows.map((r) => r.topic)).size).toBe(8);
    const mcq = rows.find((r) => r.type === 'mcq');
    expect(mcq).toMatchObject({ correct: 'B', status: 'draft', option_b: 'Primary key' });
    expect(mcq.id).toMatch(/^[a-f\d]{24}$/);

    const back = await upload(f, out.body);
    expect(back.status).toBe(200);
    expect(back.body.data.summary).toMatchObject({ created: 0, updated: 0, unchanged: 2 });

    // One unit only, and the template adds a blank row per type for each topic.
    const unit4 = readRows(
      (await download(f, { unitId: String(f.units[4]._id), template: true })).body,
    );
    expect(new Set(unit4.map((r) => r.topic))).toEqual(new Set(['Indexing']));
    expect(unit4.map((r) => r.type)).toEqual(
      expect.arrayContaining(['curiosity', 'video', 'tenMark', 'flashcard', 'mcq']),
    );
  });

  it('lists every bad row and saves nothing', async () => {
    const f = await dbmsFixture();
    const res = await upload(
      f,
      csvOf([
        { topic: 'Keys', type: 'easy', body: 'Fine row.' },
        { topic: 'Nowhere', type: 'easy', body: 'x' },
        { topic: 'Keys', type: 'poem', body: 'x' },
        { topic: 'Keys', ...MCQ, correct: 'Z' },
        { topic: 'Indexing', type: 'easy', body: 'x' },
      ]),
      { unitId: String(f.units[3]._id) },
    );
    expect(res.status).toBe(422);
    const rows = res.body.error.details.errors.map((e) => e.row);
    expect(rows).toEqual([3, 4, 5, 6]);
    expect(res.body.error.details.errors[3].message).toMatch(/not in this unit/);
    expect(await Resource.countDocuments({ subjectId: f.sid })).toBe(0);
  });

  it('publishes on import for the subject faculty, and requires full explanations to do so', async () => {
    const f = await dbmsFixture();
    const noWhy = { topic: 'Keys', ...MCQ, why_a: '', why_b: '', why_c: '' };
    const bad = await upload(f, csvOf([noWhy]), { publish: true });
    expect(bad.status).toBe(422);
    expect(bad.body.error.details.errors[0].message).toMatch(/explanation for every option/);

    const res = await upload(
      f,
      csvOf([
        { topic: 'Keys', ...MCQ },
        { topic: 'Keys', type: 'easy', body: 'Keys.' },
      ]),
      { publish: true },
    );
    expect(res.status).toBe(200);
    expect(res.body.data.summary.published).toBe(2);
    expect(await Question.countDocuments({ topicId: f.id('keys'), status: 'published' })).toBe(1);
    // Students see it on the topic page at once.
    const page = await api()
      .get(`/api/v1/topics/${f.id('keys')}/page`)
      .set(f.student.auth);
    expect(page.body.data.easy.body).toBe('Keys.');
  });

  it('round-trips a full subject (Biology: 31 topics of markdown, tables and quizzes) unchanged', async () => {
    const f = await dbmsFixture();
    const { subject } = await createBiologySubject({
      syllabusVersionId: f.version._id,
      facultyIds: [f.faculty.id],
    });
    await seedSubjectContent({ subjectId: subject._id, facultyId: f.faculty.id, pack: 'biology' });
    const bio = { ...f, sid: String(subject._id) };
    const out = await download(bio);
    const rows = readRows(out.body);
    expect(rows).toHaveLength(31 * (5 + 1 + 5 + 5)); // 5 lessons, 1 curiosity question, 5 cards, 5 MCQs
    const back = await upload(bio, out.body);
    expect(back.status).toBe(200);
    expect(back.body.data.summary).toMatchObject({
      created: 0,
      updated: 0,
      unchanged: rows.length,
    });
  });

  it('is limited to staff who can edit the subject', async () => {
    const f = await dbmsFixture();
    const csv = csvOf([{ topic: 'Keys', type: 'easy', body: 'x' }]);
    await download(f, {}, f.student).expect(403);
    await download(f, {}, f.otherFaculty).expect(403);
    await upload(f, csv, {}, f.otherFaculty).expect(403);
    // The HOD can import drafts but not publish: only the subject's faculty publishes.
    await upload(f, csv, {}, f.admin).expect(200);
    await upload(f, csv, { publish: true }, f.admin).expect(403);
  });
});
