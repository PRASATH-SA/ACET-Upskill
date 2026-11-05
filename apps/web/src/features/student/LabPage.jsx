import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, Circle, Code2, FlaskConical, List, Route } from 'lucide-react';
import { ApiError } from '../../api/client';
import { Page } from '../../components/layout/AppShell';
import { Markdown } from '../../components/Markdown';
import {
  Badge,
  Button,
  Card,
  Drawer,
  EmptyState,
  LoadingBlock,
  ProgressBar,
} from '../../components/ui';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { cn } from '../../lib/cn';
import { useSession } from '../auth/session';
import { useLab, useMarkExperimentDone } from './api';
import { learningOrderIds } from './map/graph';
import { RoadmapView } from './map/RoadmapView';

const DIFFICULTY_TONE = { easy: 'green', medium: 'orange', hard: 'red' };

/**
 * Roadmap node states from lab progress (ADR 0012): a topic is "mastered" when all its
 * experiments are done, the first topic with work left is "current", the rest are open.
 * Labs never lock a topic: experiments can be done in any order.
 */
export function labNodes(order, byTopic) {
  let current = null;
  const nodes = order.map((topicId) => {
    const list = byTopic.get(topicId) ?? [];
    const done = list.length > 0 && list.every((e) => e.done);
    let state = done ? 'mastered' : 'unlocked';
    if (!done && !current) {
      current = topicId;
      state = 'current';
    }
    return { topicId, state, missingPrerequisites: [] };
  });
  return { currentTopicId: current, nodes };
}

function ExperimentCard({ experiment: e, student, onToggle, toggling }) {
  return (
    <Card className="space-y-3" aria-labelledby={`exp-${e.id}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">Experiment {e.number}</p>
          <h3 id={`exp-${e.id}`} className="mt-1 text-lg leading-snug">
            {e.title}
          </h3>
        </div>
        {student &&
          (e.done ? (
            <Badge tone="green" icon={CheckCircle2}>
              Done
            </Badge>
          ) : (
            <Badge icon={Circle}>To do</Badge>
          ))}
        {e.status && e.status !== 'published' && <Badge tone="orange">Draft</Badge>}
      </div>
      {e.aim && (
        <p className="text-sm">
          <span className="font-semibold text-navy">Aim: </span>
          {e.aim}
        </p>
      )}
      {e.procedure && (
        <details className="rounded-2xl border border-line p-3">
          <summary className="cursor-pointer text-sm font-semibold text-navy">Procedure</summary>
          <Markdown className="mt-2 text-sm">{e.procedure}</Markdown>
        </details>
      )}
      {e.challenges.length > 0 && (
        <ul className="space-y-2" aria-label="Practice problems">
          {e.challenges.map((c) => (
            <li key={c.id}>
              <Link
                to={`/code/${c.id}`}
                className="flex items-center gap-3 rounded-2xl border border-line p-3 text-sm hover:border-brand/40 hover:no-underline"
              >
                {c.solved ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-gold-border" aria-label="Solved" />
                ) : (
                  <Code2 className="h-5 w-5 shrink-0 text-navy" aria-hidden />
                )}
                <span className="min-w-0 flex-1 font-semibold text-navy">{c.title}</span>
                <Badge tone={DIFFICULTY_TONE[c.difficulty]}>{c.difficulty}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {student && (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            size="sm"
            variant={e.markedDone ? 'ghost' : 'secondary'}
            loading={toggling}
            onClick={() => onToggle(e)}
          >
            {e.markedDone ? 'Mark as not done' : 'Mark as done'}
          </Button>
          {e.challenges.length > 0 && !e.markedDone && (
            <span className="text-xs">Or solve every problem above.</span>
          )}
        </div>
      )}
    </Card>
  );
}

/** /labs/:subjectId — a practical subject on its theory subject's roadmap (ADR 0012). */
export function LabPage() {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const user = useSession((s) => s.user);
  const student = user.role === 'student';
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const lab = useLab(subjectId);
  // The theory roadmap comes with the lab (lab faculty may not teach the theory subject).
  const map = { data: lab.data?.roadmap, isPending: lab.isPending };
  const mark = useMarkExperimentDone(subjectId);
  const [view, setView] = useState('path');
  const [selected, setSelected] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const experiments = useMemo(() => lab.data?.experiments ?? [], [lab.data]);
  const byTopic = useMemo(() => {
    const m = new Map();
    for (const e of experiments) m.set(e.topicId, [...(m.get(e.topicId) ?? []), e]);
    return m;
  }, [experiments]);
  // The lab roadmap is the theory roadmap, trimmed to the topics that have experiments.
  const roadmap = useMemo(() => {
    if (!map.data) return null;
    const topics = map.data.topics.filter((t) => byTopic.has(t.id));
    return { ...map.data, topics };
  }, [map.data, byTopic]);
  const order = useMemo(() => (roadmap ? learningOrderIds(roadmap) : []), [roadmap]);
  const me = useMemo(
    () => (student ? labNodes(order, byTopic) : undefined),
    [student, order, byTopic],
  );
  const selectedId = selected ?? me?.currentTopicId ?? order[0] ?? null;

  if (lab.isError) {
    const missing = lab.error instanceof ApiError && [400, 403, 404].includes(lab.error.status);
    return (
      <Page>
        <EmptyState
          icon={FlaskConical}
          tone={missing ? 'default' : 'error'}
          title={missing ? 'This lab is not available' : 'Could not load the lab'}
          description={missing ? 'It may belong to another syllabus version.' : lab.error.message}
          action={
            <Button as={Link} to="/learn">
              Back to my subjects
            </Button>
          }
        />
      </Page>
    );
  }
  if (lab.isPending || map.isPending) {
    return (
      <Page>
        <LoadingBlock label="Loading the lab" lines={6} />
      </Page>
    );
  }

  const { subject, theorySubject, summary } = lab.data;
  const toggle = (e) => mark.mutate({ id: e.id, done: !e.markedDone });
  const topicTitle = (id) => map.data.topics.find((t) => t.id === id)?.title ?? 'Topic';
  const cards = (list) =>
    list.map((e) => (
      <ExperimentCard
        key={e.id}
        experiment={e}
        student={student}
        onToggle={toggle}
        toggling={mark.isPending && mark.variables?.id === e.id}
      />
    ));
  const panel = selectedId ? (
    <div className="space-y-4">
      <div>
        <p className="eyebrow">On the roadmap</p>
        <h2 className="mt-1 text-xl">{topicTitle(selectedId)}</h2>
        <Link to={`/topics/${selectedId}`} className="text-sm">
          Revise the theory topic
        </Link>
      </div>
      {cards(byTopic.get(selectedId) ?? [])}
    </div>
  ) : null;

  return (
    <Page wide>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">
            {subject.code} · Practical · Semester {subject.semester}
          </p>
          <h1 className="mt-1">{subject.name}</h1>
          <p className="mt-1 text-sm">
            Follows the roadmap of{' '}
            <Link to={`/learn/${theorySubject.id}`}>
              {theorySubject.code} · {theorySubject.name}
            </Link>
            .
          </p>
        </div>
        {student && summary.total > 0 && (
          <ProgressBar
            className="w-full sm:w-64"
            value={(summary.done / summary.total) * 100}
            label={`${summary.done} of ${summary.total} experiments done`}
            showValue
            tone="gold"
          />
        )}
      </div>

      {experiments.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={FlaskConical}
          title="No experiments yet"
          description="Your lab faculty hasn't published experiments for this lab yet."
          action={
            <Button as={Link} to="/learn">
              Back to my subjects
            </Button>
          }
        />
      ) : (
        <>
          <div role="group" aria-label="View" className="glass mt-6 inline-flex rounded-full p-0.5">
            {[
              ['path', 'Roadmap', Route],
              ['list', 'All experiments', List],
            ].map(([v, label, Icon]) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => setView(v)}
                className={cn(
                  'inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-3 text-sm font-semibold',
                  view === v
                    ? 'bg-navy text-white shadow-press-navy-sm'
                    : 'text-navy hover:bg-brand-soft',
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </button>
            ))}
          </div>

          {view === 'list' ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2">{cards(experiments)}</div>
          ) : (
            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
              <Card padded={false} className="overflow-hidden py-4">
                <RoadmapView
                  map={roadmap}
                  me={me}
                  order={order}
                  unitId={null}
                  highlightId={null}
                  onSelect={setSelected}
                  onDetails={(id) => {
                    setSelected(id);
                    if (!isDesktop) setSheetOpen(true);
                  }}
                  onOpenMap={(unitId) =>
                    navigate(`/learn/${theorySubject.id}?view=map&unit=${unitId}`)
                  }
                  action={(topic) => {
                    const list = byTopic.get(topic.id) ?? [];
                    const left = student ? list.filter((e) => !e.done).length : list.length;
                    return {
                      note: student
                        ? left
                          ? `${left} of ${list.length} experiment${list.length === 1 ? '' : 's'} to do`
                          : 'All experiments done'
                        : `${list.length} experiment${list.length === 1 ? '' : 's'}`,
                      label: list.length === 1 ? 'Open experiment' : 'Open experiments',
                      icon: FlaskConical,
                      onClick: () => {
                        setSelected(topic.id);
                        if (!isDesktop) setSheetOpen(true);
                      },
                    };
                  }}
                />
              </Card>
              <aside aria-label="Experiments for the selected topic" className="hidden lg:block">
                {panel}
              </aside>
            </div>
          )}
        </>
      )}

      <Drawer
        open={sheetOpen && !isDesktop}
        onClose={() => setSheetOpen(false)}
        side="bottom"
        title="Experiments"
      >
        {panel}
      </Drawer>
    </Page>
  );
}
