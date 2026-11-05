import { cloneElement, useId, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';
import { bouncy } from '../../lib/motion';

/**
 * Text tooltip on hover and keyboard focus, linked with aria-describedby.
 * Escape hides it (WCAG 1.4.13). The child must be focusable.
 */
export function Tooltip({ content, side = 'top', children }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const show = () => setOpen(true);
  const hide = () => setOpen(false);
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      onKeyDown={(e) => e.key === 'Escape' && hide()}
    >
      {cloneElement(children, { 'aria-describedby': open ? id : undefined })}
      <motion.span
        role="tooltip"
        id={id}
        hidden={!open}
        initial={false}
        animate={open ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.8, y: side === 'top' ? 6 : -6 }}
        transition={bouncy}
        style={{ x: '-50%' }}
        className={cn(
          'pointer-events-none absolute left-1/2 z-50 w-max max-w-[16rem] rounded-md bg-navy px-3 py-1.5 text-xs font-medium leading-snug text-white shadow-glass-lg',
          side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
        )}
      >
        {content}
      </motion.span>
    </span>
  );
}
