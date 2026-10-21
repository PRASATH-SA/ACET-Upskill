import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CalendarClock,
  Check,
  GraduationCap,
  ListChecks,
  Trash2,
  TriangleAlert,
} from 'lucide-react';
import { del, get, patch, post } from '../../api/client';
import { Page } from '../../components/layout/AppShell';
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  EyebrowHeading,
  IconButton,
  Input,
  LoadingBlock,
  StatTile,
  Textarea,
  toast,
} from '../../components/ui';
import { MasteryBar } from '../student/practice/ProgressPage';
import { QueryError } from '../../components/QueryError';

const RISK = {
  high: { tone: 'red', label: 'High risk' },
  medium: { tone: 'orange', label: 'Watch' },
  none: { tone: 'green', label: 'On track' },
};
const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'never';
const daysAgo = (d) => (d ? Math.floor((Date.now() - new Date(d).getTime()) / 86400_000) : null);

/** /mentor — assigned students, riskiest first (F7.1, B5.4). */
export function MentorHome() {
  const students = useQuery({
    queryKey: ['mentor', 'students'],
    queryFn: () => get('/mentor/students'),
  });
  const list = students.data ?? [];
  const atRisk = list.filter((s) => s.risk.level !== 'none').length;
  return (
    <Page>
      <EyebrowHeading eyebrow="Mentor" title="My students" level={1}>
        <p className="text-sm">Students who need a word from you are listed first.</p>
      </EyebrowHeading>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Assigned students"
          value={students.isPending ? '–' : list.length}
          icon={GraduationCap}
        />
        <StatTile
          label="Need attention"
          value={students.isPending ? '–' : atRisk}
          icon={TriangleAlert}
          tone="navy"
        />
        <Link to="/mentor/follow-ups" className="block rounded-card hover:no-underline">
          <StatTile label="Follow-ups" value="Open list" icon={ListChecks} />
        </Link>
      </div>
      {students.isPending ? (
        <LoadingBlock className="mt-6" lines={6} />
      ) : students.isError ? (
        <QueryError className="mt-6" query={students} what="your students" />
      ) : list.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={GraduationCap}
          title="No students assigned yet"
          description="Your HOD assigns students to mentors. They will appear here."
          action={
            <Button as={Link} to="/profile" variant="secondary">
              My profile
            </Button>
          }
        />
      ) : (
        <ul className="mt-6 space-y-3">
          {list.map((s) => (
            <li key={s.id}>
              <Link
                to={`/mentor/students/${s.id}`}
                className="flex flex-col gap-3 glass rounded-card p-4 glass-hover hover:no-underline sm:flex-row sm:items-center"
              >
                <Avatar name={s.name} />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-navy">{s.name}</span>
                  <span className="block text-xs">
                    {s.batch ?? 'No batch'} · last active{' '}
                    {daysAgo(s.lastActiveAt) === null
                      ? 'never'
                      : `${daysAgo(s.lastActiveAt)} days ago`}
                  </span>
                  {s.risk.reasons.length > 0 && (
                    <span className="mt-1 block text-xs text-warning-dark">
                      {s.risk.reasons.join(' · ')}
                    </span>
                  )}
                </span>
                <span className="flex flex-wrap gap-1.5">
                  {s.needsRevision > 0 && (
                    <Badge tone="orange">{s.needsRevision} need revision</Badge>
                  )}
                  {s.dueRevisions > 0 && <Badge>{s.dueRevisions} due</Badge>}
                  <Badge tone={RISK[s.risk.level].tone}>{RISK[s.risk.level].label}</Badge>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}

function NoteForm({ studentId }) {
  const qc = useQueryClient();
  const [note, setNote] = useState('');
  const [followUpAt, setFollowUpAt] = useState('');
  const add = useMutation({
    mutationFn: () =>
      post(`/mentor/students/${studentId}/notes`, { note, ...(followUpAt ? { followUpAt } : {}) }),
    onSuccess: () => {
      setNote('');
      setFollowUpAt('');
      toast.success('Note saved');
      qc.invalidateQueries({ queryKey: ['mentor'] });
    },
  });
  return (
    <div className="space-y-3">
      <Textarea
        label="New note"
        rows={3}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="What did you discuss? What should happen next?"
      />
      <div className="flex flex-wrap items-end gap-3">
        <Input
          label="Follow up on (optional)"
          type="date"
          value={followUpAt}
          onChange={(e) => setFollowUpAt(e.target.value)}
        />
        <Button
          variant="navy"
          disabled={!note.trim()}
          loading={add.isPending}
          onClick={() => add.mutate()}
        >
          Save note
        </Button>
      </div>
    </div>
  );
}

function NoteItem({ n }) {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ['mentor'] });
  const toggle = useMutation({
    mutationFn: () => patch(`/mentor/notes/${n.id}`, { done: !n.done }),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: () => del(`/mentor/notes/${n.id}`),
    onSuccess: refresh,
  });
  return (
    <li className="rounded-2xl border border-line p-3">
      <div className="flex items-start justify-between gap-2">
        <p className={n.done ? 'text-sm line-through' : 'text-sm text-navy'}>{n.note}</p>
        <IconButton
          icon={Trash2}
          label="Delete note"
          onClick={() => remove.mutate()}
          className="-m-2"
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        <span>{fmtDate(n.createdAt)}</span>
        {n.followUpAt && (
          <Badge
            tone={n.done ? 'green' : new Date(n.followUpAt) < new Date() ? 'red' : 'blue'}
            icon={CalendarClock}
          >
            Follow up {fmtDate(n.followUpAt)}
          </Badge>
        )}
        {n.followUpAt && (
          <Button size="sm" variant="ghost" icon={Check} onClick={() => toggle.mutate()}>
            {n.done ? 'Reopen' : 'Mark done'}
          </Button>
        )}
      </div>
    </li>
  );
}

/** /mentor/students/:id — mastery per subject, activity, notes and follow-ups (F7.1). */
export function MentorStudent() {
  const { id } = useParams();
  const detail = useQuery({
    queryKey: ['mentor', 'student', id],
    queryFn: () => get(`/mentor/students/${id}`),
  });
  if (detail.isPending) {
    return (
      <Page>
        <LoadingBlock lines={6} />
      </Page>
    );
  }
  if (detail.isError) {
    return (
      <Page>
        <EmptyState
          title="Student not available"
          description={detail.error.message}
          action={
            <Button as={Link} to="/mentor">
              Back to my students
            </Button>
          }
        />
      </Page>
    );
  }
  const { student, progress, notes } = detail.data;
  return (
    <Page>
      <Link
        to="/mentor"
        className="inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> My students
      </Link>
      <div className="flex items-center gap-4">
        <Avatar name={student.name} size="lg" />
        <EyebrowHeading eyebrow={student.batch ?? 'Student'} title={student.name} level={1}>
          <p className="text-sm">{student.email}</p>
        </EyebrowHeading>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatTile label="Revision due now" value={progress.revision.dueNow} />
        <StatTile label="Revision streak" value={`${progress.revision.streakDays} days`} />
        <StatTile
          label="Weakest topic"
          value={progress.weakestTopics[0]?.title ?? '–'}
          hint={progress.weakestTopics[0] ? `${progress.weakestTopics[0].score}%` : undefined}
        />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section aria-labelledby="mastery-h" className="space-y-4">
          <h2 id="mastery-h">Mastery by subject</h2>
          {progress.subjects.map((s) => (
            <Card key={s.subjectId}>
              <h3>
                {s.code} · {s.name}
              </h3>
              <div className="mt-3">
                <MasteryBar counts={s.counts} total={s.totalTopics} />
              </div>
            </Card>
          ))}
          {progress.weakestTopics.length > 0 && (
            <Card>
              <h3>Weakest topics</h3>
              <ul className="mt-2 space-y-1 text-sm">
                {progress.weakestTopics.map((t) => (
                  <li key={t.topicId} className="flex justify-between gap-2">
                    <span className="text-navy">{t.title}</span>
                    <span>{t.score}%</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </section>
        <aside aria-labelledby="notes-h">
          <Card>
            <h2 id="notes-h" className="text-lg">
              Notes and follow-ups
            </h2>
            <div className="mt-4">
              <NoteForm studentId={student.id} />
            </div>
            <ul className="mt-5 space-y-2">
              {notes.length === 0 && <li className="text-sm">No notes yet.</li>}
              {notes.map((n) => (
                <NoteItem key={n.id} n={n} />
              ))}
            </ul>
          </Card>
        </aside>
      </div>
    </Page>
  );
}

/** /mentor/follow-ups — open follow-ups, soonest first. */
export function FollowUps() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['mentor', 'follow-ups'],
    queryFn: () => get('/mentor/follow-ups'),
  });
  const done = useMutation({
    mutationFn: (id) => patch(`/mentor/notes/${id}`, { done: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mentor'] }),
  });
  return (
    <Page>
      <EyebrowHeading eyebrow="Mentor" title="Follow-ups" level={1} />
      {list.isPending ? (
        <LoadingBlock className="mt-6" />
      ) : list.isError ? (
        <QueryError className="mt-6" query={list} what="follow-ups" />
      ) : list.data.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={ListChecks}
          title="No open follow-ups"
          description="Add a follow-up date to a note and it will show here."
          action={
            <Button as={Link} to="/mentor">
              My students
            </Button>
          }
        />
      ) : (
        <ul className="mt-6 space-y-3">
          {list.data.map((n) => {
            const overdue = new Date(n.followUpAt) < new Date();
            return (
              <li key={n.id}>
                <Card
                  padded={false}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/mentor/students/${n.studentId?.id ?? n.studentId}`}
                      className="font-semibold"
                    >
                      {n.studentId?.name ?? 'Student'}
                    </Link>
                    <p className="text-sm">{n.note}</p>
                  </div>
                  <Badge tone={overdue ? 'red' : 'blue'} icon={CalendarClock}>
                    {overdue ? 'Overdue · ' : ''}
                    {fmtDate(n.followUpAt)}
                  </Badge>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={Check}
                    onClick={() => done.mutate(n.id)}
                  >
                    Done
                  </Button>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </Page>
  );
}
