/**
 * A3.4 pyq.tag: embeddings pick the 5 closest topics for each untagged PYQ, then the model
 * chooses only among those candidates (it never names topics freely). Tags are written to
 * draft PYQs only, with a confidence per topic; published PYQs are never changed.
 */
import { Pyq } from '../../modules/exam/model.js';
import { registerPipeline } from '../../modules/ai/runner.js';
import { Topic } from '../../modules/syllabus/model.js';
import { gateway } from '../gateway/index.js';
import { cosine } from '../rag/vectorStore.js';
import { PyqTagSchema } from '../schemas.js';
import { generate } from './helpers.js';

export const TAG_PYQS_JOB = 'pyq.tag';
const CANDIDATES = 5;
export const MIN_TAG_CONFIDENCE = 0.4;
const EMBED_BATCH = 16;

async function embedMany(texts) {
  const out = [];
  for (let i = 0; i < texts.length; i += EMBED_BATCH) {
    out.push(...(await gateway().embed(texts.slice(i, i + EMBED_BATCH))).embeddings);
  }
  return out;
}

registerPipeline(TAG_PYQS_JOB, async (ctx) => {
  const subjectId = ctx.input.subjectId;
  const [topics, pyqs] = await Promise.all([
    Topic.find({ subjectId }).select('title summary').lean(),
    Pyq.find({ subjectId, status: { $in: ['draft', 'inReview'] }, topicIds: { $size: 0 } }).lean(),
  ]);
  if (!topics.length) {
    return {
      result: 'needsMaterial',
      output: { reason: 'The subject has no topics to tag against yet.' },
    };
  }
  if (!pyqs.length) {
    await ctx.log('No untagged draft PYQs in this subject.');
    return { result: 'nothingToDo', output: { tagged: 0 } };
  }
  await ctx.log(`${pyqs.length} untagged PYQ(s), ${topics.length} topic(s)`);

  await ctx.progress(5, 'Embedding topics');
  const topicVecs = await embedMany(topics.map((t) => `${t.title}. ${t.summary ?? ''}`));
  await ctx.progress(15, 'Embedding questions');
  const pyqVecs = await embedMany(pyqs.map((p) => p.text));

  let tagged = 0;
  for (const [i, pyq] of pyqs.entries()) {
    await ctx.progress(20 + (78 * i) / pyqs.length, `Tagging question ${i + 1}/${pyqs.length}`);
    const candidates = topics
      .map((t, j) => ({ t, score: cosine(pyqVecs[i], topicVecs[j]) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, CANDIDATES);
    const gen = await generate(
      ctx,
      'pyq.tag',
      {
        question: pyq.text,
        marks: pyq.marks,
        candidates: candidates.map((c, k) => `${k + 1}. ${c.t.title}`).join('\n'),
      },
      PyqTagSchema,
    );
    const picks = new Map();
    for (const p of gen.data.picks) {
      const c = candidates[p.candidate - 1];
      if (!c || p.confidence < MIN_TAG_CONFIDENCE) continue; // outside the candidates: ignored
      const id = String(c.t._id);
      picks.set(id, Math.max(picks.get(id) ?? 0, Math.round(p.confidence * 100) / 100));
    }
    if (!picks.size) {
      await ctx.log(`No confident topic for: "${pyq.text.slice(0, 60)}…"`, 'warn');
      continue;
    }
    await Pyq.updateOne(
      { _id: pyq._id, status: { $in: ['draft', 'inReview'] }, topicIds: { $size: 0 } },
      {
        $set: {
          topicIds: [...picks.keys()],
          tagConfidence: Object.fromEntries(picks),
          aiMeta: {
            model: gen.meta.model,
            promptVersion: gen.promptVersion,
            jobId: ctx.job._id,
            sourceChunkIds: [],
          },
        },
      },
    );
    tagged += 1;
  }
  return { result: 'created', output: { tagged, untagged: pyqs.length - tagged } };
});
