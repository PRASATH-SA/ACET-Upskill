import { parse as parseCsv } from 'csv-parse/sync';
import {
  CONTENT_CSV_COLUMNS,
  CONTENT_CSV_LESSON_TYPES,
  CONTENT_CSV_OPTION_LETTERS,
  CONTENT_CSV_TYPES,
  CreateFlashcardSchema,
  CreateQuestionSchema,
  CreateResourceSchema,
} from '@acet/shared';

/**
 * The content & quiz CSV, without the database: writing rows, reading them back, and turning one
 * row into a validated item. One row is one item (a lesson resource, a flashcard or a question)
 * of one topic; the same columns serve export and import (CONTENT_CSV_COLUMNS).
 */

export const MAX_ROWS = 5000;

/** Spellings teachers are likely to type, mapped to the canonical row type. */
const TYPE_ALIASES = {
  tenmark: 'tenMark',
  ten_mark: 'tenMark',
  '10mark': 'tenMark',
  '10_mark': 'tenMark',
  exam: 'tenMark',
  exammaterial: 'tenMark',
  exam_material: 'tenMark',
  studymaterial: 'tenMark',
  study_material: 'tenMark',
  examstudymaterial: 'tenMark',
  exam_study_material: 'tenMark',
  realworld: 'realWorld',
  real_world: 'realWorld',
  apply: 'realWorld',
  explanation: 'easy',
  quiz: 'mcq',
  question: 'mcq',
  curiosityquestion: 'curiosity_question',
  'curiosity question': 'curiosity_question',
  card: 'flashcard',
};

const ROMAN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10 };

/** Columns that carry content; a row with all of them empty is a blank template row. */
const CONTENT_COLUMNS = CONTENT_CSV_COLUMNS.filter(
  (c) => !['unit', 'unit_title', 'topic', 'type', 'id', 'status'].includes(c),
);

// ---------- writing ----------

/**
 * One CSV cell. Text that Excel would run as a formula (= + - @) gets a leading apostrophe,
 * which readRows() strips again, so markdown bullets ("- point") survive a round trip.
 */
export function csvCell(value) {
  let s = value == null ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV text (with a UTF-8 BOM so Excel shows ’ and ₹) for rows keyed by column name. */
export function writeCsv(rows) {
  const lines = [CONTENT_CSV_COLUMNS.join(',')];
  for (const row of rows) lines.push(CONTENT_CSV_COLUMNS.map((c) => csvCell(row[c])).join(','));
  const BOM = String.fromCharCode(0xfeff);
  return `${BOM}${lines.join('\r\n')}\r\n`;
}

/** The CSV row for a resource, flashcard or question document of `topic` in `unit`. */
export function itemToRow(unit, topic, model, doc) {
  const row = {
    unit: unit.number,
    unit_title: unit.title,
    topic: topic.title,
    id: String(doc._id),
    status: doc.status,
  };
  if (model === 'resource') {
    return {
      ...row,
      type: doc.kind,
      title: doc.title ?? '',
      url: doc.url ?? '',
      body: doc.body ?? '',
    };
  }
  if (model === 'flashcard') return { ...row, type: 'flashcard', front: doc.front, back: doc.back };
  const q = {
    ...row,
    type: doc.type === 'curiosity' ? 'curiosity_question' : 'mcq',
    question: doc.stem,
    correct: CONTENT_CSV_OPTION_LETTERS[doc.correctIndex]?.toUpperCase() ?? '',
    explanation: doc.explanation ?? '',
    difficulty: doc.difficulty ?? '',
  };
  doc.options.forEach((o, i) => {
    q[`option_${CONTENT_CSV_OPTION_LETTERS[i]}`] = o;
    q[`why_${CONTENT_CSV_OPTION_LETTERS[i]}`] = doc.optionExplanations?.[i] ?? '';
  });
  return q;
}

/** Blank rows a teacher can fill in for one topic: every lesson type, one card, one MCQ. */
export function templateRows(unit, topic) {
  const base = { unit: unit.number, unit_title: unit.title, topic: topic.title };
  return CONTENT_CSV_TYPES.map((type) => ({ ...base, type }));
}

// ---------- reading ----------

/**
 * Parses CSV text into rows keyed by lower-case column name, each with its spreadsheet row
 * number (`_row`; the header is row 1). Throws a message suitable for the user on bad CSV.
 */
export function readRows(text) {
  let rows;
  try {
    rows = parseCsv(text, {
      columns: (h) => h.map((c) => c.trim().toLowerCase().replace(/\s+/g, '_')),
      skip_empty_lines: true,
      relax_column_count: true,
      bom: true,
    });
  } catch (err) {
    throw new Error(`Could not read the CSV: ${err.message}`);
  }
  if (rows.length && !('topic' in rows[0] && 'type' in rows[0]))
    throw new Error('The CSV needs at least the columns "topic" and "type" (download a template)');
  if (rows.length > MAX_ROWS)
    throw new Error(`The CSV has more than ${MAX_ROWS} rows; upload one unit at a time`);
  return rows.map((raw, i) => {
    const row = { _row: i + 2 };
    for (const [k, v] of Object.entries(raw)) {
      const s = typeof v === 'string' ? v.trim() : '';
      row[k] = /^'[=+\-@\t\r]/.test(s) ? s.slice(1) : s;
    }
    return row;
  });
}

/** True for a template row nobody filled in. */
export const isBlankRow = (row) => CONTENT_COLUMNS.every((c) => !row[c]);

/** "tenmark", "Ten Mark", "10-mark" → "tenMark"; null if unknown. */
export function normaliseType(value) {
  const v = String(value ?? '').trim();
  if (CONTENT_CSV_TYPES.includes(v)) return v;
  const key = v.toLowerCase().replace(/[-\s]+/g, '_');
  const exact = CONTENT_CSV_TYPES.find((t) => t.toLowerCase() === key);
  return exact ?? TYPE_ALIASES[key] ?? TYPE_ALIASES[key.replace(/_/g, '')] ?? null;
}

/** "3", "III", "Unit 3", "Unit III" → 3; null if empty; NaN if unreadable. */
export function parseUnit(value) {
  const v = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/^unit\s*/, '');
  if (!v) return null;
  if (/^\d+$/.test(v)) return Number(v);
  return ROMAN[v] ?? NaN;
}

/** Drops keys the row left empty, so an import never blanks a field it did not mention. */
const defined = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

const issues = (err) =>
  err.issues.map((x) => `${x.path.join('.') || 'row'}: ${x.message}`).join('; ');

/**
 * Turns one row into the item it describes, validated with the same schemas as the studio.
 * @returns {{ model: 'resource'|'flashcard'|'question', key: string, data: object }}
 * @throws {Error} with a message naming the problem
 */
export function rowToItem(row, type) {
  if (CONTENT_CSV_LESSON_TYPES.includes(type)) {
    const parsed = CreateResourceSchema.safeParse({
      kind: type,
      title: row.title || undefined,
      body: row.body || undefined,
      url: row.url || undefined,
    });
    if (!parsed.success) throw new Error(issues(parsed.error));
    if (type === 'video' && !parsed.data.url && !row.id)
      throw new Error('a video row needs a url (uploaded video files are kept as they are)');
    if (type !== 'video' && !parsed.data.body) throw new Error(`a ${type} row needs a body`);
    return { model: 'resource', key: type, data: defined(parsed.data) };
  }
  if (type === 'flashcard') {
    const parsed = CreateFlashcardSchema.safeParse({ front: row.front, back: row.back });
    if (!parsed.success) throw new Error(issues(parsed.error));
    return { model: 'flashcard', key: parsed.data.front.toLowerCase(), data: parsed.data };
  }
  // mcq or curiosity_question
  const letters = CONTENT_CSV_OPTION_LETTERS;
  const filled = letters.map((l) => row[`option_${l}`] ?? '');
  const last = filled.findLastIndex((o) => o);
  const options = filled.slice(0, last + 1);
  if (options.some((o) => !o)) throw new Error('options must be filled in order from option_a');
  const correct = String(row.correct ?? '')
    .trim()
    .toLowerCase();
  const correctIndex = /^\d$/.test(correct) ? Number(correct) - 1 : letters.indexOf(correct);
  if (correctIndex < 0) throw new Error('correct must be the answer letter, e.g. A, B, C or D');
  const why = letters.slice(0, options.length).map((l) => row[`why_${l}`] ?? '');
  const difficulty = (row.difficulty || '').toLowerCase() || undefined;
  const parsed = CreateQuestionSchema.safeParse({
    type: type === 'curiosity_question' ? 'curiosity' : 'mcq',
    stem: row.question,
    options,
    correctIndex,
    explanation: row.explanation || '',
    optionExplanations: why.some(Boolean) ? why : [],
    ...(difficulty ? { difficulty } : {}),
  });
  if (!parsed.success) throw new Error(issues(parsed.error));
  // The CSV has no columns for these; existing questions keep theirs, new ones get the defaults.
  const { shuffleOptions: _s, conceptKey: _c, ...data } = parsed.data;
  return {
    model: 'question',
    key: `${data.type}:${data.stem.toLowerCase()}`,
    data: defined(data),
  };
}
