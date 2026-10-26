import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';
import { bouncy, soft } from '../../lib/motion';
import { AnimatedNumber } from './AnimatedNumber';

const BAR_TONES = { blue: 'bg-blue', gold: 'bg-gold', navy: 'bg-navy', red: 'bg-red' };
const RING_TONES = { blue: '#C81D78', gold: '#F2C014', navy: '#22355E', red: '#D92D20' };

/** Determinate progress bar with an accessible name. `value` is 0–100. The fill springs to its value like an XP bar. */
export function ProgressBar({ value, label, showValue, tone = 'blue', size = 'md', className }) {
  const pct = Math.max(0, Math.min(100, Math.round(value ?? 0)));
  return (
    <div className={className}>
      {(label || showValue) && (
        <div className="mb-1.5 flex justify-between text-xs font-semibold text-navy">
          <span>{label}</span>
          {showValue && (
            <span>
              <AnimatedNumber value={pct} />%
            </span>
          )}
        </div>
      )}
      <div
        role="progressbar"
        aria-label={label ?? 'Progress'}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className={cn(
          'overflow-hidden rounded-full bg-line',
          size === 'sm' ? 'h-2' : 'h-3',
        )}
      >
        {/* Brand fill with a soft moving shine. */}
        <motion.div
          className={cn('h-full rounded-full', BAR_TONES[tone], pct > 0 && pct < 100 && 'shine')}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ ...soft, delay: 0.1 }}
        />
      </div>
    </div>
  );
}

/**
 * Circular progress, for subject cards and achievements. `value` is 0–100. The centre shows
 * `children` (or the percentage).
 */
export function ProgressRing({
  value,
  label,
  size = 56,
  stroke = 6,
  tone = 'gold',
  className,
  children,
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value ?? 0)));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div
      role="progressbar"
      aria-label={label ?? 'Progress'}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className={cn('relative inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-line"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke={RING_TONES[tone]}
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (pct / 100) * c }}
          transition={{ ...soft, delay: 0.15 }}
        />
      </svg>
      <span className="absolute font-heading text-xs font-bold text-navy">
        {children ?? (
          <>
            <AnimatedNumber value={pct} />%
          </>
        )}
      </span>
    </div>
  );
}

/** Loading placeholder. Hidden from screen readers; pair it with a status message. */
export function Skeleton({ className }) {
  return (
    <div aria-hidden className={cn('shine animate-pulse rounded-xl bg-navy/[0.07]', className)} />
  );
}

/** Loading region: skeleton lines plus a polite status for screen readers. */
export function LoadingBlock({ label = 'Loading…', lines = 3, className }) {
  return (
    <div className={cn('space-y-3', className)} role="status">
      <span className="sr-only">{label}</span>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn('h-5', i === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  );
}

/** Initials avatar on the brand-soft tint. */
export function Avatar({ name = '', size = 'md', className }) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join('') || '?';
  return (
    <motion.span
      aria-hidden
      whileHover={{ rotate: [0, -12, 12, -6, 0], scale: 1.1 }}
      transition={{ duration: 0.5 }}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-brand-soft font-heading font-semibold text-brand-deep ring-1 ring-brand/15',
        size === 'sm' && 'h-8 w-8 text-xs',
        size === 'md' && 'h-10 w-10 text-sm',
        size === 'lg' && 'h-14 w-14 text-lg',
        className,
      )}
    >
      {initials}
    </motion.span>
  );
}

const ORB_TONES = {
  default: 'bg-navy text-white shadow-press-navy-sm',
  gold: 'bg-gold text-navy shadow-[0_2px_0_0_#C9A100]',
  navy: 'bg-white/15 text-gold',
  blue: 'bg-blue text-white shadow-[0_2px_0_0_#9E1360]',
  red: 'bg-red text-white shadow-press-red-sm',
};

/** A number with a label, for dashboards. `tone` tints the tile; `accent` colours the icon orb. */
export function StatTile({ label, value, hint, icon: Icon, tone = 'default', accent, className }) {
  const isNavy = tone === 'navy';
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ y: -4 }}
      transition={soft}
      className={cn(
        'rounded-card p-5',
        tone === 'gold' ? 'glass-gold' : isNavy ? 'glass-navy' : 'glass',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className={cn('text-sm font-semibold', isNavy ? 'text-white/80' : 'text-body')}>
          {label}
        </p>
        {Icon && (
          <motion.span
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            whileHover={{ rotate: 15, scale: 1.15 }}
            transition={{ ...bouncy, delay: 0.15 }}
            className={cn(
              'inline-flex h-9 w-9 items-center justify-center rounded-xl',
              ORB_TONES[accent ?? tone] ?? ORB_TONES.default,
            )}
          >
            <Icon className="h-[18px] w-[18px]" aria-hidden />
          </motion.span>
        )}
      </div>
      <p
        className={cn(
          'mt-2 font-heading text-3xl font-bold',
          isNavy ? 'text-white' : 'text-navy',
        )}
      >
        <AnimatedNumber value={value} />
      </p>
      {hint && <p className={cn('mt-1 text-xs', isNavy ? 'text-white/80' : 'text-body')}>{hint}</p>}
    </motion.div>
  );
}
