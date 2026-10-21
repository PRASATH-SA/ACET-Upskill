import { Brain, Check, Dumbbell, FileText, Lightbulb, PlayCircle, Wrench } from 'lucide-react';
import { LEARNING_STEPS } from '@acet/shared';
import { cn } from '../../lib/cn';
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
 * The six learning steps. Done steps are gold, the current step is blue (A.8).
 * @param {object} props
 * @param {string} props.current          the current step
 * @param {string[]} [props.done]         finished steps
 * @param {string[]} [props.available]   steps that have content (others are shown disabled)
 * @param {(step: string) => void} [props.onSelect]
 */
export function StepTracker({ current, done = [], available, onSelect, className }) {
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
                  className={cn(
                    'absolute left-[calc(50%+1.5rem)] right-[calc(-50%+1.5rem)] top-[1.75rem] h-1 rounded-full',
                    isDone && nextDone ? 'bg-gold' : isDone ? 'bg-gold/40' : 'bg-navy/10',
                  )}
                />
              )}
              <button
                type="button"
                disabled={!enabled}
                onClick={() => onSelect?.(step)}
                aria-current={isCurrent ? 'step' : undefined}
                className={cn(
                  'group flex w-full min-h-[44px] flex-col items-center gap-1.5 rounded-2xl px-1 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                  isCurrent ? 'text-blue-dark' : 'text-navy',
                  focusRing,
                )}
              >
                <span
                  className={cn(
                    'relative inline-flex h-11 w-11 items-center justify-center rounded-full border transition-transform duration-200 group-enabled:group-hover:-translate-y-0.5',
                    isDone && 'border-gold-border bg-gold text-navy shadow-[0_3px_0_0_#C9A100]',
                    isCurrent && !isDone && 'animate-glow-pulse border-blue bg-blue text-white',
                    !isDone && !isCurrent && 'glass border-white/80 text-navy',
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span>
                  <span className="sr-only">Step {i + 1}: </span>
                  {meta.label}
                  {isDone && <span className="sr-only"> (done)</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
