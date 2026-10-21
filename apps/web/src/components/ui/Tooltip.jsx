import { cloneElement, useId, useState } from 'react';
import { cn } from '../../lib/cn';

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
      <span
        role="tooltip"
        id={id}
        hidden={!open}
        className={cn(
          'pointer-events-none absolute left-1/2 z-50 w-max max-w-[16rem] -translate-x-1/2 rounded-xl border border-white/15 bg-navy/90 px-3 py-1.5 shadow-glass-lg backdrop-blur-md text-xs font-medium leading-snug text-white',
          side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
        )}
      >
        {content}
      </span>
    </span>
  );
}
