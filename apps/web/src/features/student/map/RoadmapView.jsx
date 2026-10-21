import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  BookOpen,
  Brain,
  Check,
  Lock,
  Map as MapIcon,
  RotateCcw,
  Sparkles,
  Star,
  Trophy,
  X,
} from 'lucide-react';
import { Button } from '../../../components/ui';
import { cn } from '../../../lib/cn';
import { MASTERY_LABEL, STATE_LABEL } from './graph';

/** Path geometry. The column is a fixed 320px so it fits a 360px phone with 16px gutters. */
const COL = 320;
const MID = COL / 2;
const ROW = 132;
const NODE = 72;
const TOP = 100; // room for the "Start" bubble below the sticky unit banner
// A gentle S-curve, like a trail: centre, right, far right, right, centre, left, far left, left.
const SWAY = [0, 56, 84, 56, 0, -56, -84, -56];

const DONE = new Set(['mastered', 'needsRevision']);

/**
 * Node faces per state, in the A.8 map colours. Each node is a 3D "coin": a coloured face on
 * a darker bottom edge that collapses when pressed.
 */
const FACE = {
  mastered:
    'border-gold-border bg-gold text-navy shadow-[inset_0_2px_0_rgb(255_255_255/0.55),0_6px_0_0_#C9A100]',
  needsRevision:
    'border-gold-border bg-gold text-navy shadow-[inset_0_2px_0_rgb(255_255_255/0.55),0_6px_0_0_#C9A100]',
  current:
    'border-blue bg-blue text-white shadow-[inset_0_2px_0_rgb(255_255_255/0.35),0_6px_0_0_#1F4FB8]',
  unlocked:
    'border-blue bg-white/85 text-blue-dark backdrop-blur-md shadow-[inset_0_2px_0_rgb(255_255_255/0.9),0_6px_0_0_rgb(47_107_234/0.35)]',
  locked:
    'border-[#C7CCD4] bg-[#E5E7EB]/85 text-navy/70 backdrop-blur-md shadow-[inset_0_2px_0_rgb(255_255_255/0.6),0_6px_0_0_#C7CCD4]',
};
const ICON = {
  mastered: Check,
  needsRevision: RotateCcw,
  current: Star,
  unlocked: BookOpen,
  locked: Lock,
};
// Decorative orbs beside each unit's trail, alternating sides.
const ORBS = [Brain, Sparkles, MapIcon, Award];

/** Smooth vertical S-curve through the points (cubic Béziers with vertical tangents). */
function curve(a, b) {
  const my = (a.y + b.y) / 2;
  return `M ${a.x} ${a.y} C ${a.x} ${my}, ${b.x} ${my}, ${b.x} ${b.y}`;
}

/** Groups topic ids by unit (in unit order), keeping learning order inside each unit. */
function unitGroups(map, order, unitId) {
  const topicOf = new Map(map.topics.map((t) => [t.id, t]));
  return [...map.units]
    .sort((a, b) => a.number - b.number)
    .filter((u) => !unitId || u.id === unitId)
    .map((u) => ({ unit: u, ids: order.filter((id) => topicOf.get(id)?.unitId === u.id) }))
    .filter((g) => g.ids.length > 0);
}

function UnitBanner({ unit, done, total, index, onOpenMap }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="sticky top-0 z-20 px-0 pb-2 pt-3">
      <div
        className={cn(
          'relative flex items-center gap-4 overflow-hidden rounded-card border px-5 py-4 text-white',
          index % 2 === 0
            ? 'border-white/15 bg-navy/95 shadow-[inset_0_1px_0_rgb(255_255_255/0.15),0_5px_0_0_#0B2247]'
            : 'border-white/20 bg-blue shadow-[inset_0_1px_0_rgb(255_255_255/0.25),0_5px_0_0_#1F4FB8]',
          'backdrop-blur-xl',
        )}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl"
        />
        <div className="relative min-w-0 flex-1">
          <p className="eyebrow text-gold">Unit {unit.number}</p>
          <h2 className="mt-0.5 truncate text-lg text-white sm:text-xl">{unit.title}</h2>
          <div className="mt-2 flex items-center gap-3">
            <div
              role="progressbar"
              aria-label={`Unit ${unit.number} mastery`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
              className="h-2 w-28 overflow-hidden rounded-full bg-white/20 sm:w-40"
            >
              <div
                className="h-full rounded-full bg-gold transition-[width] duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-white/85">
              {done} / {total} mastered
            </span>
          </div>
        </div>
        <Button
          variant="light"
          size="sm"
          icon={MapIcon}
          onClick={onOpenMap}
          className="relative shrink-0"
        >
          <span className="sr-only sm:not-sr-only">Concept map</span>
          <span className="sr-only"> for unit {unit.number}</span>
        </Button>
      </div>
    </div>
  );
}

/** The card under a tapped node: what it is, and the one next action. */
function NodePopover({ topic, node, state, unitNumber, missing, x, onClose, onDetails }) {
  const width = 272;
  const left = Math.max(0, Math.min(COL - width, x - width / 2));
  const arrow = x - left;
  const cta =
    state === 'locked'
      ? null
      : DONE.has(state)
        ? { label: state === 'needsRevision' ? 'Revise' : 'Review', icon: RotateCcw }
        : {
            label: node?.mastery && node.mastery !== 'notStarted' ? 'Continue' : 'Start',
            icon: ArrowRight,
          };
  return (
    <div
      role="group"
      aria-label={`${topic.title} details`}
      className="glass-strong absolute z-30 animate-glass-pop rounded-3xl p-4"
      style={{ left, top: NODE + 46, width }}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <span
        aria-hidden
        className="absolute -top-2 h-4 w-4 rotate-45 rounded-sm border-l border-t border-white/80 bg-white/90"
        style={{ left: arrow - 8 }}
      />
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold">
            Unit {unitNumber} · {STATE_LABEL[state]}
            {node?.mastery && ` · ${MASTERY_LABEL[node.mastery]}`}
          </p>
          <p className="mt-0.5 font-heading text-base font-extrabold leading-snug text-navy">
            {topic.title}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="-m-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-navy hover:bg-navy/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
      {topic.summary && <p className="mt-1 line-clamp-2 text-sm">{topic.summary}</p>}
      {state === 'locked' ? (
        <p className="mt-3 flex items-start gap-2 rounded-2xl bg-navy/5 p-3 text-sm font-semibold text-navy">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          Finish {missing.join(', ') || 'the earlier topics'} first
        </p>
      ) : (
        <Button
          as={Link}
          to={`/topics/${topic.id}`}
          variant={state === 'current' ? 'primary' : 'navy'}
          icon={cta.icon}
          className="mt-3 w-full hover:no-underline"
        >
          {cta.label}
          <span className="sr-only"> {topic.title}</span>
        </Button>
      )}
      <Button variant="ghost" size="sm" onClick={onDetails} className="mt-2 w-full lg:hidden">
        Links and exam insight
      </Button>
    </div>
  );
}

function UnitTrail({
  group,
  index,
  topicOf,
  nodeOf,
  staff,
  openId,
  setOpenId,
  onSelect,
  onDetails,
  highlightId,
  startIndex,
}) {
  const { unit, ids } = group;
  const stateOf = (id) => nodeOf.get(id)?.state ?? (staff ? 'unlocked' : 'locked');
  const points = ids.map((_, i) => ({
    x: MID + SWAY[i % SWAY.length],
    y: TOP + i * ROW + NODE / 2,
  }));
  const reward = { x: MID + SWAY[ids.length % SWAY.length], y: TOP + ids.length * ROW + NODE / 2 };
  const all = [...points, reward];
  const done = ids.filter((id) => stateOf(id) === 'mastered').length;
  const complete = done === ids.length;
  const height = reward.y + NODE / 2 + 48;
  const Orb = ORBS[index % ORBS.length];

  // Segment style: walked (gold), leading into the current topic (flowing blue), ahead (grey).
  const segClass = (i) => {
    const from = stateOf(ids[i]);
    const to = i + 1 < ids.length ? stateOf(ids[i + 1]) : complete ? 'mastered' : 'locked';
    if (DONE.has(from) && DONE.has(to)) return 'stroke-gold';
    if (DONE.has(from) && to === 'current') return 'stroke-blue animate-path-flow';
    return 'stroke-navy/15';
  };

  return (
    <div className="relative mx-auto" style={{ width: COL, height }}>
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-visible"
        width={COL}
        height={height}
      >
        {all.slice(0, -1).map((p, i) => (
          <path
            key={i}
            d={curve(p, all[i + 1])}
            fill="none"
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray="2 26"
            className={segClass(i)}
          />
        ))}
      </svg>

      {/*
       * Decorative floating orbs in the empty bays of the S-curve: rows 1–3 swing right, so
       * the left bay at row 2 is free; rows 5–7 swing left, freeing the right bay at row 6.
       */}
      {[
        { row: 2, side: -1, Icon: Orb },
        { row: 6, side: 1, Icon: ORBS[(index + 1) % ORBS.length] },
      ]
        .filter((o) => ids.length > o.row)
        .map(({ row, side, Icon: OrbIcon }) => (
          <span
            key={row}
            aria-hidden
            className="glass absolute inline-flex h-20 w-20 animate-float items-center justify-center rounded-full text-navy/60"
            style={{ left: MID + side * 120 - 40, top: TOP + row * ROW - 4 }}
          >
            <OrbIcon className="h-9 w-9" />
          </span>
        ))}

      <ol aria-label={`Unit ${unit.number}: ${unit.title}`} className="absolute inset-0">
        {ids.map((id, i) => {
          const t = topicOf.get(id);
          const node = nodeOf.get(id);
          const state = stateOf(id);
          const Icon = ICON[state];
          const p = points[i];
          const open = openId === id;
          const missing = (node?.missingPrerequisites ?? [])
            .map((m) => topicOf.get(m)?.title)
            .filter(Boolean);
          return (
            <li
              key={id}
              data-path-item={id}
              className={cn('absolute', open && 'z-30')}
              style={{ left: 0, top: p.y - NODE / 2, width: COL }}
            >
              {state === 'current' && (
                <span
                  aria-hidden
                  className="absolute -top-12 z-10 animate-bob whitespace-nowrap rounded-2xl border-2 border-blue/30 bg-white px-3.5 py-1.5 font-heading text-xs font-extrabold uppercase tracking-[0.18em] text-blue-dark shadow-[0_3px_0_0_rgb(47_107_234/0.25)]"
                  style={{ left: p.x }}
                >
                  {node?.mastery && node.mastery !== 'notStarted' ? 'Continue' : 'Start'}
                  <span className="absolute -bottom-[7px] left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-blue/30 bg-white" />
                </span>
              )}
              <div
                className="absolute flex w-[150px] flex-col items-center"
                style={{ left: p.x - 75 }}
              >
                <span className="relative inline-flex">
                  {state === 'current' && (
                    <>
                      <span
                        aria-hidden
                        className="absolute -inset-2 rounded-full border-4 border-blue/25"
                      />
                      <span
                        aria-hidden
                        className="absolute inset-0 animate-ring-pulse rounded-full bg-blue/40"
                      />
                    </>
                  )}
                  <button
                    type="button"
                    data-path-topic={id}
                    data-path-state={state}
                    data-path-current={state === 'current' || undefined}
                    aria-label={`${t.title}. ${STATE_LABEL[state]}. Unit ${unit.number}`}
                    aria-expanded={open}
                    aria-current={state === 'current' ? 'step' : undefined}
                    onClick={() => {
                      setOpenId(open ? null : id);
                      onSelect(id);
                    }}
                    className={cn(
                      'relative inline-flex animate-node-in items-center justify-center rounded-full border-2 transition-[transform,box-shadow] duration-150 ease-out',
                      'hover:-translate-y-0.5 active:translate-y-[5px] active:!shadow-none',
                      'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue/40 focus-visible:ring-offset-4',
                      FACE[state],
                      highlightId === id && 'ring-4 ring-gold ring-offset-4',
                    )}
                    style={{
                      width: NODE,
                      height: NODE,
                      animationDelay: `${(startIndex + i) * 70}ms`,
                    }}
                  >
                    {/* Glossy cap highlight. */}
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-x-3 top-1.5 h-4 rounded-full bg-white/35 blur-[1px]"
                    />
                    <Icon
                      className={cn('relative h-8 w-8', state === 'current' && 'fill-white/90')}
                      aria-hidden
                    />
                    {state === 'needsRevision' && (
                      <span
                        aria-hidden
                        className="absolute -right-0.5 -top-0.5 h-5 w-5 animate-pulse rounded-full border-2 border-white bg-warning"
                      />
                    )}
                    {state === 'mastered' && (
                      <Sparkles
                        aria-hidden
                        className="absolute -right-2 -top-2 h-5 w-5 animate-float text-gold-border"
                      />
                    )}
                  </button>
                </span>
                <span
                  aria-hidden
                  className={cn(
                    'mt-3 line-clamp-2 rounded-xl bg-white/75 px-2 py-0.5 text-center text-xs font-semibold leading-snug backdrop-blur-sm',
                    state === 'locked' ? 'text-body' : 'text-navy',
                  )}
                >
                  {t.title}
                </span>
              </div>
              {open && (
                <NodePopover
                  topic={t}
                  node={node}
                  state={state}
                  unitNumber={unit.number}
                  missing={missing}
                  x={p.x}
                  onClose={() => setOpenId(null)}
                  onDetails={() => onDetails(id)}
                />
              )}
            </li>
          );
        })}
      </ol>

      {/* Unit reward: a trophy that wakes up when every topic in the unit is mastered. */}
      <div
        role="img"
        aria-label={
          complete
            ? `Unit ${unit.number} complete`
            : `Unit ${unit.number} reward: ${done} of ${ids.length} topics mastered`
        }
        className={cn(
          'absolute inline-flex animate-node-in items-center justify-center rounded-3xl border-2',
          complete
            ? 'shine animate-wobble border-gold-border bg-gold text-navy shadow-[inset_0_2px_0_rgb(255_255_255/0.55),0_6px_0_0_#C9A100,0_0_30px_rgb(245_192_0/0.5)]'
            : 'border-[#C7CCD4] bg-[#E5E7EB]/85 text-navy/50 shadow-[0_6px_0_0_#C7CCD4]',
        )}
        style={{
          width: NODE + 8,
          height: NODE + 8,
          left: reward.x - (NODE + 8) / 2,
          top: reward.y - (NODE + 8) / 2,
          animationDelay: `${(startIndex + ids.length) * 70}ms`,
        }}
      >
        <Trophy className="h-9 w-9" aria-hidden />
      </div>
    </div>
  );
}

/**
 * Duolingo-style learning path (F3 alternative view): each unit is a banner followed by a
 * winding trail of topic "coins" in learning order, ending in a unit trophy. Tapping a coin
 * opens a small card with the next action. States and colours follow A.8.
 */
export function RoadmapView({
  map,
  me,
  order,
  unitId,
  highlightId,
  onSelect,
  onDetails,
  onOpenMap,
}) {
  const [openId, setOpenId] = useState(null);
  const rootRef = useRef(null);
  const topicOf = useMemo(() => new Map(map.topics.map((t) => [t.id, t])), [map.topics]);
  const nodeOf = useMemo(() => new Map((me?.nodes ?? []).map((n) => [n.topicId, n])), [me]);
  const groups = useMemo(() => unitGroups(map, order, unitId), [map, order, unitId]);

  // Bring the current topic (or a search hit) into view.
  useEffect(() => {
    const sel = highlightId ? `[data-path-topic="${highlightId}"]` : '[data-path-current]';
    rootRef.current?.querySelector(sel)?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
  }, [highlightId, unitId]);

  // Close the popover on an outside click.
  useEffect(() => {
    if (!openId) return undefined;
    const onDoc = (e) => {
      if (e.target.closest?.('[data-path-item]')?.dataset.pathItem !== openId) setOpenId(null);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [openId]);

  let start = 0;
  return (
    <div ref={rootRef} className="mx-auto w-full max-w-xl px-4 pb-16">
      {groups.map((g, i) => {
        const done = g.ids.filter((id) => nodeOf.get(id)?.state === 'mastered').length;
        const trail = (
          <section key={g.unit.id} aria-label={`Unit ${g.unit.number}`}>
            <UnitBanner
              unit={g.unit}
              done={done}
              total={g.ids.length}
              index={i}
              onOpenMap={() => onOpenMap(g.unit.id)}
            />
            <UnitTrail
              group={g}
              index={i}
              topicOf={topicOf}
              nodeOf={nodeOf}
              staff={!me}
              openId={openId}
              setOpenId={setOpenId}
              onSelect={onSelect}
              onDetails={onDetails}
              highlightId={highlightId}
              startIndex={start}
            />
          </section>
        );
        start += g.ids.length + 1;
        return trail;
      })}
    </div>
  );
}
