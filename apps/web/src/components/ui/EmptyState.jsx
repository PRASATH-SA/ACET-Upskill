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
        'flex flex-col items-center rounded-card border border-dashed px-6 py-10 text-center',
        tone === 'error' ? 'border-red/40 bg-red/5' : 'border-line bg-card',
        className,
      )}
    >
      {Icon && (
        <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-navy text-white">
          <Icon className="h-6 w-6" aria-hidden />
        </span>
      )}
      <h3 className="text-lg">{title}</h3>
      {description && <p className="mt-1 max-w-md text-sm">{description}</p>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  );
}
