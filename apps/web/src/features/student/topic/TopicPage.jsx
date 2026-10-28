import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Brain,
  CalendarDays,
  ChevronRight,
  Code2,
  FileQuestion,
  LayoutGrid,
  Printer,
} from 'lucide-react';
import { buildCheatSheet } from '@acet/shared';
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
  Tabs,
} from '../../../components/ui';
import { useSession } from '../../auth/session';
import { AnimatePresence, motion } from 'framer-motion';
import { soft } from '../../../lib/motion';
import { useLearningOrder, useMyMap, useOpenTopic, useSaveTopicSteps, useTopicPage } from '../api';
import { MASTERY_LABEL } from '../map/graph';
import { CheatSheetImage } from './CheatSheetImage';
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
/** Height of the header + sticky step bar above a section (matches the sections' scroll-mt-24). */
const STICKY_OFFSET = 96;

/** Which of the six steps have content on this page. Empty steps are hidden (F4). */
export function availableSteps(page) {
  const steps = [];
  if (page.curiosity) steps.push('curiosity');
  if (page.video || page.easy) steps.push('understand');
  if (page.tenMark || page.shortAnswers) steps.push('prepare');
  // Remember holds the flashcards and the derived cheat sheet (ADR 0016).
  if (page.flashcardCount > 0 || buildCheatSheet(page)) steps.push('remember');
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

/** Quick questions with answers for exam revision; each answer opens on demand. */
function ShortAnswers({ items }) {
  return (
    <section aria-labelledby="short-answers-h" className="mt-6">
      <h3 id="short-answers-h" className="text-base">
        Quick questions ({items.length})
      </h3>
      <ul className="mt-3 space-y-2">
        {items.map((q) => (
          <li key={q.id}>
            <details className="group rounded-xl border border-line bg-card p-3">
              <summary className="min-h-[28px] cursor-pointer font-semibold text-navy">
                {q.question}
              </summary>
              <div className="mt-2 text-sm">
                <Markdown>{q.answer}</Markdown>
              </div>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Pyqs({ pyqs }) {
  if (!pyqs?.length) return null;
  return (
    <Card tone="navy">
      <p className="eyebrow text-gold">Exam prep</p>
      <h2 className="mt-1 text-lg text-white">Exam questions on this topic</h2>
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

/**
 * Once every step is done: a floating button, bottom right, to the next topic in the subject's
 * learning order (which runs on into the next unit), or back to the map after the last topic.
 */
function NextTopicButton({ show, next, mapHref }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.9 }}
          transition={soft}
          className="no-print fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-30 md:bottom-6 md:right-6"
        >
          {next ? (
            <Button
              as={Link}
              to={`/topics/${next.topicId}`}
              size="lg"
              icon={ArrowRight}
              className="max-w-[calc(100vw-2rem)] shadow-glass-lg hover:no-underline"
            >
              <span className="truncate">Next: {next.title}</span>
            </Button>
          ) : (
            <Button
              as={Link}
              to={mapHref}
              size="lg"
              icon={ArrowRight}
              className="shadow-glass-lg hover:no-underline"
            >
              Subject complete · Back to map
            </Button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
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
  const order = useLearningOrder(subjectId, isStudent);
  const [tutorOpen, setTutorOpen] = useState(false);
  const [rememberView, setRememberView] = useState('cards');
  const sheet = useMemo(() => (page.data ? buildCheatSheet(page.data) : null), [page.data]);
  const [done, setDone] = useState([]);
  // Where to return to, from the server ({ step, offset } or null): undefined until the open call
  // answers. `readyFor` is the topic whose position has been restored, so saving can start.
  const [resumeAt, setResumeAt] = useState(undefined);
  const [readyFor, setReadyFor] = useState(null);
  const opened = useRef(null);
  const saveSteps = useSaveTopicSteps(topicId);
  const saveRef = useRef(saveSteps.mutate);
  saveRef.current = saveSteps.mutate;

  // Moving from topic to topic keeps this component, so reset the per-topic state. The router
  // keeps the window's scroll position between pages, so start each topic at the top; only real
  // input (wheel, touch, keys, clicks) counts as the student moving before the restore.
  const interacted = useRef(false);
  useEffect(() => {
    setDone([]);
    setRememberView(window.location.hash === '#cheat-sheet' ? 'sheet' : 'cards');
    setResumeAt(isStudent ? undefined : null);
    interacted.current = false;
    if (!window.location.hash) window.scrollTo(0, 0);
    const mark = () => {
      interacted.current = true;
    };
    const events = ['wheel', 'touchmove', 'keydown', 'pointerdown'];
    for (const e of events) window.addEventListener(e, mark, { passive: true });
    return () => {
      for (const e of events) window.removeEventListener(e, mark);
    };
  }, [topicId, isStudent]);

  // Opening the page marks the topic as learning (B4) and returns the saved step progress, so the
  // page continues where the student stopped, on any device. Once per topic per visit.
  useEffect(() => {
    if (!isStudent || !page.data || opened.current === topicId) return;
    opened.current = topicId;
    // The promise, not mutate()'s per-call callbacks: those are dropped when the page data was
    // already cached (a reopened topic), which left the saved position unused.
    open
      .mutateAsync(topicId)
      .then((r) => {
        if (opened.current !== topicId) return;
        const saved = r?.steps;
        if (saved?.done?.length) setDone((d) => [...new Set([...d, ...saved.done])]);
        setResumeAt(saved?.last ? { step: saved.last, offset: saved.offset ?? 0 } : null);
      })
      .catch(() => {
        if (opened.current === topicId) setResumeAt(null);
      });
  }, [isStudent, page.data, topicId, open]);

  const steps = useMemo(() => (page.data ? availableSteps(page.data) : []), [page.data]);
  const [current, setCurrent] = useCurrentStep(steps);
  const markDone = useCallback(
    (s) => {
      setDone((d) => (d.includes(s) ? d : [...d, s]));
      // Only the finished step: the reading position comes from scrolling, so it is not reset.
      if (isStudent) saveRef.current({ done: [s] });
    },
    [isStudent],
  );
  const doneSteps = useMemo(() => {
    const d = [...done];
    if (node && PRACTICED.includes(node.mastery)) {
      for (const s of ['curiosity', 'understand', 'prepare', 'practice'])
        if (!d.includes(s)) d.push(s);
    }
    return d.filter((s) => steps.includes(s));
  }, [done, node, steps]);
  const allDone = isStudent && steps.length > 0 && doneSteps.length === steps.length;
  const orderIdx = order.data?.findIndex((o) => o.topicId === topicId) ?? -1;
  const nextTopic = orderIdx >= 0 ? order.data[orderIdx + 1] : undefined;

  const jump = useCallback(
    // `focus: false` for automatic moves (resuming), so no focus ring appears unasked.
    (step, { focus = true } = {}) => {
      const el = document.getElementById(`step-${step}`);
      if (!el) return;
      setCurrent(step);
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (!focus) return;
      el.querySelector('h2')?.setAttribute('tabindex', '-1');
      el.querySelector('h2')?.focus({ preventScroll: true });
    },
    [setCurrent],
  );

  // Links such as /topics/:id#step-prepare (from exam prep) land on that section.
  const { hash } = useLocation();
  useEffect(() => {
    // `#cheat-sheet` opens the Remember step on its cheat sheet tab.
    const step =
      hash === '#cheat-sheet' ? 'remember' : hash.startsWith('#step-') ? hash.slice(6) : null;
    if (step && steps.includes(step)) requestAnimationFrame(() => jump(step));
  }, [hash, steps, jump]);

  // Otherwise return to the exact spot the student was reading last time.
  useEffect(() => {
    if (resumeAt === undefined || !steps.length || readyFor === topicId) return undefined;
    const { step, offset = 0 } = resumeAt ?? {};
    const linked = hash.startsWith('#step-') || hash === '#cheat-sheet';
    const restore = !linked && step && steps.includes(step);
    // A short wait lets the sections lay out (video, cards) before measuring.
    const timer = setTimeout(() => {
      const el = restore && document.getElementById(`step-${step}`);
      // If the student already moved while the saved position was loading, leave them there.
      if (el && !interacted.current && (step !== steps[0] || offset > 0)) {
        setCurrent(step);
        const top = el.getBoundingClientRect().top + window.scrollY - STICKY_OFFSET + offset;
        window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
        // Steps near the end cannot scroll to the top, so the scroll spy may pick the step above;
        // keep the one the student was on once the scroll settles.
        setTimeout(() => {
          if (!interacted.current) setCurrent(step);
        }, 900);
      }
      setReadyFor(topicId);
    }, 250);
    return () => clearTimeout(timer);
  }, [resumeAt, steps, topicId, hash, readyFor, setCurrent]);

  // Remember the step being read and how far into it, once scrolling settles.
  const currentRef = useRef(current);
  currentRef.current = current;
  const lastSaved = useRef(null);
  const scheduleSave = useRef(null);
  useEffect(() => {
    if (!isStudent || readyFor !== topicId) return undefined;
    let timer;
    const save = () => {
      const step = currentRef.current;
      const el = step && document.getElementById(`step-${step}`);
      if (!el) return;
      const offset = Math.max(0, Math.round(STICKY_OFFSET - el.getBoundingClientRect().top));
      const key = `${topicId}:${step}:${Math.round(offset / 40)}`;
      if (lastSaved.current === key) return;
      lastSaved.current = key;
      saveRef.current({ last: step, offset });
    };
    const onScroll = () => {
      clearTimeout(timer);
      timer = setTimeout(save, 1000);
    };
    scheduleSave.current = onScroll;
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pagehide', save);
    // Scrolling the student did before saving started (a slow open call) still counts.
    if (interacted.current && window.scrollY > 0) onScroll();
    return () => {
      scheduleSave.current = null;
      clearTimeout(timer);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pagehide', save);
    };
  }, [isStudent, readyFor, topicId]);
  // Choosing a step near the end may not scroll at all (the page is already at the bottom), so a
  // change of step also saves.
  useEffect(() => {
    scheduleSave.current?.();
  }, [current]);

  /** Prints only one part of the page: the exam notes or the cheat sheet (see index.css). */
  const printOnly = (part) => {
    document.body.dataset.print = part;
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
          {sheet && (
            <Button
              variant="secondary"
              icon={LayoutGrid}
              onClick={() => {
                setRememberView('sheet');
                jump('remember');
              }}
            >
              Cheat sheet
            </Button>
          )}
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
          <div className="no-print sticky top-[66px] z-20 -mx-4 mt-4 border-b border-line bg-surface/95 px-4 py-1.5 backdrop-blur sm:mx-0 sm:rounded-full sm:border sm:bg-card sm:px-5">
            <StepTracker
              compact
              current={current}
              done={doneSteps}
              available={steps}
              onSelect={jump}
            />
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

              {(p.tenMark || p.shortAnswers) && (
                <StepSection
                  id="prepare"
                  eyebrow="Prepare"
                  title="Exam study material"
                  actions={
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={Printer}
                      onClick={() => printOnly('step-prepare')}
                      className="no-print"
                    >
                      Print
                    </Button>
                  }
                >
                  <p className="text-sm">
                    Notes for short and long answers: read them, then try the quick questions below.
                  </p>
                  {p.tenMark && (
                    <div className="mt-4">
                      <Markdown>{p.tenMark.body}</Markdown>
                    </div>
                  )}
                  {p.shortAnswers && <ShortAnswers items={p.shortAnswers} />}
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

              {steps.includes('remember') && (
                <StepSection id="remember" eyebrow="Remember" title="Lock it in">
                  <Tabs
                    label="Ways to remember"
                    value={p.flashcardCount > 0 ? rememberView : 'sheet'}
                    onChange={setRememberView}
                    tabs={[
                      p.flashcardCount > 0 && {
                        value: 'cards',
                        label: 'Flashcards',
                        icon: Brain,
                        count: p.flashcardCount,
                        content: (
                          <FlashcardDeck topicId={t.id} onDone={() => markDone('remember')} />
                        ),
                      },
                      sheet && {
                        value: 'sheet',
                        label: 'Cheat sheet',
                        icon: LayoutGrid,
                        content: (
                          <>
                            <CheatSheetImage
                              sheet={sheet}
                              onPrint={() => printOnly('cheat-sheet')}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="no-print mt-3"
                              onClick={() => markDone('remember')}
                            >
                              I&apos;ve revised this
                            </Button>
                          </>
                        ),
                      },
                    ].filter(Boolean)}
                  />
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
                        <Code2 className="h-5 w-5 text-navy" aria-hidden /> Code lab: practice
                        problems
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
                  <Button
                    variant="ghost"
                    size="sm"
                    className="no-print mt-3"
                    onClick={() => markDone('apply')}
                  >
                    I can apply this
                  </Button>
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

      <NextTopicButton show={allDone && order.isSuccess} next={nextTopic} mapHref={mapHref} />

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
