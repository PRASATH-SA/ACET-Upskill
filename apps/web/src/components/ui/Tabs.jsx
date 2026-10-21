import { useId, useRef } from 'react';
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
        className="glass flex w-fit max-w-full gap-1 overflow-x-auto rounded-full p-1"
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
                // Segmented control: the selected tab is a raised white pill with the A.8 red marker.
                'relative inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-[background-color,box-shadow,color] duration-200',
                selected
                  ? 'bg-white text-navy shadow-press-glass after:absolute after:inset-x-5 after:bottom-1 after:h-0.5 after:rounded-full after:bg-red'
                  : 'text-body hover:bg-white/50 hover:text-navy',
                focusRing,
                'focus-visible:ring-offset-0',
              )}
            >
              {Icon && <Icon className="h-4 w-4" aria-hidden />}
              {t.label}
              {t.count !== undefined && (
                <span
                  className={cn(
                    'rounded-full px-2 text-xs',
                    selected ? 'bg-navy text-white' : 'bg-navy/10 text-navy',
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
        <div
          role="tabpanel"
          id={`${baseId}-panel-${active.value}`}
          aria-labelledby={`${baseId}-tab-${active.value}`}
          tabIndex={0}
          className={cn('rounded-lg pt-5', focusRing)}
        >
          {active.content}
        </div>
      )}
    </div>
  );
}
