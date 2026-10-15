import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';

const VARIANTS = {
  // A.8: the red pill is the one primary CTA on a screen.
  primary: 'bg-red text-white hover:bg-red-dark disabled:bg-red/50',
  secondary: 'border border-navy bg-card text-navy hover:bg-navy/5 disabled:opacity-50',
  ghost: 'text-navy hover:bg-navy/5 disabled:opacity-50',
  // Navy filled: a strong action that is not the screen's primary CTA, or a CTA on a dark panel.
  navy: 'bg-navy text-white hover:bg-navy-dark disabled:opacity-50',
  light: 'bg-white text-navy hover:bg-white/90 disabled:opacity-50',
};

const SIZES = {
  sm: 'min-h-[36px] px-4 text-sm',
  md: 'min-h-[44px] px-6 text-sm',
  lg: 'min-h-[52px] px-8 text-base',
};

export const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-offset-2';

/**
 * Pill button. `as` renders another element (e.g. a router Link) with the same styles.
 * @param {object} props
 * @param {'primary'|'secondary'|'ghost'|'navy'|'light'} [props.variant]
 * @param {'sm'|'md'|'lg'} [props.size]
 * @param {boolean} [props.loading]
 * @param {any} [props.as]
 * @param {any} [props.icon]  lucide icon component
 */
export const Button = forwardRef(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled,
    as: As = 'button',
    icon: Icon,
    className,
    children,
    type,
    ...rest
  },
  ref,
) {
  const isButton = As === 'button';
  return (
    <As
      ref={ref}
      type={isButton ? (type ?? 'button') : undefined}
      disabled={isButton ? disabled || loading : undefined}
      aria-disabled={!isButton && disabled ? true : undefined}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex select-none items-center justify-center gap-2 rounded-full font-semibold transition-colors disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        focusRing,
        className,
      )}
      {...rest}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        Icon && <Icon className="h-4 w-4" aria-hidden />
      )}
      {children}
    </As>
  );
});
