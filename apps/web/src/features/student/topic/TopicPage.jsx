import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  CalendarDays,
  ChevronRight,
  Code2,
  FileQuestion,
  Printer,
} from 'lucide-react';
import { ApiError } from '../../../api/client';
import { Page } from '../../../components/layout/AppShell';
import { Markdown } from '../../../components/Markdown';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  EyebrowHeading,
  LoadingBlock,
  StepTracker,
} from '../../../components/ui';
import { useSession } from '../../auth/session';
import { useMyMap, useOpenTopic, useTopicPage } from '../api';
import { MASTERY_LABEL } from '../map/graph';
import { Curiosity } from './Curiosity';
import { FlashcardDeck } from './FlashcardDeck';
import { TutorDrawer } from './TutorDrawer';
import { VideoPlayer } from './VideoPlayer';
import { Workshops } from './Workshop';
import { TopicCodeLab } from '../codelab/CodeLabList';

const MASTERY_TONE = {
  notStarted: 'neutral',
  learning: 'blue',
  practicing: 'blue',
  confident: 'gold',
  needsRevision: 'orange',
};
const PRACTICED = ['practicing', 'confident', 'needsRevision'];

/** Which of the six steps have content on this page. Empty steps are hidden (F4). */
export function availableSteps(page) {
  const steps = [];
  if (page.curiosity) steps.push('curiosity');
  if (page.video || page.easy) steps.push('understand');
  if (page.tenMark) steps.push('prepare');
  if (page.flashcardCount > 0) steps.push('remember');
  if (page.questionCount > 0 || page.codeChallengeCount > 0) steps.push('practice');
  if (page.realWorld || page.workshop || page.workshops?.length) steps.push('apply');
  return steps;
}

const fmtExam = (d) => new Date(d).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

function StepSection({ id, eyebrow, title, children, actions }) {
  return (
    <section
      id={`step-${id}`}
      data-step={id}
      aria-labelledby={`step-${id}-h`}
      className="scroll-mt-24"
    >
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <EyebrowHeading eyebrow={eyebrow} title={title} level={2} id={`step-${id}-h`} />
          {actions}
        </div>
        <div className="mt-4">{children}</div>
      </Card>
    </section>
  );
}

function Connections({ page }) {
  const groups = [
    ['Builds on', page.prerequisites],
    ['Unlocks', page.unlocks],
  ].filter(([, list]) => list?.length);
  if (!groups.length) return null;
  return (
    <Card>
      <h2 className="text-lg">Connections</h2>
      {groups.map(([label, list]) => (
        <div key={label} className="mt-4">
          <h3 className="text-sm font-bold uppercase tracking-wider">{label}</h3>
          <ul className="mt-2 space-y-2">
            {list.map((t) => (
              <li key={t.id}>
                <Link
                  to={`/topics/${t.id}`}
                  className="group block rounded-xl border border-line p-3 glass-hover hover:no-underline"
                >
                  <span className="flex items-center justify-between font-semibold text-navy group-hover:text-blue-dark">
                    {t.title} <ChevronRight className="h-4 w-4" aria-hidden />
                  </span>
                  {t.reason && <span className="mt-0.5 block text-xs text-body">{t.reason}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </Card>
  );
}

function Pyqs({ pyqs }) {
  if (!pyqs?.length) return null;
  return (
    <Card tone="navy">
      <p className="eyebrow text-gold">Previous-year questions</p>
      <h2 className="mt-1 text-lg text-white">Asked {pyqs.length}× in exams</h2>
      <ul className="mt-4 space-y-3">
        {pyqs.map((p) => (
          <li key={p.id} className="rounded-xl bg-white/10 p-3 text-sm text-white">
            <p>{p.text}</p>
            <p className="mt-2 flex flex-wrap gap-2 text-xs text-white/80">
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden /> {fmtExam(p.examDate)}
              </span>
              <span>· {p.marks} marks</span>
            </p>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** Scroll spy: the step whose section is nearest the top of the viewport. */
function useCurrentStep(steps) {
  const [current, setCurrent] = useState(steps[0]);
  useEffect(() => {
    setCurrent((c) => (steps.includes(c) ? c : steps[0]));
    if (typeof IntersectionObserver === 'undefined') return undefined;
    const visible = new Map();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) visible.set(e.target.dataset.step, e.isIntersecting);
        const first = steps.find((s) => visible.get(s));
        if (first) setCurrent(first);
      },
      { rootMargin: '-80px 0px -55% 0px' },
    );
    for (const s of steps) {
      const el = document.getElementById(`step-${s}`);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, [steps]);
  return [current, setCurrent];
}

/** /topics/:topicId — the six-step learning page (F4). Published content only (B3). */
export function TopicPage() {
  const { topicId } = useParams();
  const user = useSession((s) => s.user);
  const isStudent = user.role === 'student';
  const page = useTopicPage(topicId);
  const open = useOpenTopic();
  const subjectId = page.data?.topic.subject.id;
  const me = useMyMap(subjectId, isStudent);
  const node = me.data?.nodes.find((n) => n.topicId === topicId);
  const [tutorOpen, setTutorOpen] = useState(false);
  const [done, setDone] = useState([]);
  const opened = useRef(null);

  // Opening the page marks the topic as learning (B4). Once per topic per visit.
  useEffect(() => {
    if (!isStudent || !page.data || opened.current === topicId) return;
    opened.current = topicId;
    open.mutate(topicId);
  }, [isStudent, page.data, topicId, open]);

  const steps = useMemo(() => (page.data ? availableSteps(page.data) : []), [page.data]);
  const [current, setCurrent] = useCurrentStep(steps);
  const markDone = useCallback((s) => setDone((d) => (d.includes(s) ? d : [...d, s])), []);
  const doneSteps = useMemo(() => {
    const d = [...done];
    if (node && PRACTICED.includes(node.mastery)) {
      for (const s of ['curiosity', 'understand', 'prepare', 'practice'])
        if (!d.includes(s)) d.push(s);
    }
    return d.filter((s) => steps.includes(s));
  }, [done, node, steps]);

  const jump = useCallback(
    (step) => {
      const el = document.getElementById(`step-${step}`);
      if (!el) return;
      setCurrent(step);
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      el.querySelector('h2')?.setAttribute('tabindex', '-1');
      el.querySelector('h2')?.focus({ preventScroll: true });
    },
    [setCurrent],
  );

  // Links such as /topics/:id#step-prepare (from exam prep) land on that section.
  const { hash } = useLocation();
  useEffect(() => {
    const step = hash.startsWith('#step-') ? hash.slice(6) : null;
    if (step && steps.includes(step)) requestAnimationFrame(() => jump(step));
  }, [hash, steps, jump]);

  const printTenMark = () => {
    document.body.dataset.print = 'step-prepare';
    const clear = () => {
      delete document.body.dataset.print;
      window.removeEventListener('afterprint', clear);
    };
    window.addEventListener('afterprint', clear);
    window.print();
  };

  if (page.isPending) {
    return (
      <Page>
        <LoadingBlock label="Loading the topic" lines={8} />
      </Page>
    );
  }
  if (page.isError) {
    const missing = page.error instanceof ApiError && [403, 404].includes(page.error.status);
    return (
      <Page>
        <EmptyState
          icon={FileQuestion}
          tone={missing ? 'default' : 'error'}
          title={missing ? 'This topic is not available' : 'Could not load the topic'}
          description={
            missing
              ? 'It may not be published yet, or it belongs to another syllabus.'
              : page.error.message
          }
          action={
            missing ? (
              <Button as={Link} to="/learn">
                Back to my subjects
              </Button>
            ) : (
              <Button onClick={() => page.refetch()}>Try again</Button>
            )
          }
        />
      </Page>
    );
  }

  const p = page.data;
  const t = p.topic;
  const mastery = node?.mastery;
  const mapHref = isStudent
    ? `/learn/${t.subject.id}?topic=${t.id}`
    : `/studio/subjects/${t.subject.id}`;

  return (
    <Page wide>
      <nav aria-label="Breadcrumb" className="no-print text-sm">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link to={`/subjects/${t.subject.id}`}>{t.subject.name}</Link>
          </li>
          {t.unit && (
            <li className="flex items-center gap-1">
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
              <span>
                Unit {t.unit.number} · {t.unit.title}
              </span>
            </li>
          )}
          <li className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            <span aria-current="page" className="font-semibold text-navy">
              {t.title}
            </span>
          </li>
        </ol>
      </nav>

      <header className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">{t.subject.code}</p>
          <h1 className="mt-1">{t.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {mastery && <Badge tone={MASTERY_TONE[mastery]}>{MASTERY_LABEL[mastery]}</Badge>}
            {t.summary && <p className="text-sm">{t.summary}</p>}
          </div>
        </div>
        <div className="no-print flex flex-wrap gap-2">
          <Button
            as={Link}
            to={mapHref}
            variant="secondary"
            icon={ArrowLeft}
            className="hover:no-underline"
          >
            Back to map
          </Button>
          <Button variant="navy" icon={Bot} onClick={() => setTutorOpen(true)}>
            Ask why
          </Button>
        </div>
      </header>

      {steps.length === 0 ? (
        <>
          <EmptyState
            className="mt-6"
            icon={FileQuestion}
            title="Content is on its way"
            description="Your faculty hasn't published material for this topic yet. Try a connected topic meanwhile."
            action={
              <Button as={Link} to={mapHref}>
                Back to map
              </Button>
            }
          />
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <Connections page={p} />
            <Pyqs pyqs={p.pyqs} />
          </div>
        </>
      ) : (
        <>
          <div className="no-print sticky top-[66px] z-20 -mx-4 mt-5 border-b border-line bg-surface/95 px-4 py-2 backdrop-blur sm:mx-0 sm:rounded-card sm:border sm:bg-card">
            <StepTracker current={current} done={doneSteps} available={steps} onSelect={jump} />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="min-w-0 space-y-6">
              {p.curiosity && (
                <section
                  id="step-curiosity"
                  data-step="curiosity"
                  aria-labelledby="step-curiosity-h"
                  className="scroll-mt-24"
                >
                  <span id="step-curiosity-h" className="sr-only">
                    Curiosity
                  </span>
                  <Curiosity curiosity={p.curiosity} onDone={() => markDone('curiosity')} />
                </section>
              )}

              {(p.video || p.easy) && (
                <StepSection
                  id="understand"
                  eyebrow="Understand"
                  title={p.video?.title ?? 'See it explained'}
                >
                  {p.video && <VideoPlayer video={p.video} />}
                  {p.easy && (
                    <div
                      className={
                        p.video
                          ? 'mt-5 rounded-2xl border border-gold-border bg-gold-tint p-4 sm:p-5'
                          : ''
                      }
                    >
                      <h3>In simple words</h3>
                      <Markdown className="mt-2">{p.easy.body}</Markdown>
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3"
                    onClick={() => markDone('understand')}
                  >
                    I understand this
                  </Button>
                </StepSection>
              )}

              {p.tenMark && (
                <StepSection
                  id="prepare"
                  eyebrow="Prepare"
                  title={p.tenMark.title ?? '10-mark answer'}
                  actions={
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={Printer}
                      onClick={printTenMark}
                      className="no-print"
                    >
                      Print
                    </Button>
                  }
                >
                  <Markdown>{p.tenMark.body}</Markdown>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="no-print mt-3"
                    onClick={() => markDone('prepare')}
                  >
                    Mark as prepared
                  </Button>
                </StepSection>
              )}

              {p.flashcardCount > 0 && (
                <StepSection
                  id="remember"
                  eyebrow="Remember"
                  title={`Flashcards (${p.flashcardCount})`}
                >
                  <FlashcardDeck topicId={t.id} onDone={() => markDone('remember')} />
                </StepSection>
              )}

              {(p.questionCount > 0 || p.codeChallengeCount > 0) && (
                <StepSection id="practice" eyebrow="Practice" title="Check yourself">
                  {p.questionCount > 0 && (
                    <>
                      <p>
                        {p.questionCount} question{p.questionCount === 1 ? '' : 's'} with
                        explanations. Score 80% or more to move this topic towards mastered.
                      </p>
                      <Button
                        as={Link}
                        to={`/topics/${t.id}/quiz`}
                        size="lg"
                        icon={ArrowRight}
                        className="mt-4 hover:no-underline"
                      >
                        Take the quiz
                      </Button>
                    </>
                  )}
                  {p.codeChallengeCount > 0 && (
                    <div className={p.questionCount > 0 ? 'mt-6 border-t border-line pt-5' : ''}>
                      <h3 className="flex items-center gap-2">
                        <Code2 className="h-5 w-5 text-navy" aria-hidden /> Code lab: SQL problems
                      </h3>
                      <TopicCodeLab topicId={t.id} subjectId={t.subject?.id} />
                    </div>
                  )}
                </StepSection>
              )}

              {(p.realWorld || p.workshop || p.workshops?.length) && (
                <StepSection id="apply" eyebrow="Apply" title="Use it for real">
                  {p.realWorld && (
                    <div>
                      <h3>Where this is used</h3>
                      <Markdown className="mt-2">{p.realWorld.body}</Markdown>
                    </div>
                  )}
                  {(p.workshop || p.workshops?.length) && (
                    <div className={p.realWorld ? 'mt-6' : ''}>
                      <Workshops brief={p.workshop} workshops={p.workshops} />
                    </div>
                  )}
                </StepSection>
              )}
            </div>

            <aside className="no-print space-y-6" aria-label="Connections and exam questions">
              <Connections page={p} />
              <Pyqs pyqs={p.pyqs} />
            </aside>
          </div>
        </>
      )}

      <TutorDrawer
        open={tutorOpen}
        onClose={() => setTutorOpen(false)}
        topicId={t.id}
        topicTitle={t.title}
        onJump={jump}
      />
    </Page>
  );
}
