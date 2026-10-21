import { forwardRef } from 'react';
import { cn } from '../../lib/cn';
import { focusRing } from './Button';

const VARIANTS = {
  ghost: 'text-navy hover:bg-white/70 hover:shadow-glass',
  outline: 'glass border-white/80 text-navy hover:border-navy/40',
  navy: 'bg-navy text-white shadow-press-navy-sm hover:bg-navy-dark',
  onDark: 'text-white hover:bg-white/15',
};

/** Icon-only button. `label` is required: it is the accessible name and the hover title. */
export const IconButton = forwardRef(function IconButton(
  { icon: Icon, label, variant = 'ghost', className, type = 'button', ...rest },
  ref,
) {
  if (!label) throw new Error('IconButton requires a `label` for screen readers');
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-[transform,box-shadow,background-color] duration-150 active:scale-90 disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant],
        focusRing,
        className,
      )}
      {...rest}
    >
      <Icon className="h-5 w-5" aria-hidden />
    </button>
  );
});
