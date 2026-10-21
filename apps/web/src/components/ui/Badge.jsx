import { cn } from '../../lib/cn';
import { focusRing } from './Button';

// Every text/background pair here meets WCAG AA (4.5:1) for small bold text.
// Glass-tinted pills. Every pair still meets WCAG AA (4.5:1) for small bold text, because the
// tints stay light and the text uses the dark support shades.
const TONES = {
  neutral: 'border-white/80 bg-white/70 text-navy',
  navy: 'border-navy bg-navy text-white',
  blue: 'border-blue/25 bg-blue/10 text-blue-dark',
  gold: 'border-gold-border/60 bg-gold-tint text-navy',
  red: 'border-red/25 bg-red/10 text-red-dark',
  green: 'border-success/25 bg-success/10 text-success',
  orange: 'border-warning/40 bg-warning/10 text-warning-dark',
};

/** Small status label. */
export function Badge({ tone = 'neutral', icon: Icon, className, children, ...rest }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold shadow-[inset_0_1px_0_rgb(255_255_255/0.7)] backdrop-blur-sm',
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
        'inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-[transform,box-shadow,background-color,border-color] duration-150 active:scale-95',
        selected
          ? 'border-navy bg-navy text-white shadow-press-navy-sm'
          : 'glass border-white/80 text-navy hover:border-navy/40',
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
