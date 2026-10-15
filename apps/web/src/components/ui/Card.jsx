import { cn } from '../../lib/cn';

const TONES = {
  default: 'border-line bg-card',
  navy: 'border-navy bg-navy text-white',
  gold: 'border-gold-border bg-gold-tint',
  surface: 'border-line bg-surface',
};

/** A.8 card: 20px radius and a 1px border instead of a heavy shadow. `tone="navy"` is the dark panel. */
export function Card({ as: As = 'section', tone = 'default', padded = true, className, ...rest }) {
  return (
    <As
      className={cn('rounded-card border', TONES[tone], padded && 'p-5 sm:p-6', className)}
      {...rest}
    />
  );
}
