import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { api } from '../../../test/helpers.js';
import { dbmsFixture, makePdf } from '../../../test/fixtures.js';
import { Flashcard, Question, Resource } from '../../modules/content/model.js';
import { Pyq } from '../../modules/exam/model.js';
import { AiJob } from '../../modules/ai/model.js';
import { queue } from '../../modules/ai/queue.js';
import { findCycle } from '../../modules/syllabus/graph.js';
import { Subject, Topic, TopicLink, Unit } from '../../modules/syllabus/model.js';
import { gateway } from '../gateway/index.js';
import { NORMALIZATION_NOTES } from '../../../test/fixtures/notes.js';
import { scriptContentModel, scriptMapModel } from '../../../test/mockModel.js';
import { splitUnits } from '../syllabusText.js';
import { breakCycles, mergeTopics } from './draftMap.js';
import { normalizeTitle } from './helpers.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.resolve(here, '../../../test/fixtures/ai');
const SYLLABUS = readFileSync(path.join(fixtures, 'dbms-syllabus.txt'), 'utf8');

const mock = () => gateway().provider;
const userText = (req) => req.messages.at(-1).content;
const between = (text, start, end) => text.split(start)[1]?.split(end)[0] ?? '';

async function emptySubject(f) {
  const s = await Subject.create({
    syllabusVersionId: f.version._id,
    semester: 5,
    code: `NEW${Date.now() % 100000}`,
    name: 'Database Management Systems',
    facultyIds: [f.faculty.id],
  });
  return String(s._id);
}

async function runJob(req) {
  const res = await req;
  expect(res.status).toBe(202);
  await queue().drain();
  return AiJob.findById(res.body.data.jobId).lean();
}

function checkGolden(name, actual) {
  const file = path.join(fixtures, `${name}.golden.json`);
  if (process.env.UPDATE_GOLDEN || !existsSync(file))
    writeFileSync(file, `${JSON.stringify(actual, null, 2)}\n`);
  expect(actual).toEqual(JSON.parse(readFileSync(file, 'utf8')));
}

afterEach(() => mock().reset());

describe('syllabus text helpers', () => {
  it('splits units in the usual Pondicherry University layouts', () => {
    const units = splitUnits(SYLLABUS);
    expect(units.map((u) => [u.number, u.title])).toEqual([
      [1, 'INTRODUCTION'],
      [2, 'RELATIONAL MODEL AND SQL'],
      [3, 'DATABASE DESIGN'],
      [4, 'STORAGE AND INDEXING'],
      [5, 'TRANSACTIONS'],
    ]);
    expect(units[2].text).toContain('Functional Dependency');
    expect(splitUnits('Just some text with no units')).toHaveLength(1);
  });

  it('dedupes topics by normalised title and breaks cycles at the weakest link', () => {
    expect(normalizeTitle('2. Keys & Constraints.')).toBe(normalizeTitle('keys and constraint'));
    const merged = mergeTopics([
      [{ title: 'Keys', summary: '', subtopics: [] }],
      [{ title: 'KEYS', summary: 'x', subtopics: [{ title: 'Super key', summary: '' }] }],
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].subtopics).toHaveLength(1);
    const { kept, dropped } = breakCycles(
      ['a', 'b', 'c'],
      [
        { from: 'a', to: 'b', confidence: 0.9 },
        { from: 'b', to: 'c', confidence: 0.8 },
        { from: 'c', to: 'a', confidence: 0.2 },
      ],
    );
    expect(dropped.map((d) => `${d.from}${d.to}`)).toEqual(['ca']);
    expect(findCycle(['a', 'b', 'c'], kept)).toBeNull();
  });
});

describe('draft-map pipeline (A3.1)', () => {
  it('creates units, topics and links with no prerequisite cycles and a readable layout (golden)', async () => {
    const f = await dbmsFixture();
    const sid = await emptySubject(f);
    scriptMapModel();
    const material = await (async () => {
      const res = await api()
        .post('/api/v1/materials')
        .set(f.faculty.auth)
        .field('kind', 'syllabusPdf')
        .field('subjectId', sid)
        .attach('file', await makePdf(SYLLABUS), {
          filename: 's.pdf',
          contentType: 'application/pdf',
        });
      await queue().drain();
      return res.body.data.id;
    })();
    const job = await runJob(
      api()
        .post(`/api/v1/ai/subjects/${sid}/draft-map`)
        .set(f.faculty.auth)
        .send({ materialId: material }),
    );
    expect(job).toMatchObject({ status: 'succeeded', result: 'created' });
    expect(job.promptVersions).toMatchObject({
      syllabus_topics: 1,
      syllabus_prereqs: 1,
      syllabus_crossLinks: 1,
    });

    const [units, topics, links] = await Promise.all([
      Unit.find({ subjectId: sid }).sort({ number: 1 }).lean(),
      Topic.find({ subjectId: sid }).sort({ order: 1 }).lean(),
      TopicLink.find({ subjectId: sid }).lean(),
    ]);
    // Everything AI-made is a draft from source ai (A.7.5).
    expect(topics.every((t) => t.status === 'draft' && t.source === 'ai')).toBe(true);
    expect(links.every((l) => l.status === 'draft' && l.source === 'ai')).toBe(true);
    // No prerequisite cycles.
    const prereq = links
      .filter((l) => l.type === 'prerequisite')
      .map((l) => ({ from: String(l.fromTopicId), to: String(l.toTopicId) }));
    expect(
      findCycle(
        topics.map((t) => String(t._id)),
        prereq,
      ),
    ).toBeNull();
    // Readable layout: no two nodes on the same spot, prerequisites to the left.
    const pos = new Map(topics.map((t) => [String(t._id), t.position]));
    expect(new Set(topics.map((t) => `${t.position.x},${t.position.y}`)).size).toBe(topics.length);
    for (const l of prereq) expect(pos.get(l.from).x).toBeLessThan(pos.get(l.to).x);
    // Cross-unit related links exist and really cross units.
    const unitOf = new Map(topics.map((t) => [String(t._id), String(t.unitId)]));
    const related = links.filter((l) => l.type === 'related');
    expect(related.length).toBeGreaterThan(0);
    expect(
      related.every((l) => unitOf.get(String(l.fromTopicId)) !== unitOf.get(String(l.toTopicId))),
    ).toBe(true);

    const title = new Map(topics.map((t) => [String(t._id), t.title]));
    checkGolden('draft-map', {
      units: units.map((u) => `${u.number}. ${u.title}`),
      topics: topics.map((t) => `${t.parentTopicId ? '  ' : ''}${t.title}`),
      prerequisites: prereq.map((l) => `${title.get(l.from)} -> ${title.get(l.to)}`).sort(),
      related: related
        .map((l) => `${title.get(String(l.fromTopicId))} ~ ${title.get(String(l.toTopicId))}`)
        .sort(),
      droppedForCycles: job.output.droppedForCycles,
    });
  });

  it('re-running replaces only unapproved AI drafts and keeps faculty and approved topics', async () => {
    const f = await dbmsFixture();
    const sid = await emptySubject(f);
    scriptMapModel();
    await (async () => {
      await api()
        .post('/api/v1/materials')
        .set(f.faculty.auth)
        .field('kind', 'syllabusPdf')
        .field('subjectId', sid)
        .attach('file', await makePdf(SYLLABUS), {
          filename: 's.pdf',
          contentType: 'application/pdf',
        });
      await queue().drain();
    })();
    await runJob(api().post(`/api/v1/ai/subjects/${sid}/draft-map`).set(f.faculty.auth).send({}));
    const first = await Topic.countDocuments({ subjectId: sid });
    // Faculty approves one topic and adds their own.
    const keep = await Topic.findOneAndUpdate(
      { subjectId: sid, title: 'Keys' },
      { $set: { status: 'approved' } },
      { new: true },
    );
    const unit = await Unit.findOne({ subjectId: sid, number: 3 });
    const mine = await Topic.create({
      subjectId: sid,
      unitId: unit._id,
      title: 'Denormalization',
      source: 'faculty',
      status: 'draft',
    });

    const job = await runJob(
      api().post(`/api/v1/ai/subjects/${sid}/draft-map`).set(f.faculty.auth).send({}),
    );
    expect(job.status).toBe('succeeded');
    expect(await Topic.countDocuments({ subjectId: sid })).toBe(first + 1);
    expect(await Topic.findById(keep._id)).not.toBeNull();
    expect(await Topic.findById(mine._id)).not.toBeNull();
    expect(await Topic.countDocuments({ subjectId: sid, title: 'Keys' })).toBe(1);
  });

  it('with no syllabus PDF ends with needsMaterial and creates nothing', async () => {
    const f = await dbmsFixture();
    const sid = await emptySubject(f);
    const job = await runJob(
      api().post(`/api/v1/ai/subjects/${sid}/draft-map`).set(f.faculty.auth).send({}),
    );
    expect(job).toMatchObject({ status: 'succeeded', result: 'needsMaterial' });
    expect(await Topic.countDocuments({ subjectId: sid })).toBe(0);
  });

  it('is limited to the subject faculty and admins', async () => {
    const f = await dbmsFixture();
    await api()
      .post(`/api/v1/ai/subjects/${f.sid}/draft-map`)
      .set(f.otherFaculty.auth)
      .send({})
      .expect(403);
    await api()
      .post(`/api/v1/ai/subjects/${f.sid}/draft-map`)
      .set(f.student.auth)
      .send({})
      .expect(403);
  });
});

async function uploadNotes(f, topicKey = 'normalization') {
  const res = await api()
    .post('/api/v1/materials')
    .set(f.faculty.auth)
    .field('kind', 'notes')
    .field('topicId', f.id(topicKey))
    .attach('file', await makePdf(NORMALIZATION_NOTES), {
      filename: 'notes.pdf',
      contentType: 'application/pdf',
    });
  expect(res.status).toBe(201);
  await queue().drain();
}

const draft = (f, kinds, topicKey = 'normalization') =>
  runJob(
    api()
      .post(`/api/v1/ai/topics/${f.id(topicKey)}/draft-content`)
      .set(f.faculty.auth)
      .send(kinds ? { kinds } : {}),
  );

describe('draft-content pipeline (A3.2, A3.3)', () => {
  it('for a topic with no material ends succeeded + needsMaterial and creates nothing', async () => {
    const f = await dbmsFixture('draft');
    const job = await draft(f, null, 'keys');
    expect(job).toMatchObject({ status: 'succeeded', result: 'needsMaterial' });
    expect(job.output.reason).toMatch(/No notes/);
    const topicId = f.id('keys');
    expect(await Resource.countDocuments({ topicId })).toBe(0);
    expect(await Flashcard.countDocuments({ topicId })).toBe(0);
    expect(await Question.countDocuments({ topicId })).toBe(0);
    expect(mock().calls.filter((c) => c.task?.startsWith('topic.'))).toHaveLength(0);
  });

  it('every saved AI item is draft, source ai, with promptVersion and sourceChunkIds (golden)', async () => {
    const f = await dbmsFixture('draft');
    await uploadNotes(f);
    scriptContentModel();
    const job = await draft(f);
    expect(job).toMatchObject({ status: 'succeeded', result: 'created' });
    const topicId = f.id('normalization');
    const items = [
      ...(await Resource.find({ topicId }).lean()),
      ...(await Flashcard.find({ topicId }).lean()),
      ...(await Question.find({ topicId }).lean()),
    ];
    expect(items.length).toBeGreaterThan(0);
    for (const it of items) {
      expect(it).toMatchObject({ status: 'draft', source: 'ai' });
      expect(it.aiMeta.promptVersion).toMatch(/^topic\.\w+\.v\d+$/);
      expect(it.aiMeta.sourceChunkIds.length).toBeGreaterThan(0);
      expect(String(it.aiMeta.jobId)).toBe(String(job._id));
    }
    // Small-model batching: 3 flashcard calls, 2 MCQ calls of 5, one self-check per MCQ.
    const tasks = mock().calls.map((c) => c.task);
    expect(tasks.filter((t) => t === 'topic.flashcards')).toHaveLength(3);
    expect(tasks.filter((t) => t === 'topic.mcqs')).toHaveLength(2);
    expect(tasks.filter((t) => t === 'mcq.selfCheck')).toHaveLength(10);
    // Grounding: the prompts carry the faculty material, never student data.
    expect(
      mock()
        .calls.find((c) => c.task === 'topic.easy')
        .messages.at(-1).content,
    ).toContain('We split large tables');

    const resources = await Resource.find({ topicId }).sort({ kind: 1 }).lean();
    checkGolden('draft-content', {
      resources: resources.map((r) => ({ kind: r.kind, title: r.title, body: r.body })),
      flashcards: await Flashcard.countDocuments({ topicId }),
      mcqs: await Question.countDocuments({ topicId, type: 'mcq' }),
      curiosity: (await Question.findOne({ topicId, type: 'curiosity' }).lean()).stem,
      needsAttention: await Question.countDocuments({ topicId, needsAttention: true }),
    });
  });

  it('self-check disagreement flags the MCQ needsAttention instead of discarding it', async () => {
    const f = await dbmsFixture('draft');
    await uploadNotes(f);
    scriptContentModel({ selfCheckAgrees: false });
    await draft(f, ['mcq']);
    const flagged = await Question.find({
      topicId: f.id('normalization'),
      needsAttention: true,
    }).lean();
    expect(flagged).toHaveLength(2); // the "-0:" question of each of the 2 batches
    const queueRes = await api()
      .get(`/api/v1/review-queue?topicId=${f.id('normalization')}&needsAttention=true`)
      .set(f.faculty.auth)
      .expect(200);
    expect(queueRes.body.data).toHaveLength(2);
  });

  it('re-running replaces only unapproved, unedited AI drafts of the same kind', async () => {
    const f = await dbmsFixture('draft');
    await uploadNotes(f);
    scriptContentModel();
    await draft(f, ['easy', 'flashcards']);
    const topicId = f.id('normalization');
    const cards = await Flashcard.find({ topicId }).lean();
    await Flashcard.updateOne({ _id: cards[0]._id }, { $set: { status: 'approved' } });
    await Flashcard.updateOne({ _id: cards[1]._id }, { $set: { editedAfterAi: true } });
    const faculty = await Flashcard.create({
      topicId,
      subjectId: f.subject._id,
      front: 'Faculty card?',
      back: 'Mine.',
      source: 'faculty',
    });
    const easyBefore = await Resource.findOne({ topicId, kind: 'easy' }).lean();
    const tenMark = await Resource.create({
      topicId,
      subjectId: f.subject._id,
      kind: 'tenMark',
      body: 'Faculty answer',
      source: 'faculty',
    });

    await draft(f, ['easy', 'flashcards']);
    expect(await Flashcard.findById(cards[0]._id)).not.toBeNull();
    expect(await Flashcard.findById(cards[1]._id)).not.toBeNull();
    expect(await Flashcard.findById(faculty._id)).not.toBeNull();
    expect(await Flashcard.findById(cards[2]._id)).toBeNull(); // replaced
    expect(await Resource.findById(easyBefore._id)).toBeNull();
    expect(await Resource.countDocuments({ topicId, kind: 'easy' })).toBe(1);
    expect(await Resource.findById(tenMark._id)).not.toBeNull(); // other kind untouched
  });

  it('invalid output for one kind fails the job clearly but keeps the valid drafts', async () => {
    const f = await dbmsFixture('draft');
    await uploadNotes(f);
    scriptContentModel();
    mock().on('topic.tenMark', { definition: 'too short' });
    const job = await draft(f, ['easy', 'tenMark']);
    expect(job.status).toBe('failed');
    expect(job.error).toMatchObject({ code: 'AI_VALIDATION_FAILED' });
    expect(job.error.message).toMatch(/tenMark/);
    expect(job.output.resources).toHaveLength(1);
    expect(await Resource.countDocuments({ topicId: f.id('normalization'), kind: 'tenMark' })).toBe(
      0,
    );
    // Exactly one repair attempt for the bad kind.
    expect(mock().calls.filter((c) => c.task === 'topic.tenMark')).toHaveLength(2);
  });

  it('returns 503 while the AI is offline (circuit open)', async () => {
    const f = await dbmsFixture('draft');
    const b = gateway().breaker;
    b.failure();
    b.failure();
    b.failure();
    b.lastProbeAt = Date.now();
    const res = await api()
      .post(`/api/v1/ai/topics/${f.id('normalization')}/draft-content`)
      .set(f.faculty.auth)
      .send({});
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('AI_OFFLINE');
    b.success();
  });
});

describe('pyq tagging (A3.4)', () => {
  it('tags untagged draft PYQs only from embedding candidates, with confidences', async () => {
    const f = await dbmsFixture();
    const date = new Date('2024-11-20');
    const [q1, published] = await Pyq.create([
      {
        subjectId: f.subject._id,
        text: 'Explain normalization and why we split tables into 2NF and 3NF.',
        marks: 10,
        examDate: date,
        status: 'draft',
      },
      {
        subjectId: f.subject._id,
        text: 'Explain normalization with an example.',
        marks: 10,
        examDate: date,
        status: 'published',
      },
    ]);
    mock().on('pyq.tag', (req) => {
      const list = between(userText(req), 'Candidate topics:\n', '\n\nChoose');
      const norm = list.split('\n').findIndex((l) => /Normalization/.test(l)) + 1;
      return {
        picks: [
          { candidate: norm, confidence: 0.92 },
          { candidate: 9, confidence: 0.99 },
          { candidate: 2, confidence: 0.1 },
        ],
      };
    });
    const job = await runJob(
      api().post('/api/v1/ai/pyqs/tag').set(f.faculty.auth).send({ subjectId: f.sid }),
    );
    expect(job).toMatchObject({ status: 'succeeded', result: 'created', output: { tagged: 1 } });
    const tagged = await Pyq.findById(q1._id).lean();
    expect(tagged.topicIds.map(String)).toEqual([f.id('normalization')]);
    expect(tagged.tagConfidence[f.id('normalization')]).toBe(0.92);
    expect(tagged.aiMeta.promptVersion).toBe('pyq.tag.v1');
    // Published PYQs are never retagged by AI.
    expect((await Pyq.findById(published._id).lean()).topicIds).toEqual([]);
  });
});
