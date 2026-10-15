import { describe, expect, it } from 'vitest';
import { api } from '../../../test/helpers.js';
import { dbmsFixture, makePdf } from '../../../test/fixtures.js';
import { AuditLog } from '../audit/model.js';
import { Flashcard, Material, Resource } from './model.js';
import { transitionPath } from './status.js';

const NOTES =
  'Normalization is the process of organising relations to reduce redundancy. ' +
  'It splits large tables into smaller ones and links them with keys, which removes insert, ' +
  'update and delete anomalies. First normal form requires atomic values.';

async function publishedResource(f, kind, body) {
  const r = await api()
    .post(`/api/v1/topics/${f.id('normalization')}/resources`)
    .set(f.faculty.auth)
    .send({ kind, body });
  expect(r.status).toBe(201);
  await api()
    .post(`/api/v1/resources/${r.body.data.id}/status`)
    .set(f.faculty.auth)
    .send({ status: 'published' })
    .expect(200);
  return r.body.data.id;
}

describe('status machine', () => {
  it('computes allowed paths', () => {
    expect(transitionPath('draft', 'inReview')).toEqual(['inReview']);
    expect(transitionPath('draft', 'published')).toEqual(['approved', 'published']);
    expect(transitionPath('published', 'draft')).toEqual(['draft']);
    expect(transitionPath('published', 'approved')).toBeNull();
  });

  it('only the owning faculty can approve or publish; admins and other faculty get 403', async () => {
    const f = await dbmsFixture();
    const r = await api()
      .post(`/api/v1/topics/${f.id('keys')}/resources`)
      .set(f.faculty.auth)
      .send({ kind: 'easy', body: 'Keys identify rows.' });
    const rid = r.body.data.id;
    await api()
      .post(`/api/v1/resources/${rid}/status`)
      .set(f.otherFaculty.auth)
      .send({ status: 'approved' })
      .expect(403);
    await api()
      .post(`/api/v1/resources/${rid}/status`)
      .set(f.admin.auth)
      .send({ status: 'published' })
      .expect(403);
    await api()
      .post(`/api/v1/resources/${rid}/status`)
      .set(f.student.auth)
      .send({ status: 'published' })
      .expect(403);
    const okRes = await api()
      .post(`/api/v1/resources/${rid}/status`)
      .set(f.faculty.auth)
      .send({ status: 'approved' });
    expect(okRes.status).toBe(200);
    const doc = await Resource.findById(rid).lean();
    expect(doc.status).toBe('approved');
    expect(String(doc.approvedBy)).toBe(f.faculty.id);
    expect(doc.approvedAt).toBeInstanceOf(Date);
    expect(await AuditLog.exists({ action: 'content.status', 'target.id': rid })).toBeTruthy();
  });

  it('rejects an invalid transition with 422', async () => {
    const f = await dbmsFixture();
    const rid = await publishedResource(f, 'easy', 'x');
    const res = await api()
      .post(`/api/v1/resources/${rid}/status`)
      .set(f.faculty.auth)
      .send({ status: 'inReview' });
    expect(res.status).toBe(422);
  });
});

describe('topic page', () => {
  it('a draft resource never appears in /topics/:id/page', async () => {
    const f = await dbmsFixture();
    await api()
      .post(`/api/v1/topics/${f.id('normalization')}/resources`)
      .set(f.faculty.auth)
      .send({ kind: 'tenMark', body: 'Draft 10-mark answer' })
      .expect(201);
    const easyId = await publishedResource(
      f,
      'easy',
      'Splitting tables so each fact lives in one place.',
    );

    const page = await api()
      .get(`/api/v1/topics/${f.id('normalization')}/page`)
      .set(f.student.auth);
    expect(page.status).toBe(200);
    expect(page.body.data.easy).toEqual({
      id: easyId,
      body: 'Splitting tables so each fact lives in one place.',
    });
    expect(JSON.stringify(page.body.data)).not.toContain('Draft 10-mark answer');
    // Missing kinds are omitted, not null.
    for (const k of [
      'tenMark',
      'video',
      'realWorld',
      'workshop',
      'curiosity',
      'pyqs',
      'workshops',
    ]) {
      expect(Object.prototype.hasOwnProperty.call(page.body.data, k)).toBe(false);
    }
    expect(page.body.data.prerequisites.map((p) => p.title).sort()).toEqual([
      'Data Anomalies',
      'Functional Dependency',
    ]);
    expect(page.body.data.unlocks.map((p) => p.title)).toEqual(['1NF/2NF/3NF']);
    expect(page.body.data.topic.unit).toMatchObject({ number: 3, title: 'Database Design' });
  });

  it('counts only published flashcards and MCQs, and shows a published curiosity question', async () => {
    const f = await dbmsFixture();
    const t = f.id('keys');
    const fc = await api()
      .post(`/api/v1/topics/${t}/flashcards`)
      .set(f.faculty.auth)
      .send({ front: 'Primary key?', back: 'Chosen candidate key' });
    await api()
      .post(`/api/v1/topics/${t}/flashcards`)
      .set(f.faculty.auth)
      .send({ front: 'Draft card', back: 'x' });
    await api()
      .post(`/api/v1/flashcards/${fc.body.data.id}/status`)
      .set(f.faculty.auth)
      .send({ status: 'published' })
      .expect(200);
    const cq = await api()
      .post(`/api/v1/topics/${t}/questions`)
      .set(f.faculty.auth)
      .send({
        type: 'curiosity',
        stem: 'Two students share a name. How does the college tell them apart?',
        options: ['By name', 'By register number', 'By age'],
        correctIndex: 1,
        explanation: 'A unique register number is a key.',
      });
    expect(cq.status).toBe(201);
    await api()
      .post(`/api/v1/questions/${cq.body.data.id}/status`)
      .set(f.faculty.auth)
      .send({ status: 'published' })
      .expect(200);

    const page = (await api().get(`/api/v1/topics/${t}/page`).set(f.student.auth)).body.data;
    expect(page.flashcardCount).toBe(1);
    expect(page.questionCount).toBe(0);
    expect(page.curiosity.question.options).toHaveLength(3);

    // Students see only published flashcards in the deck, and never the question bank.
    const deck = await api().get(`/api/v1/topics/${t}/flashcards`).set(f.student.auth);
    expect(deck.body.data.map((c) => c.front)).toEqual(['Primary key?']);
    await api().get(`/api/v1/topics/${t}/questions`).set(f.student.auth).expect(403);
  });

  it('students outside the syllabus version and students on draft topics get no page', async () => {
    const f = await dbmsFixture();
    await api()
      .get(`/api/v1/topics/${f.id('keys')}/page`)
      .set(f.outsider.auth)
      .expect(403);
    const d = await dbmsFixture('draft');
    await api()
      .get(`/api/v1/topics/${d.id('keys')}/page`)
      .set(d.student.auth)
      .expect(404);
  });
});

describe('question validation', () => {
  it('rejects a correctIndex outside the options', async () => {
    const f = await dbmsFixture();
    const res = await api()
      .post(`/api/v1/topics/${f.id('keys')}/questions`)
      .set(f.faculty.auth)
      .send({ stem: 'Which is a key?', options: ['a', 'b'], correctIndex: 3 });
    expect(res.status).toBe(400);
  });
});

describe('materials', () => {
  it('extracts text from a text PDF on upload', async () => {
    const f = await dbmsFixture();
    const pdf = await makePdf(NOTES);
    const res = await api()
      .post('/api/v1/materials')
      .set(f.faculty.auth)
      .field('kind', 'notes')
      .field('topicId', f.id('normalization'))
      .attach('file', pdf, { filename: 'normalization.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(201);
    expect(res.body.data.scanned).toBe(false);
    expect(res.body.data.warning).toBeUndefined();
    expect(res.body.data.extractedChars).toBeGreaterThan(100);
    const stored = await Material.findById(res.body.data.id).lean();
    expect(stored.extractedText).toContain('Normalization is the process');
    expect(stored.subjectId.toString()).toBe(f.sid);

    const list = await api()
      .get(`/api/v1/materials?topicId=${f.id('normalization')}`)
      .set(f.faculty.auth);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].extractedText).toBeUndefined();
    const file = await api().get(`/api/v1/materials/${res.body.data.id}/file`).set(f.faculty.auth);
    expect(file.status).toBe(200);
    expect(file.headers['content-type']).toBe('application/pdf');
  });

  it('flags a scanned PDF with a clear warning', async () => {
    const f = await dbmsFixture();
    const pdf = await makePdf();
    const res = await api()
      .post('/api/v1/materials')
      .set(f.faculty.auth)
      .field('kind', 'notes')
      .field('topicId', f.id('normalization'))
      .attach('file', pdf, { filename: 'scan.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(201);
    expect(res.body.data.scanned).toBe(true);
    expect(res.body.data.warning).toMatch(/scanned PDF not supported/i);
  });

  it('sniffs the real file type and rejects disguised files', async () => {
    const f = await dbmsFixture();
    const res = await api()
      .post('/api/v1/materials')
      .set(f.faculty.auth)
      .field('kind', 'notes')
      .field('subjectId', f.sid)
      .attach('file', Buffer.from('#!/bin/sh\necho hi\n'), {
        filename: 'notes.pdf',
        contentType: 'application/pdf',
      });
    expect(res.status).toBe(400);
  });

  it('only owning faculty can upload or list materials', async () => {
    const f = await dbmsFixture();
    const pdf = await makePdf(NOTES);
    await api()
      .post('/api/v1/materials')
      .set(f.otherFaculty.auth)
      .field('kind', 'notes')
      .field('subjectId', f.sid)
      .attach('file', pdf, 'n.pdf')
      .expect(403);
    await api().get(`/api/v1/materials?subjectId=${f.sid}`).set(f.student.auth).expect(403);
  });
});

describe('review queue', () => {
  async function aiCards(f, count, topic = 'normalization') {
    return Flashcard.insertMany(
      Array.from({ length: count }, (_, i) => ({
        topicId: f.topics[topic]._id,
        subjectId: f.subject._id,
        front: `AI card ${i + 1}`,
        back: `Answer ${i + 1}`,
        status: 'draft',
        source: 'ai',
        aiMeta: { model: 'qwen2.5:7b-instruct', promptVersion: 'flashcards.v1' },
      })),
    );
  }

  it('lists drafts across types with filters, scoped to the faculty member', async () => {
    const f = await dbmsFixture();
    await aiCards(f, 3);
    await api()
      .post(`/api/v1/topics/${f.id('keys')}/resources`)
      .set(f.faculty.auth)
      .send({ kind: 'easy', body: 'faculty draft' });

    const all = await api().get('/api/v1/review-queue').set(f.faculty.auth);
    expect(all.status).toBe(200);
    expect(all.body.meta.total).toBe(4);
    const ai = await api()
      .get('/api/v1/review-queue?source=ai&kind=flashcard&limit=2')
      .set(f.faculty.auth);
    expect(ai.body.meta).toEqual({ page: 1, limit: 2, total: 3 });
    expect(ai.body.data[0]).toMatchObject({
      type: 'flashcard',
      kind: 'flashcard',
      source: 'ai',
      status: 'draft',
    });
    const easy = await api().get('/api/v1/review-queue?kind=easy').set(f.faculty.auth);
    expect(easy.body.data.map((x) => x.preview)).toEqual(['faculty draft']);

    const other = await api().get('/api/v1/review-queue').set(f.otherFaculty.auth);
    expect(other.body.meta.total).toBe(0);
    await api().get(`/api/v1/review-queue?subjectId=${f.sid}`).set(f.otherFaculty.auth).expect(403);
  });

  it('bulk-publishes 20 AI flashcards and audits each one', async () => {
    const f = await dbmsFixture();
    const cards = await aiCards(f, 20);
    const res = await api()
      .post('/api/v1/review-queue/bulk')
      .set(f.faculty.auth)
      .send({
        action: 'publish',
        items: cards.map((c) => ({ type: 'flashcard', id: String(c._id) })),
      });
    expect(res.status).toBe(200);
    expect(res.body.data.updated).toBe(20);
    expect(
      await Flashcard.countDocuments({ topicId: f.topics.normalization._id, status: 'published' }),
    ).toBe(20);
    expect(
      await AuditLog.countDocuments({
        action: 'content.status',
        'target.id': { $in: cards.map((c) => String(c._id)) },
      }),
    ).toBe(20);
    const page = await api()
      .get(`/api/v1/topics/${f.id('normalization')}/page`)
      .set(f.student.auth);
    expect(page.body.data.flashcardCount).toBe(20);
  });

  it('bulk is all-or-nothing when any item is not allowed', async () => {
    const f = await dbmsFixture();
    const g = await dbmsFixture();
    const mine = await aiCards(f, 2);
    const theirs = await aiCards(g, 1);
    const res = await api()
      .post('/api/v1/review-queue/bulk')
      .set(f.faculty.auth)
      .send({
        action: 'approve',
        items: [...mine, ...theirs].map((c) => ({ type: 'flashcard', id: String(c._id) })),
      });
    expect(res.status).toBe(403);
    expect(res.body.error.details.failures).toHaveLength(1);
    expect(
      await Flashcard.countDocuments({ _id: { $in: mine.map((c) => c._id) }, status: 'approved' }),
    ).toBe(0);
  });

  it('reject keeps the item as draft with a reason and hides it from the default queue', async () => {
    const f = await dbmsFixture();
    const [card] = await aiCards(f, 1);
    await api()
      .post('/api/v1/review-queue/bulk')
      .set(f.faculty.auth)
      .send({
        action: 'reject',
        reason: 'Wrong definition',
        items: [{ type: 'flashcard', id: String(card._id) }],
      })
      .expect(200);
    const doc = await Flashcard.findById(card._id).lean();
    expect(doc).toMatchObject({ status: 'draft', rejectReason: 'Wrong definition' });
    expect((await api().get('/api/v1/review-queue').set(f.faculty.auth)).body.meta.total).toBe(0);
    expect(
      (await api().get('/api/v1/review-queue?includeRejected=true').set(f.faculty.auth)).body.meta
        .total,
    ).toBe(1);
  });

  it('editing an AI draft records the edit signal and clears a rejection', async () => {
    const f = await dbmsFixture();
    const [card] = await aiCards(f, 1);
    await api()
      .post('/api/v1/review-queue/bulk')
      .set(f.faculty.auth)
      .send({ action: 'reject', items: [{ type: 'flashcard', id: String(card._id) }] });
    await api()
      .patch(`/api/v1/flashcards/${card._id}`)
      .set(f.faculty.auth)
      .send({ back: 'Better answer' })
      .expect(200);
    const doc = await Flashcard.findById(card._id).lean();
    expect(doc.editedAfterAi).toBe(true);
    expect(doc.rejectedAt).toBeUndefined();
  });
});

describe('video resources', () => {
  it('stores an uploaded video and serves it only once published', async () => {
    const f = await dbmsFixture();
    const r = await api()
      .post(`/api/v1/topics/${f.id('keys')}/resources`)
      .set(f.faculty.auth)
      .send({ kind: 'video', title: 'Keys in 5 minutes' });
    expect(r.status).toBe(201);
    // Minimal MP4 header ("ftyp" box) so the type sniffer recognises it.
    const mp4 = Buffer.concat([
      Buffer.from([0, 0, 0, 0x18]),
      Buffer.from('ftypmp42'),
      Buffer.alloc(12),
      Buffer.alloc(64),
    ]);
    const up = await api()
      .post(`/api/v1/resources/${r.body.data.id}/file`)
      .set(f.faculty.auth)
      .attach('file', mp4, 'keys.mp4');
    expect(up.status).toBe(200);
    await api().get(`/api/v1/resources/${r.body.data.id}/file`).set(f.student.auth).expect(404);
    await api()
      .post(`/api/v1/resources/${r.body.data.id}/status`)
      .set(f.faculty.auth)
      .send({ status: 'published' })
      .expect(200);
    const file = await api().get(`/api/v1/resources/${r.body.data.id}/file`).set(f.student.auth);
    expect(file.status).toBe(200);
    expect(file.headers['content-type']).toBe('video/mp4');
    const page = (
      await api()
        .get(`/api/v1/topics/${f.id('keys')}/page`)
        .set(f.student.auth)
    ).body.data;
    expect(page.video.fileUrl).toBe(`/api/v1/resources/${r.body.data.id}/file`);
  });
});
