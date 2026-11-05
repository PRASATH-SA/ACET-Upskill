import { Link } from 'react-router-dom';
import {
  BarChart3,
  Bot,
  BookOpen,
  Compass,
  Eye,
  FileSpreadsheet,
  FlaskConical,
  Map as MapIcon,
} from 'lucide-react';
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
import { aiOffline, useAiHealth } from './api';
import { QueryError } from '../../components/QueryError';
import { CohortProgressPanel } from '../progress/CohortWidgets';

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

  return (
    <Page>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <EyebrowHeading eyebrow="Faculty studio" title={`Welcome, ${user.name}`} level={1} />
        <AiStatus />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatTile
          label="My subjects"
          value={subjects.data?.length ?? '–'}
          icon={BookOpen}
          tone="navy"
        />
      </div>

      <CohortProgressPanel
        title="Student progress"
        role={user.role}
        to="/studio/students"
        linkLabel="All students"
      />

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
                    </div>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Page>
  );
}
