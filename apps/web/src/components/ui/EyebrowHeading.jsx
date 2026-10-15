import { cn } from '../../lib/cn';

const SIZES = { 1: 'text-2xl sm:text-3xl', 2: 'text-xl sm:text-2xl', 3: 'text-lg', 4: 'text-base' };

/** Red uppercase eyebrow label above a navy Montserrat heading (A.8). `light` is for navy panels. */
export function EyebrowHeading({ eyebrow, title, level = 2, id, light, className, children }) {
  const H = `h${level}`;
  return (
    <div className={className}>
      {eyebrow && <p className={cn('eyebrow', light && 'text-gold')}>{eyebrow}</p>}
      <H id={id} className={cn(eyebrow && 'mt-1', SIZES[level] ?? SIZES[3], light && 'text-white')}>
        {title}
      </H>
      {children && <div className="mt-2">{children}</div>}
    </div>
  );
}
