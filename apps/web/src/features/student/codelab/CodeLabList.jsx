import { Link, useNavigate, useParams } from 'react-router-dom';
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
import { theoryOnly, useSubjects } from '../api';
import { SubjectTabs } from '../SubjectTabs';
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

/** "Python", "SQL" or "Coding" for a list of problems. */
export const languageLabel = (items) => {
  const langs = new Set(items.map((c) => c.language));
  if (langs.size !== 1) return 'Coding';
  return langs.has('python') ? 'Python' : 'SQL';
};

/** Topic page block: this topic's code problems. */
export function TopicCodeLab({ topicId, subjectId }) {
  const list = useTopicCodeLab(topicId);
  if (list.isPending) return <LoadingBlock label="Loading problems" />;
  if (list.isError) return <QueryError query={list} what="the code problems" />;
  const items = list.data ?? [];
  const solved = items.filter((c) => c.solved).length;
  return (
    <div>
      <p>
        Write real {languageLabel(items) === 'Coding' ? 'code' : languageLabel(items)} and get
        instant feedback, LeetCode-style. {solved} of {items.length} solved.
      </p>
      <div className="mt-3">
        <ChallengeRows items={items} />
      </div>
      {subjectId && (
        <Link to={`/code-lab/${subjectId}`} className="mt-3 inline-block text-sm">
          All practice problems in this subject
        </Link>
      )}
    </div>
  );
}

/**
 * /code-lab and /code-lab/:subjectId — one page with a tab per subject (SubjectTabs); each tab
 * is a SubjectCodeLab component. The URL remembers the open subject.
 */
export function CodeLabIndex() {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const subjects = useSubjects();
  if (subjects.isPending)
    return (
      <Page>
        <LoadingBlock label="Loading subjects" />
      </Page>
    );
  const list = theoryOnly(subjects.data);
  const current = list.find((s) => s.id === subjectId) ?? list[0];
  return (
    <Page>
      <EyebrowHeading eyebrow="Code lab" title="Practise with real code" level={1}>
        <p>
          Each subject has its own problems, in syllabus order. Solve them to make the ideas stick.
        </p>
      </EyebrowHeading>
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
        <div className="mt-6">
          <SubjectTabs
            label="Subjects"
            subjects={list}
            value={current.id}
            onChange={(id) => navigate(`/code-lab/${id}`, { replace: true })}
          >
            {(s) => <SubjectCodeLab key={s.id} subject={s} />}
          </SubjectTabs>
        </div>
      )}
    </Page>
  );
}

/** Kept as a route name: the subject route is the same tabbed page. */
export const SubjectCodeLabPage = CodeLabIndex;

/** One subject's problems, grouped by topic in syllabus order. */
function SubjectCodeLab({ subject }) {
  const lab = useSubjectCodeLab(subject.id);
  if (lab.isPending) return <LoadingBlock label="Loading problems" />;
  if (lab.isError) return <QueryError query={lab} what="the code lab" />;
  const { topics, total, solved } = lab.data;
  return (
    <section aria-labelledby={`lab-subject-${subject.id}`}>
      <p className="text-xs font-semibold">
        {subject.code} · Semester {subject.semester}
      </p>
      <h2 id={`lab-subject-${subject.id}`} className="mt-1 text-xl">
        {subject.name}{' '}
        {total > 0 && (
          <span className="text-sm font-normal text-body">
            · {languageLabel(topics.flatMap((g) => g.challenges))} practice
          </span>
        )}
      </h2>
      {total === 0 ? (
        <EmptyState
          className="mt-6"
          icon={Code2}
          title="No problems yet"
          description="Your faculty hasn't published code problems for this subject yet."
          action={
            <Button as={Link} to={`/subjects/${subject.id}`}>
              Open the subject
            </Button>
          }
        />
      ) : (
        <>
          <div className="mt-4 max-w-md">
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
                <h3 id={`lab-${g.topicId}`} className="flex flex-wrap items-baseline gap-2 text-lg">
                  <Link to={`/topics/${g.topicId}`}>{g.topicTitle}</Link>
                  {g.unit && (
                    <span className="text-xs font-normal text-body">
                      Unit {g.unit.number} · {g.unit.title}
                    </span>
                  )}
                </h3>
                <div className="mt-2">
                  <ChallengeRows items={g.challenges} />
                </div>
              </section>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
