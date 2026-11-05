import { describe, expect, it } from 'vitest';
import { api } from '../../../test/helpers.js';
import { dbmsFixture as fixture } from '../../../test/fixtures.js';
import { Topic, TopicLink } from './model.js';

describe('subjects and syllabus versions', () => {
  it('a student only sees subjects of their syllabus version', async () => {
    const f = await fixture();
    const other = await fixture();
    const res = await api().get('/api/v1/subjects').set(f.student.auth);
    expect(res.status).toBe(200);
    const ids = res.body.data.map((s) => s.id);
    expect(ids).toContain(f.sid);
    expect(ids).not.toContain(other.sid);
    await api().get(`/api/v1/subjects/${other.sid}/map`).set(f.student.auth).expect(403);
  });

  it('faculty list only their own subjects; only admins create subjects', async () => {
    const f = await fixture();
    const mine = await api().get('/api/v1/subjects').set(f.faculty.auth);
    expect(mine.body.data.map((s) => s.id)).toEqual([f.sid]);
    const none = await api().get('/api/v1/subjects').set(f.otherFaculty.auth);
    expect(none.body.data).toEqual([]);
    await api()
      .post('/api/v1/subjects')
      .set(f.faculty.auth)
      .send({ syllabusVersionId: String(f.version._id), semester: 5, code: 'X1', name: 'X' })
      .expect(403);
    await api()
      .post('/api/v1/subjects')
      .set(f.admin.auth)
      .send({
        syllabusVersionId: String(f.version._id),
        semester: 5,
        code: 'CS99',
        name: 'Compilers',
        facultyIds: [f.faculty.id],
      })
      .expect(201);
  });
});

describe('map', () => {
  it('returns units, topics and links ready for React Flow with cross-unit flags', async () => {
    const f = await fixture();
    const res = await api().get(`/api/v1/subjects/${f.sid}/map`).set(f.student.auth);
    expect(res.status).toBe(200);
    const map = res.body.data;
    expect(map.units).toHaveLength(2);
    expect(map.topics).toHaveLength(8);
    expect(map.links).toHaveLength(8);
    const cross = map.links.filter((l) => l.crossUnit);
    expect(cross).toHaveLength(1);
    expect(cross[0]).toMatchObject({
      type: 'related',
      fromTopicId: f.id('keys'),
      toTopicId: f.id('indexing'),
    });
    expect(map.topics[0].position).toEqual({ x: expect.any(Number), y: expect.any(Number) });
  });

  it('a student never receives draft topics or links', async () => {
    const f = await fixture();
    // Faculty adds a draft topic and a draft link to it.
    const unitId = String(f.units[3]._id);
    const t = await api()
      .post(`/api/v1/units/${unitId}/topics`)
      .set(f.faculty.auth)
      .send({ title: 'Multivalued Dependency' });
    expect(t.status).toBe(201);
    expect(t.body.data.status).toBe('draft');
    await api()
      .post(`/api/v1/subjects/${f.sid}/links`)
      .set(f.faculty.auth)
      .send({
        fromTopicId: f.id('bcnf'),
        toTopicId: t.body.data.id,
        type: 'prerequisite',
        reason: 'MVDs extend the idea of FDs beyond BCNF.',
      })
      .expect(201);
    // A draft link between two approved topics must also stay hidden.
    await api()
      .post(`/api/v1/subjects/${f.sid}/links`)
      .set(f.faculty.auth)
      .send({
        fromTopicId: f.id('anomalies'),
        toTopicId: f.id('indexing'),
        type: 'related',
        reason: 'Indexes do not fix anomalies.',
      })
      .expect(201);

    const studentMap = (await api().get(`/api/v1/subjects/${f.sid}/map`).set(f.student.auth)).body
      .data;
    expect(studentMap.topics.every((x) => x.status === 'approved')).toBe(true);
    expect(studentMap.links.every((x) => x.status === 'approved')).toBe(true);
    expect(studentMap.topics.map((x) => x.id)).not.toContain(t.body.data.id);
    expect(studentMap.links).toHaveLength(8);

    const facultyMap = (await api().get(`/api/v1/subjects/${f.sid}/map`).set(f.faculty.auth)).body
      .data;
    expect(facultyMap.topics).toHaveLength(9);
    expect(facultyMap.links).toHaveLength(10);

    // Students get 404 for the draft topic's graph queries.
    await api()
      .get(`/api/v1/topics/${t.body.data.id}/prerequisites`)
      .set(f.student.auth)
      .expect(404);
  });

  it('approve moves all draft topics and links to approved', async () => {
    const f = await fixture('draft');
    const before = await api().get(`/api/v1/subjects/${f.sid}/map`).set(f.student.auth);
    expect(before.body.data.topics).toHaveLength(0);
    const res = await api().patch(`/api/v1/subjects/${f.sid}/map/approve`).set(f.faculty.auth);
    expect(res.body.data).toEqual({ topicsApproved: 8, linksApproved: 8 });
    const after = await api().get(`/api/v1/subjects/${f.sid}/map`).set(f.student.auth);
    expect(after.body.data.topics).toHaveLength(8);
  });

  it('only the owning faculty can edit or approve the map', async () => {
    const f = await fixture('draft');
    await api().patch(`/api/v1/subjects/${f.sid}/map/approve`).set(f.otherFaculty.auth).expect(403);
    await api().patch(`/api/v1/subjects/${f.sid}/map/approve`).set(f.student.auth).expect(403);
    await api()
      .post(`/api/v1/units/${f.units[3]._id}/topics`)
      .set(f.otherFaculty.auth)
      .send({ title: 'X' })
      .expect(403);
  });
});

describe('graph rules', () => {
  it('rejects a prerequisite cycle A→B→C→A with 422 naming the cycle', async () => {
    const f = await fixture();
    // relational → keys → fd already exists; fd → relational closes the cycle.
    const res = await api()
      .post(`/api/v1/subjects/${f.sid}/links`)
      .set(f.faculty.auth)
      .send({
        fromTopicId: f.id('fd'),
        toTopicId: f.id('relational'),
        type: 'prerequisite',
        reason: 'Bad link that makes a loop.',
      });
    expect(res.status).toBe(422);
    expect(res.body.error.message).toMatch(/cycle/i);
    expect(res.body.error.message).toContain('Relational Model');
    expect(res.body.error.message).toContain('Keys');
    expect(res.body.error.message).toContain('Functional Dependency');
    const titles = res.body.error.details.cycle.map((c) => c.title);
    expect(titles[0]).toBe(titles[titles.length - 1]);
  });

  it('allows related links to form cycles', async () => {
    const f = await fixture();
    await api()
      .post(`/api/v1/subjects/${f.sid}/links`)
      .set(f.faculty.auth)
      .send({
        fromTopicId: f.id('indexing'),
        toTopicId: f.id('bcnf'),
        type: 'related',
        reason: 'Both affect query performance.',
      })
      .expect(201);
    await api()
      .post(`/api/v1/subjects/${f.sid}/links`)
      .set(f.faculty.auth)
      .send({
        fromTopicId: f.id('bcnf'),
        toTopicId: f.id('keys'),
        type: 'related',
        reason: 'BCNF is defined using keys.',
      })
      .expect(201);
  });

  it('rejects self-links and duplicates (related links are undirected)', async () => {
    const f = await fixture();
    const self = await api()
      .post(`/api/v1/subjects/${f.sid}/links`)
      .set(f.faculty.auth)
      .send({
        fromTopicId: f.id('keys'),
        toTopicId: f.id('keys'),
        type: 'related',
        reason: 'Self link test.',
      });
    expect(self.status).toBe(422);
    const dup = await api()
      .post(`/api/v1/subjects/${f.sid}/links`)
      .set(f.faculty.auth)
      .send({
        fromTopicId: f.id('relational'),
        toTopicId: f.id('keys'),
        type: 'prerequisite',
        reason: 'Duplicate.',
      });
    expect(dup.status).toBe(409);
    const reverseRelated = await api()
      .post(`/api/v1/subjects/${f.sid}/links`)
      .set(f.faculty.auth)
      .send({
        fromTopicId: f.id('indexing'),
        toTopicId: f.id('keys'),
        type: 'related',
        reason: 'Same pair reversed.',
      });
    expect(reverseRelated.status).toBe(409);
  });

  it('rejects links to topics in another subject', async () => {
    const f = await fixture();
    const g = await fixture();
    const res = await api()
      .post(`/api/v1/subjects/${f.sid}/links`)
      .set(f.faculty.auth)
      .send({
        fromTopicId: f.id('keys'),
        toTopicId: g.id('keys'),
        type: 'related',
        reason: 'Cross-subject link.',
      });
    expect(res.status).toBe(400);
  });

  it('learningOrder returns a valid topological order for the DBMS subject', async () => {
    const f = await fixture();
    const res = await api().get(`/api/v1/subjects/${f.sid}/learning-order`).set(f.student.auth);
    expect(res.status).toBe(200);
    const order = res.body.data.map((x) => x.topicId);
    expect(order).toHaveLength(8);
    const pos = new Map(order.map((id, i) => [id, i]));
    const links = await TopicLink.find({ subjectId: f.subject._id, type: 'prerequisite' }).lean();
    for (const l of links)
      expect(pos.get(String(l.fromTopicId))).toBeLessThan(pos.get(String(l.toTopicId)));
    expect(res.body.data[0].title).toBe('Relational Model');
  });

  it('prerequisitesOf, unlocks and crossUnitLinks', async () => {
    const f = await fixture();
    const pre = await api()
      .get(`/api/v1/topics/${f.id('normalization')}/prerequisites`)
      .set(f.student.auth);
    expect(pre.body.data.map((t) => t.title).sort()).toEqual([
      'Data Anomalies',
      'Functional Dependency',
    ]);
    expect(pre.body.data[0].reason).toBeTruthy();
    const un = await api()
      .get(`/api/v1/topics/${f.id('keys')}/unlocks`)
      .set(f.student.auth);
    expect(un.body.data.map((t) => t.title)).toEqual(['Functional Dependency']);
    const cross = await api().get(`/api/v1/subjects/${f.sid}/cross-unit-links`).set(f.student.auth);
    expect(cross.body.data).toHaveLength(1);
  });
});

describe('bulk map save', () => {
  it('saves positions and edges in one request', async () => {
    const f = await fixture();
    const linkToDelete = f.links.find((l) => l.type === 'related');
    const res = await api()
      .patch(`/api/v1/subjects/${f.sid}/map`)
      .set(f.faculty.auth)
      .send({
        nodes: [{ id: f.id('keys'), position: { x: 11, y: 22 }, order: 5 }],
        edges: {
          upsert: [
            {
              fromTopicId: f.id('bcnf'),
              toTopicId: f.id('indexing'),
              type: 'related',
              reason: 'Both are physical design choices.',
            },
          ],
          delete: [String(linkToDelete._id)],
        },
      });
    expect(res.status).toBe(200);
    const keys = await Topic.findById(f.id('keys')).lean();
    expect(keys.position).toEqual({ x: 11, y: 22 });
    expect(keys.order).toBe(5);
    expect(await TopicLink.exists({ _id: linkToDelete._id })).toBeNull();
    expect(
      await TopicLink.exists({ fromTopicId: f.id('bcnf'), toTopicId: f.id('indexing') }),
    ).toBeTruthy();
  });

  it('writes nothing when the final edge set has a cycle', async () => {
    const f = await fixture();
    const res = await api()
      .patch(`/api/v1/subjects/${f.sid}/map`)
      .set(f.faculty.auth)
      .send({
        nodes: [{ id: f.id('keys'), position: { x: 999, y: 999 } }],
        edges: {
          upsert: [
            {
              fromTopicId: f.id('bcnf'),
              toTopicId: f.id('relational'),
              type: 'prerequisite',
              reason: 'Creates a loop.',
            },
          ],
        },
      });
    expect(res.status).toBe(422);
    const keys = await Topic.findById(f.id('keys')).lean();
    expect(keys.position.x).not.toBe(999);
  });
});

describe('topic CRUD', () => {
  it('creates subtopics in the same subject and rejects foreign parents', async () => {
    const f = await fixture();
    const g = await fixture();
    const sub = await api()
      .post(`/api/v1/units/${f.units[3]._id}/topics`)
      .set(f.faculty.auth)
      .send({ title: 'Partial Dependency', parentTopicId: f.id('nf123') });
    expect(sub.status).toBe(201);
    expect(sub.body.data.parentTopicId).toBe(f.id('nf123'));
    const bad = await api()
      .post(`/api/v1/units/${f.units[3]._id}/topics`)
      .set(f.faculty.auth)
      .send({ title: 'X', parentTopicId: g.id('keys') });
    expect(bad.status).toBe(400);
  });

  it('deleting a topic removes its links', async () => {
    const f = await fixture();
    await api()
      .delete(`/api/v1/topics/${f.id('indexing')}`)
      .set(f.faculty.auth)
      .expect(200);
    expect(await TopicLink.exists({ toTopicId: f.id('indexing') })).toBeNull();
  });
});

describe('search', () => {
  it('finds topics a student may open and never draft topics or other versions', async () => {
    const f = await fixture();
    const other = await fixture();
    await Topic.updateOne({ _id: f.id('bcnf') }, { $set: { status: 'draft' } });
    const res = await api().get('/api/v1/search?q=norm').set(f.student.auth).expect(200);
    const titles = res.body.data.topics.map((t) => t.title);
    expect(titles).toContain('Normalization');
    expect(res.body.data.topics.every((t) => t.subjectId === f.sid)).toBe(true);
    expect(res.body.data.topics.some((t) => t.subjectId === other.sid)).toBe(false);

    const bcnf = await api().get('/api/v1/search?q=bcnf').set(f.student.auth).expect(200);
    expect(bcnf.body.data.topics).toEqual([]);
    const staff = await api().get('/api/v1/search?q=bcnf').set(f.faculty.auth).expect(200);
    expect(staff.body.data.topics).toHaveLength(1);
  });

  it('treats the query as text, not a regex, and requires one', async () => {
    const f = await fixture();
    const res = await api().get('/api/v1/search?q=.*').set(f.student.auth).expect(200);
    expect(res.body.data.topics).toEqual([]);
    await api().get('/api/v1/search').set(f.student.auth).expect(400);
  });
});
