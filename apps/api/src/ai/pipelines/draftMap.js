/**
 * A3.1 syllabus.toMap: syllabus PDF text → units → topics → prerequisite links → cross-unit
 * related links → dedupe → cycle check → dagre layout → saved as draft / source ai.
 */
import { layoutMap } from '@acet/shared';
import { Flashcard, Material, Question, Resource } from '../../modules/content/model.js';
import { registerPipeline } from '../../modules/ai/runner.js';
import { Mastery } from '../../modules/practice/model.js';
import { findCycle } from '../../modules/syllabus/graph.js';
import { Subject, Topic, TopicLink, Unit } from '../../modules/syllabus/model.js';
import { CrossLinksSchema, PrereqLinksSchema, SyllabusTopicsSchema } from '../schemas.js';
import { splitForContext, splitUnits } from '../syllabusText.js';
import { generate, normalizeTitle } from './helpers.js';

export const DRAFT_MAP_JOB = 'syllabus.toMap';
const MAX_CROSS_UNIT_TOPICS = 40;

/** Merges topic lists from map-reduce parts, de-duplicating by normalised title. */
export function mergeTopics(lists) {
  const byKey = new Map();
  for (const t of lists.flat()) {
    const key = normalizeTitle(t.title);
    if (!key) continue;
    const prev = byKey.get(key);
    if (!prev) byKey.set(key, { ...t, subtopics: [...(t.subtopics ?? [])] });
    else {
      const subKeys = new Set(prev.subtopics.map((s) => normalizeTitle(s.title)));
      for (const s of t.subtopics ?? [])
        if (!subKeys.has(normalizeTitle(s.title))) prev.subtopics.push(s);
      if (!prev.summary && t.summary) prev.summary = t.summary;
    }
  }
  return [...byKey.values()];
}

/**
 * Drops the lowest-confidence prerequisite in each cycle until the graph is acyclic (A3.1 f).
 * @returns {{ kept: object[], dropped: object[] }}
 */
export function breakCycles(nodes, links) {
  let kept = [...links];
  const dropped = [];
  for (;;) {
    const cycle = findCycle(
      nodes,
      kept.map((l) => ({ from: l.from, to: l.to })),
    );
    if (!cycle) return { kept, dropped };
    const inCycle = [];
    for (let i = 0; i < cycle.length - 1; i++) {
      const l = kept.find((x) => x.from === cycle[i] && x.to === cycle[i + 1]);
      if (l) inCycle.push(l);
    }
    const weakest = inCycle.sort((a, b) => a.confidence - b.confidence)[0];
    dropped.push(weakest);
    kept = kept.filter((l) => l !== weakest);
  }
}

/** Index-based links from the model → validated key-based links (no self links, no duplicates). */
function resolveLinks(raw, keys) {
  const seen = new Set();
  const out = [];
  for (const l of raw) {
    const from = keys[l.from - 1];
    const to = keys[l.to - 1];
    if (!from || !to || from === to) continue;
    const id = `${from}>${to}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ from, to, reason: l.reason, confidence: l.confidence });
  }
  return out;
}

export async function sourceText(ctx, subjectId) {
  const filter = ctx.input.materialId
    ? { _id: ctx.input.materialId, subjectId }
    : { subjectId, kind: 'syllabusPdf' };
  const material = await Material.findOne(filter).sort({ createdAt: -1 }).lean();
  return material?.extractedText?.trim() ? material : null;
}

/** Removes earlier unapproved AI-drafted topics (and their links) that nobody has used yet. */
async function clearPreviousDrafts(subjectId) {
  const drafts = await Topic.find({
    subjectId,
    source: 'ai',
    status: { $in: ['draft', 'inReview'] },
  })
    .select('_id')
    .lean();
  const ids = drafts.map((t) => t._id);
  if (!ids.length) return 0;
  const [res, fc, q, m] = await Promise.all([
    Resource.distinct('topicId', { topicId: { $in: ids } }),
    Flashcard.distinct('topicId', { topicId: { $in: ids } }),
    Question.distinct('topicId', { topicId: { $in: ids } }),
    Mastery.distinct('topicId', { topicId: { $in: ids } }),
  ]);
  const used = new Set([...res, ...fc, ...q, ...m].map(String));
  const removable = ids.filter((id) => !used.has(String(id)));
  await TopicLink.deleteMany({
    $or: [{ fromTopicId: { $in: removable } }, { toTopicId: { $in: removable } }],
    status: { $in: ['draft', 'inReview'] },
  });
  await Topic.deleteMany({ _id: { $in: removable } });
  return removable.length;
}

registerPipeline(DRAFT_MAP_JOB, async (ctx) => {
  const subjectId = ctx.input.subjectId;
  const subject = await Subject.findById(subjectId).lean();
  if (!subject) throw Object.assign(new Error('Subject not found'), { code: 'NOT_FOUND' });
  const material = await sourceText(ctx, subjectId);
  if (!material) {
    await ctx.log('No syllabus PDF with readable text is uploaded for this subject.', 'warn');
    return {
      result: 'needsMaterial',
      output: { reason: 'Upload the syllabus PDF (with selectable text) first.' },
    };
  }

  // (a) split by unit
  await ctx.progress(5, 'Splitting the syllabus into units');
  const units = splitUnits(material.extractedText);
  await ctx.log(
    `Found ${units.length} unit(s): ${units.map((u) => `${u.number}. ${u.title}`).join('; ')}`,
  );

  // (b) topics per unit (map-reduce when a unit is long)
  const perUnit = [];
  for (const [i, u] of units.entries()) {
    await ctx.progress(10 + (40 * i) / units.length, `Extracting topics: Unit ${u.number}`);
    const parts = splitForContext(u.text);
    const lists = [];
    for (const part of parts) {
      const gen = await generate(
        ctx,
        'syllabus.topics',
        { subjectName: subject.name, unitNumber: u.number, unitTitle: u.title, unitText: part },
        SyllabusTopicsSchema,
      );
      lists.push(gen.data.topics);
    }
    perUnit.push({ unit: u, topics: mergeTopics(lists) });
  }

  // (e) dedupe across units: the first unit to mention a topic keeps it
  const taken = new Set();
  for (const pu of perUnit) {
    pu.topics = pu.topics.filter((t) => {
      const k = normalizeTitle(t.title);
      if (taken.has(k)) return false;
      taken.add(k);
      return true;
    });
    for (const t of pu.topics) t.key = `u${pu.unit.number}:${normalizeTitle(t.title)}`;
  }

  // (c) prerequisite links within each unit
  let prereqs = [];
  for (const [i, pu] of perUnit.entries()) {
    if (pu.topics.length < 2) continue;
    await ctx.progress(
      50 + (25 * i) / perUnit.length,
      `Linking prerequisites: Unit ${pu.unit.number}`,
    );
    const gen = await generate(
      ctx,
      'syllabus.prereqs',
      {
        subjectName: subject.name,
        unitTitle: pu.unit.title,
        topicList: pu.topics.map((t, j) => `${j + 1}. ${t.title}: ${t.summary}`).join('\n'),
      },
      PrereqLinksSchema,
    );
    prereqs.push(
      ...resolveLinks(
        gen.data.links,
        pu.topics.map((t) => t.key),
      ),
    );
  }

  // (d) one pass across units for related links
  let related = [];
  const all = perUnit.flatMap((pu) => pu.topics.map((t) => ({ ...t, unitNumber: pu.unit.number })));
  if (perUnit.filter((pu) => pu.topics.length).length > 1) {
    await ctx.progress(78, 'Finding links across units');
    const listed = all.slice(0, MAX_CROSS_UNIT_TOPICS);
    const gen = await generate(
      ctx,
      'syllabus.crossLinks',
      {
        subjectName: subject.name,
        topicList: listed.map((t, j) => `${j + 1}. [Unit ${t.unitNumber}] ${t.title}`).join('\n'),
      },
      CrossLinksSchema,
    );
    const unitOfKey = new Map(all.map((t) => [t.key, t.unitNumber]));
    related = resolveLinks(
      gen.data.links,
      listed.map((t) => t.key),
    ).filter((l) => unitOfKey.get(l.from) !== unitOfKey.get(l.to));
  }

  // (f) no prerequisite cycles: drop the weakest link of each cycle
  const { kept, dropped } = breakCycles(
    all.map((t) => t.key),
    prereqs,
  );
  prereqs = kept;
  for (const d of dropped)
    await ctx.log(`Dropped a link to break a cycle: ${d.from} → ${d.to}`, 'warn');

  await ctx.checkCancelled();
  await ctx.progress(85, 'Saving the draft map');

  // Re-running replaces only earlier unapproved AI drafts (A3.6).
  const cleared = await clearPreviousDrafts(subjectId);
  if (cleared) await ctx.log(`Replaced ${cleared} earlier AI draft topic(s)`);

  // Units: reuse by number, create missing ones.
  const unitIds = new Map();
  for (const pu of perUnit) {
    const u = await Unit.findOneAndUpdate(
      { subjectId, number: pu.unit.number },
      { $setOnInsert: { subjectId, number: pu.unit.number, title: pu.unit.title.slice(0, 160) } },
      { upsert: true, new: true },
    );
    unitIds.set(pu.unit.number, u._id);
  }

  // Topics that already exist (faculty-written or approved) are reused, not duplicated.
  const existing = await Topic.find({ subjectId }).lean();
  const existingByTitle = new Map(existing.map((t) => [normalizeTitle(t.title), t]));
  const idOfKey = new Map();
  const created = [];
  const base = { subjectId, status: 'draft', source: 'ai', createdBy: ctx.job.createdBy };
  let order = existing.length;
  const subtopicLinks = [];

  for (const pu of perUnit) {
    for (const t of pu.topics) {
      const hit = existingByTitle.get(normalizeTitle(t.title));
      if (hit) {
        idOfKey.set(t.key, hit._id);
        continue;
      }
      const doc = await Topic.create({
        ...base,
        unitId: unitIds.get(pu.unit.number),
        title: t.title.slice(0, 160),
        summary: (t.summary ?? '').slice(0, 600),
        order: order++,
      });
      idOfKey.set(t.key, doc._id);
      created.push({ doc, unitKey: String(unitIds.get(pu.unit.number)) });
      for (const s of t.subtopics ?? []) {
        if (existingByTitle.has(normalizeTitle(s.title))) continue;
        const sub = await Topic.create({
          ...base,
          unitId: unitIds.get(pu.unit.number),
          parentTopicId: doc._id,
          title: s.title.slice(0, 160),
          summary: (s.summary ?? '').slice(0, 600),
          order: order++,
        });
        created.push({ doc: sub, unitKey: String(unitIds.get(pu.unit.number)) });
        subtopicLinks.push({
          from: doc._id,
          to: sub._id,
          reason: `Part of ${t.title}.`.slice(0, 240),
        });
      }
    }
  }

  const linkDocs = [];
  const seen = new Set(
    (await TopicLink.find({ subjectId }).select('fromTopicId toTopicId type').lean()).map(
      (l) => `${l.fromTopicId}>${l.toTopicId}>${l.type}`,
    ),
  );
  const pushLink = (from, to, type, reason) => {
    if (!from || !to || String(from) === String(to)) return;
    const k = `${from}>${to}>${type}`;
    const reverse = `${to}>${from}>${type}`;
    if (seen.has(k) || (type === 'related' && seen.has(reverse))) return;
    seen.add(k);
    linkDocs.push({
      ...base,
      fromTopicId: from,
      toTopicId: to,
      type,
      reason: reason.slice(0, 240),
    });
  };
  for (const l of prereqs)
    pushLink(idOfKey.get(l.from), idOfKey.get(l.to), 'prerequisite', l.reason);
  for (const l of subtopicLinks) pushLink(l.from, l.to, 'prerequisite', l.reason);
  for (const l of related) pushLink(idOfKey.get(l.from), idOfKey.get(l.to), 'related', l.reason);

  // A final cycle check over the whole subject, existing links included (B2 rule).
  const allTopics = await Topic.find({ subjectId }).select('_id unitId position').lean();
  const existingPrereqs = (await TopicLink.find({ subjectId, type: 'prerequisite' }).lean()).map(
    (l) => ({
      from: String(l.fromTopicId),
      to: String(l.toTopicId),
      confidence: 2, // never drop faculty or approved links
    }),
  );
  const newPrereqs = linkDocs
    .filter((l) => l.type === 'prerequisite')
    .map((l) => ({ from: String(l.fromTopicId), to: String(l.toTopicId), confidence: 1, doc: l }));
  const finalCheck = breakCycles(
    allTopics.map((t) => String(t._id)),
    [...existingPrereqs, ...newPrereqs],
  );
  const droppedDocs = new Set(finalCheck.dropped.map((d) => d.doc).filter(Boolean));
  const toInsert = linkDocs.filter((l) => !droppedDocs.has(l));
  if (toInsert.length) await TopicLink.insertMany(toInsert);

  // (g) layout: left-to-right by prerequisite depth, one band per unit.
  await ctx.progress(95, 'Laying out the map');
  const keptTopics = existing.filter(
    (t) => !created.some((c) => String(c.doc._id) === String(t._id)),
  );
  const newIds = new Set(created.map((c) => String(c.doc._id)));
  const allLinks = await TopicLink.find({ subjectId }).lean();
  const positions = layoutMap(
    created.map((c) => ({ id: String(c.doc._id), unitId: c.unitKey })),
    allLinks
      .filter((l) => newIds.has(String(l.fromTopicId)) && newIds.has(String(l.toTopicId)))
      .map((l) => ({
        fromTopicId: String(l.fromTopicId),
        toTopicId: String(l.toTopicId),
        type: l.type,
      })),
    { unitOrder: [...unitIds.values()].map(String) },
  );
  // Place new topics below whatever was already on the map.
  const offsetY = keptTopics.length
    ? Math.max(...keptTopics.map((t) => t.position?.y ?? 0)) + 160
    : 0;
  await Topic.bulkWrite(
    Object.entries(positions).map(([id, p]) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { position: { x: p.x, y: p.y + offsetY } } },
      },
    })),
  );

  await ctx.log(`Created ${created.length} topic(s) and ${toInsert.length} link(s) as drafts`);
  return {
    result: 'created',
    output: {
      units: unitIds.size,
      topics: created.map((c) => String(c.doc._id)),
      links: toInsert.length,
      droppedForCycles: dropped.length + finalCheck.dropped.length,
    },
  };
});
