import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';
import { bouncy, fadeUp } from '../../lib/motion';

/**
 * Empty, error or offline state. Never leave a screen without a next step, so pass an `action`
 * (usually a Button) whenever the user can do something next. The icon bounces in and floats.
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
    <motion.div
      {...fadeUp}
      className={cn(
        'glass flex flex-col items-center rounded-card px-6 py-10 text-center',
        tone === 'error' && 'border-red/30 bg-red/[0.06]',
        className,
      )}
    >
      {Icon && (
        <motion.span
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ ...bouncy, delay: 0.1 }}
          whileHover={{ rotate: [0, -10, 10, -6, 0], transition: { duration: 0.5 } }}
          className={cn(
            'mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl text-white',
            tone === 'error' ? 'bg-red shadow-press-navy-sm' : 'bg-brand shadow-cta',
          )}
        >
          <Icon className="h-7 w-7 animate-float" aria-hidden />
        </motion.span>
      )}
      <h3 className="text-lg">{title}</h3>
      {description && <p className="mt-1 max-w-md text-sm">{description}</p>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-3">{action}</div>}
    </motion.div>
  );
}
