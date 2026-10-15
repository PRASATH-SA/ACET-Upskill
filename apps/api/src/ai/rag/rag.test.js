import { afterEach, describe, expect, it } from 'vitest';
import { api } from '../../../test/helpers.js';
import { dbmsFixture, makePdf } from '../../../test/fixtures.js';
import { setEnv, env } from '../../config/env.js';
import { Material } from '../../modules/content/model.js';
import { AiJob } from '../../modules/ai/model.js';
import { queue } from '../../modules/ai/queue.js';
import { gateway, setModelResolver } from '../gateway/index.js';
import { scheduleReembedIfStale } from '../pipelines/ingest.js';
import { chunkText, cleanText, estimateTokens, sections } from './chunk.js';
import { Chunk } from './model.js';
import { hasEnoughMaterial, retrieve } from './retrieve.js';

export const NORMALIZATION_NOTES = `NORMALIZATION

Normalization is the process of organising a relational database to reduce redundancy. We split large tables into smaller tables so that each fact is stored once. Splitting tables removes update, insertion and deletion anomalies.

First Normal Form

A table is in 1NF when every column holds atomic values and there are no repeating groups. Customer phone numbers are split into a separate table instead of a comma separated list.

Second Normal Form

A table is in 2NF when it is in 1NF and no non-key attribute depends on part of a composite key. Partial dependencies are removed by splitting the table on the determinant.

Third Normal Form

A table is in 3NF when it is in 2NF and no non-key attribute depends on another non-key attribute. Transitive dependencies are removed by splitting tables again, so that every table describes one thing. Decomposition must be lossless so the original table can be rebuilt with a join.`;

const INDEXING_NOTES = `INDEXING

An index is a data structure that speeds up lookups on disk. A B+ tree index keeps keys sorted in balanced pages so a search reads few blocks. Hash indexes give constant time equality lookups but cannot answer range queries. Clustered indexes store rows in key order while secondary indexes point to rows. Too many indexes slow down inserts and updates because each index must be maintained. The query optimiser chooses an index from statistics about selectivity and cost of disk access for every query plan.`;

async function upload(f, topicKey, text, kind = 'notes') {
  const pdf = await makePdf(text);
  const res = await api()
    .post('/api/v1/materials')
    .set(f.faculty.auth)
    .field('kind', kind)
    .field('topicId', f.id(topicKey))
    .attach('file', pdf, { filename: `${topicKey}.pdf`, contentType: 'application/pdf' });
  expect(res.status).toBe(201);
  await queue().drain();
  return res.body.data.id;
}

afterEach(() => {
  setModelResolver(undefined);
  gateway().provider.reset();
});

describe('chunking (A2.1)', () => {
  it('cleans PDF artefacts: hyphenated breaks, page numbers, extra spaces', () => {
    expect(cleanText('normal-\nization  is\n\n\n\nPage 3 of 9\nkey')).toBe(
      'normalization is\n\nkey',
    );
  });

  it('splits on headings first and keeps each section in its own chunk', () => {
    const s = sections(cleanText(NORMALIZATION_NOTES));
    expect(s.map((x) => x.heading)).toEqual([
      'NORMALIZATION',
      'First Normal Form',
      'Second Normal Form',
      'Third Normal Form',
    ]);
    const chunks = chunkText(NORMALIZATION_NOTES);
    expect(chunks.length).toBe(4);
    expect(chunks[3].heading).toBe('Third Normal Form');
    expect(chunks[3].text).toMatch(/Transitive dependencies/);
    expect(chunks.every((c, i) => c.index === i)).toBe(true);
  });

  it('packs long text into ≤ 800-token chunks with an 80-token overlap and loses nothing', () => {
    const para = (n) => `Sentence ${n} about relational keys and joins in a database.`;
    const text = Array.from({ length: 300 }, (_, i) => para(i)).join(' ');
    const chunks = chunkText(text);
    expect(chunks.length).toBeGreaterThan(2);
    for (const c of chunks) expect(c.tokenCount).toBeLessThanOrEqual(800);
    for (const c of chunks.slice(0, -1)) expect(c.tokenCount).toBeGreaterThanOrEqual(500);
    // Overlap: the next chunk starts with the end of the previous one.
    const tail = chunks[0].text.split(/\s+/).slice(-20).join(' ');
    expect(
      chunks[1].text.startsWith(tail.split(' ').slice(0, 5).join(' ')) ||
        chunks[1].text.includes(tail),
    ).toBe(true);
    // Every sentence survives.
    const joined = chunks.map((c) => c.text).join(' ');
    for (const i of [0, 150, 299]) expect(joined).toContain(para(i));
    expect(estimateTokens('one two three')).toBe(4);
  });
});

describe('ingestion and retrieval (A2 acceptance)', () => {
  it('uploading notes for Normalization produces embedded chunks within one job', async () => {
    const f = await dbmsFixture();
    const id = await upload(f, 'normalization', NORMALIZATION_NOTES);
    const material = await Material.findById(id).lean();
    expect(material.ingestStatus).toBe('done');
    expect(material.chunkCount).toBeGreaterThan(0);
    const chunks = await Chunk.find({ materialId: id }).lean();
    expect(chunks).toHaveLength(material.chunkCount);
    expect(chunks.every((c) => c.embedding.length > 0 && c.model === env().LLM_EMBED_MODEL)).toBe(
      true,
    );
    expect(String(chunks[0].topicId)).toBe(f.id('normalization'));
    const jobs = await AiJob.find({ 'input.materialId': id }).lean();
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({ status: 'succeeded', result: 'created' });
  });

  it('retrieve("why do we split tables") returns Normalization chunks first', async () => {
    const f = await dbmsFixture();
    await upload(f, 'normalization', NORMALIZATION_NOTES);
    await upload(f, 'indexing', INDEXING_NOTES);
    const topicScoped = await retrieve({
      query: 'why do we split tables',
      topicId: f.id('normalization'),
    });
    expect(topicScoped.scope).toBe('topic');
    expect(topicScoped.chunks.length).toBeGreaterThan(0);
    expect(topicScoped.chunks.every((c) => c.topicId === f.id('normalization'))).toBe(true);
    expect(topicScoped.chunks[0].text).toMatch(/split/i);

    const subjectScoped = await retrieve({
      query: 'why do we split tables',
      subjectId: f.sid,
      minScore: 0,
    });
    expect(subjectScoped.chunks[0].topicId).toBe(f.id('normalization'));
    const indexing = await retrieve({
      query: 'B+ tree index disk lookups',
      subjectId: f.sid,
      minScore: 0,
    });
    expect(indexing.chunks[0].topicId).toBe(f.id('indexing'));
  });

  it('falls back to subject scope only when the caller allows it', async () => {
    const f = await dbmsFixture();
    await upload(f, 'indexing', INDEXING_NOTES);
    const strict = await retrieve({
      query: 'index lookups disk',
      topicId: f.id('keys'),
      subjectId: f.sid,
    });
    expect(strict).toMatchObject({ scope: 'none', chunks: [] });
    const loose = await retrieve({
      query: 'index lookups disk',
      topicId: f.id('keys'),
      subjectId: f.sid,
      allowSubjectFallback: true,
    });
    expect(loose.scope).toBe('subject');
  });

  it('hasEnoughMaterial explains what is missing', async () => {
    const f = await dbmsFixture();
    expect(await hasEnoughMaterial(f.id('normalization'))).toMatchObject({
      enough: false,
      chunkCount: 0,
    });
    await upload(f, 'keys', 'Keys. A primary key identifies a row.');
    const thin = await hasEnoughMaterial(f.id('keys'));
    expect(thin.enough).toBe(false);
    expect(thin.reason).toMatch(/upload at least/);
    await upload(f, 'normalization', NORMALIZATION_NOTES);
    expect(await hasEnoughMaterial(f.id('normalization'))).toMatchObject({ enough: true });
  });

  it('skips files with no text and PYQ papers, and deleting a material deletes its chunks', async () => {
    const f = await dbmsFixture();
    const pyq = await upload(f, 'normalization', NORMALIZATION_NOTES, 'pyqPaper');
    expect((await Material.findById(pyq).lean()).ingestStatus).toBe('skipped');
    const notes = await upload(f, 'normalization', NORMALIZATION_NOTES);
    expect(await Chunk.countDocuments({ materialId: notes })).toBeGreaterThan(0);
    await api().delete(`/api/v1/materials/${notes}`).set(f.faculty.auth).expect(200);
    expect(await Chunk.countDocuments({ materialId: notes })).toBe(0);
  });

  it('a failed embedding marks the material failed and it can be re-ingested', async () => {
    const f = await dbmsFixture();
    gateway().provider.offline = true;
    const id = await upload(f, 'normalization', NORMALIZATION_NOTES);
    expect((await Material.findById(id).lean()).ingestStatus).toBe('failed');
    gateway().provider.offline = false;
    gateway().breaker.success();
    await api().post(`/api/v1/materials/${id}/ingest`).set(f.faculty.auth).expect(200);
    await queue().drain();
    expect((await Material.findById(id).lean()).ingestStatus).toBe('done');
  });
});

describe('embedding model changes (A2.2)', () => {
  it('re-embeds stale chunks, and search never mixes models meanwhile', async () => {
    const f = await dbmsFixture();
    await upload(f, 'normalization', NORMALIZATION_NOTES);
    const before = await Chunk.countDocuments({ topicId: f.id('normalization') });

    // The admin switches the embedding model.
    setModelResolver(() => ({ chatModel: env().LLM_CHAT_MODEL, embedModel: 'new-embed-model' }));
    const mixed = await retrieve({
      query: 'why do we split tables',
      topicId: f.id('normalization'),
    });
    expect(mixed.chunks).toEqual([]); // old vectors are not compared with the new model
    expect((await hasEnoughMaterial(f.id('normalization'))).reason).toMatch(/re-embedded/);

    const jobId = await scheduleReembedIfStale();
    expect(jobId).toBeTruthy();
    expect(await scheduleReembedIfStale()).toBeNull(); // one job at a time
    await queue().drain();
    expect(
      await Chunk.countDocuments({ model: 'new-embed-model', topicId: f.id('normalization') }),
    ).toBe(before);
    const after = await retrieve({
      query: 'why do we split tables',
      topicId: f.id('normalization'),
    });
    expect(after.chunks.length).toBeGreaterThan(0);
    expect(await scheduleReembedIfStale()).toBeNull();
  });

  it('exposes retrieval and coverage to faculty only', async () => {
    const f = await dbmsFixture();
    await upload(f, 'normalization', NORMALIZATION_NOTES);
    const res = await api()
      .post('/api/v1/ai/retrieve')
      .set(f.faculty.auth)
      .send({ query: 'split tables', topicId: f.id('normalization') })
      .expect(200);
    expect(res.body.data.chunks.length).toBeGreaterThan(0);
    await api()
      .post('/api/v1/ai/retrieve')
      .set(f.student.auth)
      .send({ query: 'x y', topicId: f.id('normalization') })
      .expect(403);
    await api()
      .post('/api/v1/ai/retrieve')
      .set(f.otherFaculty.auth)
      .send({ query: 'x y', topicId: f.id('normalization') })
      .expect(403);
    const cov = await api()
      .get(`/api/v1/ai/topics/${f.id('normalization')}/coverage`)
      .set(f.faculty.auth)
      .expect(200);
    expect(cov.body.data.enough).toBe(true);
  });
});

// Keep the env cache untouched for other files.
void setEnv;
