import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, Brain, Flame } from 'lucide-react';
import { MASTERY_STATES, gamify } from '@acet/shared';
import { Page } from '../../../components/layout/AppShell';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  EyebrowHeading,
  LoadingBlock,
  StatTile,
} from '../../../components/ui';
import { useProgress } from '../api';
import { MASTERY_LABEL } from '../map/graph';
import { soft } from '../../../lib/motion';
import { AchievementGrid, LevelCard } from '../game/GameWidgets';

const STATE_COLOR = {
  confident: 'bg-gold',
  practicing: 'bg-blue',
  learning: 'bg-blue/40',
  needsRevision: 'bg-warning',
  notStarted: 'bg-line',
};

/** A stacked bar of mastery states for one subject, with the numbers spelled out. Segments grow in. */
export function MasteryBar({ counts, total }) {
  const order = ['confident', 'practicing', 'learning', 'needsRevision', 'notStarted'];
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-line" aria-hidden>
        {order.map((s) =>
          counts[s] ? (
            <motion.div
              key={s}
              className={STATE_COLOR[s]}
              initial={{ width: 0 }}
              animate={{ width: `${(counts[s] / Math.max(total, 1)) * 100}%` }}
              transition={soft}
            />
          ) : null,
        )}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {order.map((s) => (
          <li key={s} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className={`inline-block h-2.5 w-2.5 rounded-full ${STATE_COLOR[s]}`}
            />
            {MASTERY_LABEL[s]}: <strong className="text-navy">{counts[s] ?? 0}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** /me/progress (F5): mastery per subject, a light revision streak, and weakest topics. */
export function ProgressPage() {
  const progress = useProgress();
  const game = useMemo(() => (progress.data ? gamify(progress.data) : null), [progress.data]);
  if (progress.isPending) {
    return (
      <Page>
        <LoadingBlock label="Loading your progress" lines={5} />
      </Page>
    );
  }
  if (progress.isError) {
    return (
      <Page>
        <EmptyState
          tone="error"
          icon={Activity}
          title="Could not load your progress"
          description={progress.error.message}
          action={<Button onClick={() => progress.refetch()}>Try again</Button>}
        />
      </Page>
    );
  }
  const p = progress.data;
  const mastered = p.subjects.reduce((n, s) => n + s.counts.confident, 0);
  const total = p.subjects.reduce((n, s) => n + s.totalTopics, 0);

  return (
    <Page>
      <EyebrowHeading eyebrow="Progress" title="How you are doing" level={1} />
      <div className="mt-6">
        <LevelCard game={game} streak={p.revision.streakDays} />
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatTile label="Topics mastered" value={`${mastered} / ${total}`} tone="gold" />
        <StatTile
          label="Revision due now"
          value={p.revision.dueNow}
          icon={Brain}
          hint={p.revision.dueNow ? 'Clear these to stay on track' : 'All caught up'}
        />
        <StatTile
          label="Revision streak"
          value={`${p.revision.streakDays} day${p.revision.streakDays === 1 ? '' : 's'}`}
          icon={Flame}
          hint="Nice to keep, not the goal"
        />
      </div>

      <section aria-labelledby="badges-h" className="mt-8">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 id="badges-h">Achievements</h2>
          <span className="text-sm font-semibold text-navy">
            {game.unlockedCount} of {game.achievements.length} unlocked
          </span>
        </div>
        <AchievementGrid achievements={game.achievements} />
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section aria-labelledby="by-subject">
          <h2 id="by-subject">By subject</h2>
          {p.subjects.length === 0 ? (
            <p className="mt-3 text-sm">No subjects yet.</p>
          ) : (
            <ul className="mt-4 space-y-4">
              {p.subjects.map((s) => (
                <li key={s.subjectId}>
                  <Card>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3>
                        <Link to={`/subjects/${s.subjectId}`}>{s.name}</Link>
                      </h3>
                      <span className="text-xs">
                        {s.code} · {s.totalTopics} topics
                      </span>
                    </div>
                    <div className="mt-4">
                      <MasteryBar counts={s.counts} total={s.totalTopics} />
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside aria-labelledby="weakest">
          <Card>
            <h2 id="weakest" className="text-lg">
              Weakest topics
            </h2>
            {p.weakestTopics.length === 0 ? (
              <p className="mt-2 text-sm">Take a quiz to see where to focus.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {p.weakestTopics.map((t) => (
                  <li key={t.topicId}>
                    <Link
                      to={`/topics/${t.topicId}`}
                      className="flex min-h-[44px] items-center justify-between gap-2 rounded-xl border border-line p-3 glass-hover hover:no-underline"
                    >
                      <span className="font-semibold text-navy">{t.title}</span>
                      <Badge tone={t.state === 'needsRevision' ? 'orange' : 'neutral'}>
                        {t.score}%
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {p.revision.dueNow > 0 && (
              <Button
                as={Link}
                to="/revision"
                className="mt-4 w-full hover:no-underline"
                icon={Brain}
              >
                Revise now
              </Button>
            )}
          </Card>
        </aside>
      </div>
      <p className="sr-only">States: {MASTERY_STATES.map((s) => MASTERY_LABEL[s]).join(', ')}</p>
    </Page>
  );
}
