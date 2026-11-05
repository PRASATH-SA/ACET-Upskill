import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronRight, Compass, X } from 'lucide-react';
import { IconButton, focusRing, toast } from '../../components/ui';
import { cn } from '../../lib/cn';
import { bouncy, soft } from '../../lib/motion';
import { matchesNav, useOnboarding } from '../../lib/onboarding';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { celebrate } from '../student/game/celebrate';

/** Progress ring around the compass: the share of pages explored. */
function Ring({ value }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <svg aria-hidden viewBox="0 0 48 48" className="absolute inset-0 h-full w-full -rotate-90">
      <circle cx="24" cy="24" r={r} fill="none" strokeWidth="3" className="stroke-white/30" />
      <motion.circle
        cx="24"
        cy="24"
        r={r}
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
        className="stroke-gold"
        strokeDasharray={c}
        initial={false}
        animate={{ strokeDashoffset: c * (1 - value) }}
        transition={soft}
      />
    </svg>
  );
}

/**
 * The first quest after the splash: open every page in the menu. Each new page ticks off with
 * confetti and a toast; all of them unlock the Explorer badge and the tracker retires.
 * @param {{ items: { to: string, label: string, icon: any, end?: boolean }[], pathname: string }} props
 */
export function ExplorerQuest({ items, pathname }) {
  const { state, explore, update } = useOnboarding();
  const explored = (state.explored ?? []).filter((to) => items.some((i) => i.to === to));
  const total = items.length;
  const count = explored.length;
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  // Phones show the quest in the bottom tabs' More sheet instead of this floating button.
  const phone = useMediaQuery('(max-width: 767px)');

  // Introduce the quest once, right after the splash.
  useEffect(() => {
    if (state.questIntroduced) return undefined;
    // The flag is saved when the panel opens: saving it first would re-run this effect and
    // cancel the timer.
    const t = setTimeout(() => {
      if (phone)
        toast.info(
          'New quest: explore SkillUp',
          'Open every page to earn the Explorer badge. Tap More to see them all.',
        );
      else setOpen(true);
      update({ questIntroduced: true });
    }, 600);
    return () => clearTimeout(t);
  }, [state.questIntroduced, update, phone]);

  // Visiting a menu page ticks it off.
  useEffect(() => {
    const item = items.find((i) => matchesNav(i, pathname));
    if (!item || !explore(item.to)) return;
    const done = useOnboarding
      .getState()
      .state.explored.filter((to) => items.some((i) => i.to === to)).length;
    if (done >= total) {
      update({ questDone: true });
      celebrate({ size: 'lg' });
      toast.success('Explorer badge unlocked!', `You visited all ${total} pages of SkillUp.`);
    } else {
      celebrate({ size: 'sm', x: 0.15, y: 0.85 });
      toast.info(`Explored: ${item.label}`, `${done} of ${total} pages. Keep going!`);
    }
  }, [pathname, items, total, explore, update]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    const onDoc = (e) => {
      if (!panelRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDoc);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDoc);
    };
  }, [open]);

  if (state.questDone || state.questHidden || total === 0 || pathname.startsWith('/topics/'))
    return null;

  return (
    <div ref={panelRef} className="no-print fixed bottom-6 right-6 z-30 hidden md:block">
      <AnimatePresence>
        {open && (
          <motion.div
            id="explorer-quest"
            role="dialog"
            aria-label="Explorer quest"
            initial={{ opacity: 0, y: 16, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.9 }}
            transition={bouncy}
            className="glass-strong absolute bottom-16 left-0 w-[min(20rem,calc(100vw-2rem))] origin-bottom-left rounded-card p-4 md:left-auto md:right-0 md:origin-bottom-right"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="eyebrow">Quest</p>
                <h2 className="mt-0.5 text-lg">Explore SkillUp</h2>
              </div>
              <IconButton icon={X} label="Close quest" onClick={() => setOpen(false)} />
            </div>
            <p className="mt-1 text-sm">
              Visit every page to earn the <strong>Explorer</strong> badge. {count} of {total} done.
            </p>
            <ul className="mt-3 space-y-1">
              {items.map((item, i) => {
                const done = explored.includes(item.to);
                return (
                  <motion.li
                    key={item.to}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ ...soft, delay: 0.04 * i }}
                  >
                    <Link
                      to={item.to}
                      onClick={() => setOpen(false)}
                      className={cn(
                        'flex min-h-[44px] items-center gap-3 rounded-md px-2 text-sm font-medium hover:bg-brand-soft hover:no-underline',
                        done ? 'text-body' : 'text-navy',
                        focusRing,
                      )}
                    >
                      <span
                        className={cn(
                          'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border',
                          done
                            ? 'border-gold-border bg-gold text-navy'
                            : 'border-line bg-card text-navy',
                        )}
                      >
                        {done ? (
                          <Check className="h-4 w-4" aria-hidden />
                        ) : (
                          <item.icon className="h-3.5 w-3.5" aria-hidden />
                        )}
                      </span>
                      <span className={cn('flex-1', done && 'line-through')}>{item.label}</span>
                      <span className="sr-only">{done ? '(explored)' : '(not explored yet)'}</span>
                      {!done && <ChevronRight className="h-4 w-4 text-brand" aria-hidden />}
                    </Link>
                  </motion.li>
                );
              })}
            </ul>
            <button
              type="button"
              onClick={() => update({ questHidden: true })}
              className={cn(
                'mt-2 min-h-[44px] w-full rounded-md text-xs font-semibold text-body hover:text-brand',
                focusRing,
              )}
            >
              Hide this quest
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        aria-expanded={open}
        aria-controls="explorer-quest"
        aria-label={`Explorer quest: ${count} of ${total} pages explored`}
        onClick={() => setOpen((o) => !o)}
        initial={{ scale: 0, rotate: -90 }}
        animate={{ scale: 1, rotate: 0 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        transition={bouncy}
        className={cn(
          'relative flex h-14 w-14 items-center justify-center rounded-full bg-navy text-white shadow-press-navy',
          focusRing,
        )}
      >
        <Ring value={total ? count / total : 0} />
        <motion.span
          animate={{ rotate: [0, -15, 15, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 2 }}
          className="inline-flex"
        >
          <Compass className="h-6 w-6" aria-hidden />
        </motion.span>
        <span
          aria-hidden
          className="absolute -right-1 -top-1 rounded-full bg-gold px-1.5 text-[11px] font-bold text-navy shadow-card"
        >
          {count}/{total}
        </span>
      </motion.button>
    </div>
  );
}
