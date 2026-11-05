/**
 * Feature 1 mcq.variants: new questions on the same concept as an existing MCQ, so a quiz can
 * give different students different variants. Grounded in the topic's material (A.7.4), each
 * variant is self-checked like A3.3, and everything is saved as an AI draft for faculty review.
 */
import { Question } from '../../modules/content/model.js';
import { registerPipeline } from '../../modules/ai/runner.js';
import { Topic } from '../../modules/syllabus/model.js';
import { hasEnoughMaterial } from '../rag/retrieve.js';
import { McqVariantsSchema, SelfCheckSchema } from '../schemas.js';
import { materialFor, optionsList } from './draftContent.js';
import { aiMeta, generate, normalizeTitle } from './helpers.js';

export const VARIANTS_JOB = 'mcq.variants';

const describe = (q) =>
  [
    `Question: ${q.stem}`,
    `Options:\n${optionsList(q.options)}`,
    `Correct option: ${q.correctIndex}`,
    q.explanation ? `Why: ${q.explanation}` : null,
  ]
    .filter(Boolean)
    .join('\n');

registerPipeline(VARIANTS_JOB, async (ctx) => {
  const source = await Question.findById(ctx.input.questionId).lean();
  if (!source || source.type !== 'mcq')
    throw Object.assign(new Error('Question not found'), { code: 'NOT_FOUND' });
  const topic = await Topic.findById(source.topicId).lean();
  if (!topic) throw Object.assign(new Error('Topic not found'), { code: 'NOT_FOUND' });
  const count = ctx.input.count ?? 3;

  await ctx.progress(5, 'Checking material');
  const coverage = await hasEnoughMaterial(String(topic._id));
  if (!coverage.enough) {
    await ctx.log(coverage.reason, 'warn');
    return { result: 'needsMaterial', output: { reason: coverage.reason, words: coverage.words } };
  }

  // The source joins a named pool so it and its variants are served one-per-quiz.
  const conceptKey = source.conceptKey || String(source._id);
  if (!source.conceptKey) await Question.updateOne({ _id: source._id }, { $set: { conceptKey } });

  await ctx.progress(15, 'Finding the relevant notes');
  const material = await materialFor(topic);
  const pool = await Question.find({ topicId: topic._id, conceptKey }).select('stem').lean();
  const seen = new Set([source.stem, ...pool.map((p) => p.stem)].map(normalizeTitle));

  await ctx.progress(30, 'Writing variants');
  const gen = await generate(
    ctx,
    VARIANTS_JOB,
    {
      topicTitle: topic.title,
      material: material.text,
      original: describe(source),
      count,
      avoid: pool.map((p) => p.stem).join(' | ') || 'none',
    },
    McqVariantsSchema,
  );
  const fresh = [];
  for (const q of gen.data.questions) {
    const k = normalizeTitle(q.stem);
    if (seen.has(k)) continue;
    seen.add(k);
    fresh.push(q);
    if (fresh.length >= count) break;
  }

  await ctx.progress(65, 'Self-checking variants');
  let flagged = 0;
  for (const q of fresh) {
    const check = await generate(
      ctx,
      'mcq.selfCheck',
      { material: material.text, question: q.stem, options: optionsList(q.options) },
      SelfCheckSchema,
    );
    q.needsAttention = check.data.answerIndex !== q.correctIndex;
    if (q.needsAttention) flagged += 1;
  }
  if (flagged) await ctx.log(`${flagged} variant(s) flagged: the self-check disagreed`, 'warn');

  const meta = aiMeta(gen, ctx, material.chunkIds);
  const docs = await Question.insertMany(
    fresh.map((q) => ({
      topicId: topic._id,
      subjectId: topic.subjectId,
      type: 'mcq',
      stem: q.stem,
      options: q.options,
      correctIndex: q.correctIndex,
      explanation: q.explanation,
      optionExplanations: q.optionExplanations,
      difficulty: q.difficulty,
      conceptKey,
      variantOf: source._id,
      needsAttention: q.needsAttention,
      status: 'draft',
      source: 'ai',
      createdBy: ctx.job.createdBy,
      aiMeta: meta,
    })),
  );
  await ctx.log(`Saved ${docs.length} variant(s) for faculty review`);
  return {
    result: 'created',
    output: { questions: docs.map((d) => String(d._id)), conceptKey },
  };
});
