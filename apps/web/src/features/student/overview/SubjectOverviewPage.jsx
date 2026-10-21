import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowDown,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Compass,
  Flag,
  GitBranch,
  Lightbulb,
  Map as MapIcon,
  Pencil,
  Puzzle,
  Rocket,
  Route,
  Sparkles,
  Target,
} from 'lucide-react';
import { get } from '../../../api/client';
import { Page } from '../../../components/layout/AppShell';
import { Markdown } from '../../../components/Markdown';
import { QueryError } from '../../../components/QueryError';
import {
  Badge,
  Button,
  Card,
  EyebrowHeading,
  LoadingBlock,
  ProgressBar,
  ProgressRing,
} from '../../../components/ui';
import { cn } from '../../../lib/cn';

export const useSubjectOverview = (subjectId) =>
  useQuery({
    queryKey: ['subjects', subjectId, 'overview'],
    queryFn: () => get(`/subjects/${subjectId}/overview`),
    enabled: Boolean(subjectId),
  });

const MAX_TOPIC_CHIPS = 6;

function Section({ id, eyebrow, title, icon: Icon, children, className }) {
  return (
    <section aria-labelledby={id} className={cn('scroll-mt-24', className)}>
      <div className="mb-4 flex items-center gap-3">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-navy text-white">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <EyebrowHeading eyebrow={eyebrow} title={title} level={2} id={id} />
      </div>
      {children}
    </section>
  );
}

/** One unit on the journey: what it covers, progress, and what you can do after it. */
function UnitCard({ unit, subjectId, isCurrent }) {
  const p = unit.progress;
  const done = p && p.total > 0 && p.mastered === p.total;
  const extra = unit.topics.length - MAX_TOPIC_CHIPS;
  return (
    <Card
      className={cn(
        'relative h-full',
        isCurrent && 'ring-2 ring-blue',
        done && 'border-gold-border bg-gold-tint',
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={done ? 'gold' : isCurrent ? 'blue' : 'navy'}>Unit {unit.number}</Badge>
        <span className="text-xs font-semibold">
          {unit.topicCount} topic{unit.topicCount === 1 ? '' : 's'}
        </span>
        {done && (
          <Badge tone="gold" icon={CheckCircle2}>
            Mastered
          </Badge>
        )}
        {isCurrent && !done && <Badge tone="blue">You are here</Badge>}
      </div>
      <h3 className="mt-2 text-lg leading-snug">{unit.title}</h3>
      {unit.summary && <p className="mt-2 text-sm">{unit.summary}</p>}

      {p && p.total > 0 && (
        <ProgressBar
          className="mt-3"
          value={(p.mastered / p.total) * 100}
          label={`${p.mastered} of ${p.total} mastered`}
          showValue
          tone={done ? 'gold' : 'blue'}
          size="sm"
        />
      )}

      {unit.youWillBeAbleTo && (
        <p className="mt-3 rounded-xl border border-gold-border/60 bg-gold-tint p-3 text-sm text-navy">
          <span className="font-semibold">You&apos;ll be able to:</span> {unit.youWillBeAbleTo}
        </p>
      )}

      {unit.topics.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label={`Topics in unit ${unit.number}`}>
          {unit.topics.slice(0, MAX_TOPIC_CHIPS).map((t) => (
            <li key={t.id}>
              <Link
                to={`/topics/${t.id}`}
                className="inline-flex min-h-[32px] items-center rounded-full border border-line bg-white px-3 text-xs font-semibold text-navy hover:border-blue hover:no-underline"
              >
                {t.title}
              </Link>
            </li>
          ))}
          {extra > 0 && <li className="px-2 py-1 text-xs font-semibold">+{extra} more</li>}
        </ul>
      )}

      <Button
        as={Link}
        to={`/learn/${subjectId}?unit=${unit.id}`}
        size="sm"
        variant="secondary"
        icon={MapIcon}
        className="mt-4 hover:no-underline"
      >
        Open unit on the map
      </Button>
    </Card>
  );
}

/** The arrow between two units, saying why one leads to the next. */
function Connector({ link, leadsTo, nextTitle }) {
  const why = leadsTo || link?.reasons?.[0]?.reason;
  const reasons = (link?.reasons ?? []).filter((r) => r.reason && r.reason !== why);
  return (
    <div
      className="flex items-stretch gap-3 py-2 pl-6 sm:pl-10"
      aria-label={`Leads to ${nextTitle}`}
    >
      <div className="flex flex-col items-center">
        <span className="w-0.5 flex-1 bg-gradient-to-b from-navy/40 to-blue" aria-hidden />
        <ArrowDown className="h-5 w-5 text-blue" aria-hidden />
      </div>
      <div className="py-2 text-sm">
        <p className="font-semibold text-navy">Leads to {nextTitle}</p>
        {why && <p className="mt-0.5">{why}</p>}
        {reasons.map((r) => (
          <p key={`${r.fromTopic}-${r.toTopic}`} className="mt-1 text-xs">
            <span className="font-semibold text-navy">
              {r.fromTopic} {r.type === 'prerequisite' ? '→' : '↔'} {r.toTopic}:
            </span>{' '}
            {r.reason}
          </p>
        ))}
      </div>
    </div>
  );
}

/** Links between units that are not next to each other ("Unit 1 is also needed in Unit 4"). */
function OtherLinks({ links, units }) {
  const title = (id) => {
    const u = units.find((x) => x.id === id);
    return u ? `Unit ${u.number} · ${u.title}` : 'another unit';
  };
  const others = links.filter((l) => l.type !== 'next');
  if (!others.length) return null;
  return (
    <Card tone="surface" className="mt-4">
      <h3 className="flex items-center gap-2 text-base">
        <GitBranch className="h-4 w-4 text-navy" aria-hidden /> More connections across units
      </h3>
      <ul className="mt-2 space-y-2 text-sm">
        {others.map((l) => (
          <li key={`${l.fromUnitId}-${l.toUnitId}`}>
            <span className="font-semibold text-navy">
              {title(l.fromUnitId)} → {title(l.toUnitId)}
            </span>
            {l.reasons[0] && (
              <span>
                : {l.reasons[0].fromTopic} → {l.reasons[0].toTopic}. {l.reasons[0].reason}
              </span>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

/**
 * /subjects/:subjectId — the subject root page: why it matters, what to know first, the
 * journey through its units and what you can do afterwards, on one page.
 */
export function SubjectOverviewPage() {
  const { subjectId } = useParams();
  const q = useSubjectOverview(subjectId);

  if (q.isPending)
    return (
      <Page>
        <LoadingBlock label="Loading the subject" lines={6} />
      </Page>
    );
  if (q.isError)
    return (
      <Page>
        <QueryError query={q} what="this subject" />
      </Page>
    );

  const { subject, overview: o, units, unitLinks, courseOutcomes, progress, canEdit } = q.data;
  const pct = progress?.total ? (progress.mastered / progress.total) * 100 : 0;
  const started = progress && (progress.mastered > 0 || progress.started > 0);
  // The first unit that is not fully mastered is where the student is.
  const currentUnitId = progress
    ? units.find((u) => u.progress && u.progress.mastered < u.progress.total)?.id
    : null;
  const nextLink = (u, i) =>
    unitLinks.find(
      (l) => l.type === 'next' && l.fromUnitId === u.id && l.toUnitId === units[i + 1]?.id,
    );
  const outcomes = o?.outcomes ?? [];

  return (
    <Page>
      {/* Hero */}
      <header className="glass-navy overflow-hidden rounded-sheet p-6 text-white sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0 max-w-2xl">
            <p className="eyebrow text-gold">
              {subject.code} · Semester {subject.semester}
            </p>
            <h1 className="mt-2 text-3xl text-white sm:text-4xl">{subject.name}</h1>
            {o?.tagline && <p className="mt-3 text-lg text-white/90">{o.tagline}</p>}
            <p className="mt-3 text-sm text-white/80">
              {units.length} unit{units.length === 1 ? '' : 's'} ·{' '}
              {units.reduce((n, u) => n + u.topicCount, 0)} topics
              {courseOutcomes.length ? ` · ${courseOutcomes.length} course outcomes` : ''}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                as={Link}
                to={`/learn/${subject.id}`}
                size="lg"
                icon={Route}
                className="hover:no-underline"
              >
                {started ? 'Continue learning path' : 'Start learning path'}
              </Button>
              <Button
                as={Link}
                to={`/learn/${subject.id}?view=map`}
                size="lg"
                variant="light"
                icon={MapIcon}
                className="hover:no-underline"
              >
                Concept map
              </Button>
              {canEdit && (
                <Button
                  as={Link}
                  to={`/studio/subjects/${subject.id}/overview`}
                  size="lg"
                  variant="light"
                  icon={Pencil}
                  className="hover:no-underline"
                >
                  Edit overview
                </Button>
              )}
            </div>
          </div>
          {progress && (
            <div className="flex flex-col items-center rounded-3xl bg-white p-4">
              <ProgressRing value={pct} label={`${subject.name} mastery`} size={96} stroke={8}>
                <span className="text-lg">{Math.round(pct)}%</span>
              </ProgressRing>
              <p className="mt-2 text-sm font-semibold text-navy">
                {progress.mastered} of {progress.total} mastered
              </p>
            </div>
          )}
        </div>
      </header>

      {!o && (
        <p className="mt-4 rounded-2xl border border-dashed border-line p-4 text-sm">
          {canEdit
            ? 'Students see the unit journey below. Add the overview (why, prerequisites, uses) with "Edit overview".'
            : 'Your faculty hasn’t written this subject’s introduction yet. The journey below shows how its units connect.'}
          {canEdit && o === null && ' It can be drafted with AI from the syllabus.'}
        </p>
      )}
      {o?.status && o.status !== 'published' && (
        <p className="mt-4 rounded-2xl border border-warning/40 bg-warning/10 p-3 text-sm text-navy">
          Preview: this overview is a <strong>{o.status}</strong> and students can&apos;t see it
          yet.
        </p>
      )}

      <div className="mt-10 space-y-12">
        {/* Before you start */}
        {o?.prerequisites?.length > 0 && (
          <Section
            id="ov-prereq"
            eyebrow="Before you start"
            title="What you should know first"
            icon={Puzzle}
          >
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {o.prerequisites.map((p) => (
                <li key={p.title}>
                  <Card className="h-full">
                    <p className="flex items-start gap-2 font-semibold text-navy">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-blue" aria-hidden />
                      {p.title}
                    </p>
                    {p.why && <p className="mt-2 text-sm">{p.why}</p>}
                  </Card>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Why */}
        {(o?.why || o?.applications?.length > 0) && (
          <Section id="ov-why" eyebrow="Why learn this" title="Why it matters" icon={Lightbulb}>
            <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
              {o.why && (
                <Card className="self-start">
                  <Markdown>{o.why}</Markdown>
                </Card>
              )}
              {o.applications?.length > 0 && (
                <div>
                  <h3 className="mb-3 flex items-center gap-2 text-base">
                    <Compass className="h-4 w-4 text-navy" aria-hidden /> Where it&apos;s used
                  </h3>
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {o.applications.map((a) => (
                      <li key={a.title} className="glass rounded-2xl p-4">
                        <p className="font-semibold text-navy">{a.title}</p>
                        {a.description && <p className="mt-1 text-sm">{a.description}</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Section>
        )}

        {/* Journey */}
        <Section id="ov-journey" eyebrow="Your journey" title="How the units connect" icon={Route}>
          {units.length === 0 ? (
            <p className="text-sm">The units of this subject are not published yet.</p>
          ) : (
            <>
              <ol className="max-w-3xl">
                {units.map((u, i) => (
                  <li key={u.id}>
                    <UnitCard unit={u} subjectId={subject.id} isCurrent={u.id === currentUnitId} />
                    {i < units.length - 1 && (
                      <Connector
                        link={nextLink(u, i)}
                        leadsTo={u.leadsTo}
                        nextTitle={`Unit ${units[i + 1].number}: ${units[i + 1].title}`}
                      />
                    )}
                  </li>
                ))}
                <li className="mt-4 flex items-center gap-3 pl-6 sm:pl-10">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-gold text-navy">
                    <Flag className="h-5 w-5" aria-hidden />
                  </span>
                  <p className="font-semibold text-navy">
                    Finish line: the whole subject, ready for exams
                  </p>
                </li>
              </ol>
              <OtherLinks links={unitLinks} units={units} />
            </>
          )}
        </Section>

        {/* What you can do */}
        {(outcomes.length > 0 || courseOutcomes.length > 0 || o?.careers?.length > 0) && (
          <Section
            id="ov-after"
            eyebrow="After this subject"
            title="What you can do with it"
            icon={Rocket}
          >
            <div className="grid gap-6 lg:grid-cols-2">
              {(outcomes.length > 0 || courseOutcomes.length > 0) && (
                <Card>
                  <h3 className="flex items-center gap-2 text-base">
                    <Target className="h-4 w-4 text-navy" aria-hidden /> You will be able to
                  </h3>
                  <ul className="mt-3 space-y-2">
                    {outcomes.map((t) => (
                      <li key={t} className="flex items-start gap-2 text-sm">
                        <CheckCircle2
                          className="mt-0.5 h-4 w-4 shrink-0 text-success"
                          aria-hidden
                        />
                        {t}
                      </li>
                    ))}
                  </ul>
                  {courseOutcomes.length > 0 && (
                    <>
                      <p className="mt-4 text-xs font-bold uppercase tracking-wider text-navy">
                        Course outcomes (university)
                      </p>
                      <ul className="mt-2 space-y-1.5">
                        {courseOutcomes.map((c) => (
                          <li key={c.code} className="text-sm">
                            <span className="font-semibold text-navy">{c.code}.</span> {c.text}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </Card>
              )}
              {o?.careers?.length > 0 && (
                <Card>
                  <h3 className="flex items-center gap-2 text-base">
                    <Briefcase className="h-4 w-4 text-navy" aria-hidden /> Careers that use it
                  </h3>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {o.careers.map((c) => (
                      <li key={c}>
                        <Badge tone="blue" icon={Sparkles}>
                          {c}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </div>
          </Section>
        )}

        <Card className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="eyebrow">Ready?</p>
            <p className="mt-1 font-semibold text-navy">
              {started ? 'Pick up where you left off.' : 'Start with the first topic of the path.'}
            </p>
          </div>
          <Button
            as={Link}
            to={`/learn/${subject.id}`}
            icon={ArrowRight}
            className="hover:no-underline"
          >
            {started ? 'Continue learning path' : 'Start learning path'}
          </Button>
        </Card>
      </div>
    </Page>
  );
}
