import { useId } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useOverlay } from '../../hooks/useOverlay';
import { cn } from '../../lib/cn';
import { bouncy } from '../../lib/motion';
import { IconButton } from './IconButton';

const SIDES = {
  // Side panels float off the edge with a gap so the glass reads as a separate sheet.
  right: 'inset-y-2 right-2 w-[calc(100%-1rem)] max-w-md rounded-sheet',
  left: 'inset-y-2 left-2 w-[calc(100%-1rem)] max-w-xs rounded-sheet',
  // Bottom sheet for mobile: the map's topic panel and the tutor use it.
  bottom: 'inset-x-0 bottom-0 max-h-[85vh] rounded-t-sheet',
};

/** Panels slide in from their own edge with a spring. */
const ENTER = {
  right: { x: 80, opacity: 0 },
  left: { x: -80, opacity: 0 },
  bottom: { y: 120, opacity: 0 },
};

/** Side panel or bottom sheet with the same modal behaviour as Dialog. */
export function Drawer({ open, onClose, title, side = 'right', footer, className, children }) {
  const panelRef = useOverlay(open, onClose);
  const titleId = useId();
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-navy/30 backdrop-blur-[3px]"
        aria-hidden
        onClick={onClose}
      />
      <motion.div
        initial={ENTER[side]}
        animate={{ x: 0, y: 0, opacity: 1 }}
        transition={bouncy}
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          'glass-strong absolute flex flex-col overflow-hidden focus:outline-none',
          SIDES[side],
          className,
        )}
      >
        {side === 'bottom' && (
          <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-navy/15" aria-hidden />
        )}
        <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3">
          <h2 id={titleId} className="text-lg">
            {title}
          </h2>
          <IconButton icon={X} label="Close" onClick={onClose} className="-mr-2" />
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && <div className="border-t border-line px-5 py-4">{footer}</div>}
      </motion.div>
    </div>,
    document.body,
  );
}
