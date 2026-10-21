import { Link, Navigate, useParams } from 'react-router-dom';
import { BookOpen, CheckCircle2, ChevronRight, Circle, CircleDot, Code2 } from 'lucide-react';
import { Page } from '../../../components/layout/AppShell';
import { QueryError } from '../../../components/QueryError';
import {
  Badge,
  Button,
  EmptyState,
  EyebrowHeading,
  LoadingBlock,
  ProgressBar,
} from '../../../components/ui';
import { useSubjects } from '../api';
import { useSubjectCodeLab, useTopicCodeLab } from './api';
import { DIFFICULTY_TONE } from './CodeLabPage';

function StatusIcon({ c }) {
  if (c.solved) return <CheckCircle2 className="h-5 w-5 text-success" aria-label="Solved" />;
  if (c.attempts) return <CircleDot className="h-5 w-5 text-warning-dark" aria-label="Attempted" />;
  return <Circle className="h-5 w-5 text-body/50" aria-label="Not started" />;
}

/** One row per problem: status, title, difficulty. */
export function ChallengeRows({ items }) {
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
      {items.map((c) => (
        <li key={c.id}>
          <Link
            to={`/code/${c.id}`}
            className="flex min-h-[52px] items-center gap-3 px-4 py-2 text-navy hover:bg-surface hover:no-underline"
          >
            <StatusIcon c={c} />
            <span className="min-w-0 flex-1 font-semibold">{c.title}</span>
            <Badge tone={DIFFICULTY_TONE[c.difficulty]}>{c.difficulty}</Badge>
            <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Topic page block: this topic's SQL problems. */
export function TopicCodeLab({ topicId, subjectId }) {
  const list = useTopicCodeLab(topicId);
  if (list.isPending) return <LoadingBlock label="Loading problems" />;
  if (list.isError) return <QueryError query={list} what="the code problems" />;
  const items = list.data ?? [];
  const solved = items.filter((c) => c.solved).length;
  return (
    <div>
      <p>
        Write real SQL and get instant feedback, LeetCode-style. {solved} of {items.length} solved.
      </p>
      <div className="mt-3">
        <ChallengeRows items={items} />
      </div>
      {subjectId && (
        <Link to={`/code-lab/${subjectId}`} className="mt-3 inline-block text-sm">
          All SQL problems in this subject
        </Link>
      )}
    </div>
  );
}

/** /code-lab — picks the subject (straight through when there is only one). */
export function CodeLabIndex() {
  const subjects = useSubjects();
  if (subjects.isPending)
    return (
      <Page>
        <LoadingBlock label="Loading subjects" />
      </Page>
    );
  const list = subjects.data ?? [];
  if (list.length === 1) return <Navigate to={`/code-lab/${list[0].id}`} replace />;
  return (
    <Page>
      <EyebrowHeading eyebrow="Code lab" title="Practise with real code" level={1} />
      {list.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={BookOpen}
          title="No subjects yet"
          description="Problems appear once your subjects are published."
          action={
            <Button as={Link} to="/learn">
              Go to Learn
            </Button>
          }
        />
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((s) => (
            <li key={s.id}>
              <Link
                to={`/code-lab/${s.id}`}
                className="block glass rounded-card p-5 glass-hover hover:no-underline"
              >
                <p className="text-xs font-semibold text-body">
                  {s.code} · Semester {s.semester}
                </p>
                <h2 className="mt-1 text-lg">{s.name}</h2>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}

/** /code-lab/:subjectId — every problem of a subject, grouped by topic in syllabus order. */
export function SubjectCodeLabPage() {
  const { subjectId } = useParams();
  const lab = useSubjectCodeLab(subjectId);
  if (lab.isPending)
    return (
      <Page>
        <LoadingBlock label="Loading problems" />
      </Page>
    );
  if (lab.isError)
    return (
      <Page>
        <QueryError query={lab} what="the code lab" />
      </Page>
    );
  const { topics, total, solved } = lab.data;
  return (
    <Page>
      <EyebrowHeading eyebrow="Code lab" title="SQL practice" level={1}>
        <p>Problems from every topic, in syllabus order. Solve them to make the ideas stick.</p>
      </EyebrowHeading>
      {total === 0 ? (
        <EmptyState
          className="mt-6"
          icon={Code2}
          title="No problems yet"
          description="Your faculty hasn't published code problems for this subject yet."
          action={
            <Button as={Link} to="/learn">
              Back to Learn
            </Button>
          }
        />
      ) : (
        <>
          <div className="mt-5 max-w-md">
            <ProgressBar
              value={(solved / total) * 100}
              label={`${solved} of ${total} solved`}
              showValue
              tone="gold"
            />
          </div>
          <div className="mt-6 space-y-6">
            {topics.map((g) => (
              <section key={g.topicId} aria-labelledby={`lab-${g.topicId}`}>
                <h2 id={`lab-${g.topicId}`} className="flex flex-wrap items-baseline gap-2 text-lg">
                  <Link to={`/topics/${g.topicId}`}>{g.topicTitle}</Link>
                  {g.unit && (
                    <span className="text-xs font-normal text-body">
                      Unit {g.unit.number} · {g.unit.title}
                    </span>
                  )}
                </h2>
                <div className="mt-2">
                  <ChallengeRows items={g.challenges} />
                </div>
              </section>
            ))}
          </div>
        </>
      )}
    </Page>
  );
}
