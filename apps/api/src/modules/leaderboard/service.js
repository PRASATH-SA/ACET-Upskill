import {
  MASTERY_STATES,
  XP_PER_STATE,
  isAdminRole,
  levelFor,
  xpForCounts,
  yearOfBatch,
  yearOfSemester,
} from '@acet/shared';
import { env } from '../../config/env.js';
import { sameId } from '../../db/mongoose.js';
import { canAccessStudent, facultySubjectIds } from '../../lib/access.js';
import { forbidden, notFound } from '../../lib/errors.js';
import { CodeSubmission } from '../codelab/model.js';
import { riskFor } from '../insights/service.js';
import { Attempt, Mastery, ReviewLog } from '../practice/model.js';
import { progressFor, studentAsAuthUser } from '../practice/service.js';
import { STUDENT_MAP_STATUSES, Subject, Topic } from '../syllabus/model.js';
import { Department } from '../org/model.js';
import { User } from '../users/model.js';
import { hodDepartment } from '../users/service.js';
import { audit } from '../audit/service.js';

/**
 * Leaderboard and cohort progress (ADR 0013). One scoring pass serves the student leaderboard,
 * the faculty class dashboard and the HOD department report, so the numbers always agree.
 * The score is the same mastery XP the student sees on their level card (gamify()).
 */

const DAY = 86_400_000;
const MAX_XP_PER_TOPIC = XP_PER_STATE.confident;
const round1 = (n) => Math.round(n * 10) / 10;
const avg = (xs) => (xs.length ? round1(xs.reduce((a, b) => a + b, 0) / xs.length) : null);

/** Whether a subject is part of a student's term: same syllabus version, and their semester once set. */
const followsSubject = (student, subject) =>
  sameId(student.syllabusVersionId, subject.syllabusVersionId) &&
  (!student.semester || student.semester === subject.semester);

const theory = { kind: { $ne: 'practical' } };
const STUDENT_FIELDS =
  'name email batch semester yearOfStudy departmentId syllabusVersionId lastActiveAt';

/**
 * Who is in the cohort and which subjects count, by role:
 * - student: classmates in the same syllabus version, semester and department;
 * - faculty: students taking any of their subjects (or the one `subjectId`);
 * - mentor: their assigned students;
 * - HOD: their department; coordinator: every department, or `departmentId`.
 */
async function resolveCohort(user, query = {}) {
  const { subjectId, semester, batch } = query;
  let subjects;
  let studentFilter;

  if (user.role === 'student') {
    if (!user.syllabusVersionId) return { students: [], subjects: [] };
    subjects = await Subject.find({
      ...theory,
      syllabusVersionId: user.syllabusVersionId,
      ...(user.semester ? { semester: user.semester } : {}),
    }).lean();
    studentFilter = {
      syllabusVersionId: user.syllabusVersionId,
      semester: user.semester ?? null,
      ...(user.departmentId ? { departmentId: user.departmentId } : {}),
    };
  } else if (user.role === 'faculty') {
    subjects = await Subject.find({
      ...theory,
      _id: { $in: await facultySubjectIds(user.id) },
    }).lean();
    if (subjectId && !subjects.some((s) => sameId(s._id, subjectId))) {
      throw forbidden('You do not teach this subject');
    }
    studentFilter = null; // built from the subjects below
  } else if (user.role === 'mentor') {
    studentFilter = { mentorId: user.id };
  } else if (isAdminRole(user.role)) {
    const dept = hodDepartment(user) ?? query.departmentId ?? null;
    studentFilter = dept ? { departmentId: dept } : {};
  } else {
    throw forbidden();
  }

  if (subjectId) {
    const one = (subjects ?? (await Subject.find({ _id: subjectId, ...theory }).lean())).filter(
      (s) => sameId(s._id, subjectId),
    );
    if (!one.length) throw notFound('Subject');
    subjects = one;
  }

  const base = {
    role: 'student',
    isActive: true,
    ...(semester && user.role !== 'student' ? { semester } : {}),
    ...(batch ? { batch } : {}),
  };
  let students;
  if (studentFilter === null || (subjectId && user.role !== 'student')) {
    // Students who follow at least one of the subjects.
    const or = subjects.map((s) => ({
      syllabusVersionId: s.syllabusVersionId,
      semester: { $in: [null, s.semester] },
    }));
    students = or.length
      ? await User.find({ ...base, ...(studentFilter ?? {}), $or: or })
          .select(STUDENT_FIELDS)
          .lean()
      : [];
  } else {
    students = await User.find({ ...base, ...studentFilter })
      .select(STUDENT_FIELDS)
      .lean();
  }
  if (!subjects) {
    const versions = [
      ...new Set(
        students
          .map((s) => s.syllabusVersionId)
          .filter(Boolean)
          .map(String),
      ),
    ];
    subjects = versions.length
      ? await Subject.find({ ...theory, syllabusVersionId: { $in: versions } }).lean()
      : [];
  }
  return { students, subjects };
}

/**
 * Scores every student of a cohort over the subjects they follow: mastery state counts, XP and
 * level, mastery % (topics confident), progress % (XP of the most XP possible), average latest
 * quiz score, code-lab problems solved and last activity.
 */
async function scoreCohort({ students, subjects }, now = new Date()) {
  if (!students.length) return { rows: [], subjects: [], topicTotals: new Map() };
  const ids = students.map((s) => s._id);
  const subjectIds = subjects.map((s) => s._id);
  const visible = await Topic.find({
    subjectId: { $in: subjectIds },
    status: { $in: [...STUDENT_MAP_STATUSES] },
  })
    .select('_id subjectId')
    .lean();
  const topicTotals = new Map();
  for (const t of visible) {
    const k = String(t.subjectId);
    topicTotals.set(k, (topicTotals.get(k) ?? 0) + 1);
  }
  const labs = await Subject.find({ kind: 'practical', theorySubjectId: { $in: subjectIds } })
    .select('_id')
    .lean();

  const deptIds = [
    ...new Set(
      students
        .map((st) => st.departmentId)
        .filter(Boolean)
        .map(String),
    ),
  ];
  const [mastery, solved, lastAttempt, lastReview, departments] = await Promise.all([
    Mastery.aggregate([
      { $match: { userId: { $in: ids }, topicId: { $in: visible.map((t) => t._id) } } },
      {
        $group: {
          _id: { u: '$userId', s: '$subjectId', st: '$state' },
          n: { $sum: 1 },
          scoreSum: { $sum: { $ifNull: ['$score', 0] } },
          scored: { $sum: { $cond: [{ $eq: [{ $ifNull: ['$score', null] }, null] }, 0, 1] } },
        },
      },
    ]),
    CodeSubmission.aggregate([
      {
        $match: {
          userId: { $in: ids },
          passed: true,
          subjectId: { $in: [...subjectIds, ...labs.map((l) => l._id)] },
        },
      },
      { $group: { _id: { u: '$userId', c: '$challengeId' } } },
      { $group: { _id: '$_id.u', n: { $sum: 1 } } },
    ]),
    Attempt.aggregate([
      { $match: { userId: { $in: ids } } },
      { $group: { _id: '$userId', at: { $max: '$answeredAt' } } },
    ]),
    ReviewLog.aggregate([
      { $match: { userId: { $in: ids } } },
      { $group: { _id: '$userId', at: { $max: '$at' } } },
    ]),
    Department.find({ _id: { $in: deptIds } })
      .select('name code')
      .lean(),
  ]);
  const deptById = new Map(departments.map((d) => [String(d._id), d]));

  /** `${userId}:${subjectId}` → { counts, scoreSum, scored } */
  const cells = new Map();
  for (const m of mastery) {
    const key = `${m._id.u}:${m._id.s}`;
    if (!cells.has(key)) cells.set(key, { counts: {}, scoreSum: 0, scored: 0 });
    const c = cells.get(key);
    c.counts[m._id.st] = (c.counts[m._id.st] ?? 0) + m.n;
    c.scoreSum += m.scoreSum;
    c.scored += m.scored;
  }
  const toMap = (rows, f) => new Map(rows.map((r) => [String(r._id), r[f]]));
  const solvedMap = toMap(solved, 'n');
  const attMap = toMap(lastAttempt, 'at');
  const revMap = toMap(lastReview, 'at');
  const e = env();
  const riskCfg = {
    inactiveDays: e.MENTOR_INACTIVE_DAYS,
    needsRevision: e.MENTOR_RISK_NEEDS_REVISION,
  };

  const rows = students.map((st) => {
    const id = String(st._id);
    const counts = Object.fromEntries(MASTERY_STATES.map((s) => [s, 0]));
    let totalTopics = 0;
    let scoreSum = 0;
    let scored = 0;
    const bySubject = {};
    for (const subject of subjects) {
      if (!followsSubject(st, subject)) continue;
      const sid = String(subject._id);
      const total = topicTotals.get(sid) ?? 0;
      const cell = cells.get(`${id}:${sid}`) ?? { counts: {}, scoreSum: 0, scored: 0 };
      const sc = Object.fromEntries(MASTERY_STATES.map((s) => [s, cell.counts[s] ?? 0]));
      const tracked = MASTERY_STATES.reduce((n, s) => n + sc[s], 0);
      sc.notStarted += Math.max(0, total - tracked);
      for (const s of MASTERY_STATES) counts[s] += sc[s];
      totalTopics += total;
      scoreSum += cell.scoreSum;
      scored += cell.scored;
      bySubject[sid] = { counts: sc, total, scoreSum: cell.scoreSum, scored: cell.scored };
    }
    const xp = xpForCounts(counts);
    const lvl = levelFor(xp);
    const lastActiveAt =
      [st.lastActiveAt, attMap.get(id), revMap.get(id)]
        .filter(Boolean)
        .sort((a, b) => new Date(b) - new Date(a))[0] ?? null;
    return {
      studentId: id,
      name: st.name,
      email: st.email,
      batch: st.batch ?? null,
      semester: st.semester ?? null,
      departmentId: st.departmentId ? String(st.departmentId) : null,
      department: deptById.get(String(st.departmentId))?.name ?? null,
      departmentCode: deptById.get(String(st.departmentId))?.code ?? null,
      // Set by the HOD; else from the semester; else from the batch ("2023-27" → IV in 2026-27).
      yearOfStudy:
        st.yearOfStudy ?? (st.semester ? yearOfSemester(st.semester) : yearOfBatch(st.batch, now)),
      xp,
      level: lvl.level,
      levelTitle: lvl.title,
      counts,
      totalTopics,
      mastered: counts.confident,
      started: totalTopics - counts.notStarted,
      needsRevision: counts.needsRevision,
      masteryPct: totalTopics ? round1((counts.confident / totalTopics) * 100) : 0,
      progressPct: totalTopics ? round1((xp / (totalTopics * MAX_XP_PER_TOPIC)) * 100) : 0,
      averageScore: scored ? round1(scoreSum / scored) : null,
      quizzesScored: scored,
      codeSolved: solvedMap.get(id) ?? 0,
      lastActiveAt,
      activeThisWeek: Boolean(lastActiveAt && now - new Date(lastActiveAt) < 7 * DAY),
      risk: riskFor({ needsRevision: counts.needsRevision, lastActiveAt }, now, riskCfg),
      bySubject,
    };
  });
  return { rows: rank(rows), subjects, topicTotals };
}

/**
 * Sorts by XP, then topics mastered, then average quiz score, then name. Students level on XP
 * and mastered share a rank (1, 2, 2, 4).
 */
export function rank(rows) {
  const sorted = [...rows].sort(
    (a, b) =>
      b.xp - a.xp ||
      b.mastered - a.mastered ||
      (b.averageScore ?? -1) - (a.averageScore ?? -1) ||
      a.name.localeCompare(b.name),
  );
  let prev = null;
  return sorted.map((r, i) => {
    const tied = prev && prev.xp === r.xp && prev.mastered === r.mastered;
    const out = { ...r, rank: tied ? prev.rank : i + 1 };
    prev = out;
    return out;
  });
}

const subjectSummary = (s) => ({
  subjectId: String(s._id),
  code: s.code,
  name: s.name,
  semester: s.semester,
});

/** What a student may see of a classmate: rank, name, department, year, batch, XP, level badge, topics mastered. */
const publicRow = (r, me) => ({
  rank: r.rank,
  studentId: r.studentId,
  name: r.name,
  batch: r.batch,
  department: r.department,
  departmentCode: r.departmentCode,
  yearOfStudy: r.yearOfStudy,
  xp: r.xp,
  level: r.level,
  levelTitle: r.levelTitle,
  mastered: r.mastered,
  isMe: r.studentId === me,
});

const staffRow = ({ bySubject: _b, counts: _c, ...r }) => r;

/** GET /leaderboard — the cohort ranked by XP. Students get the top rows plus their own. */
export async function leaderboard(user, query = {}) {
  const cohort = await resolveCohort(user, query);
  const { rows, subjects } = await scoreCohort(cohort);
  const limit = query.limit ?? 50;
  const scope = { subjects: subjects.map(subjectSummary), cohortSize: rows.length };
  if (user.role === 'student') {
    const me = rows.find((r) => r.studentId === user.id);
    return {
      scope,
      rows: rows.slice(0, limit).map((r) => publicRow(r, user.id)),
      me: me ? publicRow(me, user.id) : null,
    };
  }
  return { scope, rows: rows.slice(0, limit).map(staffRow), me: null };
}

/** Averages for a group of scored students. */
function groupStats(rows) {
  return {
    students: rows.length,
    activeThisWeek: rows.filter((r) => r.activeThisWeek).length,
    averageXp: avg(rows.map((r) => r.xp)) ?? 0,
    averageMasteryPct: avg(rows.map((r) => r.masteryPct)) ?? 0,
    averageProgressPct: avg(rows.map((r) => r.progressPct)) ?? 0,
    averageScore: avg(rows.filter((r) => r.averageScore !== null).map((r) => r.averageScore)),
    atRisk: rows.filter((r) => r.risk.level !== 'none').length,
  };
}

function groupBy(rows, key) {
  const groups = new Map();
  for (const r of rows) {
    const k = r[key] ?? null;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
  }
  return groups;
}

/**
 * GET /reports/progress — overall progress of a faculty member's classes or a HOD's department:
 * headline averages, mastery state totals, per subject, per semester and per batch, and every
 * student ranked (with risk signals) for drilling into one student.
 */
export async function progressReport(user, query = {}) {
  const cohort = await resolveCohort(user, query);
  const { rows, subjects, topicTotals } = await scoreCohort(cohort);
  const states = Object.fromEntries(
    MASTERY_STATES.map((s) => [s, rows.reduce((n, r) => n + r.counts[s], 0)]),
  );

  const bySubject = subjects
    .map((s) => {
      const sid = String(s._id);
      const cells = rows.filter((r) => r.bySubject[sid]).map((r) => r.bySubject[sid]);
      const total = topicTotals.get(sid) ?? 0;
      const st = Object.fromEntries(
        MASTERY_STATES.map((k) => [k, cells.reduce((n, c) => n + c.counts[k], 0)]),
      );
      const scored = cells.reduce((n, c) => n + c.scored, 0);
      return {
        ...subjectSummary(s),
        totalTopics: total,
        students: cells.length,
        states: st,
        averageMasteryPct: total
          ? (avg(cells.map((c) => (c.counts.confident / total) * 100)) ?? 0)
          : 0,
        averageProgressPct: total
          ? (avg(cells.map((c) => (xpForCounts(c.counts) / (total * MAX_XP_PER_TOPIC)) * 100)) ?? 0)
          : 0,
        averageScore: scored ? round1(cells.reduce((n, c) => n + c.scoreSum, 0) / scored) : null,
        needsRevision: st.needsRevision,
      };
    })
    .sort((a, b) => a.semester - b.semester || a.code.localeCompare(b.code));

  const bySemester = [...groupBy(rows, 'semester')]
    .map(([semester, rs]) => ({ semester, ...groupStats(rs) }))
    .sort((a, b) => (a.semester ?? 99) - (b.semester ?? 99));
  const byBatch = [...groupBy(rows, 'batch')]
    .map(([batch, rs]) => ({ batch, ...groupStats(rs) }))
    .sort((a, b) => String(a.batch ?? '~').localeCompare(String(b.batch ?? '~')));

  return {
    scope: { subjects: subjects.map(subjectSummary) },
    summary: { ...groupStats(rows), states },
    bySubject,
    bySemester,
    byBatch,
    students: rows.map(staffRow),
  };
}

/**
 * GET /reports/students/:id — one student's progress for staff: profile, the same progress the
 * student sees, code-lab problems solved and their rank in the viewer's cohort.
 * A HOD sees only their department's students (ADR 0011). Audited like every staff view.
 */
export async function studentReport(user, studentId) {
  const target = await User.findById(studentId).select(`role ${STUDENT_FIELDS}`).lean();
  if (!target || target.role !== 'student') throw notFound('Student');
  if (!(await canAccessStudent(user, studentId))) {
    throw forbidden('You do not have access to this student');
  }
  if (user.role === 'admin' && !sameId(target.departmentId, user.departmentId)) {
    throw forbidden('This student is not in your department');
  }
  await audit({
    actorId: user.id,
    action: 'user.dataAccess',
    target: { type: 'user', id: studentId },
    meta: { purpose: 'studentReport' },
  });
  const [progress, cohort] = await Promise.all([
    progressFor(await studentAsAuthUser(studentId)),
    resolveCohort(user, {}).then(scoreCohort),
  ]);
  const row = cohort.rows.find((r) => r.studentId === String(studentId));
  return {
    student: {
      id: String(target._id),
      name: target.name,
      email: target.email,
      batch: target.batch ?? null,
      yearOfStudy: target.yearOfStudy ?? null,
      semester: target.semester ?? null,
    },
    progress,
    standing: row
      ? {
          rank: row.rank,
          cohortSize: cohort.rows.length,
          xp: row.xp,
          averageScore: row.averageScore,
          codeSolved: row.codeSolved,
          lastActiveAt: row.lastActiveAt,
          risk: row.risk,
        }
      : null,
    // Subjects this viewer teaches, so the page can mark them.
    mySubjectIds: user.role === 'faculty' ? await facultySubjectIds(user.id) : [],
  };
}
