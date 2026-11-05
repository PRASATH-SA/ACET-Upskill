import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';
import { api } from '../../test/helpers.js';
import { CodeChallenge } from '../modules/codelab/model.js';
import { Flashcard, Question, Resource } from '../modules/content/model.js';
import { Topic, TopicLink } from '../modules/syllabus/model.js';
import { User } from '../modules/users/model.js';
import { SEED_PASSWORD, seed } from './seed.js';

describe('seed (A.9)', () => {
  it('creates the users, DBMS subject and demo content, and the student flow works', async () => {
    await mongoose.connection.dropDatabase();
    await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
    const r = await seed();

    const roles = await User.aggregate([{ $group: { _id: '$role', n: { $sum: 1 } } }]);
    expect(Object.fromEntries(roles.map((x) => [x._id, x.n]))).toEqual({
      coordinator: 1,
      admin: 1,
      faculty: 2,
      mentor: 1,
      student: 10,
    });
    expect(await Topic.countDocuments({ subjectId: r.subject._id })).toBe(8);
    expect(await TopicLink.countDocuments({ subjectId: r.subject._id })).toBe(8);
    // Every topic has published content: 5 flashcards, 5 MCQs, a video, and code-lab problems.
    const pub = (subjectId, extra = {}) => ({ subjectId, status: 'published', ...extra });
    expect(await Flashcard.countDocuments(pub(r.subject._id))).toBe(40);
    expect(await Question.countDocuments(pub(r.subject._id, { type: 'mcq' }))).toBe(40);
    expect(await CodeChallenge.countDocuments(pub(r.subject._id, { language: 'sql' }))).toBe(16);
    expect(await Resource.countDocuments(pub(r.subject._id, { kind: 'video' }))).toBe(8);
    // PSPP: Units 1 and 2, 14 topics, Python problems.
    expect(await Topic.countDocuments({ subjectId: r.pspp._id })).toBe(14);
    expect(await Flashcard.countDocuments(pub(r.pspp._id))).toBe(70);
    expect(await Question.countDocuments(pub(r.pspp._id, { type: 'mcq' }))).toBe(70);
    expect(await Resource.countDocuments(pub(r.pspp._id, { kind: 'video' }))).toBe(14);
    expect(await CodeChallenge.countDocuments(pub(r.pspp._id, { language: 'python' }))).toBe(25);
    // Biology: Semester 1, Units I–V, 31 topics, a video and full notes on every topic.
    expect(r.biology.semester).toBe(1);
    expect(await Topic.countDocuments({ subjectId: r.biology._id })).toBe(31);
    for (const kind of ['video', 'curiosity', 'easy', 'tenMark', 'realWorld'])
      expect(await Resource.countDocuments(pub(r.biology._id, { kind }))).toBe(31);
    expect(await Flashcard.countDocuments(pub(r.biology._id))).toBe(155);
    expect(await Question.countDocuments(pub(r.biology._id, { type: 'mcq' }))).toBe(155);
    expect(await Question.countDocuments(pub(r.biology._id, { type: 'curiosity' }))).toBe(31);

    const login = await api()
      .post('/api/v1/auth/login')
      .send({ email: 'student01@acet.test', password: SEED_PASSWORD });
    expect(login.status).toBe(200);
    const auth = { Authorization: `Bearer ${login.body.data.accessToken}` };
    const subjects = await api().get('/api/v1/subjects').set(auth);
    expect(subjects.body.data.map((s) => `${s.kind} ${s.name}`)).toEqual([
      'theory Biology for Computer Engineers',
      'theory Problem Solving and Python Programming',
      'practical Python Programming Lab',
      'practical Database Management Systems Lab',
      'theory Database Management Systems',
    ]);
    // Labs (ADR 0012): one published experiment per theory topic that has code-lab problems.
    for (const lab of r.labs) {
      const withProblems = await CodeChallenge.distinct('topicId', pub(lab.theorySubjectId));
      const res = await api().get(`/api/v1/subjects/${lab._id}/lab`).set(auth);
      expect(res.status).toBe(200);
      expect(res.body.data.experiments).toHaveLength(withProblems.length);
      expect(res.body.data.summary).toEqual({ total: withProblems.length, done: 0 });
    }
    const order = await api().get(`/api/v1/subjects/${r.subject._id}/learning-order`).set(auth);
    expect(order.body.data.map((x) => x.title)).toEqual([
      'Relational Model',
      'Keys',
      'Functional Dependency',
      'Data Anomalies',
      'Normalization',
      '1NF/2NF/3NF',
      'BCNF',
      'Indexing',
    ]);
    const normalization = order.body.data.find((x) => x.title === 'Normalization').topicId;
    const page = await api().get(`/api/v1/topics/${normalization}/page`).set(auth);
    expect(Object.keys(page.body.data)).toEqual(
      expect.arrayContaining(['curiosity', 'easy', 'tenMark', 'realWorld', 'pyqs', 'workshops']),
    );
    const quiz = await api().get(`/api/v1/topics/${normalization}/quiz`).set(auth);
    expect(quiz.body.data.questions).toHaveLength(5);
  });
});
