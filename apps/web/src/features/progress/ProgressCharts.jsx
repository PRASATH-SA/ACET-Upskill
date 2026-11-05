import { useState } from 'react';
import { motion } from 'framer-motion';
import { CircleCheck, Eye, TriangleAlert } from 'lucide-react';
import { Card } from '../../components/ui';
import { soft } from '../../lib/motion';
import { MASTERY_LABEL } from '../student/map/graph';

/** Mastery states, strongest first: the order of every bar, donut and legend. */
export const MASTERY_ORDER = ['confident', 'practicing', 'learning', 'needsRevision', 'notStarted'];

/** Fill classes per mastery state (bars and legend dots). */
export const STATE_COLOR = {
  confident: 'bg-gold',
  practicing: 'bg-blue',
  learning: 'bg-blue/40',
  needsRevision: 'bg-warning',
  notStarted: 'bg-line',
};

/** The same colours as SVG strokes, so donuts match the bars and the concept map. */
const STATE_STROKE = {
  confident: 'stroke-gold',
  practicing: 'stroke-blue',
  learning: 'stroke-blue/40',
  needsRevision: 'stroke-warning',
  notStarted: 'stroke-line',
};

const pct = (n, total) => (total ? Math.round((n / total) * 100) : 0);

/** Donut segments for a mastery count object. "Completed" means confident (mastered). */
export function masterySegments(counts = {}) {
  return MASTERY_ORDER.map((s) => ({
    key: s,
    label: s === 'confident' ? 'Completed' : MASTERY_LABEL[s],
    value: counts[s] ?? 0,
    stroke: STATE_STROKE[s],
    dot: STATE_COLOR[s],
  }));
}

const GAP = 2; // px of card surface between segments

/**
 * A donut chart. Hovering (or focusing) a segment or its legend row puts that segment's numbers
 * in the centre and dims the rest. `center` is what the centre shows otherwise.
 */
export function Donut({ segments, size = 160, thickness = 18, center, label, active, onActive }) {
  const [own, setOwn] = useState(null);
  const current = active === undefined ? own : active;
  const setCurrent = onActive ?? setOwn;
  const total = segments.reduce((n, s) => n + s.value, 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const shown = segments.filter((s) => s.value > 0);
  const gap = shown.length > 1 ? GAP : 0;

  let start = 0;
  const arcs = shown.map((s) => {
    const len = (s.value / total) * c;
    const arc = { ...s, offset: -start, len: Math.max(len - gap, 0.5) };
    start += len;
    return arc;
  });
  const hit = current ? segments.find((s) => s.key === current) : null;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        role="img"
        aria-label={`${label}: ${segments.map((s) => `${s.label} ${s.value}`).join(', ')}`}
        className="-rotate-90 overflow-visible"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={thickness}
          className="stroke-line/60"
        />
        {arcs.map((a) => (
          <motion.circle
            key={a.key}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={current === a.key ? thickness + 4 : thickness}
            className={`${a.stroke} cursor-pointer transition-[stroke-width,opacity]`}
            style={{ opacity: current && current !== a.key ? 0.35 : 1 }}
            strokeDashoffset={a.offset}
            initial={{ strokeDasharray: `0 ${c}` }}
            animate={{ strokeDasharray: `${a.len} ${c - a.len}` }}
            transition={soft}
            onMouseEnter={() => setCurrent(a.key)}
            onMouseLeave={() => setCurrent(null)}
          >
            <title>{`${a.label}: ${a.value} (${pct(a.value, total)}%)`}</title>
          </motion.circle>
        ))}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
        {hit ? (
          <>
            <span className="font-heading text-2xl font-bold text-navy">{hit.value}</span>
            <span className="text-xs leading-tight">
              {hit.label} · {pct(hit.value, total)}%
            </span>
          </>
        ) : (
          <>
            <span className="font-heading text-2xl font-bold text-navy">{center.value}</span>
            <span className="text-xs leading-tight">{center.caption}</span>
          </>
        )}
      </div>
    </div>
  );
}

/** The legend under or beside a donut: every segment with its count and share. */
export function DonutLegend({ segments, active, onActive, className = '' }) {
  const total = segments.reduce((n, s) => n + s.value, 0);
  return (
    <ul className={`space-y-1 text-sm ${className}`}>
      {segments.map((s) => (
        <li key={s.key}>
          <button
            type="button"
            className={`flex min-h-[32px] w-full items-center gap-2 rounded-lg px-2 text-left transition-opacity hover:bg-surface ${
              active && active !== s.key ? 'opacity-50' : ''
            }`}
            onMouseEnter={() => onActive(s.key)}
            onMouseLeave={() => onActive(null)}
            onFocus={() => onActive(s.key)}
            onBlur={() => onActive(null)}
          >
            {s.icon ? (
              <s.icon className={`h-3.5 w-3.5 shrink-0 ${s.ink}`} aria-hidden />
            ) : (
              <span
                aria-hidden
                className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${s.dot}`}
              />
            )}
            <span className="flex-1">{s.label}</span>
            <strong className="text-navy">{s.value}</strong>
            <span className="w-10 text-right text-xs">{pct(s.value, total)}%</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** A donut with its legend, sharing one hover state. */
function DonutWithLegend({ segments, center, label, size = 168 }) {
  const [active, setActive] = useState(null);
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <Donut
        segments={segments}
        size={size}
        center={center}
        label={label}
        active={active}
        onActive={setActive}
      />
      <DonutLegend
        segments={segments}
        active={active}
        onActive={setActive}
        className="w-full min-w-0 sm:flex-1"
      />
    </div>
  );
}

/** "Completed 4 · Incomplete 20" under a donut. */
function CompletedLine({ counts, total }) {
  const done = counts.confident ?? 0;
  return (
    <p className="mt-3 text-xs">
      Completed <strong className="text-navy">{done}</strong> · Incomplete{' '}
      <strong className="text-navy">{Math.max(total - done, 0)}</strong>
    </p>
  );
}

/** Small donut for one subject. */
function SubjectDonut({ name, code, counts, total, caption }) {
  return (
    <li className="flex flex-col items-center rounded-card border border-line p-4 text-center">
      <Donut
        segments={masterySegments(counts)}
        size={112}
        thickness={14}
        center={{ value: `${pct(counts.confident ?? 0, total)}%`, caption: 'completed' }}
        label={`${code} ${name}`}
      />
      <p className="mt-3 line-clamp-2 text-sm font-semibold text-navy">{name}</p>
      <p className="text-xs">
        {caption ?? `${counts.confident ?? 0} of ${total} topics completed`}
      </p>
    </li>
  );
}

const sumCounts = (list, key) =>
  Object.fromEntries(MASTERY_ORDER.map((s) => [s, list.reduce((n, x) => n + (x[key][s] ?? 0), 0)]));

/**
 * One learner's progress as pie charts: every subject together (completed vs. incomplete topics,
 * split by mastery state) and one donut per subject. Used on the student's own progress page and
 * on the staff view of a student. `subjects` is the /me/progress shape.
 */
export function SubjectDonuts({ subjects }) {
  if (!subjects.length) return null;
  const counts = sumCounts(subjects, 'counts');
  const total = subjects.reduce((n, s) => n + s.totalTopics, 0);
  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <Card>
        <h3 className="text-lg">All subjects</h3>
        <p className="text-xs">
          {total} topics across {subjects.length} subjects
        </p>
        <div className="mt-4">
          <DonutWithLegend
            segments={masterySegments(counts)}
            center={{ value: `${pct(counts.confident, total)}%`, caption: 'completed' }}
            label="Topics across all subjects"
          />
        </div>
        <CompletedLine counts={counts} total={total} />
      </Card>
      <Card>
        <h3 className="text-lg">Each subject</h3>
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {subjects.map((s) => (
            <SubjectDonut
              key={s.subjectId}
              name={s.name}
              code={s.code}
              counts={s.counts}
              total={s.totalTopics}
            />
          ))}
        </ul>
      </Card>
    </div>
  );
}

/** Progress bands for "students by progress": one hue, light to dark. */
const BANDS = [
  { key: 'b0', label: 'Under 25%', min: 0, stroke: 'stroke-blue/25', dot: 'bg-blue/25' },
  { key: 'b25', label: '25–49%', min: 25, stroke: 'stroke-blue/50', dot: 'bg-blue/50' },
  { key: 'b50', label: '50–74%', min: 50, stroke: 'stroke-blue/75', dot: 'bg-blue/75' },
  { key: 'b75', label: '75% and above', min: 75, stroke: 'stroke-blue', dot: 'bg-blue' },
];

/** Student status (the report's risk level); status colours always come with an icon. */
const STATUS = [
  {
    key: 'none',
    label: 'On track',
    stroke: 'stroke-success',
    icon: CircleCheck,
    ink: 'text-success',
  },
  { key: 'medium', label: 'Watch', stroke: 'stroke-warning', icon: Eye, ink: 'text-warning-dark' },
  { key: 'high', label: 'High risk', stroke: 'stroke-red', icon: TriangleAlert, ink: 'text-red' },
];

/**
 * Faculty and HOD dashboards: the cohort as pie charts. Topics completed across all subjects,
 * students by overall progress, students by status, and one donut per subject.
 * `report` is the GET /reports/progress shape.
 */
export function CohortCharts({ report }) {
  const { summary, students, bySubject } = report;
  if (!students.length) return null;
  const states = summary.states;
  const goals = MASTERY_ORDER.reduce((n, s) => n + (states[s] ?? 0), 0);

  const bands = BANDS.map((b, i) => ({
    ...b,
    value: students.filter(
      (s) => s.progressPct >= b.min && (i === BANDS.length - 1 || s.progressPct < BANDS[i + 1].min),
    ).length,
  }));
  const status = STATUS.map((s) => ({
    ...s,
    value: students.filter((r) => r.risk.level === s.key).length,
  }));
  const onTrack = status[0].value;

  return (
    <div className="mt-6 space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <h3 className="text-lg">Topics completed</h3>
          <p className="text-xs">Every student&apos;s topics, all subjects together</p>
          <div className="mt-4">
            <DonutWithLegend
              segments={masterySegments(states)}
              size={150}
              center={{ value: `${pct(states.confident ?? 0, goals)}%`, caption: 'completed' }}
              label="Topics completed by all students"
            />
          </div>
          <CompletedLine counts={states} total={goals} />
        </Card>
        <Card>
          <h3 className="text-lg">Students by progress</h3>
          <p className="text-xs">Overall progress across their subjects</p>
          <div className="mt-4">
            <DonutWithLegend
              segments={bands}
              size={150}
              center={{
                value: `${Math.round(summary.averageProgressPct ?? 0)}%`,
                caption: 'average',
              }}
              label="Students by overall progress"
            />
          </div>
        </Card>
        <Card>
          <h3 className="text-lg">Tracking</h3>
          <p className="text-xs">Activity and revision signals</p>
          <div className="mt-4">
            <DonutWithLegend
              segments={status}
              size={150}
              center={{ value: `${pct(onTrack, students.length)}%`, caption: 'on track' }}
              label="Students by status"
            />
          </div>
        </Card>
      </div>
      {bySubject.length > 0 && (
        <Card>
          <h3 className="text-lg">Completion by subject</h3>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {bySubject.map((s) => {
              const total = MASTERY_ORDER.reduce((n, k) => n + (s.states[k] ?? 0), 0);
              return (
                <SubjectDonut
                  key={s.subjectId}
                  name={s.name}
                  code={s.code}
                  counts={s.states}
                  total={total}
                  caption={`${s.students} students · ${s.totalTopics} topics`}
                />
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
