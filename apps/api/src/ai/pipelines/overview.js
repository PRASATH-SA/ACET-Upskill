/**
 * subject.overview: drafts the written part of a subject's root page (tagline, why, prerequisites,
 * outcomes, applications, per-unit summaries) from the subject's syllabus PDF and its unit/topic
 * list only (A.7.4). No readable syllabus → needsMaterial, nothing created. Saved as an AI draft
 * for faculty review (A.7.5); never overwrites a faculty-written or faculty-edited overview.
 */
import { registerPipeline } from '../../modules/ai/runner.js';
import { SubjectOverview } from '../../modules/overview/model.js';
import { Subject, Topic, Unit } from '../../modules/syllabus/model.js';
import { SubjectOverviewDraftSchema } from '../schemas.js';
import { courseContext } from '../syllabusText.js';
import { sourceText } from './draftMap.js';
import { generate } from './helpers.js';

export const DRAFT_OVERVIEW_JOB = 'subject.overview';

/** "Unit 3: Database Design — Keys; Normalization; …" lines for the prompt. */
export function formatUnits(units, topics) {
  return units
    .map((u) => {
      const titles = topics
        .filter((t) => String(t.unitId) === String(u._id) && !t.parentTopicId)
        .map((t) => t.title);
      return `Unit ${u.number}: ${u.title}${titles.length ? ` — ${titles.join('; ')}` : ''}`;
    })
    .join('\n');
}

registerPipeline(DRAFT_OVERVIEW_JOB, async (ctx) => {
  const subjectId = ctx.input.subjectId;
  const subject = await Subject.findById(subjectId).lean();
  if (!subject) throw Object.assign(new Error('Subject not found'), { code: 'NOT_FOUND' });

  const existing = await SubjectOverview.findOne({ subjectId }).lean();
  if (
    existing &&
    (existing.source !== 'ai' || existing.editedAfterAi || existing.status !== 'draft')
  ) {
    await ctx.log(
      'An overview written, edited or approved by faculty exists; it was left as is.',
      'warn',
    );
    return { result: 'skipped', output: { overviewId: String(existing._id) } };
  }

  await ctx.progress(5, 'Reading the syllabus');
  const material = await sourceText(ctx, subjectId);
  if (!material) {
    await ctx.log('No syllabus PDF with readable text is uploaded for this subject.', 'warn');
    return {
      result: 'needsMaterial',
      output: { reason: 'Upload the syllabus PDF (with selectable text) first.' },
    };
  }
  const [units, topics] = await Promise.all([
    Unit.find({ subjectId }).sort({ number: 1 }).lean(),
    Topic.find({ subjectId }).select('unitId title parentTopicId order').sort({ order: 1 }).lean(),
  ]);

  await ctx.progress(30, 'Writing the subject overview');
  const gen = await generate(
    ctx,
    DRAFT_OVERVIEW_JOB,
    {
      subjectName: subject.name,
      units: formatUnits(units, topics) || '(no units yet)',
      syllabus: courseContext(material.extractedText),
    },
    SubjectOverviewDraftSchema,
  );

  const byNumber = new Map(units.map((u) => [u.number, u]));
  const draft = gen.data;
  const doc = {
    tagline: draft.tagline,
    why: draft.why,
    prerequisites: draft.prerequisites,
    outcomes: draft.outcomes,
    applications: draft.applications,
    careers: existing?.careers ?? [],
    units: draft.units
      .filter((u) => byNumber.has(u.number))
      .map((u) => ({
        unitId: byNumber.get(u.number)._id,
        summary: u.summary,
        youWillBeAbleTo: u.youWillBeAbleTo,
        leadsTo: u.leadsTo,
      })),
    status: 'draft',
    source: 'ai',
    editedAfterAi: false,
    createdBy: ctx.job.createdBy,
    aiMeta: {
      model: gen.meta.model,
      promptVersion: gen.promptVersion,
      jobId: ctx.job._id,
      sourceChunkIds: [],
      sourceMaterialId: material._id,
    },
  };
  const saved = await SubjectOverview.findOneAndUpdate(
    { subjectId },
    { $set: doc, $setOnInsert: { subjectId } },
    { upsert: true, new: true },
  );
  await ctx.progress(100, 'Overview drafted');
  await ctx.log(`Drafted the overview for ${units.length} unit(s); waiting for faculty review.`);
  return { result: 'created', output: { overviewId: String(saved._id) } };
});
