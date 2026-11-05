import { describe, expect, it } from 'vitest';
import { api, makeUser } from '../../../test/helpers.js';
import { makePdf } from '../../../test/fixtures.js';
import { Department } from '../org/model.js';

const V = '/api/v1';
let deptN = 0;
const makeDept = () => {
  deptN += 1;
  return Department.create({ name: `Forms Dept ${deptN}`, code: `FD${deptN}${Date.now()}` });
};

/** Two sections: a branching question in s1 sends "No" straight to submit, skipping s2. */
function formBody(overrides = {}) {
  return {
    title: 'Lab feedback',
    description: 'Tell us how the lab went.',
    headerColor: 'brand',
    sections: [
      {
        id: 's1',
        title: 'About you',
        next: 'next',
        questions: [
          {
            id: 'attended',
            type: 'multipleChoice',
            title: 'Did you attend the lab?',
            required: true,
            branching: true,
            options: [
              { id: 'y', label: 'Yes', goTo: 'next' },
              { id: 'n', label: 'No', goTo: 'submit' },
            ],
          },
          {
            id: 'capital',
            type: 'shortText',
            title: 'Which normal form removes partial dependencies?',
            points: 2,
            answerKey: ['2NF', 'second normal form'],
          },
        ],
      },
      {
        id: 's2',
        title: 'The lab',
        next: 'next',
        questions: [
          {
            id: 'rating',
            type: 'linearScale',
            title: 'How useful was it?',
            required: true,
            scale: { min: 1, max: 5 },
          },
          {
            id: 'topics',
            type: 'checkboxes',
            title: 'Which topics were clear?',
            options: [
              { id: 'a', label: 'Joins' },
              { id: 'b', label: 'Indexes' },
            ],
            hasOther: true,
          },
        ],
      },
    ],
    settings: { isQuiz: true, releaseScore: 'immediately' },
    audience: {},
    ...overrides,
  };
}

async function setup() {
  const [dept, otherDept] = await Promise.all([makeDept(), makeDept()]);
  const [faculty, otherFaculty, hod, student, classmate, outsider] = await Promise.all([
    makeUser('faculty', { departmentId: dept._id }),
    makeUser('faculty', { departmentId: dept._id }),
    makeUser('admin', { departmentId: dept._id }),
    makeUser('student', { departmentId: dept._id, yearOfStudy: 3, semester: 5, batch: '2023-27' }),
    makeUser('student', { departmentId: dept._id, yearOfStudy: 3, semester: 5, batch: '2023-27' }),
    makeUser('student', { departmentId: otherDept._id, yearOfStudy: 3, semester: 5 }),
  ]);
  return { dept, otherDept, faculty, otherFaculty, hod, student, classmate, outsider };
}

async function publishedForm(t, overrides) {
  const created = await api().post(`${V}/forms`).set(t.faculty.auth).send({}).expect(201);
  const id = created.body.data.id;
  expect(created.body.data.audience.departmentIds).toEqual([String(t.dept._id)]);
  await api()
    .put(`${V}/forms/${id}`)
    .set(t.faculty.auth)
    .send(formBody({ audience: { departmentIds: [String(t.dept._id)] }, ...overrides }))
    .expect(200);
  const pub = await api().post(`${V}/forms/${id}/publish`).set(t.faculty.auth).expect(200);
  return { id, pub };
}

describe('form studio (ADR 0015)', () => {
  it('publishes to the audience, notifies students and hides the answer key', async () => {
    const t = await setup();
    const { id, pub } = await publishedForm(t);
    expect(pub.body.data).toMatchObject({ status: 'published', notified: 2 });

    const bell = await api().get(`${V}/notifications`).set(t.student.auth).expect(200);
    expect(bell.body.data.unread).toBe(1);
    expect(bell.body.data.items[0]).toMatchObject({
      type: 'form.published',
      title: 'New form: Lab feedback',
      link: `/forms/${id}`,
      readAt: null,
    });
    const none = await api().get(`${V}/notifications`).set(t.outsider.auth).expect(200);
    expect(none.body.data.unread).toBe(0);

    // Publishing again does not notify twice.
    const again = await api().post(`${V}/forms/${id}/publish`).set(t.faculty.auth).expect(200);
    expect(again.body.data.notified).toBe(0);

    const view = await api().get(`${V}/forms/${id}/view`).set(t.student.auth).expect(200);
    expect(view.body.data).toMatchObject({ canRespond: true, preview: false, myResponse: null });
    const q = view.body.data.form.sections[0].questions[1];
    expect(q.answerKey).toBeUndefined();
    expect(q.feedbackCorrect).toBeUndefined();

    await api().get(`${V}/forms/${id}/view`).set(t.outsider.auth).expect(403);
    const list = await api().get(`${V}/me/forms`).set(t.student.auth).expect(200);
    expect(list.body.data).toEqual([
      expect.objectContaining({ id, responded: false, open: { open: true, reason: null } }),
    ]);
    expect((await api().get(`${V}/me/forms`).set(t.outsider.auth)).body.data).toEqual([]);

    await api()
      .post(`${V}/notifications/${bell.body.data.items[0].id}/read`)
      .set(t.student.auth)
      .expect(200);
    expect((await api().get(`${V}/notifications`).set(t.student.auth)).body.data.unread).toBe(0);
    // Someone else's notification is not found.
    await api()
      .post(`${V}/notifications/${bell.body.data.items[0].id}/read`)
      .set(t.classmate.auth)
      .expect(404);
  });

  it('checks answers, follows branching, scores quizzes and allows one response', async () => {
    const t = await setup();
    const { id } = await publishedForm(t);

    const bad = await api()
      .post(`${V}/forms/${id}/responses`)
      .set(t.student.auth)
      .send({ answers: { attended: 'Yes' } })
      .expect(400);
    expect(bad.body.error.details.errors).toEqual({ rating: 'This question is required' });

    const ok = await api()
      .post(`${V}/forms/${id}/responses`)
      .set(t.student.auth)
      .send({
        answers: { attended: 'Yes', capital: ' 2nf ', rating: 4, topics: ['Joins', 'ER diagrams'] },
      })
      .expect(201);
    expect(ok.body.data.response).toMatchObject({
      scoreReleased: true,
      score: 2,
      maxScore: 2,
      results: {
        capital: { correct: true, earned: 2, correctAnswers: ['2NF', 'second normal form'] },
      },
    });
    await api()
      .post(`${V}/forms/${id}/responses`)
      .set(t.student.auth)
      .send({ answers: { attended: 'No' } })
      .expect(409);

    // "No" jumps to submit: section 2 answers are dropped, so its required question is not needed.
    const skip = await api()
      .post(`${V}/forms/${id}/responses`)
      .set(t.classmate.auth)
      .send({ answers: { attended: 'No', rating: 5 } })
      .expect(201);
    expect(skip.body.data.response.answers).toEqual({ attended: 'No' });

    // Staff cannot respond; the outsider is not in the audience.
    await api()
      .post(`${V}/forms/${id}/responses`)
      .set(t.faculty.auth)
      .send({ answers: {} })
      .expect(403);
    await api()
      .post(`${V}/forms/${id}/responses`)
      .set(t.outsider.auth)
      .send({ answers: {} })
      .expect(403);

    const res = await api().get(`${V}/forms/${id}/responses`).set(t.faculty.auth).expect(200);
    expect(res.body.data.total).toBe(2);
    expect(res.body.data.summary.attended.counts).toEqual([
      { label: 'Yes', count: 1 },
      { label: 'No', count: 1 },
    ]);
    expect(res.body.data.summary.topics.counts).toContainEqual({
      label: 'Other',
      count: 1,
      other: true,
    });
    expect(res.body.data.summary.rating.average).toBe(4);
    expect(res.body.data.quiz).toMatchObject({ maxScore: 2, average: 1 });
    expect(res.body.data.responses[0].student).toMatchObject({ id: t.student.id });

    const csv = await api().get(`${V}/forms/${id}/export`).set(t.faculty.auth).expect(200);
    expect(csv.headers['content-type']).toContain('text/csv');
    expect(csv.text).toContain('Did you attend the lab?');
    expect(csv.text).toContain('Joins; ER diagrams');

    // Only the form's editors see responses; the HOD of the department may.
    await api().get(`${V}/forms/${id}/responses`).set(t.otherFaculty.auth).expect(403);
    await api().get(`${V}/forms/${id}/responses`).set(t.hod.auth).expect(200);
    await api().get(`${V}/forms/${id}/responses`).set(t.student.auth).expect(403);
  });

  it('closes, edits responses, grades by hand and releases scores later', async () => {
    const t = await setup();
    const body = formBody({
      settings: { isQuiz: true, releaseScore: 'later', allowEdit: true },
    });
    body.sections[1].questions.push({
      id: 'essay',
      type: 'paragraph',
      title: 'Explain BCNF',
      points: 5,
    });
    const { id } = await publishedForm(t, body);
    const answers = {
      attended: 'Yes',
      capital: 'wrong',
      rating: 3,
      essay: 'Every determinant is a key.',
    };
    const first = await api()
      .post(`${V}/forms/${id}/responses`)
      .set(t.student.auth)
      .send({ answers })
      .expect(201);
    expect(first.body.data.response.scoreReleased).toBe(false);
    expect(first.body.data.response.score).toBeUndefined();

    // Allow edit: submitting again replaces the response (200, not 201).
    const edited = await api()
      .post(`${V}/forms/${id}/responses`)
      .set(t.student.auth)
      .send({ answers: { ...answers, capital: '2NF' } })
      .expect(200);
    expect(edited.body.data.edited).toBe(true);

    const all = await api().get(`${V}/forms/${id}/responses`).set(t.faculty.auth).expect(200);
    expect(all.body.data.total).toBe(1);
    const rid = all.body.data.responses[0].id;
    expect(all.body.data.responses[0].results.essay).toMatchObject({ pending: true, earned: 0 });
    const graded = await api()
      .patch(`${V}/forms/${id}/responses/${rid}/grade`)
      .set(t.faculty.auth)
      .send({ grades: { essay: 4 }, feedback: 'Good' })
      .expect(200);
    expect(graded.body.data).toMatchObject({ score: 6, maxScore: 7 });

    const rel = await api().post(`${V}/forms/${id}/release-scores`).set(t.faculty.auth).expect(200);
    expect(rel.body.data.released).toBe(1);
    const bell = await api().get(`${V}/notifications`).set(t.student.auth).expect(200);
    expect(bell.body.data.items.map((n) => n.type)).toContain('form.scoreReleased');
    const view = await api().get(`${V}/forms/${id}/view`).set(t.student.auth).expect(200);
    expect(view.body.data.myResponse).toMatchObject({ score: 6, maxScore: 7, feedback: 'Good' });

    // Stop accepting responses: the classmate can no longer submit.
    const form = (await api().get(`${V}/forms/${id}`).set(t.faculty.auth)).body.data;
    await api()
      .put(`${V}/forms/${id}`)
      .set(t.faculty.auth)
      .send({
        ...body,
        title: form.title,
        settings: { ...form.settings, acceptingResponses: false },
      })
      .expect(200);
    await api()
      .post(`${V}/forms/${id}/responses`)
      .set(t.classmate.auth)
      .send({ answers })
      .expect(403);
    const mine = await api().get(`${V}/me/forms`).set(t.classmate.auth).expect(200);
    expect(mine.body.data[0].open).toEqual({ open: false, reason: 'closed' });
  });

  it('takes file uploads, keeps HODs in their department and lets collaborators edit', async () => {
    const t = await setup();
    const body = formBody({ settings: {} });
    body.sections = [
      {
        id: 's1',
        title: '',
        next: 'next',
        questions: [
          {
            id: 'report',
            type: 'fileUpload',
            title: 'Upload your report',
            required: true,
            fileKinds: ['pdf'],
          },
        ],
      },
    ];
    const { id } = await publishedForm(t, body);
    const missing = await api()
      .post(`${V}/forms/${id}/responses`)
      .set(t.student.auth)
      .field('answers', '{}')
      .expect(400);
    expect(missing.body.error.details.errors).toEqual({ report: 'This question is required' });
    const sent = await api()
      .post(`${V}/forms/${id}/responses`)
      .set(t.student.auth)
      .field('answers', '{}')
      .attach('file:report', await makePdf('report'), {
        filename: 'report.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);
    const file = sent.body.data.response.files[0];
    expect(file).toMatchObject({ questionId: 'report', name: 'report.pdf' });
    expect(file.key).toBeUndefined();
    const rid = sent.body.data.response.id;
    await api()
      .get(`${V}/forms/${id}/responses/${rid}/files/${file.id}`)
      .set(t.faculty.auth)
      .expect(200);
    await api()
      .get(`${V}/forms/${id}/responses/${rid}/files/${file.id}`)
      .set(t.student.auth)
      .expect(200);
    await api()
      .get(`${V}/forms/${id}/responses/${rid}/files/${file.id}`)
      .set(t.classmate.auth)
      .expect(403);

    // HODs cannot target another department.
    const hodForm = await api()
      .post(`${V}/forms`)
      .set(t.hod.auth)
      .send({ title: 'Dept survey' })
      .expect(201);
    await api()
      .put(`${V}/forms/${hodForm.body.data.id}`)
      .set(t.hod.auth)
      .send(formBody({ audience: { departmentIds: [String(t.otherDept._id)] } }))
      .expect(403);

    // A collaborator can edit; removing them takes the access away.
    await api().get(`${V}/forms/${id}`).set(t.otherFaculty.auth).expect(403);
    const otherEmail = t.otherFaculty.email;
    const withCollab = await api()
      .post(`${V}/forms/${id}/collaborators`)
      .set(t.faculty.auth)
      .send({ email: otherEmail })
      .expect(200);
    expect(withCollab.body.data.collaborators).toHaveLength(1);
    await api().get(`${V}/forms/${id}`).set(t.otherFaculty.auth).expect(200);
    await api()
      .post(`${V}/forms/${id}/collaborators`)
      .set(t.faculty.auth)
      .send({ email: t.student.email })
      .expect(400);
    await api()
      .delete(`${V}/forms/${id}/collaborators/${t.otherFaculty.id}`)
      .set(t.faculty.auth)
      .expect(200);
    await api().get(`${V}/forms/${id}`).set(t.otherFaculty.auth).expect(403);

    const copy = await api().post(`${V}/forms/${id}/duplicate`).set(t.faculty.auth).expect(201);
    expect(copy.body.data).toMatchObject({
      title: 'Copy of Lab feedback',
      status: 'draft',
      responseCount: 0,
    });
    await api().delete(`${V}/forms/${id}`).set(t.faculty.auth).expect(200);
    expect((await api().get(`${V}/notifications`).set(t.student.auth)).body.data.items).toEqual([]);
  });

  it('rejects branching to a section that does not exist', async () => {
    const t = await setup();
    const created = await api().post(`${V}/forms`).set(t.faculty.auth).send({}).expect(201);
    const body = formBody();
    body.sections[0].questions[0].options[0].goTo = 'nowhere';
    await api()
      .put(`${V}/forms/${created.body.data.id}`)
      .set(t.faculty.auth)
      .send(body)
      .expect(400);
  });
});
