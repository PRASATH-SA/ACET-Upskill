import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';
import { motionOf, press } from '../../lib/motion';

// Scale on press comes from framer-motion (`press`), so no CSS transform utilities here.
const VARIANTS = {
  // The solid brand-magenta pill is the one primary action on a screen (white on it is 5.4:1).
  // A soft shine sweeps across it, like a game's "go" button.
  primary:
    'shine bg-brand text-white shadow-cta hover:bg-brand-deep disabled:bg-brand/50 disabled:shadow-none disabled:after:hidden',
  // Signature CTA gradient for full-width bottom buttons
  // (magenta → tagline red). Keep it to large labels and prefer `primary` elsewhere.
  gradient:
    'shine bg-cta-gradient text-white shadow-cta hover:brightness-95 disabled:opacity-50 disabled:shadow-none disabled:after:hidden',
  secondary:
    'border border-line bg-card text-brand hover:border-brand/40 hover:bg-brand-soft disabled:opacity-50',
  ghost: 'text-navy hover:bg-brand-soft hover:text-brand disabled:opacity-50',
  // Ink filled: a strong action that is not the screen's primary CTA.
  navy: 'bg-navy text-white shadow-press-navy-sm hover:bg-navy-dark disabled:opacity-50',
  // White pill, for actions on the deep magenta feature panel.
  light: 'bg-white text-brand hover:bg-brand-soft disabled:opacity-50',
};

const SIZES = {
  sm: 'min-h-[36px] px-4 text-sm',
  md: 'min-h-[44px] px-6 text-sm',
  lg: 'min-h-[52px] px-8 text-base',
};

export const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2';

/**
 * Pill button with springy hover and press (framer-motion). `as` renders another element
 * (e.g. a router Link) with the same styles and motion.
 * @param {object} props
 * @param {'primary'|'gradient'|'secondary'|'ghost'|'navy'|'light'} [props.variant]
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
  const inert = disabled || loading;
  const M = motionOf(As);
  return (
    <M
      ref={ref}
      type={isButton ? (type ?? 'button') : undefined}
      disabled={isButton ? inert : undefined}
      aria-disabled={!isButton && disabled ? true : undefined}
      aria-busy={loading || undefined}
      {...(inert ? {} : press)}
      className={cn(
        'inline-flex select-none items-center justify-center gap-2 rounded-full font-semibold transition-[box-shadow,background-color,border-color,filter] duration-150 ease-out disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        focusRing,
        className,
      )}
      {...rest}
    >
      {loading ? (
        <Loader2 className="relative h-4 w-4 animate-spin" aria-hidden />
      ) : (
        Icon && <Icon className="relative h-4 w-4" aria-hidden />
      )}
      {children}
    </M>
  );
});
