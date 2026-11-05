/**
 * Feature 13 explain-it-back.
 *
 * rubric.draft   — drafts a rubric from the topic's material (A.7.4); saved as an AI draft that
 *                  faculty edit and publish. No material → needsMaterial, nothing created.
 * explain.score  — transcribes a voice answer with the local speech model (if voice), then
 *                  marks the answer against the rubric snapshot. Only the rubric, the topic's
 *                  published explanation and the answer text go to the model: never the
 *                  student's name or id (A.7.9). The score is a provisional AI estimate;
 *                  modules/explain/scoring.js decides what counts and what a teacher re-checks.
 */
import { buffer as readAll } from 'node:stream/consumers';
import { STUDENT_VISIBLE_STATUS } from '@acet/shared';
import { env } from '../../config/env.js';
import { storage } from '../../lib/storage.js';
import { Resource } from '../../modules/content/model.js';
import { Explanation, Rubric } from '../../modules/explain/model.js';
import { formatCriteria, scoreAnswer } from '../../modules/explain/scoring.js';
import { registerPipeline } from '../../modules/ai/runner.js';
import { Topic } from '../../modules/syllabus/model.js';
import { speech } from '../gateway/speech.js';
import { hasEnoughMaterial } from '../rag/retrieve.js';
import { ExplainScoreSchema, RubricDraftSchema } from '../schemas.js';
import { materialFor, syllabusLineFor } from './draftContent.js';
import { aiMeta, generate } from './helpers.js';

export const RUBRIC_DRAFT_JOB = 'rubric.draft';
export const EXPLAIN_SCORE_JOB = 'explain.score';

const REFERENCE_CHARS = 1500;

registerPipeline(RUBRIC_DRAFT_JOB, async (ctx) => {
  const topic = await Topic.findById(ctx.input.topicId).lean();
  if (!topic) throw Object.assign(new Error('Topic not found'), { code: 'NOT_FOUND' });

  await ctx.progress(5, 'Checking material');
  const coverage = await hasEnoughMaterial(String(topic._id));
  if (!coverage.enough) {
    await ctx.log(coverage.reason, 'warn');
    return { result: 'needsMaterial', output: { reason: coverage.reason, words: coverage.words } };
  }
  await ctx.progress(20, 'Finding the relevant notes');
  const material = await materialFor(topic);
  await ctx.progress(40, 'Drafting the rubric');
  const gen = await generate(
    ctx,
    RUBRIC_DRAFT_JOB,
    {
      topicTitle: topic.title,
      syllabusLine: await syllabusLineFor(topic),
      material: material.text,
    },
    RubricDraftSchema,
  );
  // Replace earlier unapproved, unedited AI rubric drafts only.
  await Rubric.deleteMany({
    topicId: topic._id,
    source: 'ai',
    status: { $in: ['draft', 'inReview'] },
    editedAfterAi: { $ne: true },
  });
  const rubric = await Rubric.create({
    topicId: topic._id,
    subjectId: topic.subjectId,
    prompt: gen.data.prompt,
    criteria: gen.data.criteria.map((c, i) => ({ ...c, id: `c${i + 1}` })),
    passScore: gen.data.passScore,
    status: 'draft',
    source: 'ai',
    createdBy: ctx.job.createdBy,
    aiMeta: aiMeta(gen, ctx, material.chunkIds),
  });
  await ctx.log('Saved a rubric draft for faculty review');
  return { result: 'created', output: { rubrics: [String(rubric._id)] } };
});

/** The topic's published easy explanation, as plain text, for the scorer's judgement. */
async function referenceFor(topic) {
  const easy = await Resource.findOne({
    topicId: topic._id,
    kind: 'easy',
    status: STUDENT_VISIBLE_STATUS,
  })
    .sort({ publishedAt: -1 })
    .lean();
  const text = (easy?.body ?? topic.summary ?? '').replace(/[*_>#`]/g, '').trim();
  return text.slice(0, REFERENCE_CHARS) || 'No reference explanation.';
}

registerPipeline(EXPLAIN_SCORE_JOB, async (ctx) => {
  const ex = await Explanation.findById(ctx.input.explanationId);
  if (!ex) throw Object.assign(new Error('Explanation not found'), { code: 'NOT_FOUND' });
  try {
    const topic = await Topic.findById(ex.topicId).lean();
    if (!topic) throw Object.assign(new Error('Topic not found'), { code: 'NOT_FOUND' });

    let answer = ex.text;
    if (ex.mode === 'voice') {
      await ctx.progress(10, 'Listening to your answer');
      await ctx.checkCancelled();
      const { stream } = await storage().read(ex.audioKey);
      const audio = await readAll(stream);
      const stt = await speech().transcribe({ buffer: audio, mimeType: ex.audioMime });
      answer = stt.text;
      ex.transcript = answer;
      ex.set('ai.sttModel', stt.model);
      await ex.save();
      if (!answer.trim()) {
        throw Object.assign(
          new Error('We could not hear any words in the recording. Try again somewhere quieter.'),
          {
            code: 'UNPROCESSABLE',
          },
        );
      }
    }

    await ctx.progress(45, 'Checking it against the rubric');
    const rubric = ex.rubricSnapshot;
    const gen = await generate(
      ctx,
      EXPLAIN_SCORE_JOB,
      {
        topicTitle: topic.title,
        prompt: rubric.prompt,
        criteria: formatCriteria(rubric.criteria),
        reference: await referenceFor(topic),
        answer,
      },
      ExplainScoreSchema,
    );
    const scored = scoreAnswer(rubric, answer, gen.data, {
      attempts: gen.meta.attempts,
      spotRate: env().EXPLAIN_SPOT_CHECK_RATE,
    });
    ex.status = 'scored';
    ex.ai = {
      ...(ex.ai?.toObject?.() ?? {}),
      total: scored.total,
      passed: scored.passed,
      perCriterion: scored.perCriterion,
      feedback: scored.feedback,
      model: gen.meta.model,
      promptVersion: gen.promptVersion,
    };
    ex.spotCheck.flagged = scored.reasons.length > 0;
    ex.spotCheck.reasons = scored.reasons;
    await ex.save();
    // Log the outcome, never the answer (A.7.10).
    await ctx.log(
      `Scored ${scored.total}/${rubric.maxScore}${scored.reasons.length ? ' (sent for a teacher spot-check)' : ''}`,
    );
    return { result: 'scored', output: { explanationId: String(ex._id) } };
  } catch (err) {
    await Explanation.updateOne(
      { _id: ex._id },
      { $set: { status: 'failed', error: err.message?.slice(0, 300) ?? 'Scoring failed' } },
    );
    throw err;
  }
});
