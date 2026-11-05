import { Link } from 'react-router-dom';
import { ArrowRight, CornerDownRight, Lock, MousePointerClick } from 'lucide-react';
import { Badge, Button, Card, EmptyState, EyebrowHeading } from '../../../components/ui';
import { MASTERY_LABEL, neighboursOf, STATE_LABEL } from './graph';

const STATE_TONE = {
  mastered: 'gold',
  current: 'blue',
  unlocked: 'neutral',
  locked: 'neutral',
  needsRevision: 'orange',
};

function TopicLinks({ title, items, onSelect, empty }) {
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-navy">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-2 text-sm">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {items.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => onSelect(t.id)}
                className="group flex min-h-[44px] w-full items-start gap-3 rounded-2xl border border-line bg-white p-4 text-left transition-colors hover:border-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue"
              >
                <CornerDownRight className="mt-1 h-4 w-4 shrink-0 text-navy" aria-hidden />
                <span>
                  <span className="block text-sm font-semibold text-navy group-hover:text-blue-dark">
                    {t.title}
                  </span>
                  {t.reason && (
                    <span className="mt-1 block text-xs leading-relaxed">{t.reason}</span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Selected-topic panel (F3): summary, builds on / unlocks and the one CTA.
 * @param {{ map: object, node?: object, topicId: string|null, onSelect: (id: string) => void }} props
 */
export function TopicPanel({ map, node, topicId, onSelect }) {
  const topic = map.topics.find((t) => t.id === topicId);
  if (!topic) {
    return (
      <EmptyState
        icon={MousePointerClick}
        title="Pick a topic"
        description="Select a topic on the map to see what it builds on and what it unlocks."
      />
    );
  }
  const { buildsOn, unlocks, related } = neighboursOf(map, topic.id);
  const state = node?.state ?? 'unlocked';
  const titleOf = new Map(map.topics.map((t) => [t.id, t.title]));
  const missing = (node?.missingPrerequisites ?? []).map((id) => ({ id, title: titleOf.get(id) }));
  const unit = map.units.find((u) => u.id === topic.unitId);

  return (
    <div className="space-y-7">
      <div>
        <EyebrowHeading eyebrow="Selected topic" title={topic.title} level={2} />
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge tone={STATE_TONE[state]}>{STATE_LABEL[state]}</Badge>
          {node?.mastery && <Badge>{MASTERY_LABEL[node.mastery]}</Badge>}
          {unit && <Badge>Unit {unit.number}</Badge>}
        </div>
        {topic.summary && <p className="mt-4 text-sm leading-relaxed">{topic.summary}</p>}
      </div>

      {state === 'locked' ? (
        <Card tone="surface" padded={false} className="p-5">
          <p className="flex items-center gap-2 font-semibold text-navy">
            <Lock className="h-4 w-4" aria-hidden /> Finish{' '}
            {missing.map((m) => m.title).join(', ') || 'the earlier topics'} first
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {missing.map((m) => (
              <li key={m.id}>
                <Button size="sm" variant="secondary" onClick={() => onSelect(m.id)}>
                  Go to {m.title}
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <Button
          as={Link}
          to={`/topics/${topic.id}`}
          size="lg"
          className="w-full hover:no-underline"
          icon={ArrowRight}
        >
          {state === 'mastered' ? 'Review topic' : 'Start topic'}
        </Button>
      )}

      <TopicLinks
        title="Builds on"
        items={buildsOn}
        onSelect={onSelect}
        empty="Nothing: a good place to start."
      />
      <TopicLinks
        title="Unlocks"
        items={unlocks}
        onSelect={onSelect}
        empty="No later topics depend on this one."
      />
      {related.length > 0 && <TopicLinks title="Related" items={related} onSelect={onSelect} />}
    </div>
  );
}
