import { afterEach, describe, expect, it } from 'vitest';
import { api } from '../../../test/helpers.js';
import { dbmsFixture, makePdf } from '../../../test/fixtures.js';
import { NORMALIZATION_NOTES } from '../../../test/fixtures/notes.js';
import { scriptContentModel } from '../../../test/mockModel.js';
import { gateway } from '../../ai/gateway/index.js';
import { env } from '../../config/env.js';
import { AiJob } from '../ai/model.js';
import { queue } from '../ai/queue.js';
import { Resource } from '../content/model.js';
import { Settings, clearSettingsCache } from './service.js';

afterEach(async () => {
  gateway().provider.reset();
  gateway().provider.models = [env().LLM_CHAT_MODEL, env().LLM_EMBED_MODEL];
  await Settings.deleteMany({});
  clearSettingsCache();
});

describe('admin AI settings (A5.3)', () => {
  it('shows health, models, queue size and recent failures to admins only', async () => {
    const f = await dbmsFixture();
    await AiJob.create({
      type: 'topic.draftContent',
      status: 'failed',
      error: { code: 'AI_VALIDATION_FAILED', message: 'bad json' },
      finishedAt: new Date(),
    });
    await AiJob.create({ type: 'topic.draftContent', status: 'queued' });
    const res = await api().get('/api/v1/admin/ai').set(f.admin.auth).expect(200);
    expect(res.body.data.health).toMatchObject({ reachable: true, provider: 'mock' });
    expect(res.body.data.settings).toMatchObject({
      chatModel: env().LLM_CHAT_MODEL,
      overrides: { chatModel: null },
    });
    expect(res.body.data.queue.queued).toBeGreaterThanOrEqual(1);
    expect(res.body.data.recentFailures[0]).toMatchObject({
      type: 'topic.draftContent',
      error: { message: 'bad json' },
    });
    await api().get('/api/v1/admin/ai').set(f.faculty.auth).expect(403);
  });

  it('only accepts models that are pulled on the server', async () => {
    const f = await dbmsFixture();
    const res = await api()
      .put('/api/v1/admin/ai/settings')
      .set(f.admin.auth)
      .send({ chatModel: 'not-pulled:7b' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/not pulled/);
    await api()
      .put('/api/v1/admin/ai/settings')
      .set(f.faculty.auth)
      .send({ chatModel: 'x' })
      .expect(403);
  });

  it('a chat model change takes effect for new jobs without a restart', async () => {
    const f = await dbmsFixture('draft');
    gateway().provider.models.push('llama3.1:8b');
    await api()
      .post('/api/v1/materials')
      .set(f.faculty.auth)
      .field('kind', 'notes')
      .field('topicId', f.id('normalization'))
      .attach('file', await makePdf(NORMALIZATION_NOTES), {
        filename: 'n.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);
    await queue().drain();
    scriptContentModel();

    const set = await api()
      .put('/api/v1/admin/ai/settings')
      .set(f.admin.auth)
      .send({ chatModel: 'llama3.1:8b' })
      .expect(200);
    expect(set.body.data.settings).toMatchObject({
      chatModel: 'llama3.1:8b',
      overrides: { chatModel: 'llama3.1:8b' },
    });

    const started = await api()
      .post(`/api/v1/ai/topics/${f.id('normalization')}/draft-content`)
      .set(f.faculty.auth)
      .send({ kinds: ['easy'] })
      .expect(202);
    await queue().drain();
    const job = await AiJob.findById(started.body.data.jobId).lean();
    expect(job.model).toBe('llama3.1:8b');
    expect(gateway().provider.calls.at(-1).model).toBe('llama3.1:8b');
    const easy = await Resource.findOne({ topicId: f.id('normalization'), kind: 'easy' }).lean();
    expect(easy.aiMeta.model).toBe('llama3.1:8b');

    // null returns to the env default.
    await api()
      .put('/api/v1/admin/ai/settings')
      .set(f.admin.auth)
      .send({ chatModel: null })
      .expect(200);
    expect((await gateway().models()).chatModel).toBe(env().LLM_CHAT_MODEL);
  });

  it('an embedding model change schedules re-embedding of existing chunks', async () => {
    const f = await dbmsFixture();
    gateway().provider.models.push('mxbai-embed-large');
    await api()
      .post('/api/v1/materials')
      .set(f.faculty.auth)
      .field('kind', 'notes')
      .field('topicId', f.id('normalization'))
      .attach('file', await makePdf(NORMALIZATION_NOTES), {
        filename: 'n.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);
    await queue().drain();
    const res = await api()
      .put('/api/v1/admin/ai/settings')
      .set(f.admin.auth)
      .send({ embedModel: 'mxbai-embed-large' })
      .expect(200);
    expect(res.body.data.reembedJobId).toBeTruthy();
    await queue().drain();
    const job = await AiJob.findById(res.body.data.reembedJobId).lean();
    expect(job).toMatchObject({ type: 'embeddings.reembed', status: 'succeeded' });
    expect(job.output.model).toBe('mxbai-embed-large');
  });
});
