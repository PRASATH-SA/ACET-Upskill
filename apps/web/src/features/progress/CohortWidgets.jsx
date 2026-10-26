import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  GraduationCap,
  Star,
  Target,
  Trophy,
  TriangleAlert,
  Users,
} from 'lucide-react';
import {
  Avatar,
  Badge,
  Button,
  Card,
  LoadingBlock,
  ProgressBar,
  StatTile,
} from '../../components/ui';
import { QueryError } from '../../components/QueryError';
import { item, stagger } from '../../lib/motion';
import { MasteryBar } from '../student/practice/ProgressPage';
import { useProgressReport, studentPath } from './api';

export const RISK = {
  high: { tone: 'red', label: 'High risk' },
  medium: { tone: 'orange', label: 'Watch' },
  none: { tone: 'green', label: 'On track' },
};

export const fmtPct = (n) => (n === null || n === undefined ? '–' : `${Math.round(n)}%`);

export function lastActive(d) {
  if (!d) return 'never';
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000);
  return days <= 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`;
}

/** Headline numbers for a cohort report. */
export function CohortSummaryTiles({ summary }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatTile
        label="Students"
        value={summary.students}
        icon={Users}
        hint={`${summary.activeThisWeek} active this week`}
      />
      <StatTile
        label="Average progress"
        value={fmtPct(summary.averageProgressPct)}
        icon={Activity}
        tone="navy"
        hint={`${fmtPct(summary.averageMasteryPct)} of topics mastered`}
      />
      <StatTile
        label="Average quiz score"
        value={fmtPct(summary.averageScore)}
        icon={Target}
        hint="Latest score per topic"
      />
      <StatTile
        label="Need attention"
        value={summary.atRisk}
        icon={TriangleAlert}
        tone={summary.atRisk ? 'gold' : 'default'}
        hint="Inactive, or many topics to revise"
      />
    </div>
  );
}

/** One card per subject: average progress and the class's mastery states. */
export function SubjectProgressList({ subjects }) {
  if (!subjects.length) return <p className="mt-3 text-sm">No subjects in this view yet.</p>;
  return (
    <motion.ul {...stagger} className="mt-4 grid gap-4 md:grid-cols-2">
      {subjects.map((s) => {
        const total = Object.values(s.states).reduce((a, b) => a + b, 0);
        return (
          <motion.li key={s.subjectId} {...item}>
            <Card className="h-full">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-base">
                  {s.code} · {s.name}
                </h3>
                <span className="text-xs">
                  Sem {s.semester} · {s.students} students · {s.totalTopics} topics
                </span>
              </div>
              <ProgressBar
                className="mt-4"
                value={s.averageProgressPct}
                label="Average progress"
                showValue
              />
              <div className="mt-4">
                <MasteryBar counts={s.states} total={total} />
              </div>
              <p className="mt-3 text-xs">
                Average quiz score <strong className="text-navy">{fmtPct(s.averageScore)}</strong>
                {s.needsRevision > 0 && ` · ${s.needsRevision} topic-revisions pending`}
              </p>
            </Card>
          </motion.li>
        );
      })}
    </motion.ul>
  );
}

const YEAR = ['I', 'II', 'III', 'IV'];

/** "CSE · III Year · 2023-27": who a student is, shown beside their name on every ranking. */
export function studentMeta(r) {
  return [
    r.departmentCode ?? r.department,
    r.yearOfStudy ? `${YEAR[r.yearOfStudy - 1] ?? r.yearOfStudy} Year` : null,
    r.batch,
  ]
    .filter(Boolean)
    .join(' · ');
}

/** The student's level as a badge; gold from level 5 (Achiever) up. */
export function LevelTag({ level, title }) {
  return (
    <Badge tone={level >= 5 ? 'gold' : 'blue'} icon={Star}>
      Lv {level} · {title}
    </Badge>
  );
}

/** Medal colours for the top three. */
// Explicit hues: the theme's `red`/`blue` names carry the brand palette (ADR 0010).
// Text on each fill meets WCAG AA for bold text.
export const TOP3 = [
  {
    fill: 'bg-gradient-to-b from-[#FF4D5E] to-[#C8102E] text-white',
    ring: 'ring-[#E11D48]',
    glow: 'shadow-[0_10px_28px_-8px_rgba(225,29,72,0.65)]',
  },
  {
    fill: 'bg-gradient-to-b from-[#FFE14D] to-[#F5B400] text-navy',
    ring: 'ring-[#F5B400]',
    glow: 'shadow-[0_10px_28px_-8px_rgba(245,180,0,0.65)]',
  },
  {
    fill: 'bg-gradient-to-b from-[#3BA4FF] to-[#0B5CD6] text-white',
    ring: 'ring-[#1E7BEA]',
    glow: 'shadow-[0_10px_28px_-8px_rgba(30,123,234,0.65)]',
  },
];

/** Medal colours for the top three: red, yellow, blue. */
export const MEDAL = TOP3.map((t) => `${t.fill} ${t.glow}`);

export function RankBadge({ rank }) {
  return (
    <span
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
        MEDAL[rank - 1] ?? 'bg-surface text-navy'
      }`}
      aria-label={`Rank ${rank}`}
    >
      {rank}
    </span>
  );
}

/** A short ranked list of students (dashboards). */
export function StudentShortList({ rows, role, empty, extra, label }) {
  if (!rows.length) return <p className="mt-2 text-sm">{empty}</p>;
  return (
    <ul className="mt-3 space-y-2" aria-label={label}>
      {rows.map((r) => (
        <li key={r.studentId}>
          <Link
            to={studentPath(role, r.studentId)}
            className="flex min-h-[44px] items-center gap-3 rounded-xl border border-line p-2.5 glass-hover hover:no-underline"
          >
            <RankBadge rank={r.rank} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold text-navy">{r.name}</span>
              <span className="block text-xs">{extra(r)}</span>
            </span>
            <ArrowRight className="h-4 w-4 text-navy" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Every student of a report, ranked, with a link to their progress page. */
export function StudentTable({ students, role, showSemester = false }) {
  if (!students.length) return <p className="mt-3 text-sm">No students match these filters.</p>;
  return (
    <div className="mt-4 overflow-x-auto rounded-card border border-line bg-card">
      <table className="w-full min-w-[720px] text-left text-sm">
        <caption className="sr-only">Students ranked by XP</caption>
        <thead>
          <tr className="border-b border-line text-xs uppercase tracking-wider text-navy">
            <th scope="col" className="px-3 py-2">
              Rank
            </th>
            <th scope="col" className="px-3 py-2">
              Student
            </th>
            {showSemester && (
              <th scope="col" className="px-3 py-2">
                Sem
              </th>
            )}
            <th scope="col" className="px-3 py-2 text-right">
              XP
            </th>
            <th scope="col" className="px-3 py-2 text-right">
              Mastered
            </th>
            <th scope="col" className="px-3 py-2">
              Progress
            </th>
            <th scope="col" className="px-3 py-2 text-right">
              Quiz avg
            </th>
            <th scope="col" className="px-3 py-2 text-right">
              Code solved
            </th>
            <th scope="col" className="px-3 py-2">
              Last active
            </th>
            <th scope="col" className="px-3 py-2">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.studentId} className="border-b border-line last:border-0">
              <td className="px-3 py-2">
                <RankBadge rank={s.rank} />
              </td>
              <td className="px-3 py-2">
                <Link to={studentPath(role, s.studentId)} className="flex items-center gap-2">
                  <Avatar name={s.name} size="sm" />
                  <span>
                    <span className="block font-semibold">{s.name}</span>
                    <span className="block text-xs text-body">
                      {studentMeta(s) || 'No department'}
                    </span>
                  </span>
                </Link>
              </td>
              {showSemester && <td className="px-3 py-2">{s.semester ?? '–'}</td>}
              <td className="px-3 py-2 text-right font-semibold text-navy">
                {s.xp}
                <span className="mt-1 block">
                  <LevelTag level={s.level} title={s.levelTitle} />
                </span>
              </td>
              <td className="px-3 py-2 text-right">
                {s.mastered} / {s.totalTopics}
              </td>
              <td className="px-3 py-2">
                <ProgressBar size="sm" value={s.progressPct} label={`${fmtPct(s.progressPct)}`} />
              </td>
              <td className="px-3 py-2 text-right">{fmtPct(s.averageScore)}</td>
              <td className="px-3 py-2 text-right">{s.codeSolved}</td>
              <td className="px-3 py-2 text-xs">{lastActive(s.lastActiveAt)}</td>
              <td className="px-3 py-2">
                <Badge tone={RISK[s.risk.level].tone}>{RISK[s.risk.level].label}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Dashboard panel (faculty studio home and HOD overview): headline numbers, progress per
 * subject, the top five and the students who need attention, with a link to the full report.
 */
export function CohortProgressPanel({ title, role, to, linkLabel, query = {} }) {
  const report = useProgressReport(query);
  return (
    <section className="mt-8" aria-labelledby="cohort-progress-h">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="cohort-progress-h">{title}</h2>
        <div className="flex flex-wrap gap-2">
          <Button
            as={Link}
            to="/leaderboard"
            size="sm"
            variant="secondary"
            icon={Trophy}
            className="hover:no-underline"
          >
            Leaderboard
          </Button>
          <Button as={Link} to={to} size="sm" icon={GraduationCap} className="hover:no-underline">
            {linkLabel}
          </Button>
        </div>
      </div>
      {report.isPending ? (
        <LoadingBlock className="mt-4" lines={4} />
      ) : report.isError ? (
        <QueryError className="mt-4" query={report} what="student progress" />
      ) : (
        <>
          <div className="mt-4">
            <CohortSummaryTiles summary={report.data.summary} />
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div>
              <h3 className="text-lg">By subject</h3>
              <SubjectProgressList subjects={report.data.bySubject} />
            </div>
            <div className="space-y-4">
              <Card>
                <h3 className="text-lg">Top students</h3>
                <StudentShortList
                  rows={report.data.students.slice(0, 5)}
                  role={role}
                  label="Top students"
                  empty="No students yet."
                  extra={(r) => `${r.xp} XP · ${r.mastered} mastered`}
                />
              </Card>
              <Card>
                <h3 className="text-lg">Need attention</h3>
                <StudentShortList
                  rows={report.data.students.filter((s) => s.risk.level === 'high').slice(0, 5)}
                  role={role}
                  label="Need attention"
                  empty="Nobody is at high risk right now."
                  extra={(r) => r.risk.reasons.join(' · ')}
                />
              </Card>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
