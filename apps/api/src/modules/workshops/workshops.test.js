import { describe, expect, it } from 'vitest';
import { api } from '../../../test/helpers.js';
import { dbmsFixture, makePdf } from '../../../test/fixtures.js';
import { NORMALIZATION_NOTES } from '../../../test/fixtures/notes.js';
import { Chunk } from '../../ai/rag/model.js';
import { queue } from '../ai/queue.js';

describe('faculty studio support (F6)', () => {
  it('lists a subject workshops with submission and grading counts', async () => {
    const f = await dbmsFixture();
    const w = await api()
      .post(`/api/v1/topics/${f.id('normalization')}/workshops`)
      .set(f.faculty.auth)
      .send({
        brief: 'Normalise the mess-bill sheet to 3NF.',
        dueAt: new Date(Date.now() + 86400000),
      })
      .expect(201);
    const sub = await api()
      .post(`/api/v1/workshops/${w.body.data.id}/submissions`)
      .set(f.student.auth)
      .field('text', 'My tables are attached.')
      .attach('file', await makePdf('tables'), {
        filename: 'tables.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);
    // The storage key is never sent to clients.
    expect(sub.body.data.fileKey).toBeUndefined();
    expect(sub.body.data).toMatchObject({ hasFile: true, text: 'My tables are attached.' });

    const list = await api()
      .get(`/api/v1/subjects/${f.sid}/workshops`)
      .set(f.faculty.auth)
      .expect(200);
    expect(list.body.data).toEqual([
      expect.objectContaining({ topicTitle: 'Normalization', submitted: 1, graded: 0 }),
    ]);
    await api().get(`/api/v1/subjects/${f.sid}/workshops`).set(f.otherFaculty.auth).expect(403);
    await api().get(`/api/v1/subjects/${f.sid}/workshops`).set(f.student.auth).expect(403);
  });

  it('returns source chunks for review only to the subject faculty', async () => {
    const f = await dbmsFixture();
    await api()
      .post('/api/v1/materials')
      .set(f.faculty.auth)
      .field('kind', 'notes')
      .field('topicId', f.id('normalization'))
      .attach('file', await makePdf(NORMALIZATION_NOTES), {
        filename: 'notes.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);
    await queue().drain();
    const ids = (
      await Chunk.find({ topicId: f.id('normalization') })
        .limit(2)
        .lean()
    ).map((c) => String(c._id));
    const res = await api()
      .get(`/api/v1/ai/chunks?ids=${ids.join(',')}`)
      .set(f.faculty.auth)
      .expect(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0]).toMatchObject({ fileName: 'notes.pdf', text: expect.any(String) });
    expect(res.body.data[0].embedding).toBeUndefined();
    await api().get(`/api/v1/ai/chunks?ids=${ids[0]}`).set(f.otherFaculty.auth).expect(403);
    await api().get(`/api/v1/ai/chunks?ids=${ids[0]}`).set(f.student.auth).expect(403);
  });
});
