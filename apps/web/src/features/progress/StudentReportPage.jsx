import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Brain, Code2, Flame, Target, Trophy } from 'lucide-react';
import { gamify } from '@acet/shared';
import { Page } from '../../components/layout/AppShell';
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  EyebrowHeading,
  LoadingBlock,
  StatTile,
} from '../../components/ui';
import { item, stagger } from '../../lib/motion';
import { useSession } from '../auth/session';
import { AchievementGrid, LevelCard } from '../student/game/GameWidgets';
import { MasteryBar } from '../student/practice/ProgressPage';
import { useStudentReport } from './api';
import { RISK, fmtPct, lastActive } from './CohortWidgets';

/**
 * /studio/students/:id — one student's progress for faculty and the HOD: level and XP, rank in
 * the viewer's cohort, mastery per subject, weakest topics and achievements. Audited by the API.
 */
export function StudentReportPage() {
  const { id } = useParams();
  const role = useSession((s) => s.user.role);
  const report = useStudentReport(id);
  const game = useMemo(() => (report.data ? gamify(report.data.progress) : null), [report.data]);
  const back =
    role === 'faculty'
      ? { to: '/studio/students', label: 'Student progress' }
      : { to: '/admin/progress', label: 'Department progress' };

  if (report.isPending) {
    return (
      <Page>
        <LoadingBlock lines={6} label="Loading student progress" />
      </Page>
    );
  }
  if (report.isError) {
    return (
      <Page>
        <EmptyState
          title="Student not available"
          description={report.error.message}
          action={
            <Button as={Link} to={back.to}>
              Back to {back.label.toLowerCase()}
            </Button>
          }
        />
      </Page>
    );
  }
  const { student, progress, standing, mySubjectIds } = report.data;
  const mine = new Set(mySubjectIds);
  const mastered = progress.subjects.reduce((n, s) => n + s.counts.confident, 0);
  const total = progress.subjects.reduce((n, s) => n + s.totalTopics, 0);

  return (
    <Page>
      <Link
        to={back.to}
        className="inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> {back.label}
      </Link>
      <div className="flex flex-wrap items-center gap-4">
        <Avatar name={student.name} size="lg" />
        <EyebrowHeading
          eyebrow={
            [student.batch, student.semester && `Semester ${student.semester}`]
              .filter(Boolean)
              .join(' · ') || 'Student'
          }
          title={student.name}
          level={1}
        >
          <p className="text-sm">
            {student.email} · last active {lastActive(standing?.lastActiveAt)}
          </p>
        </EyebrowHeading>
        {standing && (
          <Badge tone={RISK[standing.risk.level].tone} className="ml-auto">
            {RISK[standing.risk.level].label}
          </Badge>
        )}
      </div>
      {standing?.risk.reasons.length > 0 && (
        <p className="mt-2 text-sm text-warning-dark">{standing.risk.reasons.join(' · ')}</p>
      )}

      <div className="mt-6">
        <LevelCard game={game} streak={progress.revision.streakDays} />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Class rank"
          value={standing ? `#${standing.rank}` : '–'}
          icon={Trophy}
          tone="navy"
          hint={standing ? `of ${standing.cohortSize} students` : 'Not in your classes'}
        />
        <StatTile
          label="Topics mastered"
          value={`${mastered} / ${total}`}
          tone="gold"
          hint={`${progress.revision.dueNow} revisions due now`}
          icon={Brain}
        />
        <StatTile
          label="Quiz average"
          value={fmtPct(standing?.averageScore)}
          icon={Target}
          hint="Latest score per topic"
        />
        <StatTile
          label="Code problems solved"
          value={standing?.codeSolved ?? 0}
          icon={Code2}
          hint={
            <span className="inline-flex items-center gap-1">
              <Flame className="h-3 w-3" aria-hidden /> {progress.revision.streakDays}-day revision
              streak
            </span>
          }
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section aria-labelledby="mastery-h">
          <h2 id="mastery-h">Mastery by subject</h2>
          {progress.subjects.length === 0 ? (
            <p className="mt-3 text-sm">No subjects for this student&apos;s term yet.</p>
          ) : (
            <motion.ul {...stagger} className="mt-4 space-y-4">
              {progress.subjects.map((s) => (
                <motion.li key={s.subjectId} {...item}>
                  <Card>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="text-base">
                        {s.code} · {s.name}
                      </h3>
                      <span className="flex items-center gap-2 text-xs">
                        {mine.has(s.subjectId) && <Badge tone="blue">Your subject</Badge>}
                        {s.totalTopics} topics
                      </span>
                    </div>
                    <div className="mt-3">
                      <MasteryBar counts={s.counts} total={s.totalTopics} />
                    </div>
                  </Card>
                </motion.li>
              ))}
            </motion.ul>
          )}
        </section>
        <aside aria-labelledby="weak-h">
          <Card>
            <h2 id="weak-h" className="text-lg">
              Weakest topics
            </h2>
            {progress.weakestTopics.length === 0 ? (
              <p className="mt-2 text-sm">No quiz scores yet.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {progress.weakestTopics.map((t) => (
                  <li
                    key={t.topicId}
                    className="flex items-center justify-between gap-2 rounded-xl border border-line p-3"
                  >
                    <span className="font-semibold text-navy">{t.title}</span>
                    <Badge tone={t.state === 'needsRevision' ? 'orange' : 'neutral'}>
                      {t.score}%
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </aside>
      </div>

      <section aria-labelledby="ach-h" className="mt-8">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 id="ach-h">Achievements</h2>
          <span className="text-sm font-semibold text-navy">
            {game.unlockedCount} of {game.achievements.length} unlocked
          </span>
        </div>
        <AchievementGrid achievements={game.achievements} />
      </section>
    </Page>
  );
}
