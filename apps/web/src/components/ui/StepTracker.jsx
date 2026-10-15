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
      <ol className="flex gap-1 overflow-x-auto pb-1 sm:gap-2">
        {LEARNING_STEPS.map((step, i) => {
          const meta = STEP_META[step];
          const isDone = done.includes(step);
          const isCurrent = step === current;
          const enabled = !available || available.includes(step);
          const Icon = isDone ? Check : meta.icon;
          return (
            <li key={step} className="flex min-w-[4.5rem] flex-1 items-center">
              <button
                type="button"
                disabled={!enabled}
                onClick={() => onSelect?.(step)}
                aria-current={isCurrent ? 'step' : undefined}
                className={cn(
                  'flex w-full min-h-[44px] flex-col items-center gap-1 rounded-xl px-1 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                  isCurrent ? 'text-blue' : 'text-navy hover:bg-navy/5',
                  focusRing,
                )}
              >
                <span
                  className={cn(
                    'inline-flex h-9 w-9 items-center justify-center rounded-full border-2',
                    isDone && 'border-gold-border bg-gold text-navy',
                    isCurrent && !isDone && 'border-blue bg-blue text-white',
                    !isDone && !isCurrent && 'border-line bg-card text-navy',
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
