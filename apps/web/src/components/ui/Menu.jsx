import { useEffect, useId, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';
import { bouncy } from '../../lib/motion';
import { focusRing } from './Button';

/**
 * Menu button (WAI-ARIA menu pattern): Enter/Space/ArrowDown opens, arrows move,
 * Escape closes and returns focus to the trigger.
 * items: [{ label, icon?, onSelect, tone? }]
 */
export function Menu({ trigger, label, items, align = 'right' }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const triggerRef = useRef(null);
  const itemRefs = useRef([]);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    itemRefs.current[0]?.focus();
    const onDoc = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onMenuKey = (e) => {
    const els = itemRefs.current.filter(Boolean);
    const i = els.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') els[(i + 1) % els.length]?.focus();
    else if (e.key === 'ArrowUp') els[(i - 1 + els.length) % els.length]?.focus();
    else if (e.key === 'Home') els[0]?.focus();
    else if (e.key === 'End') els[els.length - 1]?.focus();
    else if (e.key === 'Escape') close();
    else if (e.key === 'Tab') setOpen(false);
    else return;
    if (e.key !== 'Tab') e.preventDefault();
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={id}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={cn('inline-flex min-h-[44px] items-center gap-2 rounded-full px-1', focusRing)}
      >
        {trigger}
      </button>
      {open && (
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={bouncy}
          style={{ transformOrigin: align === 'right' ? 'top right' : 'top left' }}
          id={id}
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKey}
          className={cn(
            'glass-strong absolute z-40 mt-2 min-w-[13rem] overflow-hidden rounded-2xl p-1.5',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {items.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.button
                key={item.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...bouncy, delay: 0.03 * i }}
                whileHover={{ x: 4 }}
                ref={(el) => (itemRefs.current[i] = el)}
                role="menuitem"
                type="button"
                tabIndex={-1}
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
                className={cn(
                  'flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3.5 text-left text-sm font-medium transition-colors hover:bg-brand-soft focus:bg-brand-soft focus:outline-none',
                  item.tone === 'danger' ? 'text-red-dark' : 'text-navy',
                )}
              >
                {Icon && <Icon className="h-4 w-4" aria-hidden />}
                {item.label}
              </motion.button>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
