import { useId, useRef } from 'react';
import { motion } from 'framer-motion';
import { bouncy, soft } from '../../lib/motion';
import { cn } from '../../lib/cn';
import { focusRing } from './Button';

/**
 * Accessible tabs (WAI-ARIA tabs pattern): arrow keys, Home and End move between tabs.
 * Controlled: pass `value` and `onChange`. Each tab is { value, label, content, icon?, count? }.
 */
export function Tabs({ tabs, value, onChange, label, className }) {
  const baseId = useId();
  const refs = useRef([]);
  const index = Math.max(
    0,
    tabs.findIndex((t) => t.value === value),
  );

  const move = (next) => {
    const i = (next + tabs.length) % tabs.length;
    onChange(tabs[i].value);
    refs.current[i]?.focus();
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowRight') move(index + 1);
    else if (e.key === 'ArrowLeft') move(index - 1);
    else if (e.key === 'Home') move(0);
    else if (e.key === 'End') move(tabs.length - 1);
    else return;
    e.preventDefault();
  };

  const active = tabs[index];
  return (
    <div className={className}>
      <div
        role="tablist"
        aria-label={label}
        className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-full border border-line bg-card p-1"
        onKeyDown={onKeyDown}
      >
        {tabs.map((t, i) => {
          const selected = i === index;
          const Icon = t.icon;
          return (
            <button
              key={t.value}
              ref={(el) => (refs.current[i] = el)}
              role="tab"
              type="button"
              id={`${baseId}-tab-${t.value}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${t.value}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(t.value)}
              className={cn(
                // Kit segmented tabs: a brand pill slides to the selected tab (shared layoutId).
                'relative inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors duration-200',
                selected ? 'text-white' : 'text-body hover:bg-brand-soft hover:text-brand',
                focusRing,
                'focus-visible:ring-offset-0',
              )}
            >
              {selected && (
                <motion.span
                  layoutId={`${baseId}-pill`}
                  aria-hidden
                  className="absolute inset-0 rounded-full bg-brand shadow-press-red-sm"
                  transition={bouncy}
                />
              )}
              {Icon && <Icon className="relative h-4 w-4" aria-hidden />}
              <span className="relative">{t.label}</span>
              {t.count !== undefined && (
                <span
                  className={cn(
                    'relative rounded-full px-2 text-xs',
                    selected ? 'bg-white/20 text-white' : 'bg-brand-soft text-brand-deep',
                  )}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {active && (
        <motion.div
          key={active.value}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={soft}
          role="tabpanel"
          id={`${baseId}-panel-${active.value}`}
          aria-labelledby={`${baseId}-tab-${active.value}`}
          tabIndex={0}
          className={cn('rounded-lg pt-5', focusRing)}
        >
          {active.content}
        </motion.div>
      )}
    </div>
  );
}
