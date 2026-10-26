import { useEffect } from 'react';
import { RotateCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { REVIEW_RATINGS } from '@acet/shared';
import { cn } from '../../../lib/cn';
import { focusRing } from '../../../components/ui';
import { bouncy, press } from '../../../lib/motion';

export const RATING_META = {
  again: { label: 'Again', hint: 'Forgot it', key: '1' },
  hard: { label: 'Hard', hint: 'Struggled', key: '2' },
  good: { label: 'Good', hint: 'Got it', key: '3' },
  easy: { label: 'Easy', hint: 'Instant', key: '4' },
};

/**
 * One flip card. Space or Enter flips (with a 3D turn); keys 1–4 rate once the back is showing.
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
      <motion.button
        type="button"
        onClick={onFlip}
        style={{ perspective: 1000 }}
        whileHover={{ y: -4, rotate: flipped ? 0 : -0.6 }}
        whileTap={{ scale: 0.97 }}
        transition={bouncy}
        aria-label={
          flipped
            ? `${label}: answer showing. Activate to see the question`
            : `${label}: ${front}. Activate to show the answer`
        }
        className={cn(
          'relative flex min-h-[200px] w-full flex-col items-center justify-center rounded-card border-2 p-6 text-center transition-colors',
          flipped ? 'border-gold-border bg-gold-tint' : 'border-brand bg-card shadow-card',
          focusRing,
        )}
      >
        {/* The face turns in on every flip; the button itself keeps focus. */}
        <motion.span
          key={flipped ? 'back' : 'front'}
          initial={{ rotateY: flipped ? -90 : 90, opacity: 0 }}
          animate={{ rotateY: 0, opacity: 1 }}
          transition={bouncy}
          className="flex flex-col items-center"
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
        </motion.span>
      </motion.button>
      {flipped && (
        <div
          role="group"
          aria-label="How well did you remember?"
          className="mt-4 grid grid-cols-4 gap-2"
        >
          {REVIEW_RATINGS.map((r, i) => (
            <motion.button
              key={r}
              type="button"
              initial={{ opacity: 0, y: 16, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ ...bouncy, delay: 0.05 * i }}
              {...(busy ? {} : { whileHover: press.whileHover, whileTap: press.whileTap })}
              disabled={busy}
              onClick={() => onRate(r)}
              className={cn(
                'flex min-h-[56px] flex-col items-center justify-center rounded-2xl border text-sm font-semibold transition-colors disabled:opacity-50',
                r === 'again'
                  ? 'border-navy bg-navy text-white hover:bg-navy-dark'
                  : 'border-line bg-card text-navy hover:border-brand hover:bg-brand-soft',
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
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}
