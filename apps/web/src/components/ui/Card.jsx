import { cn } from '../../lib/cn';

const TONES = {
  default: 'glass',
  navy: 'glass-navy',
  gold: 'glass-gold',
  surface: 'glass border-white/60 bg-white/40',
  blue: 'glass-blue',
};

/**
 * Liquid-glass card: 28px radius, translucent fill, light rim and soft elevation.
 * `tone="navy"` is the dark panel. `interactive` lifts the card on hover (for link cards).
 */
export function Card({
  as: As = 'section',
  tone = 'default',
  padded = true,
  interactive = false,
  className,
  ...rest
}) {
  return (
    <As
      className={cn(
        'rounded-card',
        TONES[tone],
        padded && 'p-5 sm:p-6',
        interactive && 'glass-hover',
        className,
      )}
      {...rest}
    />
  );
}
