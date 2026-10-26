/**
 * Code lab (LeetCode-style practice). SQL: students Run a query on the sample data and Submit;
 * the server compares it with the hidden reference solution on the sample data and on the
 * sample plus hidden rows. Python: students Run a program with their own input and Submit; it
 * runs on every test input and its output is compared with the reference program's output.
 * Students only ever see published challenges, and never the solution, hidden rows, check
 * query or hidden test inputs.
 */
import { STUDENT_VISIBLE_STATUS } from '@acet/shared';
import { oid } from '../../db/mongoose.js';
import { isStaff, loadSubject, loadTopic } from '../../lib/access.js';
import { AppError, badRequest, notFound } from '../../lib/errors.js';
import { Topic, Unit } from '../syllabus/model.js';
import { CodeChallenge, CodeSubmission } from './model.js';
import { runPython } from './pySandbox.js';
import { runSql } from './sandbox.js';

const PUBLISHED = STUDENT_VISIBLE_STATUS;
const PREVIEW_ROWS = 5;
const DIFF_ROWS = 50;

// ---------- grading (pure helpers, exported for tests) ----------

/** Plan of sandbox steps for one run of `code` against a challenge. */
export function gradingSteps(c, code, { hidden = false, check = true } = {}) {
  const useCheck = check && Boolean(c.checkSql?.trim());
  return [
    { sql: c.setupSql, stage: 'setup' },
    ...(hidden && c.hiddenSql?.trim() ? [{ sql: c.hiddenSql, stage: 'setup' }] : []),
    { sql: code, stage: 'code', capture: !useCheck },
    ...(useCheck ? [{ sql: c.checkSql, stage: 'check', capture: true }] : []),
  ];
}

const normValue = (v) =>
  typeof v === 'number' && !Number.isInteger(v) ? Math.round(v * 1e6) / 1e6 : v;

/** Rows ready for comparison: numbers rounded, and sorted unless order matters. */
export function normalizeRows(rows, orderMatters) {
  const out = rows.map((r) => r.map(normValue));
  if (!orderMatters) out.sort((a, b) => (JSON.stringify(a) < JSON.stringify(b) ? -1 : 1));
  return out;
}

/**
 * Compares two result sets by values (column names are ignored, so aliases don't matter).
 * @returns {{ equal: boolean, reason?: string }}
 */
export function compareResults(expected, got, orderMatters) {
  if (expected.columns.length !== got.columns.length)
    return {
      equal: false,
      reason: `Expected ${expected.columns.length} column(s), got ${got.columns.length}.`,
    };
  if (expected.rowCount !== got.rowCount)
    return { equal: false, reason: `Expected ${expected.rowCount} row(s), got ${got.rowCount}.` };
  const a = normalizeRows(expected.rows, orderMatters);
  const b = normalizeRows(got.rows, orderMatters);
  for (let i = 0; i < a.length; i++) {
    if (JSON.stringify(a[i]) !== JSON.stringify(b[i]))
      return {
        equal: false,
        reason: orderMatters
          ? `Row ${i + 1} is different (check ORDER BY too).`
          : 'Some values are different.',
      };
  }
  return { equal: true };
}

// ---------- caches ----------

/** Small LRU for results that only change when the challenge changes. */
const cache = new Map();
const CACHE_MAX = 300;
async function cached(key, fn) {
  if (cache.has(key)) {
    const v = cache.get(key);
    cache.delete(key);
    cache.set(key, v);
    return v;
  }
  const v = await fn();
  cache.set(key, v);
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
  return v;
}
const version = (c) => `${c._id}:${new Date(c.updatedAt ?? 0).getTime()}`;

/** The reference solution's result on the sample (or sample + hidden) data. */
function solutionResult(c, hidden) {
  return cached(`sol:${version(c)}:${hidden}`, async () => {
    const res = await runSql(gradingSteps(c, c.solution, { hidden }), { maxRows: 100_000 });
    if (!res.ok)
      throw new AppError(
        'UNPROCESSABLE',
        `This challenge is broken (${res.stage}: ${res.error}). Ask your faculty to fix it.`,
      );
    return res;
  });
}

/** Table names, columns and the first rows of the sample data, for the problem panel. */
function tablesOf(c) {
  return cached(`tables:${version(c)}`, async () => {
    const meta = await runSql([
      { sql: c.setupSql, stage: 'setup' },
      {
        sql: `SELECT m.name, p.name, p.type, p.pk FROM sqlite_master m
              JOIN pragma_table_info(m.name) p
              WHERE m.type = 'table' AND m.name NOT LIKE 'sqlite_%'
              ORDER BY m.rowid, p.cid`,
        stage: 'meta',
        capture: true,
      },
    ]);
    if (!meta.ok) return [];
    const tables = new Map();
    for (const [table, column, type, pk] of meta.rows) {
      if (!tables.has(table)) tables.set(table, { name: table, columns: [] });
      tables.get(table).columns.push({ name: column, type: type || 'ANY', pk: pk > 0 });
    }
    return Promise.all(
      [...tables.values()].map(async (t) => {
        const quoted = `"${t.name.replace(/"/g, '""')}"`;
        const rows = await runSql(
          [
            { sql: c.setupSql, stage: 'setup' },
            { sql: `SELECT * FROM ${quoted} LIMIT ${PREVIEW_ROWS}`, stage: 'meta', capture: true },
          ],
          { maxRows: PREVIEW_ROWS },
        );
        const count = await runSql([
          { sql: c.setupSql, stage: 'setup' },
          { sql: `SELECT count(*) FROM ${quoted}`, stage: 'meta', capture: true },
        ]);
        return {
          ...t,
          sampleRows: rows.ok ? rows.rows : [],
          rowCount: count.ok ? count.rows[0][0] : null,
        };
      }),
    );
  });
}

// ---------- Python grading ----------

/** Output as compared: Windows newlines, trailing spaces and trailing blank lines don't matter. */
export function normalizeOutput(s) {
  return String(s ?? '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => l.replace(/[ \t]+$/, ''))
    .join('\n')
    .replace(/\n+$/, '');
}

/** @returns {{ equal: boolean, reason?: string }} */
export function compareOutput(expected, got) {
  const a = normalizeOutput(expected).split('\n');
  const b = normalizeOutput(got).split('\n');
  if (a.join('\n') === b.join('\n')) return { equal: true };
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] === b[i]) continue;
    if (b[i] === undefined)
      return {
        equal: false,
        reason: `Your output stops after line ${i}; ${a.length - i} more line(s) expected.`,
      };
    if (a[i] === undefined)
      return { equal: false, reason: `Your output has extra lines from line ${i + 1}.` };
    const spacing = a[i].replace(/\s+/g, '') === b[i].replace(/\s+/g, '');
    return {
      equal: false,
      reason: `Line ${i + 1} is different${spacing ? ' (only the spaces differ: check sep= and end=)' : ''}.`,
    };
  }
  return { equal: false, reason: 'The output is different.' };
}

/** The reference program's output for every test (cached until the challenge changes). */
function pythonExpected(c) {
  return cached(`py:${version(c)}`, async () => {
    const out = [];
    for (const [i, t] of c.tests.entries()) {
      const res = await runPython(c.solution, t.input);
      if (!res.ok)
        throw new AppError(
          'UNPROCESSABLE',
          `This challenge is broken (test ${i + 1}: ${res.error}). Ask your faculty to fix it.`,
        );
      out.push(res.stdout);
    }
    return out;
  });
}

async function assertPythonWorks(c) {
  for (const [i, t] of c.tests.entries()) {
    const res = await runPython(c.solution, t.input);
    if (!res.ok) throw badRequest(`The solution failed on test ${i + 1}: ${res.error}`);
    if (!normalizeOutput(res.stdout))
      throw badRequest(`The solution prints nothing for test ${i + 1}`);
  }
}

/** Runs the program on every test in order and stops at the first failure, like LeetCode. */
async function gradePython(c, code) {
  const expected = await pythonExpected(c);
  const cases = [];
  let example = 0;
  let hiddenNo = 0;
  for (const [i, t] of c.tests.entries()) {
    const name = t.hidden ? `Hidden test ${++hiddenNo}` : `Example ${++example}`;
    const input = t.hidden ? null : t.input;
    const got = await runPython(code, t.input);
    if (!got.ok) {
      cases.push({
        name,
        input,
        passed: false,
        error: got.error,
        stage: got.stage,
        ...(t.hidden ? {} : { got: got.stdout }),
      });
      return { verdict: got.stage === 'timeout' ? 'timeout' : 'error', cases };
    }
    const cmp = compareOutput(expected[i], got.stdout);
    if (!cmp.equal) {
      cases.push(
        t.hidden
          ? {
              name,
              input,
              passed: false,
              reason: `${cmp.reason} Your program works on the examples but not on other input. Read the input instead of printing fixed values.`,
            }
          : {
              name,
              input,
              passed: false,
              reason: cmp.reason,
              expected: expected[i],
              got: got.stdout,
            },
      );
      return { verdict: t.hidden ? 'hiddenTests' : 'wrongAnswer', cases };
    }
    cases.push({ name, input, passed: true, ...(t.hidden ? {} : { got: got.stdout }) });
  }
  return { verdict: 'accepted', cases };
}

/** Staff check on create/update: the setup and the solution must run cleanly. */
export async function assertChallengeWorks(c) {
  if (c.language === 'python') return assertPythonWorks(c);
  for (const hidden of [false, true]) {
    const res = await runSql(gradingSteps(c, c.solution, { hidden }));
    if (!res.ok)
      throw badRequest(
        `The ${res.stage === 'code' ? 'solution' : res.stage} SQL failed${hidden ? ' with the hidden rows' : ''}: ${res.error}`,
      );
    if (!res.columns.length)
      throw badRequest('The solution (or check query) must return rows to compare');
  }
}

// ---------- access ----------

/** A challenge the user may open: published for students, any status for the subject's staff. */
async function loadChallenge(user, id) {
  const c = await CodeChallenge.findById(id).lean();
  if (!c) throw notFound('Challenge');
  await loadTopic(user, String(c.topicId), 'read');
  if (c.status === PUBLISHED) return { c, staff: false };
  if (isStaff(user)) {
    await loadSubject(user, String(c.subjectId), 'write');
    return { c, staff: true };
  }
  throw notFound('Challenge');
}

async function progressFor(userId, challengeIds) {
  if (!challengeIds.length) return new Map();
  const rows = await CodeSubmission.aggregate([
    { $match: { userId: oid(userId), challengeId: { $in: challengeIds.map(oid) } } },
    { $group: { _id: '$challengeId', attempts: { $sum: 1 }, solved: { $max: '$passed' } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), { attempts: r.attempts, solved: r.solved }]));
}

const listView = (c, p) => ({
  id: String(c._id),
  topicId: String(c.topicId),
  title: c.title,
  difficulty: c.difficulty,
  language: c.language,
  solved: Boolean(p?.solved),
  attempts: p?.attempts ?? 0,
});

// ---------- endpoints ----------

/** GET /topics/:id/code-lab — the topic's published challenges with my progress. */
export async function listForTopic(user, topicId) {
  await loadTopic(user, topicId, 'read');
  const items = await CodeChallenge.find({ topicId, status: PUBLISHED })
    .select('topicId title difficulty language order')
    .sort({ order: 1, createdAt: 1 })
    .lean();
  const progress = await progressFor(
    user.id,
    items.map((c) => String(c._id)),
  );
  return items.map((c) => listView(c, progress.get(String(c._id))));
}

/** GET /subjects/:id/code-lab — every published challenge of a subject, by unit and topic. */
export async function listForSubject(user, subjectId) {
  await loadSubject(user, subjectId, 'read');
  const [items, topics, units] = await Promise.all([
    CodeChallenge.find({ subjectId, status: PUBLISHED })
      .select('topicId title difficulty language order')
      .sort({ order: 1, createdAt: 1 })
      .lean(),
    Topic.find({ subjectId }).select('title unitId order').lean(),
    Unit.find({ subjectId }).select('number title').lean(),
  ]);
  const progress = await progressFor(
    user.id,
    items.map((c) => String(c._id)),
  );
  const unitById = new Map(units.map((u) => [String(u._id), u]));
  const groups = new Map();
  for (const c of items) {
    const key = String(c.topicId);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(listView(c, progress.get(String(c._id))));
  }
  const ordered = topics
    .filter((t) => groups.has(String(t._id)))
    .map((t) => {
      const u = unitById.get(String(t.unitId));
      return {
        topicId: String(t._id),
        topicTitle: t.title,
        unit: u ? { number: u.number, title: u.title } : null,
        order: t.order ?? 0,
        challenges: groups.get(String(t._id)),
      };
    })
    .sort((a, b) => (a.unit?.number ?? 0) - (b.unit?.number ?? 0) || a.order - b.order)
    .map(({ order: _o, ...g }) => g);
  const all = ordered.flatMap((g) => g.challenges);
  return { topics: ordered, total: all.length, solved: all.filter((c) => c.solved).length };
}

/** GET /code-lab/:id — the problem, its tables and my last submission. Never the solution. */
export async function getChallenge(user, id) {
  const { c, staff } = await loadChallenge(user, id);
  const python = c.language === 'python';
  const [tables, progress, last, expected] = await Promise.all([
    python ? [] : tablesOf(c),
    progressFor(user.id, [String(c._id)]),
    CodeSubmission.findOne({ userId: user.id, challengeId: c._id })
      .sort({ createdAt: -1 })
      .select('code passed verdict createdAt')
      .lean(),
    python ? pythonExpected(c) : null,
  ]);
  const p = progress.get(String(c._id));
  return {
    ...listView(c, p),
    prompt: c.prompt,
    starterCode: c.starterCode,
    hints: c.hints,
    ...(python
      ? {
          // Visible tests are the examples (input and expected output); hidden ones are counted only.
          examples: c.tests
            .map((t, i) => ({ t, i }))
            .filter(({ t }) => !t.hidden)
            .map(({ t, i }) => ({ input: t.input, output: normalizeOutput(expected[i]) })),
          hiddenTestCount: c.tests.filter((t) => t.hidden).length,
        }
      : { setupSql: c.setupSql, orderMatters: c.orderMatters, tables }),
    lastSubmission: last
      ? { code: last.code, passed: last.passed, verdict: last.verdict, at: last.createdAt }
      : null,
    ...(staff ? { status: c.status, preview: true } : {}),
  };
}

/** POST /code-lab/:id/run — runs the code on the sample data and returns its output. */
export async function runCode(user, id, { code, input }) {
  const { c } = await loadChallenge(user, id);
  const t0 = Date.now();
  if (c.language === 'python') {
    // The student's own input, or the first example's.
    const stdin = input ?? c.tests.find((t) => !t.hidden)?.input ?? '';
    const res = await runPython(code, stdin);
    return { ...res, input: stdin, timeMs: Date.now() - t0 };
  }
  // Runs show the student's own output, even for tasks graded with a check query.
  const res = await runSql(gradingSteps(c, code, { check: false }));
  return { ...res, timeMs: Date.now() - t0 };
}

const preview = (r) => ({
  columns: r.columns,
  rows: r.rows.slice(0, DIFF_ROWS),
  rowCount: r.rowCount,
});

/**
 * POST /code-lab/:id/submit — grades the code on the sample data (output shown) and on the
 * sample plus hidden rows (pass/fail only). Students' submissions are stored.
 */
export async function submitCode(user, id, { code }) {
  const { c, staff } = await loadChallenge(user, id);
  const t0 = Date.now();
  let cases = [];
  let verdict = 'accepted';

  if (c.language === 'python') ({ verdict, cases } = await gradePython(c, code));
  else
    for (const hidden of [false, true]) {
      const name = hidden ? 'Hidden tests' : 'Sample data';
      const expected = await solutionResult(c, hidden);
      const got = await runSql(gradingSteps(c, code, { hidden }), { maxRows: 100_000 });
      if (!got.ok) {
        verdict = got.stage === 'timeout' ? 'timeout' : 'error';
        cases.push({ name, passed: false, error: got.error, stage: got.stage });
        break;
      }
      const cmp = compareResults(expected, got, c.orderMatters);
      if (!cmp.equal) {
        verdict = hidden ? 'hiddenTests' : 'wrongAnswer';
        // Hidden data is never shown; say what kind of mistake it is instead.
        const orderOnly = c.orderMatters && compareResults(expected, got, false).equal;
        const hiddenReason = orderOnly
          ? 'The rows are right but in the wrong order on other data. Check your ORDER BY.'
          : `${cmp.reason} Your query works on the sample but not on other data. Avoid hard-coding values.`;
        cases.push(
          hidden
            ? { name, passed: false, reason: hiddenReason }
            : {
                name,
                passed: false,
                reason: cmp.reason,
                expected: preview(expected),
                got: preview(got),
              },
        );
        break;
      }
      cases.push({ name, passed: true, ...(hidden ? {} : { got: preview(got) }) });
    }

  const passed = verdict === 'accepted';
  const timeMs = Date.now() - t0;
  let firstSolve = false;
  if (user.role === 'student') {
    firstSolve =
      passed &&
      !(await CodeSubmission.exists({ userId: user.id, challengeId: c._id, passed: true }));
    await CodeSubmission.create({
      userId: user.id,
      challengeId: c._id,
      topicId: c.topicId,
      subjectId: c.subjectId,
      code,
      passed,
      verdict,
      timeMs,
    });
  }
  return { passed, verdict, cases, timeMs, firstSolve, ...(staff ? { preview: true } : {}) };
}

/** Number of published challenges on a topic (topic page). */
export const publishedCount = (topicId) =>
  CodeChallenge.countDocuments({ topicId, status: PUBLISHED });
