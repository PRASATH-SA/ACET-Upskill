import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, Medal, Trophy } from 'lucide-react';
import { SEMESTERS, isAdminRole } from '@acet/shared';
import { Page } from '../../components/layout/AppShell';
import {
  Avatar,
  Badge,
  Card,
  Chip,
  EmptyState,
  EyebrowHeading,
  LoadingBlock,
  Select,
} from '../../components/ui';
import { QueryError } from '../../components/QueryError';
import { bouncy, item, stagger } from '../../lib/motion';
import { cn } from '../../lib/cn';
import { useSession } from '../auth/session';
import { useDepartments } from '../admin/lookups';
import { useLeaderboard } from './api';
import { LevelTag, RankBadge, StudentTable, TOP3, studentMeta } from './CohortWidgets';

/** Subjects of the unfiltered view, kept so the subject filter can switch back and forth. */
function useSubjectOptions(data, subjectId) {
  const [options, setOptions] = useState([]);
  useEffect(() => {
    if (data && !subjectId) setOptions(data.scope.subjects);
  }, [data, subjectId]);
  return options;
}

function SubjectChips({ subjects, value, onChange }) {
  if (subjects.length < 2) return null;
  return (
    <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Filter by subject">
      <Chip selected={!value} onClick={() => onChange(undefined)}>
        All subjects
      </Chip>
      {subjects.map((s) => (
        <Chip
          key={s.subjectId}
          selected={value === s.subjectId}
          onClick={() => onChange(s.subjectId)}
        >
          {s.code}
        </Chip>
      ))}
    </div>
  );
}

const PODIUM_HEIGHT = ['h-28', 'h-20', 'h-16'];

/** The top three on steps: second, first, third. */
function Podium({ rows }) {
  const order = [rows[1], rows[0], rows[2]].filter(Boolean);
  return (
    <ol className="mt-6 grid grid-cols-3 items-end gap-3" aria-label="Top three">
      {order.map((r) => {
        // Place on the podium (0–2), not the rank, so tied students still get three colours.
        const i = rows.indexOf(r);
        const tone = TOP3[i];
        return (
          <motion.li
            key={r.studentId}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...bouncy, delay: 0.1 * (2 - Math.min(i, 2)) }}
            className="flex flex-col items-center text-center"
          >
            {i === 0 && (
              <motion.span
                aria-hidden
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Crown className="h-6 w-6 text-[#E11D48]" />
              </motion.span>
            )}
            <Avatar
              name={r.name}
              size={i === 0 ? 'lg' : 'md'}
              className={cn('ring-4', tone.ring)}
            />
            <p
              className={cn(
                'mt-2 line-clamp-2 text-sm font-semibold text-navy',
                r.isMe && 'text-brand',
              )}
            >
              {r.name}
              {r.isMe && ' (you)'}
            </p>
            <p className="text-xs">{studentMeta(r)}</p>
            <p className="mt-1 font-heading text-lg font-bold text-navy">{r.xp} XP</p>
            <LevelTag level={r.level} title={r.levelTitle} />
            <div
              className={cn(
                'mt-2 flex w-full items-start justify-center rounded-t-2xl pt-2 font-heading text-3xl font-bold',
                PODIUM_HEIGHT[i],
                tone.fill,
                tone.glow,
              )}
            >
              {r.rank}
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}

function StudentRow({ r }) {
  return (
    <motion.li
      {...item}
      className={cn(
        'flex min-h-[56px] items-center gap-3 rounded-card border p-3',
        r.isMe ? 'border-brand bg-brand-soft' : 'border-line bg-card',
      )}
      aria-current={r.isMe ? 'true' : undefined}
    >
      <RankBadge rank={r.rank} />
      <Avatar name={r.name} size="sm" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-navy">
          {r.name}
          {r.isMe && ' (you)'}
        </span>
        <span className="block text-xs">{studentMeta(r)}</span>
        <span className="mt-1 flex flex-wrap items-center gap-2 text-xs">
          <LevelTag level={r.level} title={r.levelTitle} />
          {r.mastered} topics mastered
        </span>
      </span>
      <span className="text-right">
        <span className="block font-heading text-lg font-bold text-navy">{r.xp}</span>
        <span className="block text-xs">XP</span>
      </span>
    </motion.li>
  );
}

/** Student view: their class on a podium and in a list, with their own rank pinned on top. */
function StudentLeaderboard() {
  const [subjectId, setSubjectId] = useState();
  const board = useLeaderboard({ subjectId, limit: 50 });
  const subjects = useSubjectOptions(board.data, subjectId);
  const data = board.data;
  return (
    <Page>
      <EyebrowHeading eyebrow="Leaderboard" title="Your class" level={1}>
        <p className="text-sm">
          Ranked by XP from the topics you learn and master. Revise to keep your topics confident.
        </p>
      </EyebrowHeading>
      <SubjectChips subjects={subjects} value={subjectId} onChange={setSubjectId} />
      {board.isPending ? (
        <LoadingBlock className="mt-6" lines={6} />
      ) : board.isError ? (
        <QueryError className="mt-6" query={board} what="the leaderboard" />
      ) : data.rows.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={Trophy}
          title="No classmates yet"
          description="The leaderboard appears once your HOD places you in a class."
        />
      ) : (
        <>
          {data.me && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={bouncy}
              className="mt-6 flex flex-wrap items-center gap-4 rounded-card glass-navy p-5 text-white"
            >
              <Medal className="h-8 w-8 text-gold" aria-hidden />
              <div className="flex-1">
                <p className="text-sm text-white/80">
                  Your rank{studentMeta(data.me) && ` · ${studentMeta(data.me)}`}
                </p>
                <p className="font-heading text-3xl font-bold">
                  {`#${data.me.rank}`}{' '}
                  <span className="text-base font-semibold text-white/80">
                    of {data.scope.cohortSize}
                  </span>
                </p>
              </div>
              <div className="text-right">
                <p className="font-heading text-2xl font-bold">{data.me.xp} XP</p>
                <p className="text-sm text-white/80">
                  Level {data.me.level} {data.me.levelTitle}
                </p>
              </div>
            </motion.div>
          )}
          {data.rows.length >= 3 && <Podium rows={data.rows} />}
          <motion.ol {...stagger} className="mt-6 space-y-2" aria-label="Rankings">
            {data.rows.slice(data.rows.length >= 3 ? 3 : 0).map((r) => (
              <StudentRow key={r.studentId} r={r} />
            ))}
          </motion.ol>
          {data.me && !data.rows.some((r) => r.isMe) && (
            <ol className="mt-2" aria-label="Your position">
              <StudentRow r={data.me} />
            </ol>
          )}
        </>
      )}
    </Page>
  );
}

/** Coordinator only: every department, or one. */
export function DepartmentSelect({ value, onChange }) {
  const departments = useDepartments();
  return (
    <Select
      label="Department"
      compact
      value={value ?? ''}
      onChange={onChange}
      options={[
        { value: '', label: 'All departments' },
        ...(departments.data ?? []).map((d) => ({ value: d.id, label: d.name })),
      ]}
    />
  );
}

export const semesterOptions = [
  { value: '', label: 'All semesters' },
  ...SEMESTERS.map((s) => ({ value: String(s), label: `Semester ${s}` })),
];

/** Faculty, mentor, HOD and coordinator view: filters and the full ranked table. */
function StaffLeaderboard({ user }) {
  const [filters, setFilters] = useState({});
  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value || undefined }));
  const board = useLeaderboard({ ...filters, limit: 200 });
  const subjects = useSubjectOptions(board.data, filters.subjectId);
  const admin = isAdminRole(user.role);
  const scopeLabel = {
    faculty: 'Students taking your subjects',
    mentor: 'Your mentees',
    admin: 'Your department',
    coordinator: 'All departments',
  }[user.role];

  return (
    <Page>
      <EyebrowHeading eyebrow="Leaderboard" title="Student rankings" level={1}>
        <p className="text-sm">{scopeLabel}. Ranked by mastery XP, then topics mastered.</p>
      </EyebrowHeading>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Select
          label="Subject"
          compact
          value={filters.subjectId ?? ''}
          onChange={set('subjectId')}
          options={[
            { value: '', label: 'All subjects' },
            ...subjects.map((s) => ({
              value: s.subjectId,
              label: `${s.code} · ${s.name}`,
            })),
          ]}
        />
        {admin && (
          <Select
            label="Semester"
            compact
            value={filters.semester ?? ''}
            onChange={set('semester')}
            options={semesterOptions}
          />
        )}
        {user.role === 'coordinator' && (
          <DepartmentSelect value={filters.departmentId} onChange={set('departmentId')} />
        )}
      </div>
      {board.isPending ? (
        <LoadingBlock className="mt-6" lines={6} />
      ) : board.isError ? (
        <QueryError className="mt-6" query={board} what="the leaderboard" />
      ) : (
        <>
          <p className="mt-5 text-sm">
            <Badge tone="navy">{board.data.scope.cohortSize}</Badge> students
            {board.data.rows.length < board.data.scope.cohortSize &&
              ` · showing the top ${board.data.rows.length}`}
          </p>
          {board.data.rows.length === 0 ? (
            <Card className="mt-4">
              <p className="text-sm">No students match these filters.</p>
            </Card>
          ) : (
            <StudentTable students={board.data.rows} role={user.role} showSemester={admin} />
          )}
        </>
      )}
    </Page>
  );
}

/** /leaderboard — every role; the API decides who is in the cohort (ADR 0013). */
export function LeaderboardPage() {
  const user = useSession((s) => s.user);
  return user.role === 'student' ? <StudentLeaderboard /> : <StaffLeaderboard user={user} />;
}
