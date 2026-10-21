import { cn } from '../../lib/cn';

const BAR_TONES = { blue: 'bg-blue', gold: 'bg-gold', navy: 'bg-navy', red: 'bg-red' };
const RING_TONES = { blue: '#2F6BEA', gold: '#F5C000', navy: '#0F2D5C', red: '#E0262B' };

/** Determinate progress bar with an accessible name. `value` is 0–100. */
export function ProgressBar({ value, label, showValue, tone = 'blue', size = 'md', className }) {
  const pct = Math.max(0, Math.min(100, Math.round(value ?? 0)));
  return (
    <div className={className}>
      {(label || showValue) && (
        <div className="mb-1.5 flex justify-between text-xs font-semibold text-navy">
          <span>{label}</span>
          {showValue && <span>{pct}%</span>}
        </div>
      )}
      <div
        role="progressbar"
        aria-label={label ?? 'Progress'}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className={cn(
          'overflow-hidden rounded-full bg-navy/[0.08] shadow-[inset_0_1px_2px_rgb(15_45_92/0.12)]',
          size === 'sm' ? 'h-2' : 'h-3',
        )}
      >
        {/* Glossy fill with a moving shine, like an XP bar. */}
        <div
          className={cn(
            'h-full rounded-full bg-[linear-gradient(180deg,rgb(255_255_255/0.45),rgb(255_255_255/0)_60%)] transition-[width] duration-700 ease-out',
            BAR_TONES[tone],
            pct > 0 && pct < 100 && 'shine',
          )}
          style={{ width: `${pct}%` }}
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
          className="stroke-navy/10"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke={RING_TONES[tone]}
          strokeDasharray={c}
          strokeDashoffset={c - (pct / 100) * c}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <span className="absolute font-heading text-xs font-extrabold text-navy">
        {children ?? `${pct}%`}
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

/** Initials avatar with a glass ring. */
export function Avatar({ name = '', size = 'md', className }) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join('') || '?';
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-navy font-heading font-bold text-gold ring-2 ring-white/80 shadow-glass',
        size === 'sm' && 'h-8 w-8 text-xs',
        size === 'md' && 'h-10 w-10 text-sm',
        size === 'lg' && 'h-14 w-14 text-lg',
        className,
      )}
    >
      {initials}
    </span>
  );
}

const ORB_TONES = {
  default: 'bg-navy text-white shadow-press-navy-sm',
  gold: 'bg-gold text-navy shadow-[0_2px_0_0_#C9A100]',
  navy: 'bg-white/15 text-gold',
  blue: 'bg-blue text-white shadow-[0_2px_0_0_#1F4FB8]',
  red: 'bg-red text-white shadow-press-red-sm',
};

/** A number with a label, for dashboards. `tone` tints the tile; `accent` colours the icon orb. */
export function StatTile({ label, value, hint, icon: Icon, tone = 'default', accent, className }) {
  const isNavy = tone === 'navy';
  return (
    <div
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
          <span
            className={cn(
              'inline-flex h-9 w-9 items-center justify-center rounded-xl',
              ORB_TONES[accent ?? tone] ?? ORB_TONES.default,
            )}
          >
            <Icon className="h-[18px] w-[18px]" aria-hidden />
          </span>
        )}
      </div>
      <p
        className={cn(
          'mt-2 font-heading text-3xl font-extrabold',
          isNavy ? 'text-white' : 'text-navy',
        )}
      >
        {value}
      </p>
      {hint && <p className={cn('mt-1 text-xs', isNavy ? 'text-white/80' : 'text-body')}>{hint}</p>}
    </div>
  );
}
