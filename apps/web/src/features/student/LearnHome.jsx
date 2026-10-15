import { Link } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { ArrowRight, BookOpen, Brain, Map as MapIcon, Target } from 'lucide-react';
import { get } from '../../api/client';
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
import { useSession } from '../auth/session';
import { keys, useProgress, useRevisionToday, useSubjectMap, useSubjects } from './api';

/** Finds the first subject with a "current" topic and shows it as "Continue learning". */
function ContinueCard({ subjects }) {
  const maps = useQueries({
    queries: subjects.map((s) => ({
      queryKey: keys.myMap(s.id),
      queryFn: () => get(`/subjects/${s.id}/map/me`),
    })),
  });
  const pending = maps.some((q) => q.isPending);
  const hit = subjects
    .map((s, i) => ({ subject: s, me: maps[i].data }))
    .find((x) => x.me?.currentTopicId);
  const map = useSubjectMap(hit?.subject.id);
  const topic = map.data?.topics.find((t) => t.id === hit?.me.currentTopicId);

  if (pending || (hit && map.isPending)) {
    return (
      <Card>
        <LoadingBlock label="Finding where you left off" lines={2} />
      </Card>
    );
  }
  if (!hit || !topic) {
    return (
      <Card tone="gold">
        <EyebrowHeading
          eyebrow="Continue learning"
          title="Every unlocked topic is mastered"
          level={2}
        >
          <p className="text-sm">Revise to keep it that way, or explore a subject map.</p>
        </EyebrowHeading>
      </Card>
    );
  }
  return (
    <Card className="flex flex-col gap-5 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <EyebrowHeading eyebrow="Continue learning" title={topic.title} level={2}>
          <p className="text-sm">
            {hit.subject.code} · {hit.subject.name}
          </p>
          {topic.summary && <p className="mt-1 text-sm">{topic.summary}</p>}
        </EyebrowHeading>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button
          as={Link}
          to={`/topics/${topic.id}`}
          icon={ArrowRight}
          className="hover:no-underline"
        >
          Continue
        </Button>
        <Button
          as={Link}
          to={`/learn/${hit.subject.id}`}
          variant="secondary"
          icon={MapIcon}
          className="hover:no-underline"
        >
          Open map
        </Button>
      </div>
    </Card>
  );
}

function SubjectCard({ subject, progress }) {
  const total = progress?.totalTopics ?? 0;
  const c = progress?.counts ?? {};
  const pct = total ? ((c.confident ?? 0) / total) * 100 : 0;
  return (
    <li>
      <Link
        to={`/learn/${subject.id}`}
        className="block h-full rounded-card border border-line bg-card p-5 transition-colors hover:border-blue hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-offset-2"
      >
        <p className="text-xs font-semibold text-body">
          {subject.code} · Semester {subject.semester}
        </p>
        <h3 className="mt-1 text-lg">{subject.name}</h3>
        <ProgressBar
          className="mt-4"
          value={pct}
          tone="gold"
          label={`${c.confident ?? 0} of ${total} topics mastered`}
          showValue
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {c.needsRevision > 0 && <Badge tone="orange">{c.needsRevision} need revision</Badge>}
          {(c.learning ?? 0) + (c.practicing ?? 0) > 0 && (
            <Badge tone="blue">{(c.learning ?? 0) + (c.practicing ?? 0)} in progress</Badge>
          )}
        </div>
      </Link>
    </li>
  );
}

/** /learn — the student home (F3.5). */
export function LearnHome() {
  const user = useSession((s) => s.user);
  const subjects = useSubjects();
  const progress = useProgress();
  const revision = useRevisionToday();
  const progressOf = new Map((progress.data?.subjects ?? []).map((p) => [p.subjectId, p]));
  const due = revision.data?.total ?? progress.data?.revision.dueNow;

  return (
    <Page>
      <EyebrowHeading eyebrow="Learn" title={`Hello, ${user.name.split(' ')[0]}`} level={1}>
        <p>Pick up where you left off, or open a subject map.</p>
      </EyebrowHeading>

      {subjects.isPending ? (
        <LoadingBlock className="mt-6" label="Loading your subjects" lines={4} />
      ) : subjects.data?.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={BookOpen}
          title="No subjects yet"
          description="Your account has no syllabus version, or no subjects are published for it. Ask your HOD to check your batch."
          action={
            <Button as={Link} to="/profile" variant="secondary">
              Check my profile
            </Button>
          }
        />
      ) : (
        <>
          <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_280px]">
            <ContinueCard subjects={subjects.data} />
            <Link
              to="/revision"
              className="block rounded-card hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-offset-2"
            >
              <StatTile
                label="Revision due today"
                value={due ?? '–'}
                icon={Brain}
                tone="navy"
                hint={due ? 'A few minutes keeps it fresh' : 'All caught up'}
                className="h-full"
              />
            </Link>
          </div>

          <section aria-labelledby="subjects-h" className="mt-8">
            <div className="flex items-center justify-between gap-3">
              <h2 id="subjects-h">My subjects</h2>
              <Button
                as={Link}
                to="/exam-prep"
                variant="ghost"
                size="sm"
                icon={Target}
                className="hover:no-underline"
              >
                Exam prep
              </Button>
            </div>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {subjects.data.map((s) => (
                <SubjectCard key={s.id} subject={s} progress={progressOf.get(s.id)} />
              ))}
            </ul>
          </section>
        </>
      )}
    </Page>
  );
}
