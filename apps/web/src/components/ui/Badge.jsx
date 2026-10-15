import { cn } from '../../lib/cn';
import { focusRing } from './Button';

// Every text/background pair here meets WCAG AA (4.5:1) for small bold text.
const TONES = {
  neutral: 'border-line bg-surface text-navy',
  navy: 'border-navy bg-navy text-white',
  blue: 'border-blue/30 bg-blue/10 text-blue-dark',
  gold: 'border-gold-border bg-gold-tint text-navy',
  red: 'border-red/30 bg-red/10 text-red-dark',
  green: 'border-success/30 bg-success/10 text-success',
  orange: 'border-warning/40 bg-warning/10 text-warning-dark',
};

/** Small status label. */
export function Badge({ tone = 'neutral', icon: Icon, className, children, ...rest }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        TONES[tone],
        className,
      )}
      {...rest}
    >
      {Icon && <Icon className="h-3.5 w-3.5" aria-hidden />}
      {children}
    </span>
  );
}

/** Toggleable filter chip with `aria-pressed`. */
export function Chip({ selected = false, onClick, icon: Icon, className, children, ...rest }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors',
        selected
          ? 'border-navy bg-navy text-white'
          : 'border-line bg-card text-navy hover:border-navy',
        focusRing,
        className,
      )}
      {...rest}
    >
      {Icon && <Icon className="h-4 w-4" aria-hidden />}
      {children}
    </button>
  );
}
