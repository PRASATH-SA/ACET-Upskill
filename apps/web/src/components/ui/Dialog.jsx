import { useId } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useOverlay } from '../../hooks/useOverlay';
import { cn } from '../../lib/cn';
import { bouncy } from '../../lib/motion';
import { IconButton } from './IconButton';

/** The panel springs up from below and settles, like a game's reward card. */
const PANEL = {
  initial: { opacity: 0, y: 60, scale: 0.92 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: bouncy,
};

/**
 * Modal dialog: focus is trapped inside, Escape and the backdrop close it, and focus returns
 * to the opener. Put a `data-autofocus` attribute on the control that should get focus first.
 */
export function Dialog({ open, onClose, title, description, footer, size = 'md', children }) {
  const panelRef = useOverlay(open, onClose);
  const titleId = useId();
  const descId = useId();
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-navy/40 backdrop-blur-[3px]"
        aria-hidden
        onClick={onClose}
      />
      <motion.div
        {...PANEL}
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          'glass-strong flex max-h-[90vh] w-full flex-col rounded-t-sheet focus:outline-none sm:rounded-sheet',
          size === 'sm' && 'sm:max-w-sm',
          size === 'md' && 'sm:max-w-lg',
          size === 'lg' && 'sm:max-w-3xl',
          size === 'xl' && 'sm:max-w-5xl',
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
          <div>
            <h2 id={titleId} className="text-lg">
              {title}
            </h2>
            {description && (
              <p id={descId} className="mt-1 text-sm">
                {description}
              </p>
            )}
          </div>
          <IconButton icon={X} label="Close" onClick={onClose} className="-mr-2 -mt-1" />
        </div>
        <div className="overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && (
          <div className="flex flex-wrap justify-end gap-3 border-t border-line px-5 py-4 sm:px-6">
            {footer}
          </div>
        )}
      </motion.div>
    </div>,
    document.body,
  );
}
