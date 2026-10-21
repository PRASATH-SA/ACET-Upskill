import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Plus, Wrench } from 'lucide-react';
import { get, patch, post } from '../../api/client';
import { Page } from '../../components/layout/AppShell';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  EyebrowHeading,
  Input,
  LoadingBlock,
  Textarea,
  toast,
} from '../../components/ui';
import { downloadAuthFile } from '../../hooks/useAuthFile';
import { cn } from '../../lib/cn';
import { skeys } from './api';
import { SubjectTopicPicker } from './QuestionBank';
import { QueryError } from '../../components/QueryError';

const fmt = (d) => new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

function GradeForm({ sub, workshopId }) {
  const qc = useQueryClient();
  const [score, setScore] = useState(sub.score ?? '');
  const [feedback, setFeedback] = useState(sub.feedback ?? '');
  const grade = useMutation({
    mutationFn: () => patch(`/submissions/${sub.id}/grade`, { score: Number(score), feedback }),
    onSuccess: () => {
      toast.success('Graded');
      qc.invalidateQueries({ queryKey: skeys.submissions(workshopId) });
      qc.invalidateQueries({ queryKey: ['subjects'] });
    },
  });
  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-[120px_1fr_auto] sm:items-end">
      <Input
        label="Score (0–100)"
        type="number"
        min={0}
        max={100}
        value={score}
        onChange={(e) => setScore(e.target.value)}
      />
      <Textarea
        label="Feedback"
        rows={2}
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
      />
      <Button
        size="sm"
        variant="navy"
        loading={grade.isPending}
        disabled={score === '' || score < 0 || score > 100}
        onClick={() => grade.mutate()}
      >
        {sub.gradedAt ? 'Update grade' : 'Save grade'}
      </Button>
    </div>
  );
}

function Submissions({ workshop }) {
  const subs = useQuery({
    queryKey: skeys.submissions(workshop.id),
    queryFn: () => get(`/workshops/${workshop.id}/submissions`),
  });
  if (subs.isPending) return <LoadingBlock />;
  if (!subs.data.length) return <p className="text-sm">No submissions yet.</p>;
  return (
    <ul className="space-y-3">
      {subs.data.map((s) => (
        <li key={s.id} className="rounded-2xl border border-line p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-navy">
              {s.student?.name ?? 'Student'}{' '}
              <span className="text-xs font-normal">{s.student?.batch}</span>
            </p>
            <span className="flex gap-1.5">
              {s.late && <Badge tone="orange">Late</Badge>}
              {s.gradedAt ? (
                <Badge tone="green">Graded {s.score}/100</Badge>
              ) : (
                <Badge>Not graded</Badge>
              )}
            </span>
          </div>
          <p className="text-xs">Submitted {fmt(s.submittedAt)}</p>
          {s.text && <p className="mt-2 whitespace-pre-line text-sm">{s.text}</p>}
          {s.hasFile && (
            <Button
              size="sm"
              variant="ghost"
              icon={Download}
              className="mt-2"
              onClick={() =>
                downloadAuthFile(`/submissions/${s.id}/file`, s.fileName ?? 'submission')
              }
            >
              {s.fileName ?? 'Download file'}
            </Button>
          )}
          <GradeForm sub={s} workshopId={workshop.id} />
        </li>
      ))}
    </ul>
  );
}

function NewWorkshop({ subjectId, onDone }) {
  const qc = useQueryClient();
  const [topicId, setTopicId] = useState(null);
  const [brief, setBrief] = useState('');
  const [dueAt, setDueAt] = useState('');
  const create = useMutation({
    mutationFn: () =>
      post(`/topics/${topicId}/workshops`, { brief, dueAt: new Date(dueAt).toISOString() }),
    onSuccess: () => {
      toast.success('Workshop created');
      qc.invalidateQueries({ queryKey: skeys.workshops(subjectId) });
      onDone();
    },
  });
  return (
    <Card tone="surface" className="space-y-3">
      <SubjectTopicPicker
        subjectId={subjectId}
        topicId={topicId}
        onTopic={setTopicId}
        lockSubject
      />
      <Textarea
        label="Brief"
        rows={4}
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
        hint="What students do and submit. At least 10 characters."
      />
      <Input
        label="Due"
        type="datetime-local"
        value={dueAt}
        onChange={(e) => setDueAt(e.target.value)}
      />
      <Button
        variant="navy"
        loading={create.isPending}
        disabled={!topicId || brief.trim().length < 10 || !dueAt}
        onClick={() => create.mutate()}
      >
        Create workshop
      </Button>
    </Card>
  );
}

/** /studio/workshops — workshops per subject, submissions and grading (F6.5). */
export function WorkshopReview() {
  const [subjectId, setSubjectId] = useState(null);
  const [open, setOpen] = useState(null);
  const [creating, setCreating] = useState(false);
  const list = useQuery({
    queryKey: skeys.workshops(subjectId),
    queryFn: () => get(`/subjects/${subjectId}/workshops`),
    enabled: Boolean(subjectId),
  });

  return (
    <Page>
      <EyebrowHeading eyebrow="Apply" title="Workshops" level={1}>
        <p className="text-sm">Set hands-on tasks per topic and grade what students submit.</p>
      </EyebrowHeading>
      <div className="mt-5 flex flex-wrap items-end gap-3">
        <div className="min-w-[16rem] flex-1">
          <SubjectTopicPicker
            subjectId={subjectId}
            onSubject={(id) => {
              setSubjectId(id);
              setOpen(null);
            }}
          />
        </div>
        <Button
          variant="secondary"
          icon={Plus}
          disabled={!subjectId}
          onClick={() => setCreating((c) => !c)}
        >
          New workshop
        </Button>
      </div>
      {creating && subjectId && (
        <div className="mt-4">
          <NewWorkshop subjectId={subjectId} onDone={() => setCreating(false)} />
        </div>
      )}
      <div className="mt-6">
        {!subjectId ? (
          <EmptyState
            icon={Wrench}
            title="Choose a subject"
            description="Its workshops and submissions will show here."
          />
        ) : list.isPending ? (
          <LoadingBlock />
        ) : list.isError ? (
          <QueryError query={list} what="workshops" />
        ) : list.data.length === 0 ? (
          <EmptyState
            icon={Wrench}
            title="No workshops yet"
            description="Create one for a topic. AI-drafted workshop briefs are in each topic's Workshop tab."
            action={<Button onClick={() => setCreating(true)}>New workshop</Button>}
          />
        ) : (
          <ul className="space-y-3">
            {list.data.map((w) => (
              <li key={w.id}>
                <Card padded={false} className={cn('p-4', open === w.id && 'border-navy')}>
                  <button
                    type="button"
                    className="block w-full text-left"
                    aria-expanded={open === w.id}
                    onClick={() => setOpen(open === w.id ? null : w.id)}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-navy">{w.topicTitle}</p>
                      <span className="flex gap-1.5">
                        <Badge>{w.submitted} submitted</Badge>
                        <Badge tone={w.graded === w.submitted ? 'green' : 'orange'}>
                          {w.graded} graded
                        </Badge>
                        <Badge tone={new Date(w.dueAt) < new Date() ? 'neutral' : 'blue'}>
                          Due {fmt(w.dueAt)}
                        </Badge>
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm">{w.brief}</p>
                  </button>
                  {open === w.id && (
                    <div className="mt-4 border-t border-line pt-4">
                      <Submissions workshop={w} />
                    </div>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Page>
  );
}
