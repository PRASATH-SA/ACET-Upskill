import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';
import { bouncy, popIn, press } from '../../lib/motion';
import { focusRing } from './Button';

// Kit tags: 6px radius, soft tint, dark text. Every pair meets WCAG AA (4.5:1) for small bold text.
const TONES = {
  neutral: 'border-line bg-surface text-navy',
  navy: 'border-navy bg-navy text-white',
  blue: 'border-brand/15 bg-brand-soft text-brand-deep',
  gold: 'border-gold-border/60 bg-gold-tint text-navy',
  red: 'border-red/25 bg-red/10 text-red-dark',
  green: 'border-success/20 bg-success-soft text-success',
  orange: 'border-warning/40 bg-warning/10 text-warning-dark',
};

/** Small status label. It pops in like a reward tag. */
export function Badge({ tone = 'neutral', icon: Icon, className, children, ...rest }) {
  return (
    <motion.span
      {...popIn}
      whileHover={{ scale: 1.08, rotate: -2 }}
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-sm border px-2 py-0.5 text-xs font-semibold',
        TONES[tone],
        className,
      )}
      {...rest}
    >
      {Icon && <Icon className="h-3.5 w-3.5" aria-hidden />}
      {children}
    </motion.span>
  );
}

/** Toggleable filter chip with `aria-pressed`. Selecting it gives a little bounce. */
export function Chip({ selected = false, onClick, icon: Icon, className, children, ...rest }) {
  return (
    <motion.button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      {...press}
      animate={{ scale: selected ? [1, 1.12, 1] : 1 }}
      transition={bouncy}
      className={cn(
        'inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-[box-shadow,background-color,border-color,color] duration-150',
        selected
          ? 'border-brand bg-brand text-white shadow-press-red-sm'
          : 'border-line bg-card text-navy hover:border-brand/40 hover:text-brand',
        focusRing,
        className,
      )}
      {...rest}
    >
      {Icon && <Icon className="h-4 w-4" aria-hidden />}
      {children}
    </motion.button>
  );
}
