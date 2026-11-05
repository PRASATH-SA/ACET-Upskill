import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';
import { soft } from '../../lib/motion';

const SIZES = { 1: 'text-2xl sm:text-3xl', 2: 'text-xl sm:text-2xl', 3: 'text-lg', 4: 'text-base' };

/**
 * Brand uppercase eyebrow label above an ink Poppins heading (ADR 0008). The eyebrow slides in,
 * then the heading rises. `light` is for the violet feature panel.
 */
export function EyebrowHeading({ eyebrow, title, level = 2, id, light, className, children }) {
  const H = motion[`h${level}`];
  return (
    <div className={className}>
      {eyebrow && (
        <motion.p
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={soft}
          className={cn('eyebrow', light && 'text-gold')}
        >
          {eyebrow}
        </motion.p>
      )}
      <H
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...soft, delay: 0.05 }}
        id={id}
        className={cn(eyebrow && 'mt-1', SIZES[level] ?? SIZES[3], light && 'text-white')}
      >
        {title}
      </H>
      {children && <div className="mt-2">{children}</div>}
    </div>
  );
}
