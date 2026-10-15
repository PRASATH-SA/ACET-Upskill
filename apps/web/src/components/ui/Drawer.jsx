import { useId } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useOverlay } from '../../hooks/useOverlay';
import { cn } from '../../lib/cn';
import { IconButton } from './IconButton';

const SIDES = {
  right: 'inset-y-0 right-0 w-full max-w-md border-l',
  left: 'inset-y-0 left-0 w-full max-w-xs border-r',
  // Bottom sheet for mobile: the map's topic panel and the tutor use it.
  bottom: 'inset-x-0 bottom-0 max-h-[85vh] rounded-t-card border-t',
};

/** Side panel or bottom sheet with the same modal behaviour as Dialog. */
export function Drawer({ open, onClose, title, side = 'right', footer, className, children }) {
  const panelRef = useOverlay(open, onClose);
  const titleId = useId();
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-navy/40" aria-hidden onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          'absolute flex flex-col border-line bg-card focus:outline-none',
          SIDES[side],
          className,
        )}
      >
        {side === 'bottom' && (
          <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-line" aria-hidden />
        )}
        <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3">
          <h2 id={titleId} className="text-lg">
            {title}
          </h2>
          <IconButton icon={X} label="Close" onClick={onClose} className="-mr-2" />
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && <div className="border-t border-line px-5 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
