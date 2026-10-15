import { describe, expect, it } from 'vitest';
import { api } from '../../../test/helpers.js';
import { dbmsFixture } from '../../../test/fixtures.js';
import { Flashcard, Question } from '../content/model.js';
import { Attempt, Mastery, Review } from './model.js';
import { revisionStreak, sweepOverdue } from './service.js';

/** Publishes 5 MCQs (correct answer is always option 1) and 3 flashcards on a topic. */
async function publishedPractice(f, key) {
  const base = {
    topicId: f.topics[key]._id,
    subjectId: f.subject._id,
    status: 'published',
    source: 'faculty',
  };
  const questions = await Question.insertMany(
    Array.from({ length: 5 }, (_, i) => ({
      ...base,
      type: 'mcq',
      stem: `${key} question ${i + 1}?`,
      options: ['wrong A', 'right', 'wrong C', 'wrong D'],
      correctIndex: 1,
      explanation: `Because of rule ${i + 1}.`,
      optionExplanations: [
        'A is wrong because…',
        'Correct.',
        'C is wrong because…',
        'D is wrong because…',
      ],
    })),
  );
  await Question.create({
    ...base,
    type: 'mcq',
    stem: 'draft q',
    options: ['a', 'b'],
    correctIndex: 0,
    status: 'draft',
  });
  const cards = await Flashcard.insertMany(
    Array.from({ length: 3 }, (_, i) => ({
      ...base,
      front: `${key} card ${i}`,
      back: `back ${i}`,
    })),
  );
  return { questions, cards };
}

const answerAll = (questions, correctCount) =>
  questions.map((q, i) => ({ questionId: String(q._id), selectedIndex: i < correctCount ? 1 : 0 }));

describe('quiz', () => {
  it('never sends answers or explanations before submission', async () => {
    const f = await dbmsFixture();
    await publishedPractice(f, 'relational');
    const res = await api()
      .get(`/api/v1/topics/${f.id('relational')}/quiz?limit=10`)
      .set(f.student.auth);
    expect(res.status).toBe(200);
    expect(res.body.data.questions).toHaveLength(5); // the draft question is excluded
    const raw = JSON.stringify(res.body);
    expect(raw).not.toMatch(
      /correctIndex|explanation|optionExplanations|Because of rule|is wrong because/,
    );
    for (const q of res.body.data.questions)
      expect(Object.keys(q).sort()).toEqual(['difficulty', 'id', 'options', 'stem']);
  });

  it('grades, explains, stores attempts, moves learning → practicing, and enrols revision items', async () => {
    const f = await dbmsFixture();
    const { questions } = await publishedPractice(f, 'relational');
    await api()
      .post(`/api/v1/topics/${f.id('relational')}/open`)
      .set(f.student.auth)
      .expect(200);
    expect(
      (await Mastery.findOne({ userId: f.student.id, topicId: f.id('relational') }).lean()).state,
    ).toBe('learning');

    const res = await api()
      .post('/api/v1/quiz/submit')
      .set(f.student.auth)
      .send({ topicId: f.id('relational'), answers: answerAll(questions, 3) });
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d).toMatchObject({ score: 60, correct: 3, total: 5 });
    const wrong = d.results.find((r) => !r.correct);
    expect(wrong).toMatchObject({
      correctIndex: 1,
      selectedIndex: 0,
      whyWrong: 'A is wrong because…',
    });
    expect(wrong.explanation).toMatch(/Because of rule/);
    expect(d.mastery.before.state).toBe('learning');
    expect(d.mastery.after.state).toBe('practicing');
    expect(d.enrolled).toEqual({ flashcards: 3, questions: 2 });
    expect(await Attempt.countDocuments({ userId: f.student.id, quizId: d.quizId })).toBe(5);

    // Re-taking the quiz does not duplicate revision items.
    const again = await api()
      .post('/api/v1/quiz/submit')
      .set(f.student.auth)
      .send({ topicId: f.id('relational'), answers: answerAll(questions, 3) });
    expect(again.body.data.enrolled).toEqual({ flashcards: 0, questions: 0 });
    expect(await Review.countDocuments({ userId: f.student.id })).toBe(5);
  });

  it('rejects answers to questions from another topic or unpublished questions', async () => {
    const f = await dbmsFixture();
    await publishedPractice(f, 'relational');
    const other = await publishedPractice(f, 'keys');
    const res = await api()
      .post('/api/v1/quiz/submit')
      .set(f.student.auth)
      .send({ topicId: f.id('relational'), answers: answerAll(other.questions, 5) });
    expect(res.status).toBe(400);
    const draft = await Question.findOne({ status: 'draft', topicId: f.id('relational') });
    const res2 = await api()
      .post('/api/v1/quiz/submit')
      .set(f.student.auth)
      .send({
        topicId: f.id('relational'),
        answers: [{ questionId: String(draft._id), selectedIndex: 0 }],
      });
    expect(res2.status).toBe(400);
  });

  it('only students submit quizzes', async () => {
    const f = await dbmsFixture();
    const { questions } = await publishedPractice(f, 'relational');
    await api()
      .post('/api/v1/quiz/submit')
      .set(f.faculty.auth)
      .send({ topicId: f.id('relational'), answers: answerAll(questions, 5) })
      .expect(403);
  });
});

describe('revision and mastery', () => {
  it('shows due items grouped by topic, rates them, and reaches confident', async () => {
    const f = await dbmsFixture();
    const { questions } = await publishedPractice(f, 'relational');
    await api()
      .post('/api/v1/quiz/submit')
      .set(f.student.auth)
      .send({ topicId: f.id('relational'), answers: answerAll(questions, 5) })
      .expect(200);

    const today = await api().get('/api/v1/revision/today').set(f.student.auth);
    expect(today.status).toBe(200);
    expect(today.body.data.total).toBe(3);
    expect(today.body.data.groups).toHaveLength(1);
    expect(today.body.data.groups[0]).toMatchObject({ title: 'Relational Model', count: 3 });

    const item = today.body.data.groups[0].items[0];
    const rated = await api()
      .post(`/api/v1/revision/${item.reviewId}/rate`)
      .set(f.student.auth)
      .send({ rating: 'good' });
    expect(rated.status).toBe(200);
    expect(new Date(rated.body.data.nextDue).getTime()).toBeGreaterThan(Date.now());
    // Score 100 + one passed revision → confident.
    expect(rated.body.data.mastery.state).toBe('confident');

    const after = await api().get('/api/v1/revision/today').set(f.student.auth);
    expect(after.body.data.total).toBe(2);
  });

  it('a failed revision moves confident → needsRevision', async () => {
    const f = await dbmsFixture();
    const { questions } = await publishedPractice(f, 'relational');
    await api()
      .post('/api/v1/quiz/submit')
      .set(f.student.auth)
      .send({ topicId: f.id('relational'), answers: answerAll(questions, 5) });
    const [a, b] = (await api().get('/api/v1/revision/today').set(f.student.auth)).body.data
      .groups[0].items;
    await api()
      .post(`/api/v1/revision/${a.reviewId}/rate`)
      .set(f.student.auth)
      .send({ rating: 'easy' });
    const failed = await api()
      .post(`/api/v1/revision/${b.reviewId}/rate`)
      .set(f.student.auth)
      .send({ rating: 'again' });
    expect(failed.body.data.mastery.state).toBe('needsRevision');
  });

  it('a student cannot rate someone else’s revision item', async () => {
    const f = await dbmsFixture();
    const { questions } = await publishedPractice(f, 'relational');
    await api()
      .post('/api/v1/quiz/submit')
      .set(f.student.auth)
      .send({ topicId: f.id('relational'), answers: answerAll(questions, 5) });
    const review = await Review.findOne({ userId: f.student.id });
    const intruder = await (
      await import('../../../test/helpers.js')
    ).makeUser('student', { syllabusVersionId: f.version._id });
    await api()
      .post(`/api/v1/revision/${review._id}/rate`)
      .set(intruder.auth)
      .send({ rating: 'easy' })
      .expect(404);
  });

  it('the overdue sweep flags confident topics overdue by more than 3 days', async () => {
    const f = await dbmsFixture();
    await Mastery.create({
      userId: f.student.id,
      topicId: f.topics.keys._id,
      subjectId: f.subject._id,
      state: 'confident',
      score: 90,
      revisionsPassed: 2,
    });
    await Review.create({
      userId: f.student.id,
      itemType: 'flashcard',
      itemId: f.topics.keys._id,
      topicId: f.topics.keys._id,
      subjectId: f.subject._id,
      due: new Date(Date.now() - 4 * 24 * 3600 * 1000),
    });
    expect(await sweepOverdue({ userId: f.student.id })).toBe(1);
    expect(
      (await Mastery.findOne({ userId: f.student.id, topicId: f.topics.keys._id })).state,
    ).toBe('needsRevision');
  });
});

describe('student map state', () => {
  it('starts at Relational Model and advances as prerequisites reach practicing', async () => {
    const f = await dbmsFixture();
    const first = await api().get(`/api/v1/subjects/${f.sid}/map/me`).set(f.student.auth);
    expect(first.status).toBe(200);
    const state = (res) => Object.fromEntries(res.body.data.nodes.map((n) => [n.topicId, n.state]));
    let s = state(first);
    expect(first.body.data.currentTopicId).toBe(f.id('relational'));
    expect(s[f.id('keys')]).toBe('locked');
    expect(s[f.id('normalization')]).toBe('locked');

    const { questions } = await publishedPractice(f, 'relational');
    await api()
      .post('/api/v1/quiz/submit')
      .set(f.student.auth)
      .send({ topicId: f.id('relational'), answers: answerAll(questions, 2) });
    const second = await api().get(`/api/v1/subjects/${f.sid}/map/me`).set(f.student.auth);
    s = state(second);
    // Relational Model is practicing (not confident) so it stays current; Keys and Anomalies unlock.
    expect(second.body.data.currentTopicId).toBe(f.id('relational'));
    expect(s[f.id('keys')]).toBe('unlocked');
    expect(s[f.id('anomalies')]).toBe('unlocked');
    expect(s[f.id('fd')]).toBe('locked');
  });

  it('a mentor can view an assigned student’s map; other mentors cannot', async () => {
    const f = await dbmsFixture();
    const { makeUser } = await import('../../../test/helpers.js');
    const mentor = await makeUser('mentor');
    const otherMentor = await makeUser('mentor');
    const { User } = await import('../users/model.js');
    await User.updateOne({ _id: f.student.id }, { $set: { mentorId: mentor.id } });
    await api()
      .get(`/api/v1/subjects/${f.sid}/map/students/${f.student.id}`)
      .set(mentor.auth)
      .expect(200);
    await api()
      .get(`/api/v1/subjects/${f.sid}/map/students/${f.student.id}`)
      .set(otherMentor.auth)
      .expect(403);
    await api().get(`/api/v1/students/${f.student.id}/progress`).set(mentor.auth).expect(200);
  });
});

describe('progress', () => {
  it('reports per-subject counts and weakest topics', async () => {
    const f = await dbmsFixture();
    const { questions } = await publishedPractice(f, 'relational');
    await api()
      .post('/api/v1/quiz/submit')
      .set(f.student.auth)
      .send({ topicId: f.id('relational'), answers: answerAll(questions, 1) });
    const res = await api().get('/api/v1/me/progress').set(f.student.auth);
    expect(res.status).toBe(200);
    const subj = res.body.data.subjects.find((x) => x.subjectId === f.sid);
    expect(subj.totalTopics).toBe(8);
    expect(subj.counts).toMatchObject({ practicing: 1, notStarted: 7 });
    expect(res.body.data.weakestTopics[0]).toMatchObject({ title: 'Relational Model', score: 20 });
    expect(res.body.data.revision.dueNow).toBe(7);
  });

  it('computes a revision streak ending today or yesterday', () => {
    const now = new Date('2026-03-10T08:00:00Z');
    expect(revisionStreak(['2026-03-10', '2026-03-09', '2026-03-08', '2026-03-05'], now)).toBe(3);
    expect(revisionStreak(['2026-03-09', '2026-03-08'], now)).toBe(2);
    expect(revisionStreak(['2026-03-07'], now)).toBe(0);
  });
});
