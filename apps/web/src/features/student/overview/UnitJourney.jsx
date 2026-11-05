import { useId, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Check, Flag, Play, Sparkles, Trophy } from 'lucide-react';
import { Badge, ProgressBar, ProgressRing, focusRing } from '../../../components/ui';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import { cn } from '../../../lib/cn';
import { bouncy, soft } from '../../../lib/motion';

/**
 * Trail geometry. Unit cards stack in normal flow on the right; the trail column on the left
 * zig-zags between `xs` and each node sits level with the middle of its card (measured), so cards
 * of any height line up. Wide = ≥640px; narrow fits a 360px phone with 16px gutters.
 */
const GEOMETRY = {
  wide: { ring: 88, xs: [60, 140], cardLeft: 224, chips: 6 },
  narrow: { ring: 64, xs: [36, 60], cardLeft: 104, chips: 3 },
};
const TOP_PAD = 76; // room for the Start bubble above the first card
const START_Y = 22;
const GUTTER_X = 6; // where dashed "skip" links bend, left of every node

/** Vertical S-curve between two points (cubic Bézier with vertical tangents). */
const curve = (a, b) => {
  const my = (a.y + b.y) / 2;
  return `M ${a.x} ${a.y} C ${a.x} ${my}, ${b.x} ${my}, ${b.x} ${b.y}`;
};

const stateOf = (u, currentId) => {
  const p = u.progress;
  if (p && p.total > 0 && p.mastered === p.total) return 'done';
  if (u.id === currentId) return 'current';
  return 'todo';
};

const COIN = {
  done: 'border-gold-border bg-gold text-navy shadow-[inset_0_2px_0_rgb(255_255_255/0.55),0_5px_0_0_#C9A100]',
  current:
    'border-blue bg-blue text-white shadow-[inset_0_2px_0_rgb(255_255_255/0.35),0_5px_0_0_#9E1360]',
  todo: 'border-blue bg-white text-blue-dark shadow-[inset_0_2px_0_rgb(255_255_255/0.9),0_5px_0_0_rgb(200_29_120/0.35)]',
};

/** The short "Keys → Indexing" label of a topic link that joins two units. */
const linkLabel = (r) => `${r.fromTopic} ${r.type === 'prerequisite' ? '→' : '↔'} ${r.toTopic}`;

function UnitNode({ unit, state, x, y, size, subjectId, delay }) {
  const p = unit.progress;
  const pct = p?.total ? (p.mastered / p.total) * 100 : 0;
  const coin = size - 18;
  return (
    <motion.div
      className="absolute z-10"
      style={{ left: x - size / 2, top: y - size / 2 }}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ ...bouncy, delay }}
    >
      {state === 'current' && (
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-full bg-blue/25"
          animate={{ scale: [1, 1.35, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
        />
      )}
      <ProgressRing
        value={pct}
        size={size}
        stroke={5}
        tone={state === 'done' ? 'gold' : 'blue'}
        label={`Unit ${unit.number} mastery`}
        className="rounded-full bg-surface"
      >
        <motion.span
          className="block"
          whileHover={{ scale: 1.08, y: -2 }}
          whileTap={{ scale: 0.92 }}
          transition={bouncy}
        >
          <Link
            to={`/learn/${subjectId}?unit=${unit.id}`}
            aria-label={`Open unit ${unit.number}, ${unit.title}, on the map`}
            className={cn(
              'flex items-center justify-center rounded-full border-2 font-heading font-extrabold hover:no-underline',
              COIN[state],
              focusRing,
            )}
            style={{ width: coin, height: coin, fontSize: coin * 0.38 }}
          >
            {state === 'done' ? <Check className="h-1/2 w-1/2" aria-hidden /> : unit.number}
          </Link>
        </motion.span>
      </ProgressRing>
    </motion.div>
  );
}

function UnitCard({ unit, state, chips, subjectId, delay }) {
  const p = unit.progress;
  const extra = unit.topics.length - chips;
  return (
    <motion.article
      aria-labelledby={`unit-${unit.id}`}
      className={cn(
        'glass rounded-card p-4',
        state === 'current' && 'ring-2 ring-blue',
        state === 'done' && 'border-gold-border bg-gold-tint',
      )}
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ ...soft, delay }}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone={state === 'done' ? 'gold' : state === 'current' ? 'blue' : 'navy'}>
          Unit {unit.number}
        </Badge>
        <Badge icon={BookOpen}>{unit.topicCount}</Badge>
        {state === 'current' && (
          <Badge tone="blue" icon={Play}>
            You are here
          </Badge>
        )}
        {state === 'done' && (
          <Badge tone="gold" icon={Check}>
            Mastered
          </Badge>
        )}
      </div>
      <h3 id={`unit-${unit.id}`} className="mt-2 line-clamp-2 text-base leading-snug sm:text-lg">
        <Link
          to={`/learn/${subjectId}?unit=${unit.id}`}
          className="text-navy hover:text-blue hover:no-underline"
        >
          {unit.title}
        </Link>
      </h3>
      {p && p.total > 0 && (
        <ProgressBar
          className="mt-2"
          value={(p.mastered / p.total) * 100}
          label={`${p.mastered}/${p.total} mastered`}
          showValue
          tone={state === 'done' ? 'gold' : 'blue'}
          size="sm"
        />
      )}
      {unit.topics.length > 0 && (
        <ul
          className="mt-3 flex max-h-[68px] flex-wrap gap-1.5 overflow-hidden"
          aria-label={`Topics in unit ${unit.number}`}
        >
          {unit.topics.slice(0, chips).map((t, i) => (
            <li key={t.id}>
              <Link
                to={`/topics/${t.id}`}
                className="inline-flex min-h-[30px] items-center gap-1.5 rounded-full border border-line bg-white py-0.5 pl-1 pr-2.5 text-xs font-semibold text-navy hover:border-blue hover:no-underline"
              >
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue/10 text-[10px] text-blue-dark">
                  {i + 1}
                </span>
                <span className="max-w-[9rem] truncate">{t.title}</span>
              </Link>
            </li>
          ))}
          {extra > 0 && <li className="self-center px-1 text-xs font-semibold">+{extra}</li>}
        </ul>
      )}
    </motion.article>
  );
}

/**
 * Measures the vertical middle of each tracked block (unit cards + finish line) and the list
 * height. Offsets are relative to the list, the positioned ancestor.
 */
function useMiddles(count) {
  const listRef = useRef(null);
  const itemRefs = useRef([]);
  const [layout, setLayout] = useState(null);
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return undefined;
    const middle = (el) => (el ? el.offsetTop + el.offsetHeight / 2 : null);
    const measure = () => {
      const ys = itemRefs.current.slice(0, count).map((el) => middle(el) ?? 0);
      setLayout((prev) => {
        const next = { ys, height: list.offsetHeight };
        return prev && prev.height === next.height && prev.ys.join() === next.ys.join()
          ? prev
          : next;
      });
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(list);
    itemRefs.current.forEach((el) => el && ro.observe(el));
    return () => ro.disconnect();
  }, [count]);
  return { listRef, itemRefs, layout };
}

/**
 * The subject's units as a visual trail: Start → Unit → Unit → Finish, joined by arrows. Solid
 * arrows lead to the next unit; dashed arrows show a unit that is needed again further on.
 * Each node opens that unit on the concept map; each card lists its topics.
 */
export function UnitJourney({ units, unitLinks, subjectId, careers = [] }) {
  const narrow = useMediaQuery('(max-width: 639px)');
  const g = narrow ? GEOMETRY.narrow : GEOMETRY.wide;
  const ids = useId().replace(/:/g, '');
  const R = g.ring / 2;
  // One tracked block per unit card, plus the finish line.
  const { listRef, itemRefs, layout } = useMiddles(units.length + 1);

  const currentId = units.find((u) => u.progress && u.progress.mastered < u.progress.total)?.id;
  const states = units.map((u) => stateOf(u, currentId));
  const index = new Map(units.map((u, i) => [u.id, i]));
  const skips = unitLinks.filter(
    (l) => l.type !== 'next' && index.has(l.fromUnitId) && index.has(l.toUnitId),
  );

  const pts = layout ? units.map((_, i) => ({ x: g.xs[i % 2], y: layout.ys[i] })) : [];
  const finish = layout ? { x: g.xs[units.length % 2], y: layout.ys[units.length] } : null;
  const segments = layout
    ? [
        {
          from: { x: g.xs[0], y: START_Y + 18 },
          to: pts[0],
          done: states[0] === 'done',
          first: true,
        },
        ...pts.slice(1).map((p, i) => ({ from: pts[i], to: p, done: states[i] === 'done' })),
        {
          from: pts[pts.length - 1],
          to: finish,
          done: states.every((s) => s === 'done'),
          finish: true,
        },
      ].map((s) => {
        // Start below the source node and stop the arrowhead just above the target.
        const a = { x: s.from.x, y: s.first ? s.from.y : s.from.y + R + 4 };
        const b = { x: s.to.x, y: s.to.y - (s.finish ? 34 : R + 8) };
        return { ...s, a, b, d: curve(a, b) };
      })
    : [];
  const step = 0.22; // stagger between trail pieces, in seconds

  return (
    <div>
      <ul
        className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-xs font-semibold text-navy"
        aria-label="Legend"
      >
        <li className="flex items-center gap-2">
          <svg width="28" height="8" aria-hidden>
            <line x1="0" y1="4" x2="28" y2="4" className="stroke-blue" strokeWidth="3" />
          </svg>
          Leads to
        </li>
        <li className="flex items-center gap-2">
          <svg width="28" height="8" aria-hidden>
            <line
              x1="0"
              y1="4"
              x2="28"
              y2="4"
              className="stroke-navy/50"
              strokeWidth="2"
              strokeDasharray="5 4"
            />
          </svg>
          Needed again later
        </li>
        <li className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-gold" aria-hidden /> Mastered
        </li>
      </ul>

      <ol
        ref={listRef}
        className="relative space-y-10"
        style={{ paddingTop: TOP_PAD, paddingLeft: g.cardLeft }}
        aria-label="Unit journey from start to finish"
      >
        {layout && (
          <svg
            className="pointer-events-none absolute left-0 top-0"
            width={g.cardLeft}
            height={layout.height}
            aria-hidden
          >
            <defs>
              {[
                ['on', 'fill-blue'],
                ['done', 'fill-gold'],
                ['skip', 'fill-navy/50'],
              ].map(([k, cls]) => (
                <marker
                  key={k}
                  id={`${ids}-${k}`}
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto-start-reverse"
                >
                  <path d="M0 0 L10 5 L0 10 z" className={cls} />
                </marker>
              ))}
            </defs>
            {/* Dotted ties from each node to its card. */}
            {pts.map((p, i) => (
              <motion.line
                key={`tie-${units[i].id}`}
                x1={p.x + R + 4}
                y1={p.y}
                x2={g.cardLeft - 6}
                y2={p.y}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="1 7"
                className={states[i] === 'done' ? 'stroke-gold' : 'stroke-blue/50'}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 + i * step }}
              />
            ))}
            {segments.map((s, i) => (
              <motion.path
                key={i}
                d={s.d}
                fill="none"
                strokeWidth={s.done ? 6 : 5}
                strokeLinecap="round"
                className={s.done ? 'stroke-gold' : 'stroke-blue'}
                markerEnd={`url(#${ids}-${s.done ? 'done' : 'on'})`}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.55, delay: 0.1 + i * step, ease: 'easeInOut' }}
              />
            ))}
            {skips.map((l, i) => {
              const a = pts[index.get(l.fromUnitId)];
              const b = pts[index.get(l.toUnitId)];
              const bend = GUTTER_X + (i % 2) * 4;
              const d = `M ${a.x - R} ${a.y} C ${bend} ${a.y}, ${bend} ${b.y}, ${b.x - R - 6} ${b.y}`;
              return (
                <motion.path
                  key={`${l.fromUnitId}-${l.toUnitId}`}
                  d={d}
                  fill="none"
                  strokeWidth="2.5"
                  strokeDasharray="6 5"
                  className="stroke-navy/50"
                  markerEnd={`url(#${ids}-skip)`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 + segments.length * step }}
                >
                  <title>
                    {l.reasons
                      .map((r) => `${linkLabel(r)}${r.reason ? `: ${r.reason}` : ''}`)
                      .join('\n')}
                  </title>
                </motion.path>
              );
            })}
          </svg>
        )}
        {units.map((u, i) => (
          <li key={u.id}>
            {layout && (
              <UnitNode
                unit={u}
                state={states[i]}
                x={pts[i].x}
                y={pts[i].y}
                size={g.ring}
                subjectId={subjectId}
                delay={0.2 + i * step}
              />
            )}
            <div
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
            >
              <UnitCard
                unit={u}
                state={states[i]}
                chips={g.chips}
                subjectId={subjectId}
                delay={0.25 + i * step}
              />
            </div>
          </li>
        ))}

        <li
          ref={(el) => {
            itemRefs.current[units.length] = el;
          }}
          className="py-2"
        >
          {layout && (
            <motion.span
              className="absolute z-10 inline-flex h-14 w-14 items-center justify-center rounded-full bg-gold text-navy shadow-[0_4px_0_0_#C9A100]"
              style={{ left: finish.x - 28, top: finish.y - 28 }}
              initial={{ opacity: 0, scale: 0.4, rotate: -30 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ ...bouncy, delay: 0.3 + units.length * step }}
            >
              <Flag className="h-6 w-6" aria-hidden />
            </motion.span>
          )}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...soft, delay: 0.35 + units.length * step }}
          >
            <p className="font-heading text-lg font-bold text-navy">Finish line</p>
            {careers.length > 0 ? (
              <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Careers that use it">
                {careers.map((c) => (
                  <li key={c}>
                    <Badge tone="gold" icon={Sparkles}>
                      {c}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 flex items-center gap-1.5 text-sm">
                <Trophy className="h-4 w-4 text-navy" aria-hidden /> The whole subject, exam ready
              </p>
            )}
          </motion.div>
        </li>

        {/* Last so the list spacing does not push the first card down. */}
        <li
          aria-hidden
          className="absolute -translate-x-1/2 rounded-full bg-navy px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-white shadow-press-navy-sm"
          style={{ left: Math.max(g.xs[0], 46), top: START_Y - 14, marginTop: 0 }}
        >
          Start
        </li>
      </ol>
    </div>
  );
}
