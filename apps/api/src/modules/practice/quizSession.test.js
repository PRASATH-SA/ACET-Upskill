import { afterEach, describe, expect, it } from 'vitest';
import { api } from '../../../test/helpers.js';
import { dbmsFixture, uploadTopicNotes } from '../../../test/fixtures.js';
import { scriptContentModel } from '../../../test/mockModel.js';
import { gateway } from '../../ai/gateway/index.js';
import { AiJob } from '../ai/model.js';
import { queue } from '../ai/queue.js';
import { Flashcard, Question } from '../content/model.js';
import { Attempt, QuizSession, Review, ReviewLog } from './model.js';
import { pickFromPools, shuffle } from './quizSession.js';

afterEach(() => gateway().provider.reset());

const EXPL = ['A is wrong.', 'Correct.', 'C is wrong.', 'D is wrong.'];

/** `concepts` pools with `variants` published MCQs each. The right answer is always "right <c>". */
async function publishPools(f, key, concepts = 3, variants = 2) {
  const base = {
    topicId: f.topics[key]._id,
    subjectId: f.subject._id,
    status: 'published',
    source: 'faculty',
    type: 'mcq',
  };
  const docs = [];
  for (let c = 0; c < concepts; c++) {
    for (let v = 0; v < variants; v++) {
      docs.push({
        ...base,
        conceptKey: `concept-${c}`,
        stem: `Concept ${c}, variant ${v}?`,
        options: [`wrong A${c}`, `right ${c}`, `wrong C${c}`, `wrong D${c}`],
        correctIndex: 1,
        explanation: `Because of rule ${c}.`,
        optionExplanations: EXPL,
      });
    }
  }
  return Question.insertMany(docs);
}

const startQuiz = (f, key, who = f.student) =>
  api()
    .post(`/api/v1/topics/${f.id(key)}/quiz-sessions`)
    .set(who.auth)
    .send({ limit: 10 });

describe('question pools (pure)', () => {
  it('picks one question per pool and prefers variants the student has not seen', () => {
    const qs = [
      { _id: 'a1', conceptKey: 'a' },
      { _id: 'a2', conceptKey: 'a' },
      { _id: 'b1', conceptKey: 'b' },
      { _id: 'solo', conceptKey: null },
    ];
    const picked = pickFromPools(qs, new Set(['a1']), 10);
    expect(picked.map((q) => q._id).sort()).toEqual(['a2', 'b1', 'solo']);
    // When every variant was seen, one is still served.
    expect(pickFromPools(qs, new Set(['a1', 'a2', 'b1', 'solo']), 10)).toHaveLength(3);
    expect(pickFromPools(qs, new Set(), 2)).toHaveLength(2);
  });

  it('shuffle keeps every element', () => {
    expect(shuffle([0, 1, 2, 3]).sort()).toEqual([0, 1, 2, 3]);
  });
});

describe('quiz sessions (feature 1)', () => {
  it('serves one variant per concept with shuffled options and never leaks answers', async () => {
    const f = await dbmsFixture();
    await publishPools(f, 'relational');
    await Question.create({
      topicId: f.topics.relational._id,
      subjectId: f.subject._id,
      type: 'mcq',
      stem: 'draft',
      options: ['a', 'b'],
      correctIndex: 0,
      status: 'draft',
    });
    const res = await startQuiz(f, 'relational');
    expect(res.status).toBe(201);
    const { questions, sessionId } = res.body.data;
    expect(sessionId).toBeTruthy();
    expect(questions).toHaveLength(3); // 3 concepts, not 6 questions, and no draft
    const concepts = questions.map((q) => q.stem.match(/Concept (\d)/)[1]);
    expect(new Set(concepts).size).toBe(3);
    expect(JSON.stringify(res.body)).not.toMatch(/correctIndex|explanation|rule \d|is wrong/);
    for (const q of questions) {
      const c = q.stem.match(/Concept (\d)/)[1];
      expect([...q.options].sort()).toEqual(
        [`right ${c}`, `wrong A${c}`, `wrong C${c}`, `wrong D${c}`].sort(),
      );
    }
    const stored = await QuizSession.findById(sessionId).lean();
    expect(stored.items).toHaveLength(3);
    for (const it of stored.items) expect([...it.optionOrder].sort()).toEqual([0, 1, 2, 3]);
  });

  it('grades on-screen picks against the real answer and explains every option in screen order', async () => {
    const f = await dbmsFixture();
    await publishPools(f, 'relational');
    const { questions, sessionId } = (await startQuiz(f, 'relational')).body.data;
    // Answer the first two right and the last one wrong, by option text.
    const answers = questions.map((q, i) => {
      const c = q.stem.match(/Concept (\d)/)[1];
      const target = i < 2 ? `right ${c}` : `wrong A${c}`;
      return { questionId: q.id, selectedIndex: q.options.indexOf(target) };
    });
    const res = await api()
      .post(`/api/v1/quiz-sessions/${sessionId}/submit`)
      .set(f.student.auth)
      .send({ answers });
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d.score).toBe(67);
    expect(d.correct).toBe(2);
    for (const [i, r] of d.results.entries()) {
      const q = questions[i];
      const c = q.stem.match(/Concept (\d)/)[1];
      expect(q.options[r.correctIndex]).toBe(`right ${c}`);
      expect(r.selectedIndex).toBe(answers[i].selectedIndex);
      // One explanation per option, lined up with what the student saw.
      expect(r.optionExplanations).toHaveLength(4);
      expect(r.optionExplanations[r.correctIndex]).toBe('Correct.');
    }
    expect(d.results[2].whyWrong).toBe('A is wrong.');
    // Attempts store the canonical index (faculty order), plus what was on screen.
    const atts = await Attempt.find({ sessionId }).lean();
    expect(atts).toHaveLength(3);
    expect(atts.filter((a) => a.correct).every((a) => a.selectedIndex === 1)).toBe(true);
    expect(atts.find((a) => !a.correct).selectedIndex).toBe(0);
    // Missed question and topic flashcards join revision, as with the legacy quiz.
    expect(d.enrolled.questions).toBe(1);

    // A session can be submitted once, then reviewed.
    await api()
      .post(`/api/v1/quiz-sessions/${sessionId}/submit`)
      .set(f.student.auth)
      .send({ answers })
      .expect(409);
    const review = (await api().get(`/api/v1/quiz-sessions/${sessionId}`).set(f.student.auth)).body
      .data;
    expect(review.score).toBe(67);
    expect(review.results.map((r) => r.correctIndex)).toEqual(d.results.map((r) => r.correctIndex));
  });

  it('gives the next quiz the variants the student has not seen yet', async () => {
    const f = await dbmsFixture();
    await publishPools(f, 'relational', 2, 2);
    const first = (await startQuiz(f, 'relational')).body.data;
    await api()
      .post(`/api/v1/quiz-sessions/${first.sessionId}/submit`)
      .set(f.student.auth)
      .send({ answers: first.questions.map((q) => ({ questionId: q.id, selectedIndex: 0 })) })
      .expect(200);
    const second = (await startQuiz(f, 'relational')).body.data;
    const firstIds = new Set(first.questions.map((q) => q.id));
    expect(second.questions.some((q) => firstIds.has(q.id))).toBe(false);
  });

  it('keeps option order when shuffling is off, and checks who may submit or read', async () => {
    const f = await dbmsFixture();
    const [q] = await publishPools(f, 'relational', 1, 1);
    await Question.updateOne({ _id: q._id }, { $set: { shuffleOptions: false } });
    const s = (await startQuiz(f, 'relational')).body.data;
    expect(s.questions[0].options).toEqual(q.options);

    const bad = (body) =>
      api().post(`/api/v1/quiz-sessions/${s.sessionId}/submit`).set(f.student.auth).send(body);
    await bad({ answers: [{ questionId: String(f.subject._id), selectedIndex: 0 }] }).expect(400);
    await bad({ answers: [{ questionId: String(q._id), selectedIndex: 5 }] }).expect(400);

    const other = await dbmsFixture();
    await api().get(`/api/v1/quiz-sessions/${s.sessionId}`).set(other.student.auth).expect(404);
    // Staff can preview a quiz but cannot submit one.
    const staff = (await startQuiz(f, 'relational', f.faculty)).body.data;
    await api()
      .post(`/api/v1/quiz-sessions/${staff.sessionId}/submit`)
      .set(f.faculty.auth)
      .send({ answers: [{ questionId: String(q._id), selectedIndex: 1 }] })
      .expect(403);
  });

  it('returns an empty quiz when nothing is published', async () => {
    const f = await dbmsFixture();
    const res = await startQuiz(f, 'keys');
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ sessionId: null, questions: [] });
  });
});

describe('question bank rules (feature 1)', () => {
  it('blocks publishing an MCQ until every option has an explanation', async () => {
    const f = await dbmsFixture();
    const q = await api()
      .post(`/api/v1/topics/${f.id('keys')}/questions`)
      .set(f.faculty.auth)
      .send({
        stem: 'Which key uniquely identifies a row?',
        options: ['Foreign key', 'Primary key'],
        correctIndex: 1,
        explanation: 'A primary key is unique and not null.',
      });
    expect(q.status).toBe(201);
    const publish = () =>
      api()
        .post(`/api/v1/questions/${q.body.data.id}/status`)
        .set(f.faculty.auth)
        .send({ status: 'published' });
    const blocked = await publish();
    expect(blocked.status).toBe(422);
    expect(blocked.body.error.details.failures[0].message).toMatch(/every option/);
    await api()
      .patch(`/api/v1/questions/${q.body.data.id}`)
      .set(f.faculty.auth)
      .send({ optionExplanations: ['References another table.', 'Unique and not null.'] })
      .expect(200);
    await publish().expect(200);
  });

  it('groups questions into concept pools for faculty', async () => {
    const f = await dbmsFixture();
    await publishPools(f, 'relational', 2, 2);
    await Question.create({
      topicId: f.topics.relational._id,
      subjectId: f.subject._id,
      type: 'mcq',
      stem: 'A lone question',
      options: ['a', 'b'],
      correctIndex: 0,
      status: 'published',
    });
    const res = await api()
      .get(`/api/v1/topics/${f.id('relational')}/question-pools`)
      .set(f.faculty.auth);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ concepts: 3, publishedConcepts: 3, singleVariant: 1 });
    await api()
      .get(`/api/v1/topics/${f.id('relational')}/question-pools`)
      .set(f.student.auth)
      .expect(403);
  });

  it('AI variants join the same concept pool as drafts, grounded and self-checked', async () => {
    const f = await dbmsFixture();
    scriptContentModel();
    gateway().provider.on('mcq.variants', (_req, n) => ({
      questions: Array.from({ length: 3 }, (_, i) => ({
        stem: `Variant ${n}-${i}: which normal form removes partial dependency?`,
        options: ['1NF', '2NF', '3NF', 'BCNF'],
        correctIndex: 1,
        explanation: '2NF removes partial dependency.',
        optionExplanations: ['Atomic only.', 'Correct.', 'Transitive.', 'Stricter.'],
        difficulty: 'medium',
      })),
    }));
    const [source] = await publishPools(f, 'normalization', 1, 1);
    await Question.updateOne({ _id: source._id }, { $unset: { conceptKey: 1 } });

    // No material yet: the job ends with needsMaterial and invents nothing.
    let res = await api()
      .post(`/api/v1/ai/questions/${source._id}/variants`)
      .set(f.faculty.auth)
      .send({ count: 2 });
    expect(res.status).toBe(202);
    await queue().drain();
    expect((await AiJob.findById(res.body.data.jobId).lean()).result).toBe('needsMaterial');

    await uploadTopicNotes(f);
    res = await api()
      .post(`/api/v1/ai/questions/${source._id}/variants`)
      .set(f.faculty.auth)
      .send({ count: 2 });
    await queue().drain();
    const job = await AiJob.findById(res.body.data.jobId).lean();
    expect(job.status).toBe('succeeded');
    expect(job.output.questions).toHaveLength(2);
    const variants = await Question.find({ variantOf: source._id }).lean();
    expect(variants).toHaveLength(2);
    for (const v of variants) {
      expect(v).toMatchObject({ status: 'draft', source: 'ai', conceptKey: String(source._id) });
      expect(v.aiMeta.sourceChunkIds.length).toBeGreaterThan(0);
      expect(v.aiMeta.promptVersion).toBe('mcq.variants.v1');
    }
    expect((await Question.findById(source._id).lean()).conceptKey).toBe(String(source._id));
    // Students never see draft variants.
    const quiz = (await startQuiz(f, 'normalization')).body.data;
    expect(quiz.questions.map((q) => q.id)).toEqual([String(source._id)]);
  });
});

describe('flashcards: knew it / didn’t (feature 2)', () => {
  async function cards(f) {
    return Flashcard.insertMany(
      [0, 1].map((i) => ({
        topicId: f.topics.keys._id,
        subjectId: f.subject._id,
        front: `Card ${i}`,
        back: `Back ${i}`,
        status: 'published',
      })),
    );
  }

  it('maps "knew" to good and "didn’t" to again, and tags the source', async () => {
    const f = await dbmsFixture();
    const [a, b] = await cards(f);
    const knew = await api()
      .post(`/api/v1/flashcards/${a._id}/rate`)
      .set(f.student.auth)
      .send({ result: 'knew' });
    expect(knew.status).toBe(200);
    expect(knew.body.data.rating).toBe('good');
    const didnt = await api()
      .post(`/api/v1/flashcards/${b._id}/rate`)
      .set(f.student.auth)
      .send({ result: 'didnt' });
    expect(didnt.body.data.rating).toBe('again');
    // "Didn't" comes back sooner than "knew it".
    expect(new Date(didnt.body.data.nextDue) < new Date(knew.body.data.nextDue)).toBe(true);
    const logs = await ReviewLog.find({ userId: f.student.id }).lean();
    expect(logs.map((l) => l.source)).toEqual(['topicPage', 'topicPage']);

    // Revision accepts the same two-button result.
    const review = await Review.findOne({ userId: f.student.id, itemId: b._id }).lean();
    const rev = await api()
      .post(`/api/v1/revision/${review._id}/rate`)
      .set(f.student.auth)
      .send({ result: 'knew' });
    expect(rev.body.data.rating).toBe('good');
    expect((await ReviewLog.findOne({ reviewId: review._id }).sort({ at: -1 }).lean()).source).toBe(
      'revision',
    );

    for (const body of [{}, { rating: 'good', result: 'knew' }, { result: 'maybe' }]) {
      await api()
        .post(`/api/v1/flashcards/${a._id}/rate`)
        .set(f.student.auth)
        .send(body)
        .expect(400);
    }
  });

  it('the deck lists published cards with the student’s next due date', async () => {
    const f = await dbmsFixture();
    const [a] = await cards(f);
    await Flashcard.create({
      topicId: f.topics.keys._id,
      subjectId: f.subject._id,
      front: 'Draft',
      back: 'x',
    });
    await api()
      .post(`/api/v1/flashcards/${a._id}/rate`)
      .set(f.student.auth)
      .send({ result: 'knew' })
      .expect(200);
    const deck = (
      await api()
        .get(`/api/v1/topics/${f.id('keys')}/flashcards/deck`)
        .set(f.student.auth)
    ).body.data;
    expect(deck.cards.map((c) => c.front)).toEqual(['Card 0', 'Card 1']);
    expect(deck.cards[0].due).toBeTruthy();
    expect(deck.cards[0].reps).toBe(1);
    expect(deck.cards[1].due).toBeNull();
    await api()
      .get(`/api/v1/topics/${f.id('keys')}/flashcards/deck`)
      .set(f.outsider.auth)
      .expect(403);
  });
});
