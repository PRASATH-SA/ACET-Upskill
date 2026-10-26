import { cn } from '../../lib/cn';
import { fadeUp, motionOf, spring } from '../../lib/motion';

const TONES = {
  default: 'glass',
  navy: 'glass-navy',
  gold: 'glass-gold',
  surface: 'border border-line bg-surface',
  blue: 'glass-blue',
};

/**
 * Kit card: 14px radius, white surface, 1px line hairline and shadow-card. It rises in when it
 * mounts. `tone="navy"` is the deep violet feature panel. `interactive` lifts it on hover.
 */
export function Card({
  as: As = 'section',
  tone = 'default',
  padded = true,
  interactive = false,
  className,
  ...rest
}) {
  const M = motionOf(As);
  return (
    <M
      {...fadeUp}
      {...(interactive ? { whileHover: { y: -4, scale: 1.01 }, whileTap: { scale: 0.99 } } : {})}
      transition={spring}
      className={cn(
        'rounded-card',
        TONES[tone],
        padded && 'p-4 sm:p-5',
        interactive && 'transition-[box-shadow,border-color] hover:border-brand/30 hover:shadow-glass-lg',
        className,
      )}
      {...rest}
    />
  );
}
