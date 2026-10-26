import { Brain, Check, Dumbbell, FileText, Lightbulb, PlayCircle, Wrench } from 'lucide-react';
import { LEARNING_STEPS } from '@acet/shared';
import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';
import { bouncy, soft } from '../../lib/motion';
import { focusRing } from './Button';

/** A.1: Curiosity → Understand → Prepare → Remember → Practice → Apply. */
export const STEP_META = {
  curiosity: { label: 'Curiosity', icon: Lightbulb },
  understand: { label: 'Understand', icon: PlayCircle },
  prepare: { label: 'Prepare', icon: FileText },
  remember: { label: 'Remember', icon: Brain },
  practice: { label: 'Practice', icon: Dumbbell },
  apply: { label: 'Apply', icon: Wrench },
};

/**
 * The six learning steps, as a quest path. Done steps are gold, the current step is brand.
 * Steps pop in one by one, a step bounces when it is finished and the track fills in.
 * @param {object} props
 * @param {string} props.current          the current step
 * @param {string[]} [props.done]         finished steps
 * @param {string[]} [props.available]   steps that have content (others are shown disabled)
 * @param {(step: string) => void} [props.onSelect]
 * @param {boolean} [props.compact]      one slim row (sticky toolbars); labels hide on phones
 *                                        except the current step's
 */
export function StepTracker({ current, done = [], available, onSelect, compact, className }) {
  if (compact) return <CompactSteps {...{ current, done, available, onSelect, className }} />;
  return (
    <nav aria-label="Learning steps" className={className}>
      {/* A quest path: steps are joined by a track that turns gold as steps are finished. */}
      <ol className="flex overflow-x-auto pb-1">
        {LEARNING_STEPS.map((step, i) => {
          const meta = STEP_META[step];
          const isDone = done.includes(step);
          const isCurrent = step === current;
          const enabled = !available || available.includes(step);
          const Icon = isDone ? Check : meta.icon;
          const nextDone = done.includes(LEARNING_STEPS[i + 1]);
          return (
            <li key={step} className="relative flex min-w-[4.5rem] flex-1 items-start">
              {i < LEARNING_STEPS.length - 1 && (
                <span
                  aria-hidden
                  className="absolute left-[calc(50%+1.5rem)] right-[calc(-50%+1.5rem)] top-[1.75rem] h-1 overflow-hidden rounded-full bg-line"
                >
                  <motion.span
                    className="block h-full origin-left rounded-full bg-gold"
                    initial={false}
                    animate={{ scaleX: isDone && nextDone ? 1 : isDone ? 0.5 : 0 }}
                    transition={{ ...soft, delay: 0.1 * i }}
                  />
                </span>
              )}
              <motion.button
                type="button"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...soft, delay: 0.05 * i }}
                whileTap={enabled ? { scale: 0.9 } : undefined}
                disabled={!enabled}
                onClick={() => onSelect?.(step)}
                aria-current={isCurrent ? 'step' : undefined}
                className={cn(
                  'group flex w-full min-h-[44px] flex-col items-center gap-1.5 rounded-2xl px-1 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                  isCurrent ? 'text-brand' : 'text-navy',
                  focusRing,
                )}
              >
                <motion.span
                  // Re-keyed when the step finishes, so the gold coin bounces in.
                  key={isDone ? 'done' : 'todo'}
                  initial={isDone ? { scale: 0.4, rotate: -180 } : false}
                  animate={{ scale: 1, rotate: 0 }}
                  whileHover={enabled ? { y: -3, scale: 1.08 } : undefined}
                  transition={bouncy}
                  className={cn(
                    'relative inline-flex h-11 w-11 items-center justify-center rounded-full border',
                    isDone && 'border-gold-border bg-gold text-navy shadow-[0_3px_0_0_#C9A100]',
                    isCurrent && !isDone && 'animate-glow-pulse border-brand bg-brand text-white',
                    !isDone && !isCurrent && 'border-line bg-card text-navy',
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </motion.span>
                <span>
                  <span className="sr-only">Step {i + 1}: </span>
                  {meta.label}
                  {isDone && <span className="sr-only"> (done)</span>}
                </span>
              </motion.button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** One slim row: small coins joined by short tracks, about 40px tall. */
function CompactSteps({ current, done, available, onSelect, className }) {
  return (
    <nav aria-label="Learning steps" className={className}>
      <ol className="flex items-center">
        {LEARNING_STEPS.map((step, i) => {
          const meta = STEP_META[step];
          const isDone = done.includes(step);
          const isCurrent = step === current;
          const enabled = !available || available.includes(step);
          const Icon = isDone ? Check : meta.icon;
          const last = i === LEARNING_STEPS.length - 1;
          return (
            <li key={step} className={cn('flex items-center', !last && 'flex-1')}>
              <motion.button
                type="button"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...soft, delay: 0.04 * i }}
                whileTap={enabled ? { scale: 0.9 } : undefined}
                disabled={!enabled}
                onClick={() => onSelect?.(step)}
                aria-current={isCurrent ? 'step' : undefined}
                className={cn(
                  'flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-full px-1 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                  isCurrent ? 'text-brand' : 'text-navy',
                  focusRing,
                )}
              >
                <motion.span
                  key={isDone ? 'done' : 'todo'}
                  initial={isDone ? { scale: 0.4, rotate: -180 } : false}
                  animate={{ scale: 1, rotate: 0 }}
                  whileHover={enabled ? { scale: 1.1 } : undefined}
                  transition={bouncy}
                  className={cn(
                    'inline-flex h-7 w-7 items-center justify-center rounded-full border',
                    isDone && 'border-gold-border bg-gold text-navy',
                    isCurrent && !isDone && 'border-brand bg-brand text-white',
                    !isDone && !isCurrent && 'border-line bg-card text-navy',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                </motion.span>
                <span className={cn(!isCurrent && 'sr-only md:not-sr-only')}>
                  <span className="sr-only">Step {i + 1}: </span>
                  {meta.label}
                  {isDone && <span className="sr-only"> (done)</span>}
                </span>
              </motion.button>
              {!last && (
                <span
                  aria-hidden
                  className="mx-1.5 h-0.5 min-w-[8px] flex-1 overflow-hidden rounded-full bg-line"
                >
                  <motion.span
                    className="block h-full origin-left rounded-full bg-gold"
                    initial={false}
                    animate={{ scaleX: isDone ? 1 : 0 }}
                    transition={{ ...soft, delay: 0.08 * i }}
                  />
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
