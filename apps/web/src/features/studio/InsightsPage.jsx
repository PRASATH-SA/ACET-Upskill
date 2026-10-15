import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ApiError, get } from '../../api/client';
import { ArrowLeft, BarChart3, MessageCircleQuestion, RotateCcw, Users } from 'lucide-react';
import { Page } from '../../components/layout/AppShell';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  EyebrowHeading,
  LoadingBlock,
  ProgressBar,
  StatTile,
} from '../../components/ui';
import { skeys } from './api';

function CommonQuestions({ subjectId }) {
  const q = useQuery({
    queryKey: ['subjects', subjectId, 'tutor', 'common'],
    queryFn: () => get(`/subjects/${subjectId}/tutor/common-questions`),
    meta: { silent: true },
  });
  if (q.isPending) return <LoadingBlock lines={3} />;
  if (q.isError) {
    return (
      <p className="text-sm">
        {q.error instanceof ApiError && q.error.status === 404
          ? 'Tutor questions appear here once students start asking.'
          : 'Could not load tutor questions.'}
      </p>
    );
  }
  if (!q.data.clusters?.length) return <p className="text-sm">No tutor questions yet.</p>;
  return (
    <ul className="space-y-3">
      {q.data.clusters.map((c) => (
        <li key={c.id} className="rounded-2xl border border-line p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-navy">“{c.representative}”</p>
            <Badge tone="navy">Asked {c.count}×</Badge>
          </div>
          <p className="mt-1 text-xs">
            {c.topicTitle}
            {c.notGrounded > 0 && ` · ${c.notGrounded} not answerable from your material`}
          </p>
          {c.examples.length > 1 && (
            <details className="mt-1">
              <summary className="cursor-pointer text-xs font-semibold text-navy">
                Similar questions
              </summary>
              <ul className="mt-1 list-disc pl-5 text-xs">
                {c.examples.slice(1).map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </details>
          )}
        </li>
      ))}
    </ul>
  );
}

/** /studio/subjects/:subjectId/insights — class insights (F6.6, B5.3). */
export function InsightsPage() {
  const { subjectId } = useParams();
  const insights = useQuery({
    queryKey: skeys.insights(subjectId),
    queryFn: () => get(`/subjects/${subjectId}/insights`),
  });

  if (insights.isPending) {
    return (
      <Page>
        <LoadingBlock lines={6} />
      </Page>
    );
  }
  if (insights.isError) {
    return (
      <Page>
        <EmptyState
          tone="error"
          icon={BarChart3}
          title="Could not load insights"
          description={insights.error.message}
          action={<Button onClick={() => insights.refetch()}>Try again</Button>}
        />
      </Page>
    );
  }
  const d = insights.data;
  const notStarted = [...d.topics]
    .sort((a, b) => b.notStartedPercent - a.notStartedPercent)
    .slice(0, 8);

  return (
    <Page wide>
      <Link
        to={`/studio/subjects/${subjectId}`}
        className="inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Back to the map
      </Link>
      <EyebrowHeading eyebrow="Class insights" title="How the class is doing" level={1} />
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatTile label="Students" value={d.studentCount} icon={Users} />
        <StatTile
          label="Need revision"
          value={d.studentsNeedingRevision.length}
          icon={RotateCcw}
          tone="navy"
          hint="Students with overdue or failed reviews"
        />
        <StatTile label="Topics tracked" value={d.topics.length} icon={BarChart3} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg">Weakest topics</h2>
          <p className="text-sm">Average latest quiz score</p>
          {d.weakestTopics.length === 0 ? (
            <p className="mt-3 text-sm">No quiz attempts yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {d.weakestTopics.map((t) => (
                <li key={t.topicId}>
                  <ProgressBar
                    value={t.averageScore ?? 0}
                    label={`${t.title} · ${t.studentsScored} student${t.studentsScored === 1 ? '' : 's'}`}
                    showValue
                    tone={(t.averageScore ?? 0) < 50 ? 'red' : 'blue'}
                  />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="text-lg">Students not started</h2>
          <p className="text-sm">Share of the class that has not opened each topic</p>
          <ul className="mt-4 space-y-3">
            {notStarted.map((t) => (
              <li key={t.topicId}>
                <ProgressBar
                  value={t.notStartedPercent}
                  label={t.title}
                  showValue
                  tone="navy"
                  size="sm"
                />
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h2 className="text-lg">Needs revision</h2>
          {d.studentsNeedingRevision.length === 0 ? (
            <p className="mt-3 text-sm">Nobody is overdue. Good.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {d.studentsNeedingRevision.map((s) => (
                <li key={s.studentId} className="py-2 text-sm">
                  <p className="font-semibold text-navy">
                    {s.name} <span className="font-normal">{s.batch}</span>
                  </p>
                  <p className="text-xs">{s.topics.map((t) => t.title).join(', ')}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="flex items-center gap-2 text-lg">
            <MessageCircleQuestion className="h-5 w-5" aria-hidden /> Common tutor questions
          </h2>
          <p className="text-sm">What students ask the “Ask why” tutor, grouped by meaning</p>
          <div className="mt-4">
            <CommonQuestions subjectId={subjectId} />
          </div>
        </Card>
      </div>
    </Page>
  );
}
