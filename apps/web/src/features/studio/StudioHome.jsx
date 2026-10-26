import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  Bot,
  BookOpen,
  ClipboardCheck,
  Compass,
  Eye,
  FileSpreadsheet,
  FlaskConical,
  Map as MapIcon,
} from 'lucide-react';
import { get } from '../../api/client';
import { Page } from '../../components/layout/AppShell';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  EyebrowHeading,
  LoadingBlock,
  StatTile,
} from '../../components/ui';
import { useSession } from '../auth/session';
import { useSubjects } from '../student/api';
import { aiOffline, useAiHealth, useJobs } from './api';
import { QueryError } from '../../components/QueryError';

const JOB_LABEL = {
  'syllabus.toMap': 'Draft map',
  'topic.draftContent': 'Draft content',
  'pyq.tag': 'Tag PYQs',
  'material.ingest': 'Read notes',
  'embeddings.reembed': 'Re-embed',
};
const STATUS_TONE = {
  queued: 'neutral',
  running: 'blue',
  succeeded: 'green',
  failed: 'red',
  cancelled: 'neutral',
};

/** The AI status pill used across the studio (A.7.8). */
export function AiStatus() {
  const health = useAiHealth();
  if (health.isPending) return <Badge>Checking AI…</Badge>;
  if (aiOffline(health))
    return (
      <Badge tone="red" icon={Bot}>
        AI service offline
      </Badge>
    );
  if (!health.data.modelsPulled)
    return (
      <Badge tone="orange" icon={Bot}>
        AI model not downloaded
      </Badge>
    );
  return (
    <Badge tone="green" icon={Bot}>
      AI ready · {health.data.chatModel}
    </Badge>
  );
}

/** /studio — the faculty home (F6.1). */
export function StudioHome() {
  const user = useSession((s) => s.user);
  const subjects = useSubjects();
  const queue = useQuery({
    queryKey: ['review-queue', 'count'],
    queryFn: () => get('/review-queue', { query: { limit: 1 }, withMeta: true }),
  });
  const jobs = useJobs();

  return (
    <Page>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <EyebrowHeading eyebrow="Faculty studio" title={`Welcome, ${user.name}`} level={1} />
        <AiStatus />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Link to="/studio/review" className="block rounded-card hover:no-underline">
          <StatTile
            label="Waiting for review"
            value={queue.data?.meta?.total ?? '–'}
            icon={ClipboardCheck}
            tone="navy"
            hint="Drafts across your subjects"
          />
        </Link>
        <StatTile label="My subjects" value={subjects.data?.length ?? '–'} icon={BookOpen} />
        <StatTile
          label="AI jobs today"
          value={
            (jobs.data ?? []).filter(
              (j) => new Date(j.createdAt).toDateString() === new Date().toDateString(),
            ).length
          }
          icon={Bot}
        />
      </div>

      <section className="mt-8" aria-labelledby="my-subjects">
        <h2 id="my-subjects">My subjects</h2>
        {subjects.isPending ? (
          <LoadingBlock className="mt-4" />
        ) : subjects.isError ? (
          <QueryError className="mt-4" query={subjects} what="your subjects" />
        ) : subjects.data.length === 0 ? (
          <EmptyState
            className="mt-4"
            icon={BookOpen}
            title="No subjects assigned yet"
            description="Ask your HOD to assign you to a subject. It will appear here."
            action={
              <Button as={Link} to="/profile" variant="secondary">
                My profile
              </Button>
            }
          />
        ) : (
          <ul className="mt-4 grid gap-4 md:grid-cols-2">
            {subjects.data.map((s) => (
              <li key={s.id}>
                <Card className="h-full">
                  <p className="text-xs font-semibold">
                    {s.code} · Semester {s.semester}
                    {s.kind === 'practical' && ' · Practical'}
                  </p>
                  <h3 className="mt-1 text-lg">{s.name}</h3>
                  {s.kind === 'practical' ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        as={Link}
                        to={`/studio/labs/${s.id}`}
                        size="sm"
                        icon={FlaskConical}
                        className="hover:no-underline"
                      >
                        Experiments
                      </Button>
                      <Button
                        as={Link}
                        to={`/labs/${s.id}`}
                        size="sm"
                        variant="secondary"
                        icon={Eye}
                        className="hover:no-underline"
                      >
                        Student view
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        as={Link}
                        to={`/studio/subjects/${s.id}`}
                        size="sm"
                        icon={MapIcon}
                        className="hover:no-underline"
                      >
                        Build the map
                      </Button>
                      <Button
                        as={Link}
                        to={`/studio/subjects/${s.id}/insights`}
                        size="sm"
                        variant="secondary"
                        icon={BarChart3}
                        className="hover:no-underline"
                      >
                        Class insights
                      </Button>
                      <Button
                        as={Link}
                        to={`/studio/subjects/${s.id}/overview`}
                        size="sm"
                        variant="secondary"
                        icon={Compass}
                        className="hover:no-underline"
                      >
                        Subject overview
                      </Button>
                      <Button
                        as={Link}
                        to={`/studio/subjects/${s.id}/content`}
                        size="sm"
                        variant="secondary"
                        icon={FileSpreadsheet}
                        className="hover:no-underline"
                      >
                        Content & quiz CSV
                      </Button>
                      <Button
                        as={Link}
                        to={`/studio/review?subjectId=${s.id}`}
                        size="sm"
                        variant="ghost"
                        className="hover:no-underline"
                      >
                        Review drafts
                      </Button>
                    </div>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8" aria-labelledby="recent-jobs">
        <h2 id="recent-jobs">Recent AI jobs</h2>
        {jobs.isPending ? (
          <LoadingBlock className="mt-4" lines={2} />
        ) : (jobs.data ?? []).length === 0 ? (
          <p className="mt-3 text-sm">No AI jobs yet. Open a subject and draft its map with AI.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line glass rounded-card">
            {jobs.data.map((j) => (
              <li
                key={j.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <span className="font-semibold text-navy">{JOB_LABEL[j.type] ?? j.type}</span>
                <span className="flex items-center gap-2">
                  {j.result === 'needsMaterial' && <Badge tone="orange">Needs material</Badge>}
                  <Badge tone={STATUS_TONE[j.status]}>{j.status}</Badge>
                  <span className="text-xs">{new Date(j.createdAt).toLocaleString('en-IN')}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Page>
  );
}
