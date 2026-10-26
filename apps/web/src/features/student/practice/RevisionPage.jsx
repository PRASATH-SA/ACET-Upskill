import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Brain, CloudUpload, Map as MapIcon, PartyPopper, Play } from 'lucide-react';
import { REVIEW_RATINGS } from '@acet/shared';
import { Page } from '../../../components/layout/AppShell';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  EyebrowHeading,
  LoadingBlock,
  ProgressBar,
  StatTile,
  toast,
} from '../../../components/ui';
import { keys, useRevisionToday, useSubjects } from '../api';
import { Flashcard, RATING_META } from './Flashcard';
import { sendRating, useOutbox } from './outbox';
import { useCelebrateWhen } from '../game/Celebration';
import { PointsPop } from '../game/GameWidgets';

// Every reviewed card earns the same points, whatever the rating, so the score never
// tempts anyone to rate "Easy" when they forgot (that would skew the FSRS schedule).
const POINTS_PER_CARD = 10;

function QuestionBack({ item }) {
  return (
    <span className="block text-left">
      <span className="block">{item.back}</span>
      {item.explanation && (
        <span className="mt-2 block text-sm font-normal text-body">{item.explanation}</span>
      )}
    </span>
  );
}

function QuestionFront({ item }) {
  return (
    <span className="block text-left">
      <span className="block">{item.front}</span>
      <span className="mt-3 block space-y-1 text-sm font-normal text-body">
        {item.options.map((o, i) => (
          <span key={i} className="block">
            {String.fromCharCode(65 + i)}. {o}
          </span>
        ))}
      </span>
    </span>
  );
}

/**
 * A focused card session. Items are snapshotted when it starts, so it keeps working if the
 * network drops; ratings are queued and synced later (F5).
 */
function Session({ items, onExit }) {
  const qc = useQueryClient();
  const pending = useOutbox((s) => s.pending.length);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tally, setTally] = useState({ again: 0, hard: 0, good: 0, easy: 0 });
  const [pop, setPop] = useState(0);
  const item = items[index];
  const reviewed = REVIEW_RATINGS.reduce((n, r) => n + tally[r], 0);
  useCelebrateWhen(!item && reviewed > 0, { size: 'lg' });

  const rate = useCallback(
    async (rating) => {
      if (!item || busy) return;
      setBusy(true);
      try {
        const res = await sendRating(`/revision/${item.reviewId}/rate`, { rating });
        if (res.queued) {
          toast({
            title: 'Saved offline',
            description: 'Ratings will sync when you reconnect.',
            key: 'revision-offline',
          });
        }
        setTally((t) => ({ ...t, [rating]: t[rating] + 1 }));
        setPop((p) => p + 1);
        setFlipped(false);
        setIndex((i) => i + 1);
      } catch (err) {
        toast.error('Could not save that rating', err.message);
      } finally {
        setBusy(false);
      }
    },
    [item, busy],
  );

  if (!item) {
    const total = REVIEW_RATINGS.reduce((n, r) => n + tally[r], 0);
    return (
      <div className="mx-auto max-w-2xl">
        <EyebrowHeading eyebrow="Session complete" title={`${total} cards reviewed`} level={1} />
        <div className="mt-6">
          <StatTile
            label="Session points"
            value={total * POINTS_PER_CARD}
            hint={`${POINTS_PER_CARD} points for every card you reviewed`}
            tone="gold"
          />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {REVIEW_RATINGS.map((r) => (
            <StatTile key={r} label={RATING_META[r].label} value={tally[r]} />
          ))}
        </div>
        {pending > 0 && (
          <p
            role="status"
            className="mt-4 flex items-center gap-2 rounded-2xl bg-surface p-3 text-sm"
          >
            <CloudUpload className="h-4 w-4 text-navy" aria-hidden /> {pending} rating
            {pending === 1 ? '' : 's'} waiting to sync. Keep this tab open until you are back
            online.
          </p>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            onClick={() => {
              qc.invalidateQueries({ queryKey: keys.revision });
              qc.invalidateQueries({ queryKey: keys.progress });
              onExit();
            }}
          >
            Done
          </Button>
          <Button as={Link} to="/learn" variant="secondary" className="hover:no-underline">
            Back to my subjects
          </Button>
        </div>
      </div>
    );
  }

  const isQuestion = item.itemType === 'question';
  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between gap-3">
        <p className="eyebrow">Revision · {item.topicTitle}</p>
        <span className="relative inline-flex items-center text-sm font-semibold text-brand">
          {reviewed * POINTS_PER_CARD} pts
          <PointsPop id={pop} points={POINTS_PER_CARD} className="-top-2 right-0" />
        </span>
        {pending > 0 && (
          <Badge tone="orange" icon={CloudUpload}>
            {pending} to sync
          </Badge>
        )}
      </div>
      <ProgressBar
        className="mt-3"
        value={(index / items.length) * 100}
        label={`Card ${index + 1} of ${items.length}`}
      />
      <div className="mt-5">
        <Flashcard
          label={isQuestion ? 'Revision question' : 'Flashcard'}
          front={isQuestion ? <QuestionFront item={item} /> : item.front}
          back={isQuestion ? <QuestionBack item={item} /> : item.back}
          flipped={flipped}
          onFlip={() => setFlipped((f) => !f)}
          onRate={rate}
          busy={busy}
        />
      </div>
      <Button variant="ghost" className="mt-4" onClick={onExit}>
        End session
      </Button>
    </div>
  );
}

/** Due groups by subject, in the order of the student's subject list. */
function bySubject(groups, subjects = []) {
  const known = new Map(subjects.map((s) => [s.id, s]));
  const out = new Map();
  for (const g of groups) {
    const subject = known.get(g.subjectId) ?? { id: g.subjectId, code: '', name: 'Other' };
    if (!out.has(subject.id)) out.set(subject.id, { subject, groups: [], count: 0 });
    const entry = out.get(subject.id);
    entry.groups.push(g);
    entry.count += g.count;
  }
  const order = subjects.map((s) => s.id);
  return [...out.values()].sort(
    (a, b) => (order.indexOf(a.subject.id) >>> 0) - (order.indexOf(b.subject.id) >>> 0),
  );
}

/** /revision — today's due items by subject and topic, then a focused session (F5). */
export function RevisionPage() {
  const today = useRevisionToday();
  const subjects = useSubjects();
  const [session, setSession] = useState(null);

  const start = (groups) =>
    setSession(groups.flatMap((g) => g.items.map((it) => ({ ...it, topicTitle: g.title }))));

  if (session) {
    return (
      <Page>
        <Session items={session} onExit={() => setSession(null)} />
      </Page>
    );
  }

  return (
    <Page>
      <EyebrowHeading eyebrow="Spaced revision" title="Today's revision" level={1}>
        <p>Cards come back just before you would forget them. A few minutes a day is enough.</p>
      </EyebrowHeading>
      {today.isPending ? (
        <LoadingBlock className="mt-6" label="Loading today's revision" />
      ) : today.isError ? (
        <EmptyState
          className="mt-6"
          tone="error"
          icon={Brain}
          title="Could not load revision"
          description={today.error.message}
          action={<Button onClick={() => today.refetch()}>Try again</Button>}
        />
      ) : today.data.total === 0 ? (
        <EmptyState
          className="mt-6"
          icon={PartyPopper}
          title="All caught up"
          description="Nothing is due today. Learn a new topic and its cards will join your revision."
          action={
            <Button as={Link} to="/learn" icon={MapIcon}>
              Open my subjects
            </Button>
          }
        />
      ) : (
        <>
          <Card className="mt-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="font-heading text-3xl font-bold text-navy">{today.data.total}</p>
              <p className="text-sm">
                items due across {today.data.groups.length} topic
                {today.data.groups.length === 1 ? '' : 's'} in{' '}
                {new Set(today.data.groups.map((g) => g.subjectId)).size} subject
                {new Set(today.data.groups.map((g) => g.subjectId)).size === 1 ? '' : 's'}
              </p>
            </div>
            <Button size="lg" icon={Play} onClick={() => start(today.data.groups)}>
              Start revision (all subjects)
            </Button>
          </Card>
          {bySubject(today.data.groups, subjects.data).map(({ subject, groups, count }) => (
            <section key={subject.id} className="mt-8" aria-labelledby={`rev-${subject.id}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold">{subject.code}</p>
                  <h2 id={`rev-${subject.id}`} className="text-lg">
                    {subject.name}{' '}
                    <span className="text-sm font-normal text-body">· {count} due</span>
                  </h2>
                </div>
                <Button size="sm" icon={Play} onClick={() => start(groups)}>
                  Revise this subject<span className="sr-only">: {subject.name}</span>
                </Button>
              </div>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                {groups.map((g) => (
                  <li
                    key={g.topicId}
                    className="flex items-center justify-between gap-3 glass rounded-2xl p-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-navy">{g.title}</p>
                      <p className="text-xs">{g.count} due</p>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => start([g])}>
                      Revise<span className="sr-only"> {g.title}</span>
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </Page>
  );
}
