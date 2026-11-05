import { afterEach, describe, expect, it } from 'vitest';
import { api } from '../../test/helpers.js';
import { dbmsFixture, makePdf } from '../../test/fixtures.js';
import { NORMALIZATION_NOTES } from '../../test/fixtures/notes.js';
import { scriptTutorModel } from '../../test/mockModel.js';
import { setEnv, env } from '../config/env.js';
import { Resource } from '../modules/content/model.js';
import { queue } from '../modules/ai/queue.js';
import { TutorQuestion } from '../modules/tutor/model.js';
import { User } from '../modules/users/model.js';
import { gateway } from './gateway/index.js';

/** Collects an SSE response body into [{ event, data }]. */
const sse = (req) =>
  req.buffer(true).parse((res, cb) => {
    let body = '';
    res.on('data', (c) => (body += c));
    res.on('end', () => cb(null, body));
  });
const events = (body) =>
  body
    .split('\n\n')
    .filter((b) => b.includes('data:'))
    .map((b) => ({
      event: b.match(/^event: (.+)$/m)?.[1],
      data: JSON.parse(b.match(/^data: (.+)$/m)[1]),
    }));
const textOf = (evs) =>
  evs
    .filter((e) => e.event === 'token')
    .map((e) => e.data.text)
    .join('');

async function publishedNormalization(f) {
  const base = { topicId: f.topics.normalization._id, subjectId: f.subject._id, source: 'faculty' };
  const [easy, tenMark] = await Resource.create([
    {
      ...base,
      kind: 'easy',
      title: 'In simple words',
      status: 'published',
      body: 'We split large tables into smaller tables so each fact is stored once. This stops update anomalies.',
    },
    {
      ...base,
      kind: 'tenMark',
      status: 'published',
      body: '**Definition.** Normalization organises tables to reduce redundancy.\n\nDecomposition must be lossless so a join rebuilds the table.',
    },
  ]);
  return { easy, tenMark };
}

const ask = (user, topicId, question, history = []) =>
  sse(api().post('/api/v1/ai/tutor/ask').set(user.auth).send({ topicId, question, history }));

afterEach(() => gateway().provider.reset());

describe('tutor (A4)', () => {
  it('streams an answer about the topic content with at least one citation', async () => {
    const f = await dbmsFixture();
    const { easy } = await publishedNormalization(f);
    scriptTutorModel();
    const res = await ask(
      f.student,
      f.id('normalization'),
      'Why do we split tables into smaller tables?',
    );
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/event-stream/);
    const evs = events(res.body);
    expect(evs.filter((e) => e.event === 'token').length).toBeGreaterThan(3); // streamed in pieces
    expect(textOf(evs)).toMatch(/split large tables/);
    expect(textOf(evs)).toMatch(/Check:/);
    const done = evs.at(-1);
    expect(done.event).toBe('done');
    expect(done.data).toMatchObject({ grounded: true, refused: false });
    expect(done.data.citations.length).toBeGreaterThanOrEqual(1);
    expect(done.data.citations[0]).toMatchObject({
      kind: 'resource',
      id: String(easy._id),
      section: 'understand',
    });
  });

  it('refuses an unrelated question (a cricket score) without calling the model', async () => {
    const f = await dbmsFixture();
    await publishedNormalization(f);
    scriptTutorModel();
    const res = await ask(
      f.student,
      f.id('normalization'),
      'What was the cricket score in the IPL final yesterday?',
    );
    const evs = events(res.body);
    expect(textOf(evs)).toMatch(/I can only answer questions about "Normalization"/);
    expect(evs.at(-1).data).toMatchObject({ refused: true, reason: 'offTopic', citations: [] });
    expect(gateway().provider.calls.filter((c) => c.task === 'tutor.answer')).toHaveLength(0);
  });

  it('refuses unsafe questions', async () => {
    const f = await dbmsFixture();
    await publishedNormalization(f);
    const res = await ask(
      f.student,
      f.id('normalization'),
      'How do I get the leaked question paper for the exam?',
    );
    expect(events(res.body).at(-1).data).toMatchObject({ refused: true, reason: 'unsafe' });
  });

  it('never cites or sends unpublished content', async () => {
    const f = await dbmsFixture();
    await publishedNormalization(f);
    const draft = await Resource.create({
      topicId: f.topics.normalization._id,
      subjectId: f.subject._id,
      kind: 'realWorld',
      status: 'draft',
      source: 'ai',
      body: 'SECRET DRAFT: we split tables in banking systems to store each fact once.',
    });
    scriptTutorModel();
    const res = await ask(
      f.student,
      f.id('normalization'),
      'Why do we split tables to store each fact once?',
    );
    const done = events(res.body).at(-1).data;
    expect(done.citations.map((c) => c.id)).not.toContain(String(draft._id));
    const sent = gateway()
      .provider.calls.find((c) => c.task === 'tutor.answer')
      .messages.map((m) => m.content)
      .join('\n');
    expect(sent).not.toContain('SECRET DRAFT');
  });

  it('grounds on faculty notes and prerequisite explanations, and sends no student data', async () => {
    const f = await dbmsFixture();
    await api()
      .post('/api/v1/materials')
      .set(f.faculty.auth)
      .field('kind', 'notes')
      .field('topicId', f.id('normalization'))
      .attach('file', await makePdf(NORMALIZATION_NOTES), {
        filename: 'n.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);
    await queue().drain();
    scriptTutorModel();
    const student = await User.findById(f.student.id).lean();
    const res = await ask(
      f.student,
      f.id('normalization'),
      'Why does third normal form remove transitive dependencies between non-key attributes?',
      [
        { role: 'user', content: 'What is 2NF?' },
        { role: 'assistant', content: 'No partial dependencies.' },
      ],
    );
    const done = events(res.body).at(-1).data;
    expect(done.grounded).toBe(true);
    expect(done.citations.some((c) => c.kind === 'chunk')).toBe(true);
    const call = gateway().provider.calls.find((c) => c.task === 'tutor.answer');
    const sent = call.messages.map((m) => m.content).join('\n');
    expect(sent).not.toContain(student.name);
    expect(sent).not.toContain(student.email);
    expect(call.messages.map((m) => m.role)).toEqual(['system', 'user', 'assistant', 'user']);
  });

  it('logs question, topic, latency and grounded flag without who asked', async () => {
    const f = await dbmsFixture();
    await publishedNormalization(f);
    scriptTutorModel();
    await ask(f.student, f.id('normalization'), 'Why split tables?');
    const row = await TutorQuestion.findOne({ topicId: f.id('normalization') }).lean();
    expect(row).toMatchObject({
      question: 'Why split tables?',
      grounded: true,
      refused: false,
      promptVersion: 'tutor.answer.v1',
    });
    expect(row.latencyMs).toBeGreaterThanOrEqual(0);
    expect(JSON.stringify(row)).not.toContain(f.student.id);
  });

  it('limits each student to the hourly quota and caps question length', async () => {
    const f = await dbmsFixture();
    await publishedNormalization(f);
    const cfg = env();
    setEnv({ ...cfg, TUTOR_RATE_LIMIT_PER_HOUR: 2 });
    try {
      await ask(f.student, f.id('normalization'), 'Why split tables?');
      await ask(f.student, f.id('normalization'), 'Why split tables again?');
      const third = await api()
        .post('/api/v1/ai/tutor/ask')
        .set(f.student.auth)
        .send({ topicId: f.id('normalization'), question: 'One more?' });
      expect(third.status).toBe(429);
      expect(third.body.error).toMatchObject({ code: 'RATE_LIMITED' });
    } finally {
      setEnv(cfg);
    }
    const long = await api()
      .post('/api/v1/ai/tutor/ask')
      .set(f.student.auth)
      .send({
        topicId: f.id('normalization'),
        question: 'x'.repeat(env().TUTOR_MAX_QUESTION_CHARS + 1),
      });
    expect(long.status).toBe(400);
  });

  it('only reaches topics the student may see, and reports the AI offline as an event', async () => {
    const f = await dbmsFixture();
    await publishedNormalization(f);
    await api()
      .post('/api/v1/ai/tutor/ask')
      .set(f.outsider.auth)
      .send({ topicId: f.id('normalization'), question: 'Why?' })
      .expect(403);
    gateway().provider.offline = true;
    const res = await ask(f.student, f.id('normalization'), 'Why split tables?');
    expect(events(res.body).at(-1)).toMatchObject({ event: 'error', data: { code: 'AI_OFFLINE' } });
    gateway().provider.offline = false;
    gateway().breaker.success();
  });

  it('groups common questions for faculty by meaning', async () => {
    const f = await dbmsFixture();
    await publishedNormalization(f);
    scriptTutorModel();
    for (const q of [
      'Why do we split tables?',
      'why do we split the tables',
      'What is a lossless join decomposition?',
    ]) {
      await ask(f.student, f.id('normalization'), q);
    }
    const res = await api()
      .get(`/api/v1/subjects/${f.sid}/tutor/common-questions`)
      .set(f.faculty.auth)
      .expect(200);
    expect(res.body.data.total).toBe(3);
    expect(res.body.data.clusters[0]).toMatchObject({ count: 2, topicTitle: 'Normalization' });
    await api()
      .get(`/api/v1/subjects/${f.sid}/tutor/common-questions`)
      .set(f.student.auth)
      .expect(403);
  });
});
