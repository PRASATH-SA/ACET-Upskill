/**
 * A2.1 material.ingest: clean → chunk → embed in batches → save chunks with the model name.
 * A2.2 embeddings.reembed: re-embeds every chunk whose model differs from the current one.
 */
import { Material } from '../../modules/content/model.js';
import { registerPipeline } from '../../modules/ai/runner.js';
import { gateway } from '../gateway/index.js';
import { chunkText } from '../rag/chunk.js';
import { Chunk } from '../rag/model.js';
import { currentEmbedModel } from '../rag/retrieve.js';
import { vectorStore } from '../rag/vectorStore.js';

export const INGEST_JOB = 'material.ingest';
export const REEMBED_JOB = 'embeddings.reembed';
export const EMBED_BATCH = 16;

/** Material kinds that ground content drafts. PYQ papers are tagged separately (A3.4). */
export const INGESTIBLE_KINDS = ['notes', 'slides', 'syllabusPdf'];

async function embedAll(texts, ctx, from, to) {
  const vectors = [];
  let model;
  for (let i = 0; i < texts.length; i += EMBED_BATCH) {
    await ctx.checkCancelled();
    const out = await gateway().embed(texts.slice(i, i + EMBED_BATCH));
    vectors.push(...out.embeddings);
    model = out.model;
    const done = Math.min(i + EMBED_BATCH, texts.length);
    await ctx.progress(
      from + ((to - from) * done) / texts.length,
      `Embedding ${done}/${texts.length}`,
    );
  }
  return { vectors, model };
}

registerPipeline(INGEST_JOB, async (ctx) => {
  const material = await Material.findById(ctx.input.materialId);
  if (!material) throw Object.assign(new Error('Material no longer exists'), { code: 'NOT_FOUND' });
  await Material.updateOne(
    { _id: material._id },
    { $set: { ingestStatus: 'running', ingestError: null } },
  );
  try {
    await ctx.progress(5, 'Cleaning text');
    const pieces = chunkText(material.extractedText);
    if (!material.extractedText?.trim() || pieces.length === 0) {
      await Material.updateOne(
        { _id: material._id },
        { $set: { ingestStatus: 'skipped', chunkCount: 0 } },
      );
      await ctx.log('No readable text in this file; nothing to embed.', 'warn');
      return { result: 'noText', output: { chunks: 0 } };
    }
    await ctx.log(`Split into ${pieces.length} chunk(s)`);
    await ctx.progress(15, 'Embedding');
    const { vectors, model } = await embedAll(
      pieces.map((p) =>
        p.heading && !p.text.startsWith(p.heading) ? `${p.heading}\n${p.text}` : p.text,
      ),
      ctx,
      15,
      90,
    );
    await ctx.progress(92, 'Saving chunks');
    await vectorStore().upsert(
      material._id,
      pieces.map((p, i) => ({
        topicId: material.topicId,
        subjectId: material.subjectId,
        index: p.index,
        heading: p.heading,
        text: p.text,
        tokenCount: p.tokenCount,
        embedding: vectors[i],
        model,
      })),
    );
    await Material.updateOne(
      { _id: material._id },
      { $set: { ingestStatus: 'done', chunkCount: pieces.length } },
    );
    await ctx.log(`Saved ${pieces.length} chunk(s) embedded with ${model}`);
    return { result: 'created', output: { chunks: pieces.length, model } };
  } catch (err) {
    await Material.updateOne(
      { _id: material._id },
      { $set: { ingestStatus: 'failed', ingestError: err.message } },
    );
    throw err;
  }
});

/**
 * A2.2: if any chunk was embedded with another model (LLM_EMBED_MODEL or the A5 setting
 * changed), queue one re-embed job. Called at worker start and when the model setting changes.
 * Until it finishes, searches only use chunks of the current model, so models never mix.
 * @returns {Promise<string|null>} the job id, or null when nothing is stale or a job is running
 */
export async function scheduleReembedIfStale(createdBy = null) {
  const { AiJob } = await import('../../modules/ai/model.js');
  const { createJob } = await import('../../modules/ai/jobs.js');
  const model = await currentEmbedModel();
  const stale = await Chunk.exists({ model: { $ne: model } });
  if (!stale) return null;
  const active = await AiJob.exists({ type: REEMBED_JOB, status: { $in: ['queued', 'running'] } });
  if (active) return null;
  const job = await createJob({ type: REEMBED_JOB, createdBy });
  return String(job._id);
}

registerPipeline(REEMBED_JOB, async (ctx) => {
  const model = await currentEmbedModel();
  const filter = { model: { $ne: model } };
  const total = await Chunk.countDocuments(filter);
  await ctx.log(`${total} chunk(s) to re-embed with ${model}`);
  let done = 0;
  for (;;) {
    await ctx.checkCancelled();
    const batch = await Chunk.find(filter).select('text heading').limit(EMBED_BATCH).lean();
    if (!batch.length) break;
    const out = await gateway().embed(
      batch.map((c) => (c.heading ? `${c.heading}\n${c.text}` : c.text)),
    );
    await Chunk.bulkWrite(
      batch.map((c, i) => ({
        updateOne: {
          filter: { _id: c._id },
          update: { $set: { embedding: out.embeddings[i], model: out.model } },
        },
      })),
    );
    done += batch.length;
    await ctx.progress(total ? (done / total) * 99 : 99, `Re-embedded ${done}/${total}`);
  }
  return { result: 'created', output: { chunks: done, model } };
});
