import { cn } from '../../lib/cn';

const BAR_TONES = { blue: 'bg-blue', gold: 'bg-gold', navy: 'bg-navy', red: 'bg-red' };

/** Determinate progress bar with an accessible name. `value` is 0–100. */
export function ProgressBar({ value, label, showValue, tone = 'blue', size = 'md', className }) {
  const pct = Math.max(0, Math.min(100, Math.round(value ?? 0)));
  return (
    <div className={className}>
      {(label || showValue) && (
        <div className="mb-1 flex justify-between text-xs font-semibold text-navy">
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
        className={cn('overflow-hidden rounded-full bg-line', size === 'sm' ? 'h-1.5' : 'h-2.5')}
      >
        <div
          className={cn('h-full rounded-full transition-[width] duration-500', BAR_TONES[tone])}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/** Loading placeholder. Hidden from screen readers; pair it with a status message. */
export function Skeleton({ className }) {
  return <div aria-hidden className={cn('animate-pulse rounded-xl bg-line', className)} />;
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

/** Initials avatar. */
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
        'inline-flex shrink-0 items-center justify-center rounded-full bg-navy font-heading font-bold text-white',
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

/** A number with a label, for dashboards. */
export function StatTile({ label, value, hint, icon: Icon, tone = 'default', className }) {
  return (
    <div
      className={cn(
        'rounded-card border p-5',
        tone === 'gold' ? 'border-gold-border bg-gold-tint' : 'border-line bg-card',
        tone === 'navy' && 'border-navy bg-navy',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className={cn('text-sm font-semibold', tone === 'navy' ? 'text-white/80' : 'text-body')}>
          {label}
        </p>
        {Icon && (
          <Icon
            className={cn('h-5 w-5', tone === 'navy' ? 'text-gold' : 'text-navy')}
            aria-hidden
          />
        )}
      </div>
      <p
        className={cn(
          'mt-2 font-heading text-3xl font-extrabold',
          tone === 'navy' ? 'text-white' : 'text-navy',
        )}
      >
        {value}
      </p>
      {hint && (
        <p className={cn('mt-1 text-xs', tone === 'navy' ? 'text-white/80' : 'text-body')}>
          {hint}
        </p>
      )}
    </div>
  );
}
