import { afterEach, describe, expect, it } from 'vitest';
import { api } from '../../../test/helpers.js';
import { dbmsFixture } from '../../../test/fixtures.js';
import { createSpeech, MockSpeechProvider } from '../../ai/gateway/speech.js';
import { gateway, setSpeech } from '../../ai/gateway/index.js';
import { queue } from '../ai/queue.js';
import { User } from '../users/model.js';
import { Explanation } from './model.js';
import { quoteFound, scoreAnswer } from './scoring.js';

afterEach(() => {
  gateway().provider.reset();
  setSpeech(undefined);
});

const RUBRIC = {
  prompt: 'Explain normalization to a friend who missed class.',
  criteria: [
    { id: 'why', text: 'Says why we normalize', points: 2, keyIdeas: ['redundancy', 'anomalies'] },
    { id: 'how', text: 'Says how tables are split', points: 3, keyIdeas: ['decomposition'] },
  ],
  passScore: 3,
};

const ANSWER =
  'Normalization removes redundancy so the same fact is not stored twice, which stops update anomalies. ' +
  'We do it by splitting one big table into smaller tables linked by keys, without losing any data.';

describe('explain-it-back scoring (pure)', () => {
  const out = (perCriterion) => ({ perCriterion, feedback: 'Good start, add more detail.' });
  const calm = { random: () => 1 };

  it('finds quotes ignoring case, punctuation and spacing', () => {
    expect(quoteFound('Removes  REDUNDANCY!', ANSWER)).toBe(true);
    expect(quoteFound('uses foreign keys everywhere', ANSWER)).toBe(false);
    expect(quoteFound('', ANSWER)).toBe(false);
  });

  it('scores a clean answer without flagging it', () => {
    const r = scoreAnswer(
      RUBRIC,
      ANSWER,
      out([
        { criterionId: 'why', score: 2, evidence: 'removes redundancy', missing: '' },
        {
          criterionId: 'how',
          score: 3,
          evidence: 'splitting one big table into smaller tables',
          missing: '',
        },
      ]),
      calm,
    );
    expect(r).toMatchObject({ total: 5, passed: true, reasons: [] });
  });

  it('clamps scores and removes credit whose quote is not in the answer', () => {
    const r = scoreAnswer(
      RUBRIC,
      ANSWER,
      out([
        { criterionId: 'why', score: 9, evidence: 'removes redundancy', missing: '' },
        { criterionId: 'how', score: 3, evidence: 'uses BCNF on every relation', missing: '' },
      ]),
      calm,
    );
    expect(r.perCriterion).toEqual([
      expect.objectContaining({ criterionId: 'why', score: 2 }),
      expect.objectContaining({ criterionId: 'how', score: 0, evidence: '' }),
    ]);
    expect(r.total).toBe(2);
    expect(r.reasons).toContain('AI credit without a quote was removed');
  });

  it('flags skipped criteria, retries, short answers and random samples', () => {
    const r = scoreAnswer(
      RUBRIC,
      'It splits tables.',
      out([{ criterionId: 'how', score: 1, evidence: 'splits tables', missing: '' }]),
      { attempts: 2, spotRate: 0.5, random: () => 0 },
    );
    expect(r.perCriterion[0]).toMatchObject({ criterionId: 'why', score: 0 });
    expect(r.reasons).toEqual(
      expect.arrayContaining([
        'random sample',
        'AI needed a retry',
        'very short answer',
        'AI skipped a criterion',
      ]),
    );
  });
});

describe('explain-it-back API (feature 13)', () => {
  /** A rubric created and published by the owning faculty through the content routes. */
  async function publishRubric(f, key = 'normalization') {
    const created = await api()
      .post(`/api/v1/topics/${f.id(key)}/rubrics`)
      .set(f.faculty.auth)
      .send(RUBRIC);
    expect(created.status).toBe(201);
    const id = created.body.data.id;
    const pub = await api()
      .post(`/api/v1/rubrics/${id}/status`)
      .set(f.faculty.auth)
      .send({ status: 'published' });
    expect(pub.status).toBe(200);
    return id;
  }

  /** The mock scorer quotes the student's answer exactly, giving full marks. */
  function scriptScorer() {
    gateway().provider.on('explain.score', {
      perCriterion: [
        { criterionId: 'why', score: 2, evidence: 'removes redundancy', missing: '' },
        {
          criterionId: 'how',
          score: 3,
          evidence: 'splitting one big table into smaller tables',
          missing: '',
        },
      ],
      feedback: 'Clear and complete explanation.',
    });
  }

  const submit = (f, body, who = f.student, key = 'normalization') =>
    api()
      .post(`/api/v1/topics/${f.id(key)}/explanations`)
      .set(who.auth)
      .send(body);

  it('needs a published rubric, then scores a text answer without sending student data to the model', async () => {
    const f = await dbmsFixture();
    expect((await submit(f, { text: ANSWER })).status).toBe(422);

    await publishRubric(f);
    const home = (
      await api()
        .get(`/api/v1/topics/${f.id('normalization')}/explain`)
        .set(f.student.auth)
    ).body.data;
    expect(home.rubric.prompt).toBe(RUBRIC.prompt);
    // Students never see the scorer's key ideas.
    expect(JSON.stringify(home)).not.toContain('redundancy');
    expect(home.voiceEnabled).toBe(false);

    expect((await submit(f, { text: 'too short' })).status).toBe(400);
    scriptScorer();
    const res = await submit(f, { text: ANSWER });
    expect(res.status).toBe(202);
    await queue().drain();

    const view = (
      await api().get(`/api/v1/explanations/${res.body.data.explanationId}`).set(f.student.auth)
    ).body.data;
    expect(view).toMatchObject({ status: 'scored', score: 5, passed: true, teacherChecked: false });
    expect(view.ai.perCriterion[1].evidence).toBe('splitting one big table into smaller tables');
    expect(view.flagged).toBeUndefined();

    // A.7.9: the model saw the answer but never the student's name, email or id.
    const student = await User.findById(f.student.id).lean();
    const sent = JSON.stringify(gateway().provider.calls.filter((c) => c.task === 'explain.score'));
    expect(sent).toContain('removes redundancy');
    for (const secret of [student.name, student.email, f.student.id])
      expect(sent).not.toContain(secret);
  });

  it('lets only the subject faculty see and spot-check; the teacher score becomes final', async () => {
    const f = await dbmsFixture();
    await publishRubric(f);
    scriptScorer();
    const { explanationId } = (await submit(f, { text: ANSWER })).body.data;
    await queue().drain();

    const peek = (who) => api().get(`/api/v1/explanations/${explanationId}`).set(who.auth);
    expect((await peek(f.otherFaculty)).status).toBe(403);
    expect((await peek(f.outsider)).status).toBe(404);

    const queueRes = await api().get('/api/v1/explanations').set(f.faculty.auth);
    expect(queueRes.body.data.map((e) => e.id)).toContain(explanationId);
    expect(
      (await api().get('/api/v1/explanations').set(f.otherFaculty.auth)).body.data,
    ).toHaveLength(0);

    const check = (body, who = f.faculty) =>
      api().post(`/api/v1/explanations/${explanationId}/spot-check`).set(who.auth).send(body);
    expect((await check({ agree: false })).status).toBe(400);
    expect(
      (await check({ agree: false, perCriterion: [{ criterionId: 'how', score: 9 }] })).status,
    ).toBe(400);
    expect((await check({ agree: true }, f.admin)).status).toBe(403);

    const res = await check({
      agree: false,
      perCriterion: [{ criterionId: 'how', score: 0 }],
      note: 'No split.',
    });
    expect(res.status).toBe(200);
    const view = (await api().get(`/api/v1/explanations/${explanationId}`).set(f.student.auth)).body
      .data;
    expect(view).toMatchObject({
      score: 2,
      passed: false,
      teacherChecked: true,
      teacher: { note: 'No split.' },
    });
  });

  it('limits attempts per day', async () => {
    const f = await dbmsFixture();
    const rubricId = await publishRubric(f);
    await Explanation.insertMany(
      Array.from({ length: 5 }, () => ({
        userId: f.student.id,
        rubricId,
        topicId: f.topics.normalization._id,
        subjectId: f.subject._id,
        mode: 'text',
        text: ANSWER,
        status: 'scored',
      })),
    );
    const res = await submit(f, { text: ANSWER });
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
  });

  it('voice: refused while speech-to-text is off, transcribed locally when on', async () => {
    const f = await dbmsFixture();
    await publishRubric(f);
    // A minimal WAV header is enough for the type sniffing.
    const wav = Buffer.alloc(44);
    wav.write('RIFF', 0);
    wav.writeUInt32LE(36, 4);
    wav.write('WAVEfmt ', 8);
    const voice = () =>
      api()
        .post(`/api/v1/topics/${f.id('normalization')}/explanations`)
        .set(f.student.auth)
        .field('durationSec', '12')
        .attach('audio', wav, { filename: 'answer.wav', contentType: 'audio/wav' });

    expect((await voice()).status).toBe(503);

    const provider = new MockSpeechProvider();
    provider.transcript = ANSWER;
    setSpeech(createSpeech({ provider, model: 'whisper-test', language: 'en', timeoutMs: 5000 }));
    scriptScorer();
    const res = await voice();
    expect(res.status).toBe(202);
    await queue().drain();

    expect(provider.calls).toEqual([{ size: wav.length, mimeType: 'audio/wav' }]);
    const view = (
      await api().get(`/api/v1/explanations/${res.body.data.explanationId}`).set(f.student.auth)
    ).body.data;
    expect(view).toMatchObject({
      mode: 'voice',
      status: 'scored',
      answer: ANSWER,
      hasAudio: true,
      score: 5,
    });
    const link = await api()
      .get(`/api/v1/explanations/${res.body.data.explanationId}/audio-url`)
      .set(f.student.auth);
    expect(link.body.data.url).toMatch(/\/media\//);
  });
});
