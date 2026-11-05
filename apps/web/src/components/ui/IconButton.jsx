import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';
import { pressSmall } from '../../lib/motion';
import { focusRing } from './Button';

const VARIANTS = {
  ghost: 'text-navy hover:bg-brand-soft hover:text-brand',
  outline: 'border border-line bg-card text-navy hover:border-brand/40 hover:text-brand',
  navy: 'bg-navy text-white shadow-press-navy-sm hover:bg-navy-dark',
  onDark: 'text-white hover:bg-white/15',
};

/** Icon-only button with a springy press. `label` is required: it is the accessible name and the hover title. */
export const IconButton = forwardRef(function IconButton(
  { icon: Icon, label, variant = 'ghost', className, type = 'button', disabled, ...rest },
  ref,
) {
  if (!label) throw new Error('IconButton requires a `label` for screen readers');
  return (
    <motion.button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      disabled={disabled}
      {...(disabled ? {} : pressSmall)}
      className={cn(
        'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-[box-shadow,background-color,color] duration-150 disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant],
        focusRing,
        className,
      )}
      {...rest}
    >
      <Icon className="h-5 w-5" aria-hidden />
    </motion.button>
  );
});
