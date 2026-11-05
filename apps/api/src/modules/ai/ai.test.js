import { afterEach, describe, expect, it } from 'vitest';
import { api } from '../../../test/helpers.js';
import { dbmsFixture } from '../../../test/fixtures.js';
import { gateway } from '../../ai/gateway/index.js';
import { createJob } from './jobs.js';
import { queue } from './queue.js';
import { registerPipeline } from './runner.js';

/** Parses a full SSE body into [{ event, data }]. */
function parseSse(text) {
  return text
    .split('\n\n')
    .filter((b) => b.includes('data:'))
    .map((b) => ({
      event: b.match(/^event: (.+)$/m)?.[1],
      data: JSON.parse(b.match(/^data: (.+)$/m)[1]),
    }));
}

let gate;
registerPipeline('test.steps', async (ctx) => {
  await ctx.progress(30, 'Step one');
  await ctx.log('did step one');
  if (gate) await gate;
  await ctx.checkCancelled();
  await ctx.progress(80, 'Step two');
  return { result: 'created', output: { things: 2 } };
});
registerPipeline('test.boom', async () => {
  throw Object.assign(new Error('model exploded'), { code: 'AI_VALIDATION_FAILED' });
});

afterEach(() => {
  gateway().provider.reset();
  gate = null;
});

describe('AI health (A1.5)', () => {
  it('reports provider, models and reachability', async () => {
    const f = await dbmsFixture();
    const res = await api().get('/api/v1/ai/health').set(f.student.auth).expect(200);
    expect(res.body.data).toMatchObject({ provider: 'mock', reachable: true, modelsPulled: true });
    expect(res.body.data.chatModel).toBeTruthy();
  });

  it('with the model server stopped: health says unreachable and the rest of the API works', async () => {
    const f = await dbmsFixture();
    gateway().provider.offline = true;
    const res = await api().get('/api/v1/ai/health').set(f.faculty.auth).expect(200);
    expect(res.body.data).toMatchObject({ reachable: false, modelsPulled: false });
    await api().get(`/api/v1/subjects/${f.sid}/map`).set(f.student.auth).expect(200);
    await api().get('/api/v1/health').expect(200);
  });

  it('requires sign-in', async () => {
    await api().get('/api/v1/ai/health').expect(401);
  });
});

describe('AI jobs (A1.6)', () => {
  it('runs a job, records progress and logs, and streams snapshot → progress → done over SSE', async () => {
    const f = await dbmsFixture();
    let open;
    gate = new Promise((r) => (open = r));
    const job = await createJob({
      type: 'test.steps',
      createdBy: f.faculty.id,
      subjectId: f.subject._id,
    });
    const id = String(job._id);

    const stream = api()
      .get(`/api/v1/ai/jobs/${id}/events`)
      .set(f.faculty.auth)
      .buffer(true)
      .parse((res, cb) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => cb(null, body));
      });
    setTimeout(() => open(), 300);
    const res = await stream;
    expect(res.headers['content-type']).toMatch(/text\/event-stream/);
    const events = parseSse(res.body);
    expect(events[0].event).toBe('snapshot');
    expect(events.at(-1).event).toBe('done');
    expect(events.at(-1).data).toMatchObject({
      status: 'succeeded',
      progress: 100,
      result: 'created',
      output: { things: 2 },
    });
    const logs = events.flatMap((e) => e.data.logs ?? []).map((l) => l.message);
    expect(logs).toContain('did step one');

    const got = await api().get(`/api/v1/ai/jobs/${id}`).set(f.faculty.auth).expect(200);
    expect(got.body.data.status).toBe('succeeded');
  });

  it('a failing pipeline marks the job failed with a clear error', async () => {
    const f = await dbmsFixture();
    const job = await createJob({
      type: 'test.boom',
      createdBy: f.faculty.id,
      subjectId: f.subject._id,
    });
    await queue().drain();
    const res = await api().get(`/api/v1/ai/jobs/${job._id}`).set(f.faculty.auth).expect(200);
    expect(res.body.data).toMatchObject({
      status: 'failed',
      error: { code: 'AI_VALIDATION_FAILED', message: 'model exploded' },
    });
  });

  it('cancel stops a running job at its next step', async () => {
    const f = await dbmsFixture();
    let open;
    gate = new Promise((r) => (open = r));
    const job = await createJob({
      type: 'test.steps',
      createdBy: f.faculty.id,
      subjectId: f.subject._id,
    });
    // Wait until the job is running.
    for (let i = 0; i < 50; i++) {
      const j = await api().get(`/api/v1/ai/jobs/${job._id}`).set(f.faculty.auth);
      if (j.body.data.status === 'running') break;
      await new Promise((r) => setTimeout(r, 20));
    }
    await api().post(`/api/v1/ai/jobs/${job._id}/cancel`).set(f.faculty.auth).expect(200);
    open();
    await queue().drain();
    const res = await api().get(`/api/v1/ai/jobs/${job._id}`).set(f.faculty.auth).expect(200);
    expect(res.body.data.status).toBe('cancelled');
    expect(res.body.data.progress).toBeLessThan(80);
    await api().post(`/api/v1/ai/jobs/${job._id}/cancel`).set(f.faculty.auth).expect(422);
  });

  it('only the owner, the subject faculty or an admin can see a job', async () => {
    const f = await dbmsFixture();
    const job = await createJob({
      type: 'test.steps',
      createdBy: f.faculty.id,
      subjectId: f.subject._id,
    });
    await queue().drain();
    await api().get(`/api/v1/ai/jobs/${job._id}`).set(f.otherFaculty.auth).expect(403);
    await api().get(`/api/v1/ai/jobs/${job._id}`).set(f.student.auth).expect(403);
    await api().get(`/api/v1/ai/jobs/${job._id}`).set(f.admin.auth).expect(200);
    const list = await api()
      .get(`/api/v1/ai/jobs?subjectId=${f.sid}`)
      .set(f.faculty.auth)
      .expect(200);
    expect(list.body.data.map((j) => j.id)).toContain(String(job._id));
  });
});
