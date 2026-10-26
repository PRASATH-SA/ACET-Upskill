import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Trophy } from 'lucide-react';
import { isAdminRole } from '@acet/shared';
import { Page } from '../../components/layout/AppShell';
import {
  Button,
  Card,
  EyebrowHeading,
  Input,
  LoadingBlock,
  ProgressBar,
  Select,
} from '../../components/ui';
import { QueryError } from '../../components/QueryError';
import { useSession } from '../auth/session';
import { useProgressReport } from './api';
import { CohortSummaryTiles, StudentTable, SubjectProgressList, fmtPct } from './CohortWidgets';
import { DepartmentSelect, semesterOptions } from './LeaderboardPage';

/** Bars for a breakdown (per semester or per batch). */
function GroupBars({ title, groups, label }) {
  return (
    <Card>
      <h3 className="text-lg">{title}</h3>
      {groups.length === 0 ? (
        <p className="mt-2 text-sm">No students yet.</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {groups.map((g) => (
            <li key={label(g)}>
              <ProgressBar
                value={g.averageProgressPct}
                label={`${label(g)} · ${g.students} students`}
                showValue
              />
              <p className="mt-1 text-xs">
                {fmtPct(g.averageMasteryPct)} mastered · quiz avg {fmtPct(g.averageScore)} ·{' '}
                {g.activeThisWeek} active this week
                {g.atRisk > 0 && ` · ${g.atRisk} need attention`}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/**
 * The full progress report. `department` (HOD, /admin/progress) adds semester and batch
 * breakdowns and semester/department filters; otherwise (faculty, /studio/students) it filters
 * by subject and batch.
 */
function ProgressReport({ department }) {
  const user = useSession((s) => s.user);
  const [filters, setFilters] = useState({});
  const [search, setSearch] = useState('');
  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value || undefined }));
  const report = useProgressReport(filters);

  // Subjects and batches of the unfiltered report, so filters can switch back.
  const [options, setOptions] = useState({ subjects: [], batches: [] });
  useEffect(() => {
    if (report.data && !filters.subjectId && !filters.batch) {
      setOptions({
        subjects: report.data.scope.subjects,
        batches: report.data.byBatch.map((b) => b.batch).filter(Boolean),
      });
    }
  }, [report.data, filters.subjectId, filters.batch]);

  const students = useMemo(() => {
    const q = search.trim().toLowerCase();
    const all = report.data?.students ?? [];
    return q ? all.filter((s) => `${s.name} ${s.email}`.toLowerCase().includes(q)) : all;
  }, [report.data, search]);

  return (
    <Page>
      <Link
        to={department ? '/admin' : '/studio'}
        className="inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> {department ? 'Overview' : 'Studio'}
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <EyebrowHeading
          eyebrow={department ? 'HOD' : 'Faculty'}
          title={department ? 'Department progress' : 'Student progress'}
          level={1}
        >
          <p className="text-sm">
            {department
              ? user.role === 'coordinator'
                ? 'Every department, or pick one.'
                : 'Every student in your department, by semester, subject and batch.'
              : 'Students taking your subjects. Open a student to see their full progress.'}
          </p>
        </EyebrowHeading>
        <Button
          as={Link}
          to="/leaderboard"
          variant="secondary"
          icon={Trophy}
          className="hover:no-underline"
        >
          Leaderboard
        </Button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {department && user.role === 'coordinator' && (
          <DepartmentSelect value={filters.departmentId} onChange={set('departmentId')} />
        )}
        {department && (
          <Select
            label="Semester"
            compact
            value={filters.semester ?? ''}
            onChange={set('semester')}
            options={semesterOptions}
          />
        )}
        <Select
          label="Subject"
          compact
          value={filters.subjectId ?? ''}
          onChange={set('subjectId')}
          options={[
            { value: '', label: 'All subjects' },
            ...options.subjects.map((s) => ({
              value: s.subjectId,
              label: `${s.code} · ${s.name}`,
            })),
          ]}
        />
        <Select
          label="Batch"
          compact
          value={filters.batch ?? ''}
          onChange={set('batch')}
          options={[
            { value: '', label: 'All batches' },
            ...options.batches.map((b) => ({ value: b, label: b })),
          ]}
        />
      </div>

      {report.isPending ? (
        <LoadingBlock className="mt-6" lines={6} />
      ) : report.isError ? (
        <QueryError className="mt-6" query={report} what="student progress" />
      ) : (
        <>
          <div className="mt-6">
            <CohortSummaryTiles summary={report.data.summary} />
          </div>
          {department && (
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <GroupBars
                title="By semester"
                groups={report.data.bySemester}
                label={(g) => (g.semester ? `Semester ${g.semester}` : 'No semester set')}
              />
              <GroupBars
                title="By batch"
                groups={report.data.byBatch}
                label={(g) => g.batch ?? 'No batch'}
              />
            </div>
          )}
          <section className="mt-8" aria-labelledby="by-subject-h">
            <h2 id="by-subject-h">By subject</h2>
            <SubjectProgressList subjects={report.data.bySubject} />
          </section>
          {!department && report.data.byBatch.length > 1 && (
            <div className="mt-6">
              <GroupBars
                title="By batch"
                groups={report.data.byBatch}
                label={(g) => g.batch ?? 'No batch'}
              />
            </div>
          )}
          <section className="mt-8" aria-labelledby="students-h">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 id="students-h">Students</h2>
              <Input
                label="Search students"
                hideLabel
                placeholder="Search by name or email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full sm:w-72"
              />
            </div>
            <StudentTable
              students={students}
              role={user.role}
              showSemester={isAdminRole(user.role)}
            />
          </section>
        </>
      )}
    </Page>
  );
}

/** /studio/students — overall progress of a faculty member's classes. */
export function ClassProgressPage() {
  return <ProgressReport department={false} />;
}

/** /admin/progress — overall department progress for the HOD (and the coordinator). */
export function DepartmentProgressPage() {
  return <ProgressReport department />;
}
