import { cn } from '../../lib/cn';

/**
 * Empty, error or offline state. A.8 forbids a CTA-less screen, so pass an `action`
 * (usually a Button) whenever the user can do something next.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  tone = 'default',
}) {
  return (
    <div
      className={cn(
        'glass flex flex-col items-center rounded-card px-6 py-10 text-center',
        tone === 'error' && 'border-red/30 bg-red/[0.06]',
        className,
      )}
    >
      {Icon && (
        <span className="mb-4 inline-flex h-14 w-14 animate-float items-center justify-center rounded-2xl bg-navy text-gold shadow-press-navy">
          <Icon className="h-7 w-7" aria-hidden />
        </span>
      )}
      <h3 className="text-lg">{title}</h3>
      {description && <p className="mt-1 max-w-md text-sm">{description}</p>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  );
}
