import { useEffect } from 'react';
import { RotateCw } from 'lucide-react';
import { REVIEW_RATINGS } from '@acet/shared';
import { cn } from '../../../lib/cn';
import { focusRing } from '../../../components/ui';

export const RATING_META = {
  again: { label: 'Again', hint: 'Forgot it', key: '1' },
  hard: { label: 'Hard', hint: 'Struggled', key: '2' },
  good: { label: 'Good', hint: 'Got it', key: '3' },
  easy: { label: 'Easy', hint: 'Instant', key: '4' },
};

/**
 * One flip card. Space or Enter flips; keys 1–4 rate once the back is showing.
 * `back` may be a node (for revision questions with options).
 */
export function Flashcard({ front, back, flipped, onFlip, onRate, busy, label = 'Flashcard' }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))
        return;
      if (!flipped && (e.key === ' ' || e.key === 'Enter') && e.target === document.body) {
        e.preventDefault();
        onFlip();
        return;
      }
      if (!flipped || busy) return;
      const rating = REVIEW_RATINGS.find((r) => RATING_META[r].key === e.key);
      if (rating) onRate(rating);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flipped, busy, onFlip, onRate]);

  return (
    <div>
      <button
        type="button"
        onClick={onFlip}
        aria-label={
          flipped
            ? `${label}: answer showing. Activate to see the question`
            : `${label}: ${front}. Activate to show the answer`
        }
        className={cn(
          'relative flex min-h-[200px] w-full flex-col items-center justify-center rounded-card border-2 p-6 text-center transition-colors',
          flipped ? 'border-gold-border bg-gold-tint' : 'border-blue bg-card',
          focusRing,
        )}
      >
        <span className="eyebrow mb-3">{flipped ? 'Answer' : 'Question'}</span>
        <span className="font-heading text-lg font-bold text-navy" aria-live="polite">
          {flipped ? back : front}
        </span>
        {!flipped && (
          <span className="mt-4 inline-flex items-center gap-1 text-xs">
            <RotateCw className="h-3.5 w-3.5" aria-hidden /> Tap or press Space to flip
          </span>
        )}
      </button>
      {flipped && (
        <div
          role="group"
          aria-label="How well did you remember?"
          className="mt-4 grid grid-cols-4 gap-2"
        >
          {REVIEW_RATINGS.map((r) => (
            <button
              key={r}
              type="button"
              disabled={busy}
              onClick={() => onRate(r)}
              className={cn(
                'flex min-h-[56px] flex-col items-center justify-center rounded-2xl border text-sm font-semibold transition-colors disabled:opacity-50',
                r === 'again'
                  ? 'border-navy bg-navy text-white hover:bg-navy-dark'
                  : 'border-line bg-card text-navy hover:border-navy',
                focusRing,
              )}
            >
              {RATING_META[r].label}
              <span
                className={cn(
                  'text-[11px] font-medium',
                  r === 'again' ? 'text-white/80' : 'text-body',
                )}
              >
                {RATING_META[r].hint} · {RATING_META[r].key}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
