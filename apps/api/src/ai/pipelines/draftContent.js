/**
 * A3.2 topic.draftContent: grounded drafts for one topic, one small call per kind.
 * A3.3 MCQ self-check: a second call answers each MCQ from the same chunks; a disagreement
 * flags the item `needsAttention` for faculty instead of discarding it.
 *
 * Grounding (A.7.4): no material → result `needsMaterial` and nothing is created.
 * Idempotency (A3.6): re-running replaces only earlier unapproved, unedited AI drafts of the
 * same kind; approved, published and faculty-written content is never touched.
 */
import { Flashcard, Question, Resource } from '../../modules/content/model.js';
import { registerPipeline } from '../../modules/ai/runner.js';
import { Topic, Unit } from '../../modules/syllabus/model.js';
import { Chunk } from '../rag/model.js';
import { currentEmbedModel, hasEnoughMaterial, retrieve } from '../rag/retrieve.js';
import {
  CuriositySchema,
  EasySchema,
  FlashcardsSchema,
  McqsSchema,
  RealWorldSchema,
  SelfCheckSchema,
  TenMarkSchema,
} from '../schemas.js';
import { aiMeta, formatMaterial, generate, normalizeTitle } from './helpers.js';

export const DRAFT_CONTENT_JOB = 'topic.draftContent';
export const DRAFT_KINDS = ['easy', 'tenMark', 'flashcards', 'mcq', 'curiosity', 'realWorld'];
const FLASHCARD_CALLS = 3; // 5 per call, up to 15 (A3.2)
const MCQ_CALLS = 2; // 5 per call
const UNAPPROVED = { $in: ['draft', 'inReview'] };

/** Earlier AI drafts that may be replaced: unapproved and not edited by faculty. */
const replaceable = (topicId) => ({
  topicId,
  source: 'ai',
  status: UNAPPROVED,
  editedAfterAi: { $ne: true },
});

/** Exam study material as markdown: notes for long answers, then short answers and exam tips. */
export function renderTenMark(d) {
  return [
    `**Definition.** ${d.definition}`,
    `**Need.** ${d.need}`,
    d.keyTerms?.length &&
      `**Key terms**\n\n${d.keyTerms.map((k) => `- **${k.term}**: ${k.meaning}`).join('\n')}`,
    `**Explanation**\n\n${d.points.map((p, i) => `${i + 1}. **${p.heading}**: ${p.text}`).join('\n')}`,
    `**Example / diagram.** ${d.example}`,
    `**Advantages**\n\n${d.advantages.map((a) => `- ${a}`).join('\n')}`,
    `**Conclusion.** ${d.conclusion}`,
    d.shortAnswers?.length &&
      `**Short answers (2 marks)**\n\n${d.shortAnswers.map((q) => `- **${q.question}** ${q.answer}`).join('\n')}`,
    d.examTips?.length && `**Exam tips**\n\n${d.examTips.map((t) => `- ${t}`).join('\n')}`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

/** Retrieval for drafting: the best-matching chunks, or the topic's chunks in order as a fallback. */
export async function materialFor(topic) {
  const hit = await retrieve({
    query: `${topic.title}. ${topic.summary ?? ''}`,
    topicId: String(topic._id),
    k: 8,
  });
  if (hit.chunks.length) return formatMaterial(hit.chunks);
  const model = await currentEmbedModel();
  const chunks = await Chunk.find({ topicId: topic._id, model })
    .sort({ materialId: 1, index: 1 })
    .limit(12)
    .lean();
  return formatMaterial(chunks.map((c) => ({ ...c, id: c._id })));
}

export const optionsList = (opts) => opts.map((o, i) => `${i}. ${o}`).join('\n');

/** "Unit 3 (Database Design): Normalization: summary" — the syllabus line for grounding. */
export async function syllabusLineFor(topic) {
  const unit = await Unit.findById(topic.unitId).lean();
  return `${unit ? `Unit ${unit.number} (${unit.title}): ` : ''}${topic.title}${topic.summary ? `: ${topic.summary}` : ''}`;
}

registerPipeline(DRAFT_CONTENT_JOB, async (ctx) => {
  const topic = await Topic.findById(ctx.input.topicId).lean();
  if (!topic) throw Object.assign(new Error('Topic not found'), { code: 'NOT_FOUND' });
  const kinds = DRAFT_KINDS.filter((k) => (ctx.input.kinds ?? DRAFT_KINDS).includes(k));

  await ctx.progress(3, 'Checking material');
  const coverage = await hasEnoughMaterial(String(topic._id));
  if (!coverage.enough) {
    await ctx.log(coverage.reason, 'warn');
    return { result: 'needsMaterial', output: { reason: coverage.reason, words: coverage.words } };
  }

  await ctx.progress(8, 'Finding the relevant notes');
  const material = await materialFor(topic);
  const unit = await Unit.findById(topic.unitId).lean();
  const syllabusLine = `${unit ? `Unit ${unit.number} (${unit.title}): ` : ''}${topic.title}${topic.summary ? `: ${topic.summary}` : ''}`;
  const common = { topicTitle: topic.title, syllabusLine, material: material.text };
  const base = {
    topicId: topic._id,
    subjectId: topic.subjectId,
    status: 'draft',
    source: 'ai',
    createdBy: ctx.job.createdBy,
  };
  await ctx.log(`Grounding on ${material.chunkIds.length} chunk(s) of faculty material`);

  const created = { resources: [], flashcards: [], questions: [] };
  const failures = [];
  const step = (i) => 10 + (85 * i) / kinds.length;

  for (const [i, kind] of kinds.entries()) {
    await ctx.progress(step(i), `Drafting ${kind}`);
    try {
      if (kind === 'easy') {
        const gen = await generate(ctx, 'topic.easy', common, EasySchema);
        await Resource.deleteMany({ ...replaceable(topic._id), kind: 'easy' });
        const body = `${gen.data.text.trim()}\n\n> **Think of it like this:** ${gen.data.analogy.trim()}`;
        const r = await Resource.create({
          ...base,
          kind: 'easy',
          title: 'In simple words',
          body,
          aiMeta: aiMeta(gen, ctx, material.chunkIds),
        });
        created.resources.push(String(r._id));
      }

      if (kind === 'tenMark') {
        const gen = await generate(ctx, 'topic.tenMark', common, TenMarkSchema);
        await Resource.deleteMany({ ...replaceable(topic._id), kind: 'tenMark' });
        const r = await Resource.create({
          ...base,
          kind: 'tenMark',
          title: `Exam study material: ${topic.title}`.slice(0, 160),
          body: renderTenMark(gen.data),
          aiMeta: aiMeta(gen, ctx, material.chunkIds),
        });
        created.resources.push(String(r._id));
      }

      if (kind === 'flashcards') {
        const kept = await Flashcard.find({ topicId: topic._id, $nor: [replaceable(topic._id)] })
          .select('front')
          .lean();
        const seen = new Set(kept.map((c) => normalizeTitle(c.front)));
        const cards = [];
        let gen;
        for (let call = 0; call < FLASHCARD_CALLS; call++) {
          gen = await generate(
            ctx,
            'topic.flashcards',
            {
              topicTitle: topic.title,
              material: material.text,
              avoid:
                [...kept.map((c) => c.front), ...cards.map((c) => c.front)].join(' | ') || 'none',
            },
            FlashcardsSchema,
          );
          for (const c of gen.data.cards) {
            const k = normalizeTitle(c.front);
            if (seen.has(k)) continue;
            seen.add(k);
            cards.push({ ...c, aiMeta: aiMeta(gen, ctx, material.chunkIds) });
          }
        }
        await Flashcard.deleteMany(replaceable(topic._id));
        const docs = await Flashcard.insertMany(
          cards.map((c) => ({ ...base, front: c.front, back: c.back, aiMeta: c.aiMeta })),
        );
        created.flashcards.push(...docs.map((d) => String(d._id)));
      }

      if (kind === 'mcq') {
        const kept = await Question.find({
          topicId: topic._id,
          type: 'mcq',
          $nor: [replaceable(topic._id)],
        })
          .select('stem')
          .lean();
        const seen = new Set(kept.map((q) => normalizeTitle(q.stem)));
        const qs = [];
        for (let call = 0; call < MCQ_CALLS; call++) {
          const gen = await generate(
            ctx,
            'topic.mcqs',
            {
              topicTitle: topic.title,
              material: material.text,
              avoid: [...kept.map((q) => q.stem), ...qs.map((q) => q.stem)].join(' | ') || 'none',
            },
            McqsSchema,
          );
          for (const q of gen.data.questions) {
            const k = normalizeTitle(q.stem);
            if (seen.has(k)) continue;
            seen.add(k);
            qs.push({ ...q, aiMeta: aiMeta(gen, ctx, material.chunkIds) });
          }
        }
        // A3.3 self-check: answer each question from the chunks only.
        await ctx.progress(step(i + 0.6), 'Self-checking questions');
        let flagged = 0;
        for (const q of qs) {
          const check = await generate(
            ctx,
            'mcq.selfCheck',
            { material: material.text, question: q.stem, options: optionsList(q.options) },
            SelfCheckSchema,
          );
          q.needsAttention = check.data.answerIndex !== q.correctIndex;
          if (q.needsAttention) flagged += 1;
        }
        if (flagged)
          await ctx.log(
            `${flagged} question(s) flagged for attention: the self-check disagreed`,
            'warn',
          );
        await Question.deleteMany({ ...replaceable(topic._id), type: 'mcq' });
        const docs = await Question.insertMany(
          qs.map((q) => ({
            ...base,
            type: 'mcq',
            stem: q.stem,
            options: q.options,
            correctIndex: q.correctIndex,
            explanation: q.explanation,
            optionExplanations: q.optionExplanations,
            difficulty: q.difficulty,
            needsAttention: q.needsAttention,
            aiMeta: q.aiMeta,
          })),
        );
        created.questions.push(...docs.map((d) => String(d._id)));
      }

      if (kind === 'curiosity') {
        const gen = await generate(
          ctx,
          'topic.curiosity',
          { topicTitle: topic.title, material: material.text },
          CuriositySchema,
        );
        const meta = aiMeta(gen, ctx, material.chunkIds);
        await Resource.deleteMany({ ...replaceable(topic._id), kind: 'curiosity' });
        await Question.deleteMany({ ...replaceable(topic._id), type: 'curiosity' });
        const r = await Resource.create({
          ...base,
          kind: 'curiosity',
          title: gen.data.title,
          body: gen.data.scenario,
          aiMeta: meta,
        });
        const q = await Question.create({
          ...base,
          type: 'curiosity',
          stem: gen.data.question,
          options: gen.data.options,
          correctIndex: gen.data.correctIndex,
          explanation: gen.data.explanation,
          optionExplanations: gen.data.optionExplanations,
          difficulty: 'easy',
          aiMeta: meta,
        });
        created.resources.push(String(r._id));
        created.questions.push(String(q._id));
      }

      if (kind === 'realWorld') {
        const gen = await generate(
          ctx,
          'topic.realWorld',
          { topicTitle: topic.title, material: material.text },
          RealWorldSchema,
        );
        const meta = aiMeta(gen, ctx, material.chunkIds);
        await Resource.deleteMany({
          ...replaceable(topic._id),
          kind: { $in: ['realWorld', 'workshop'] },
        });
        const uses = await Resource.create({
          ...base,
          kind: 'realWorld',
          title: 'Where this is used',
          body: gen.data.uses.map((u) => `- ${u}`).join('\n'),
          aiMeta: meta,
        });
        const w = gen.data.workshop;
        const brief = await Resource.create({
          ...base,
          kind: 'workshop',
          title: w.title,
          body: `${w.brief}\n\n**Submit:** ${w.deliverable}`,
          aiMeta: meta,
        });
        created.resources.push(String(uses._id), String(brief._id));
      }
    } catch (err) {
      if (err.name === 'JobCancelledError') throw err;
      failures.push({ kind, code: err.code ?? 'INTERNAL', message: err.message });
      await ctx.log(`Could not draft ${kind}: ${err.message}`, 'error');
      // The AI server going away fails the job at once; a bad answer for one kind does not.
      if (err.code === 'AI_OFFLINE') break;
    }
  }

  const total = created.resources.length + created.flashcards.length + created.questions.length;
  if (failures.length) {
    const e = new Error(
      `Drafted ${total} item(s), but these failed: ${failures.map((f) => `${f.kind} (${f.message})`).join('; ')}`,
    );
    e.code = failures.some((f) => f.code === 'AI_OFFLINE') ? 'AI_OFFLINE' : 'AI_VALIDATION_FAILED';
    e.output = { ...created, failures };
    throw e;
  }
  await ctx.log(`Saved ${total} draft item(s) for faculty review`);
  return { result: 'created', output: created };
});
