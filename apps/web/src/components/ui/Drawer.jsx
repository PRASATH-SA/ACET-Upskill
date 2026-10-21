import { useId } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useOverlay } from '../../hooks/useOverlay';
import { cn } from '../../lib/cn';
import { IconButton } from './IconButton';

const SIDES = {
  // Side panels float off the edge with a gap so the glass reads as a separate sheet.
  right: 'inset-y-2 right-2 w-[calc(100%-1rem)] max-w-md rounded-sheet',
  left: 'inset-y-2 left-2 w-[calc(100%-1rem)] max-w-xs rounded-sheet',
  // Bottom sheet for mobile: the map's topic panel and the tutor use it.
  bottom: 'inset-x-0 bottom-0 max-h-[85vh] rounded-t-sheet',
};

/** Side panel or bottom sheet with the same modal behaviour as Dialog. */
export function Drawer({ open, onClose, title, side = 'right', footer, className, children }) {
  const panelRef = useOverlay(open, onClose);
  const titleId = useId();
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-navy/30 backdrop-blur-[4px]"
        aria-hidden
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          'glass-strong absolute flex animate-glass-pop flex-col overflow-hidden focus:outline-none',
          SIDES[side],
          className,
        )}
      >
        {side === 'bottom' && (
          <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-navy/15" aria-hidden />
        )}
        <div className="flex items-center justify-between gap-4 border-b border-navy/[0.08] px-5 py-3">
          <h2 id={titleId} className="text-lg">
            {title}
          </h2>
          <IconButton icon={X} label="Close" onClick={onClose} className="-mr-2" />
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && <div className="border-t border-navy/[0.08] px-5 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
