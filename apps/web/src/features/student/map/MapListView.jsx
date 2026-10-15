import { Link } from 'react-router-dom';
import { Award, Lock, MapPin, RotateCcw, Unlock } from 'lucide-react';
import { Badge } from '../../../components/ui';
import { STATE_LABEL } from './graph';

const ICON = {
  mastered: Award,
  current: MapPin,
  unlocked: Unlock,
  locked: Lock,
  needsRevision: RotateCcw,
};
const TONE = {
  mastered: 'gold',
  current: 'blue',
  unlocked: 'neutral',
  locked: 'neutral',
  needsRevision: 'orange',
};

/**
 * Accessible alternative to the map (F3): topics in learning order with their state spelled
 * out, so screen readers announce "Normalization, Locked, needs Functional Dependency".
 */
export function MapListView({ map, me, order, onSelect, selectedId }) {
  const byId = new Map(map.topics.map((t) => [t.id, t]));
  const nodeOf = new Map((me?.nodes ?? []).map((n) => [n.topicId, n]));
  const unitOf = new Map(map.units.map((u) => [u.id, u]));
  return (
    <ol className="space-y-2" aria-label={`${map.subject.name} topics in learning order`}>
      {order.map((id, i) => {
        const t = byId.get(id);
        if (!t) return null;
        const n = nodeOf.get(id);
        const state = n?.state ?? 'unlocked';
        const Icon = ICON[state];
        const missing = (n?.missingPrerequisites ?? [])
          .map((m) => byId.get(m)?.title)
          .filter(Boolean);
        return (
          <li key={id}>
            <div
              className={`flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center ${
                selectedId === id ? 'border-navy' : 'border-line'
              }`}
            >
              <span className="font-heading text-lg font-extrabold text-navy" aria-hidden>
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-navy">
                  <span className="sr-only">Step {i + 1}: </span>
                  {t.title}
                </p>
                <p className="text-xs">
                  Unit {unitOf.get(t.unitId)?.number}
                  {missing.length > 0 && <> · Needs {missing.join(', ')}</>}
                </p>
              </div>
              <Badge tone={TONE[state]} icon={Icon}>
                {STATE_LABEL[state]}
              </Badge>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onSelect(id)}
                  className="min-h-[44px] rounded-full px-4 text-sm font-semibold text-navy hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue"
                >
                  Details<span className="sr-only"> for {t.title}</span>
                </button>
                {state !== 'locked' && (
                  <Link
                    to={`/topics/${id}`}
                    className="inline-flex min-h-[44px] items-center rounded-full border border-navy px-4 text-sm font-semibold text-navy hover:bg-navy/5 hover:no-underline"
                  >
                    Open<span className="sr-only"> {t.title}</span>
                  </Link>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
