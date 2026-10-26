import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, FlaskConical, PlayCircle, RotateCcw, Target, Trophy } from 'lucide-react';
import { Page } from '../../components/layout/AppShell';
import {
  Badge,
  Button,
  EmptyState,
  EyebrowHeading,
  LoadingBlock,
  ProgressBar,
  ProgressRing,
  focusRing,
} from '../../components/ui';
import { cn } from '../../lib/cn';
import { useSession } from '../auth/session';
import { isPractical, theoryOnly, useLab, useProgress, useSubjects } from './api';
import { QueryError } from '../../components/QueryError';
import { item, stagger } from '../../lib/motion';

// Subject tiles rotate through tints of the A.8 palette (no new colours).
const SUBJECT_TINTS = [
  { tile: 'bg-blue/[0.08]', orb: 'bg-blue text-white shadow-[0_3px_0_0_#9E1360]' },
  { tile: 'bg-gold-tint/70', orb: 'bg-gold text-navy shadow-[0_3px_0_0_#C9A100]' },
  { tile: 'bg-navy/[0.06]', orb: 'bg-navy text-gold shadow-press-navy-sm' },
];

const ROMAN = ['I', 'II', 'III', 'IV'];

/** "Year III · Semester 5" from the term the HOD set; null until one is set. */
export function termLabel(user) {
  if (!user?.semester) return null;
  const year = user.yearOfStudy ?? Math.ceil(user.semester / 2);
  return `Year ${ROMAN[year - 1] ?? year} · Semester ${user.semester}`;
}

function greeting(now = new Date()) {
  const h = now.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function SubjectCard({ subject, progress, index }) {
  const total = progress?.totalTopics ?? 0;
  const c = progress?.counts ?? {};
  const mastered = c.confident ?? 0;
  const inProgress = (c.learning ?? 0) + (c.practicing ?? 0);
  const pct = total ? (mastered / total) * 100 : 0;
  const tint = SUBJECT_TINTS[index % SUBJECT_TINTS.length];

  return (
    <motion.li {...item} whileHover={{ y: -6 }} whileTap={{ scale: 0.98 }}>
      <Link
        to={`/subjects/${subject.id}`}
        className={cn(
          'glass glass-hover block h-full rounded-card p-2 hover:no-underline',
          focusRing,
        )}
      >
        <div className={cn('flex items-start justify-between gap-3 rounded-2xl p-4', tint.tile)}>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-navy/70">
              {subject.code} · Sem {subject.semester}
            </p>
            <h3 className="mt-1.5 text-lg leading-snug">{subject.name}</h3>
          </div>
          <motion.span
            whileHover={{ rotate: [0, -12, 12, 0], scale: 1.12 }}
            transition={{ duration: 0.5 }}
            className={cn(
              'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl',
              tint.orb,
            )}
          >
            <BookOpen className="h-5 w-5" aria-hidden />
          </motion.span>
        </div>

        <div className="flex items-center gap-4 px-3 pb-3 pt-4">
          <ProgressRing value={pct} label={`${subject.name} mastery`} size={60} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-navy">
              {mastered} of {total} topics mastered
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {c.needsRevision > 0 && (
                <Badge tone="orange" icon={RotateCcw}>
                  {c.needsRevision} to revise
                </Badge>
              )}
              {inProgress > 0 && (
                <Badge tone="blue" icon={PlayCircle}>
                  {inProgress} in progress
                </Badge>
              )}
              {mastered > 0 && mastered === total && (
                <Badge tone="gold" icon={Trophy}>
                  Complete
                </Badge>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.li>
  );
}

/** A practical (lab) subject: experiments done, on the roadmap of its theory subject (ADR 0012). */
function PracticalCard({ subject, theory, index }) {
  const lab = useLab(subject.id);
  const total = lab.data?.summary.total ?? 0;
  const done = lab.data?.summary.done ?? 0;
  const pct = total ? (done / total) * 100 : 0;
  const tint = SUBJECT_TINTS[(index + 1) % SUBJECT_TINTS.length];
  return (
    <motion.li {...item} whileHover={{ y: -6 }} whileTap={{ scale: 0.98 }}>
      <Link
        to={`/labs/${subject.id}`}
        className={cn(
          'glass glass-hover block h-full rounded-card p-2 hover:no-underline',
          focusRing,
        )}
      >
        <div className={cn('flex items-start justify-between gap-3 rounded-2xl p-4', tint.tile)}>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-navy/70">
              {subject.code} · Sem {subject.semester}
            </p>
            <h3 className="mt-1.5 text-lg leading-snug">{subject.name}</h3>
            {theory && (
              <p className="mt-1 text-xs font-semibold text-navy/70">Roadmap: {theory.name}</p>
            )}
          </div>
          <motion.span
            whileHover={{ rotate: [0, -12, 12, 0], scale: 1.12 }}
            transition={{ duration: 0.5 }}
            className={cn(
              'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl',
              tint.orb,
            )}
          >
            <FlaskConical className="h-5 w-5" aria-hidden />
          </motion.span>
        </div>
        <div className="flex items-center gap-4 px-3 pb-3 pt-4">
          <ProgressRing value={pct} label={`${subject.name} experiments done`} size={60} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-navy">
              {lab.isPending ? 'Loading experiments…' : `${done} of ${total} experiments done`}
            </p>
            {total > 0 && done === total && (
              <Badge tone="gold" icon={Trophy} className="mt-2">
                Complete
              </Badge>
            )}
          </div>
        </div>
      </Link>
    </motion.li>
  );
}

/** /learn — the student home (F3.5). */
export function LearnHome() {
  const user = useSession((s) => s.user);
  const subjects = useSubjects();
  const progress = useProgress();
  const progressOf = new Map((progress.data?.subjects ?? []).map((p) => [p.subjectId, p]));
  const allSubjects = progress.data?.subjects ?? [];
  const overall = allSubjects.reduce((n, s) => n + s.totalTopics, 0);
  const overallMastered = allSubjects.reduce((n, s) => n + (s.counts.confident ?? 0), 0);
  const term = termLabel(user);
  const theory = theoryOnly(subjects.data);
  const labs = (subjects.data ?? []).filter(isPractical);
  const subjectById = new Map((subjects.data ?? []).map((s) => [s.id, s]));

  return (
    <Page>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">{greeting()}</p>
          <h1 className="mt-1">Hello, {user.name.split(' ')[0]}</h1>
          <p className="mt-1 text-sm">
            {term ?? 'Your HOD has not set your semester yet, so all your subjects are shown.'}
          </p>
        </div>
        {overall > 0 && (
          <ProgressBar
            className="w-full sm:w-64"
            value={(overallMastered / overall) * 100}
            label={term ? `Semester ${user.semester} mastery` : 'Overall mastery'}
            showValue
            tone="gold"
          />
        )}
      </div>

      {subjects.isPending ? (
        <LoadingBlock className="mt-6" label="Loading your subjects" lines={4} />
      ) : subjects.isError ? (
        <QueryError className="mt-6" query={subjects} what="your subjects" />
      ) : subjects.data.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={BookOpen}
          title="No subjects yet"
          description={
            term
              ? `No subjects are set up for ${term} in your syllabus yet. Ask your HOD to check.`
              : 'Your account has no syllabus version, or no subjects are published for it. Ask your HOD to check your batch.'
          }
          action={
            <Button as={Link} to="/profile" variant="secondary">
              Check my profile
            </Button>
          }
        />
      ) : (
        <div className="mt-6 space-y-6">
          <section aria-labelledby="subjects-h">
            <div className="mb-4 flex items-center justify-between gap-3">
              <EyebrowHeading
                id="subjects-h"
                eyebrow={term ?? 'This semester'}
                title="My subjects"
              />
              <Button
                as={Link}
                to="/exam-prep"
                variant="secondary"
                size="sm"
                icon={Target}
                className="hover:no-underline"
              >
                Exam prep
              </Button>
            </div>
            {theory.length > 0 && (
              <>
                <h3 className="mb-3 flex items-center gap-2 text-base">
                  <BookOpen className="h-4 w-4" aria-hidden /> Theory
                </h3>
                <motion.ul {...stagger} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {theory.map((s, idx) => (
                    <SubjectCard
                      key={s.id}
                      subject={s}
                      progress={progressOf.get(s.id)}
                      index={idx}
                    />
                  ))}
                </motion.ul>
              </>
            )}
            {labs.length > 0 && (
              <>
                <h3 className="mb-3 mt-6 flex items-center gap-2 text-base">
                  <FlaskConical className="h-4 w-4" aria-hidden /> Practical
                </h3>
                <motion.ul {...stagger} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {labs.map((s, idx) => (
                    <PracticalCard
                      key={s.id}
                      subject={s}
                      theory={subjectById.get(s.theorySubjectId)}
                      index={idx}
                    />
                  ))}
                </motion.ul>
              </>
            )}
          </section>
        </div>
      )}
    </Page>
  );
}
