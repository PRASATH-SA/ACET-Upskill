import { questionPublishProblem } from '@acet/shared';
import { withTransaction } from '../../db/connect.js';
import { sameId } from '../../db/mongoose.js';
import { canWriteSubject, loadSubject } from '../../lib/access.js';
import { badRequest, forbidden, unprocessable } from '../../lib/errors.js';
import { audit } from '../audit/service.js';
import { Flashcard, Question, Resource } from '../content/model.js';
import { changeStatus } from '../content/status.js';
import { Topic, Unit } from '../syllabus/model.js';
import {
  isBlankRow,
  itemToRow,
  normaliseType,
  parseUnit,
  readRows,
  rowToItem,
  templateRows,
  writeCsv,
} from './csv.js';

/**
 * Content & quiz CSV for a subject, separated by unit and topic. Export gives the whole subject
 * (or one unit) in one file; import takes that file back, for one unit or the whole subject.
 * Only staff who can write the subject may use either: the file contains the quiz answers.
 */

const MODELS = { resource: Resource, flashcard: Flashcard, question: Question };
const RESOURCE_ORDER = ['curiosity', 'video', 'easy', 'tenMark', 'realWorld', 'workshop'];
const STATUS_TYPE = { resource: 'resource', flashcard: 'flashcard', question: 'question' };

/** Units (in number order) and their topics (in map order) for the subject, or one unit. */
async function unitsAndTopics(subjectId, unitId) {
  const units = await Unit.find({ subjectId, ...(unitId ? { _id: unitId } : {}) })
    .sort({ number: 1 })
    .lean();
  if (unitId && !units.length) throw badRequest('That unit is not part of this subject');
  const topics = await Topic.find({ subjectId, unitId: { $in: units.map((u) => u._id) } })
    .sort({ order: 1, createdAt: 1 })
    .lean();
  return { units, topics };
}

/**
 * GET /subjects/:id/content.csv. Every topic appears, in unit order: its lesson rows, then its
 * curiosity question, flashcards and MCQs. A topic with no content gets one row (or, with
 * `template`, one blank row per type) so the teacher sees where to write.
 * @returns {Promise<{ filename: string, csv: string }>}
 */
export async function exportContentCsv(user, subjectId, { unitId, template = false } = {}) {
  const subject = await loadSubject(user, subjectId, 'write');
  const { units, topics } = await unitsAndTopics(subject._id, unitId);
  const ids = topics.map((t) => t._id);
  const [resources, flashcards, questions] = await Promise.all([
    Resource.find({ topicId: { $in: ids } })
      .sort({ createdAt: 1 })
      .lean(),
    Flashcard.find({ topicId: { $in: ids } })
      .sort({ createdAt: 1 })
      .lean(),
    Question.find({ topicId: { $in: ids } })
      .sort({ type: -1, createdAt: 1 })
      .lean(),
  ]);
  const byTopic = (list) => {
    const m = new Map();
    for (const d of list) {
      const k = String(d.topicId);
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(d);
    }
    return m;
  };
  const res = byTopic(resources);
  const cards = byTopic(flashcards);
  const qs = byTopic(questions);

  const rows = [];
  for (const unit of units) {
    for (const topic of topics.filter((t) => sameId(t.unitId, unit._id))) {
      const k = String(topic._id);
      const own = [
        ...(res.get(k) ?? [])
          .sort((a, b) => RESOURCE_ORDER.indexOf(a.kind) - RESOURCE_ORDER.indexOf(b.kind))
          .map((d) => itemToRow(unit, topic, 'resource', d)),
        // curiosity questions sort before MCQs (type descending)
        ...(qs.get(k) ?? []).map((d) => itemToRow(unit, topic, 'question', d)),
        ...(cards.get(k) ?? []).map((d) => itemToRow(unit, topic, 'flashcard', d)),
      ];
      if (template) {
        const have = new Set(own.map((r) => r.type));
        rows.push(...own, ...templateRows(unit, topic).filter((r) => !have.has(r.type)));
      } else if (own.length) {
        rows.push(...own);
      } else {
        rows.push({ unit: unit.number, unit_title: unit.title, topic: topic.title });
      }
    }
  }
  const unitPart = unitId && units[0] ? `-unit-${units[0].number}` : '';
  const filename = `${subject.code.replace(/[^\w-]+/g, '')}${unitPart}-content${template ? '-template' : ''}.csv`;
  return { filename, csv: writeCsv(rows) };
}

/** Unchanged when every field the row sets already has that value. */
function sameData(doc, data) {
  return Object.entries(data).every(([k, v]) =>
    Array.isArray(v) ? JSON.stringify(doc[k] ?? []) === JSON.stringify(v) : (doc[k] ?? '') === v,
  );
}

/**
 * POST /subjects/:id/content-import. Every row is checked first; if any row is wrong nothing is
 * saved and every problem is listed by row number (422). Then each row updates its item (by
 * `id`, else by kind / flashcard front / question text within the topic) or creates a draft.
 * With `publish`, the imported items are then published through the review rules.
 */
export async function importContentCsv(user, subjectId, text, { unitId, publish = false } = {}) {
  const subject = await loadSubject(user, subjectId, 'write');
  if (publish && !(user.role === 'faculty' && canWriteSubject(user, subject)))
    throw forbidden('Only faculty assigned to this subject can publish content');

  let rows;
  try {
    rows = readRows(text);
  } catch (err) {
    throw badRequest(err.message);
  }
  if (!rows.length) throw badRequest('The CSV has no rows');

  const { units, topics } = await unitsAndTopics(subject._id, unitId);
  const unitById = new Map(units.map((u) => [String(u._id), u]));
  const topicsByTitle = new Map();
  for (const t of topics) {
    const k = t.title.trim().toLowerCase();
    if (!topicsByTitle.has(k)) topicsByTitle.set(k, []);
    topicsByTitle.get(k).push(t);
  }

  // Existing items of the topics in scope, for matching.
  const ids = topics.map((t) => t._id);
  const existing = {};
  for (const [model, Model] of Object.entries(MODELS))
    existing[model] = await Model.find({ topicId: { $in: ids } });
  const byId = new Map();
  const byKey = new Map();
  for (const [model, docs] of Object.entries(existing)) {
    for (const d of docs) {
      byId.set(String(d._id), { model, doc: d });
      const key =
        model === 'resource'
          ? d.kind
          : model === 'flashcard'
            ? d.front.toLowerCase()
            : `${d.type}:${d.stem.toLowerCase()}`;
      const k = `${d.topicId}|${model}|${key}`;
      byKey.set(k, byKey.has(k) ? null : d); // null: ambiguous, never matched by key
    }
  }

  const errors = [];
  const plan = [];
  const seen = new Map();
  let skipped = 0;
  for (const row of rows) {
    const fail = (message) =>
      errors.push({ row: row._row, topic: row.topic || undefined, message });
    if (!row.type && !row.topic && isBlankRow(row)) continue;
    if (isBlankRow(row)) {
      skipped += 1;
      continue;
    }
    const type = normaliseType(row.type);
    if (!type) {
      fail(row.type ? `unknown type "${row.type}"` : 'type is empty');
      continue;
    }
    if (!row.topic) {
      fail('topic is empty');
      continue;
    }
    const unitNo = parseUnit(row.unit);
    if (Number.isNaN(unitNo)) {
      fail(`unit "${row.unit}" is not a unit number`);
      continue;
    }
    const matches = (topicsByTitle.get(row.topic.toLowerCase()) ?? []).filter(
      (t) => unitNo === null || unitById.get(String(t.unitId))?.number === unitNo,
    );
    if (!matches.length) {
      fail(
        unitId
          ? `topic "${row.topic}" is not in this unit`
          : `topic "${row.topic}"${unitNo ? ` is not in unit ${unitNo}` : ' was not found'}`,
      );
      continue;
    }
    if (matches.length > 1) {
      fail(`topic "${row.topic}" is in more than one unit; fill in the unit column`);
      continue;
    }
    const topic = matches[0];
    let item;
    try {
      item = rowToItem(row, type);
    } catch (err) {
      fail(err.message);
      continue;
    }

    let target = null;
    if (row.id) {
      const hit = byId.get(row.id);
      if (!hit || hit.model !== item.model || !sameId(hit.doc.topicId, topic._id)) {
        fail(`id ${row.id} is not a ${type} of "${topic.title}" (clear the id to add it as new)`);
        continue;
      }
      target = hit.doc;
    } else {
      target = byKey.get(`${topic._id}|${item.model}|${item.key}`) ?? null;
    }
    const dupKey = target ? String(target._id) : `${topic._id}|${item.model}|${item.key}`;
    if (seen.has(dupKey)) {
      fail(`same item as row ${seen.get(dupKey)}`);
      continue;
    }
    seen.set(dupKey, row._row);
    if (item.model === 'question' && item.data.type === 'mcq') {
      const published = target?.status === 'published';
      const problem = (publish || published) && questionPublishProblem(item.data);
      if (problem) {
        fail(`this question ${problem}; fill in explanation and why_a, why_b, …`);
        continue;
      }
    }
    plan.push({ row: row._row, type, topic, target, ...item });
  }
  if (errors.length) {
    throw unprocessable(
      `${errors.length} row${errors.length === 1 ? '' : 's'} need fixing; nothing was imported`,
      { errors },
    );
  }

  const summary = { created: 0, updated: 0, unchanged: 0, skipped, published: 0 };
  const byType = {};
  const touched = [];
  await withTransaction(async (session) => {
    const opts = session ? { session } : {};
    for (const p of plan) {
      const count = (byType[p.type] ??= { created: 0, updated: 0, unchanged: 0 });
      if (p.target) {
        if (sameData(p.target, p.data)) {
          summary.unchanged += 1;
          count.unchanged += 1;
        } else {
          p.target.set(p.data);
          if (p.target.source === 'ai') p.target.editedAfterAi = true;
          p.target.rejectedAt = undefined;
          p.target.rejectedBy = undefined;
          p.target.rejectReason = undefined;
          await p.target.save(opts);
          summary.updated += 1;
          count.updated += 1;
        }
        touched.push({ model: p.model, doc: p.target });
      } else {
        const [doc] = await MODELS[p.model].create(
          [
            {
              ...p.data,
              topicId: p.topic._id,
              subjectId: subject._id,
              status: 'draft',
              source: 'faculty',
              createdBy: user.id,
            },
          ],
          opts,
        );
        summary.created += 1;
        count.created += 1;
        touched.push({ model: p.model, doc });
      }
    }
  });

  if (publish) {
    const items = touched
      .filter((t) => t.doc.status !== 'published')
      .map((t) => ({ type: STATUS_TYPE[t.model], id: String(t.doc._id) }));
    for (let i = 0; i < items.length; i += 200) {
      const r = await changeStatus(user, items.slice(i, i + 200), { to: 'published' });
      summary.published += r.updated;
    }
  }

  await audit({
    actorId: user.id,
    action: 'content.csvImport',
    target: { type: 'subject', id: String(subject._id) },
    meta: { unitId: unitId ?? null, ...summary },
  });
  return { summary, byType };
}
