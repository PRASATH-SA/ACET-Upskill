import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { api } from '../../../test/helpers.js';
import { dbmsFixture, makePdf } from '../../../test/fixtures.js';
import { courseContext } from '../../ai/syllabusText.js';
import { gateway } from '../../ai/gateway/index.js';
import { seedDbmsContent } from '../../db/seedContent.js';
import { AiJob } from '../ai/model.js';
import { queue } from '../ai/queue.js';
import { Mastery } from '../practice/model.js';
import { SubjectOverview } from './model.js';
import { unitJourneyLinks } from './service.js';

afterEach(() => gateway().provider.reset());

const here = path.dirname(fileURLToPath(import.meta.url));
const SYLLABUS = readFileSync(
  path.join(here, '../../../test/fixtures/ai/dbms-syllabus.txt'),
  'utf8',
);
const get = (f, who = f.student) => api().get(`/api/v1/subjects/${f.sid}/overview`).set(who.auth);

describe('subject overview (pure)', () => {
  it('links every unit to the next and collects cross-unit reasons', () => {
    const units = [{ id: 'u1' }, { id: 'u2' }, { id: 'u3' }];
    const links = unitJourneyLinks(units, [
      { fromUnit: 'u1', toUnit: 'u2', type: 'related', from: 'A', to: 'B', reason: 'A helps B' },
      {
        fromUnit: 'u1',
        toUnit: 'u3',
        type: 'prerequisite',
        from: 'A',
        to: 'C',
        reason: 'C needs A',
      },
    ]);
    expect(links).toEqual([
      {
        fromUnitId: 'u1',
        toUnitId: 'u2',
        type: 'next',
        reasons: [expect.objectContaining({ reason: 'A helps B' })],
      },
      { fromUnitId: 'u2', toUnitId: 'u3', type: 'next', reasons: [] },
      {
        fromUnitId: 'u1',
        toUnitId: 'u3',
        type: 'prerequisite',
        reasons: [expect.objectContaining({ fromTopic: 'A', toTopic: 'C' })],
      },
    ]);
  });

  it('picks the course parts of a syllabus (objectives, outcomes) for the overview prompt', () => {
    const ctx = courseContext(SYLLABUS);
    expect(ctx.length).toBeLessThanOrEqual(7002);
    expect(ctx).toMatch(/unit/i);
  });
});

describe('subject overview API', () => {
  it('gives students the published overview, the unit journey and their progress', async () => {
    const f = await dbmsFixture();
    await seedDbmsContent({ subjectId: f.subject._id, facultyId: f.faculty.id });
    await Mastery.create({
      userId: f.student.id,
      topicId: f.topics.keys._id,
      subjectId: f.subject._id,
      state: 'confident',
    });

    const res = await get(f);
    expect(res.status).toBe(200);
    const o = res.body.data;
    expect(o.subject.name).toBe('Database Management Systems');
    expect(o.overview.tagline).toMatch(/Design data/);
    expect(o.overview.prerequisites.length).toBeGreaterThan(0);
    expect(o.overview.status).toBeUndefined(); // students don't see review fields
    expect(o.units.map((u) => [u.number, u.topicCount])).toEqual([
      [3, 7],
      [4, 1],
    ]);
    expect(o.units[0].summary).toMatch(/relational tables/);
    expect(o.units[0].progress).toEqual({ mastered: 1, started: 0, total: 7 });
    expect(o.progress).toEqual({ total: 8, mastered: 1, started: 0 });
    // Unit 3 → Unit 4, explained by the Keys → Indexing link.
    expect(o.unitLinks).toEqual([
      expect.objectContaining({
        type: 'next',
        reasons: [expect.objectContaining({ fromTopic: 'Keys', toTopic: 'Indexing' })],
      }),
    ]);
    expect(o.canEdit).toBe(false);
  });

  it('keeps drafts from students; faculty edit, publish, and only their subjects', async () => {
    const f = await dbmsFixture();
    const units = (await get(f, f.faculty)).body.data.units;
    const body = {
      tagline: 'Learn data.',
      why: 'Because.',
      prerequisites: [{ title: 'Sets', why: 'Relations are sets.' }],
      outcomes: ['Normalize a table.'],
      applications: [],
      careers: ['DBA'],
      units: [
        {
          unitId: units[0].id,
          summary: 'Design.',
          youWillBeAbleTo: 'Normalize.',
          leadsTo: 'Speed.',
        },
      ],
    };
    const put = (who, b = body) =>
      api().put(`/api/v1/subjects/${f.sid}/overview`).set(who.auth).send(b);

    expect((await put(f.student)).status).toBe(403);
    expect((await put(f.otherFaculty)).status).toBe(403);
    expect(
      (await put(f.faculty, { ...body, units: [{ ...body.units[0], unitId: f.sid }] })).status,
    ).toBe(400);
    const saved = await put(f.faculty);
    expect(saved.status).toBe(200);
    expect(saved.body.data.status).toBe('draft');

    expect((await get(f)).body.data.overview).toBeNull();
    const staffView = (await get(f, f.faculty)).body.data;
    expect(staffView).toMatchObject({
      canEdit: true,
      overview: { status: 'draft', tagline: 'Learn data.' },
    });

    const publish = await api()
      .post(`/api/v1/subject-overviews/${saved.body.data.id}/status`)
      .set(f.faculty.auth)
      .send({ status: 'published' });
    expect(publish.status).toBe(200);
    const student = (await get(f)).body.data;
    expect(student.overview.careers).toEqual(['DBA']);
    expect(student.units[0].leadsTo).toBe('Speed.');

    expect((await get(f, f.outsider)).status).toBe(403);
  });

  it('AI drafts the overview from the syllabus PDF only, and never replaces faculty work', async () => {
    const f = await dbmsFixture();
    const draft = () =>
      api().post(`/api/v1/ai/subjects/${f.sid}/draft-overview`).set(f.faculty.auth);

    // No syllabus yet: nothing is invented.
    let res = await draft();
    expect(res.status).toBe(202);
    await queue().drain();
    expect((await AiJob.findById(res.body.data.jobId).lean()).result).toBe('needsMaterial');

    const upload = await api()
      .post('/api/v1/materials')
      .set(f.faculty.auth)
      .field('kind', 'syllabusPdf')
      .field('subjectId', f.sid)
      .attach('file', await makePdf(SYLLABUS), {
        filename: 'syllabus.pdf',
        contentType: 'application/pdf',
      });
    expect(upload.status).toBe(201);
    await queue().drain();

    gateway().provider.on('subject.overview', (req) => {
      const text = req.messages.at(-1).content;
      expect(text).toMatch(/Unit 3: Database Design — Relational Model; Keys/);
      return {
        tagline: 'Design and query reliable data.',
        why: 'Databases are everywhere. The syllabus says so.',
        prerequisites: [{ title: 'Data structures', why: 'Indexes use trees.' }],
        outcomes: ['Design normalized schemas.'],
        applications: [],
        units: [
          {
            number: 3,
            summary: 'Design.',
            youWillBeAbleTo: 'Normalize.',
            leadsTo: 'Then indexing.',
          },
          { number: 9, summary: 'Not a unit.', youWillBeAbleTo: '', leadsTo: '' },
        ],
      };
    });
    res = await draft();
    await queue().drain();
    const job = await AiJob.findById(res.body.data.jobId).lean();
    expect(job).toMatchObject({ status: 'succeeded', result: 'created' });
    const saved = await SubjectOverview.findOne({ subjectId: f.subject._id }).lean();
    expect(saved).toMatchObject({
      status: 'draft',
      source: 'ai',
      tagline: 'Design and query reliable data.',
    });
    expect(saved.units).toHaveLength(1); // unit 9 does not exist
    expect(saved.aiMeta.promptVersion).toBe('subject.overview.v1');
    expect(String(saved.aiMeta.sourceMaterialId)).toBe(upload.body.data.id);
    expect((await get(f)).body.data.overview).toBeNull(); // still a draft

    // Faculty edits it; a new AI run leaves it alone.
    await api().put(`/api/v1/subjects/${f.sid}/overview`).set(f.faculty.auth).send({
      tagline: 'Mine now.',
      why: '',
      prerequisites: [],
      outcomes: [],
      applications: [],
      careers: [],
      units: [],
    });
    res = await draft();
    await queue().drain();
    expect((await AiJob.findById(res.body.data.jobId).lean()).result).toBe('skipped');
    expect((await SubjectOverview.findOne({ subjectId: f.subject._id }).lean()).tagline).toBe(
      'Mine now.',
    );
  });
});
