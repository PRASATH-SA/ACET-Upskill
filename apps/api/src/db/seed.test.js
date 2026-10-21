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
      admin: 1,
      faculty: 2,
      mentor: 1,
      student: 10,
    });
    expect(await Topic.countDocuments({ subjectId: r.subject._id })).toBe(8);
    expect(await TopicLink.countDocuments({ subjectId: r.subject._id })).toBe(8);
    // Every topic has published content: 5 flashcards, 5 MCQs and 2 code-lab problems each.
    expect(await Flashcard.countDocuments({ status: 'published' })).toBe(40);
    expect(await Question.countDocuments({ status: 'published', type: 'mcq' })).toBe(40);
    expect(await CodeChallenge.countDocuments({ status: 'published' })).toBe(16);
    expect(await Resource.countDocuments({ status: 'published', kind: 'video' })).toBe(8);

    const login = await api()
      .post('/api/v1/auth/login')
      .send({ email: 'student01@acet.test', password: SEED_PASSWORD });
    expect(login.status).toBe(200);
    const auth = { Authorization: `Bearer ${login.body.data.accessToken}` };
    const subjects = await api().get('/api/v1/subjects').set(auth);
    expect(subjects.body.data.map((s) => s.name)).toEqual(['Database Management Systems']);
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
