/**
 * Retrieval and the material coverage check (A2.4, A2.5).
 */
import { env } from '../../config/env.js';
import { gateway } from '../gateway/index.js';
import { Chunk } from './model.js';
import { vectorStore } from './vectorStore.js';

/** The embedding model new vectors and queries use (env, or the A5 runtime setting). */
export async function currentEmbedModel() {
  return (await gateway().models()).embedModel;
}

const view = ({ chunk, score }) => ({
  id: String(chunk._id),
  materialId: String(chunk.materialId),
  topicId: chunk.topicId ? String(chunk.topicId) : null,
  subjectId: String(chunk.subjectId),
  heading: chunk.heading,
  text: chunk.text,
  tokenCount: chunk.tokenCount,
  score: Math.round(score * 1000) / 1000,
});

/**
 * Topic-scoped retrieval first; subject scope only when the caller allows it and the topic
 * returned too little. Only chunks embedded with the current model are searched.
 * @param {{ query: string, topicId?: string, subjectId?: string, k?: number, minScore?: number, allowSubjectFallback?: boolean }} q
 * @returns {Promise<{ chunks: object[], scope: 'topic'|'subject'|'none', model: string }>}
 */
export async function retrieve({
  query,
  topicId,
  subjectId,
  k,
  minScore,
  allowSubjectFallback = false,
}) {
  const cfg = env();
  k ??= cfg.RAG_TOP_K;
  minScore ??= cfg.RAG_MIN_SCORE;
  const { embeddings, model } = await gateway().embed([query]);
  const vector = embeddings[0];
  if (topicId) {
    const hits = await vectorStore().search({ vector, model, topicId, k, minScore });
    if (hits.length >= Math.min(k, cfg.RAG_MIN_CHUNKS) || !allowSubjectFallback || !subjectId) {
      return { chunks: hits.map(view), scope: hits.length ? 'topic' : 'none', model };
    }
  }
  if (subjectId && (allowSubjectFallback || !topicId)) {
    const hits = await vectorStore().search({ vector, model, subjectId, k, minScore });
    return { chunks: hits.map(view), scope: hits.length ? 'subject' : 'none', model };
  }
  return { chunks: [], scope: 'none', model };
}

/**
 * A2.5: is there enough embedded faculty material for this topic to ground AI drafts?
 * Used by A3 to end a job with `needsMaterial` instead of inventing content.
 * @returns {Promise<{ enough: boolean, reason: string, chunkCount: number, words: number, staleChunks: number }>}
 */
export async function hasEnoughMaterial(topicId) {
  const cfg = env();
  const model = await currentEmbedModel();
  const [chunks, stale] = await Promise.all([
    Chunk.find({ topicId, model }).select('text').lean(),
    Chunk.countDocuments({ topicId, model: { $ne: model } }),
  ]);
  const words = chunks.reduce((n, c) => n + (c.text.match(/\S+/g)?.length ?? 0), 0);
  const base = { chunkCount: chunks.length, words, staleChunks: stale };
  if (chunks.length === 0) {
    return {
      enough: false,
      reason: stale
        ? 'The notes for this topic are being re-embedded for the new model. Try again shortly.'
        : 'No notes or slides with readable text are uploaded for this topic yet.',
      ...base,
    };
  }
  if (chunks.length < cfg.RAG_MIN_CHUNKS || words < cfg.RAG_MIN_WORDS) {
    return {
      enough: false,
      reason: `Only ${words} words of material for this topic; upload at least ${cfg.RAG_MIN_WORDS} words of notes.`,
      ...base,
    };
  }
  return { enough: true, reason: 'ok', ...base };
}
