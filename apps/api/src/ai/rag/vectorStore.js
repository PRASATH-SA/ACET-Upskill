/**
 * VectorStore (A.3, A2.3). Callers use only `upsert`, `search` and `deleteByMaterial`, so this
 * MongoDB + in-process cosine implementation can be replaced by Atlas Vector Search or Qdrant
 * without touching them.
 *
 * MongoCosineVectorStore: pre-filters in Mongo by topic/subject AND embedding model (vectors
 * from different models are never compared), then scores candidates in Node. Simple and
 * correct for a college's material (thousands of chunks per subject); for far larger corpora
 * swap in an ANN index.
 */
import { Chunk } from './model.js';

export function cosine(a, b) {
  if (!a?.length || a.length !== b?.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

/**
 * @typedef {object} VectorStore
 * @property {(chunks: object[]) => Promise<void>} upsert
 * @property {(q: { vector: number[], model: string, topicId?: string, subjectId?: string, k: number, minScore: number }) => Promise<{ chunk: object, score: number }[]>} search
 * @property {(materialId: string) => Promise<void>} deleteByMaterial
 */

/** @implements {VectorStore} */
export class MongoCosineVectorStore {
  /** Replaces a material's chunks (re-ingesting is idempotent). */
  async upsert(materialId, chunks) {
    await Chunk.deleteMany({ materialId });
    if (chunks.length) await Chunk.insertMany(chunks.map((c) => ({ ...c, materialId })));
  }

  async search({ vector, model, topicId, subjectId, k, minScore, maxCandidates = 5000 }) {
    if (!topicId && !subjectId) throw new Error('search needs a topicId or subjectId pre-filter');
    const filter = {
      model,
      embedding: { $exists: true },
      ...(topicId ? { topicId } : { subjectId }),
    };
    const docs = await Chunk.find(filter).limit(maxCandidates).lean();
    return docs
      .map((chunk) => ({ chunk, score: cosine(vector, chunk.embedding) }))
      .filter((r) => r.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }

  async deleteByMaterial(materialId) {
    await Chunk.deleteMany({ materialId });
  }
}

let store = new MongoCosineVectorStore();
export const vectorStore = () => store;
export const setVectorStore = (s) => {
  store = s;
};
