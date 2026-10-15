import { useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Markdown } from '../../../components/Markdown';
import { Button, EyebrowHeading } from '../../../components/ui';
import { cn } from '../../../lib/cn';

/**
 * Curiosity challenge (navy panel): a real-world scenario with options. It is ungraded, so the
 * answer and explanations arrive with the page and are revealed after the student picks.
 */
export function Curiosity({ curiosity, onDone }) {
  const q = curiosity.question;
  const [picked, setPicked] = useState(null);
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="rounded-card bg-navy p-5 text-white sm:p-7">
      <EyebrowHeading
        eyebrow="Curiosity challenge"
        title={curiosity.title ?? 'What would you do?'}
        level={2}
        light
      />
      {curiosity.body && (
        <Markdown className="mt-3 text-white/90 [&_strong]:text-white">{curiosity.body}</Markdown>
      )}
      {q && (
        <fieldset className="mt-5">
          <legend className="font-semibold text-white">{q.stem}</legend>
          <div className="mt-3 grid gap-2">
            {q.options.map((opt, i) => {
              const isRight = revealed && i === q.correctIndex;
              const isWrongPick = revealed && i === picked && i !== q.correctIndex;
              return (
                <label
                  key={i}
                  className={cn(
                    'flex min-h-[48px] cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 text-sm transition-colors',
                    picked === i ? 'border-gold bg-white/10' : 'border-white/20 hover:bg-white/5',
                    isRight && 'border-gold bg-gold text-navy',
                    isWrongPick && 'border-white/40',
                    revealed && 'cursor-default',
                  )}
                >
                  <input
                    type="radio"
                    name={`curiosity-${q.id}`}
                    className="mt-1 accent-gold"
                    checked={picked === i}
                    disabled={revealed}
                    onChange={() => setPicked(i)}
                  />
                  <span className="flex-1">
                    {opt}
                    {revealed && q.optionExplanations?.[i] && (
                      <span
                        className={cn(
                          'mt-1 block text-xs',
                          isRight ? 'text-navy' : 'text-white/80',
                        )}
                      >
                        {q.optionExplanations[i]}
                      </span>
                    )}
                  </span>
                  {isRight && (
                    <CheckCircle2 className="h-5 w-5 shrink-0" aria-label="Best answer" />
                  )}
                  {isWrongPick && <XCircle className="h-5 w-5 shrink-0" aria-label="Your pick" />}
                </label>
              );
            })}
          </div>
          {!revealed ? (
            <Button
              variant="light"
              className="mt-4"
              disabled={picked === null}
              onClick={() => {
                setRevealed(true);
                onDone?.();
              }}
            >
              Reveal the answer
            </Button>
          ) : (
            <div className="mt-4 rounded-2xl bg-white/10 p-4 text-sm" role="status">
              <p className="font-semibold text-gold">
                {picked === q.correctIndex ? 'Good instinct!' : 'Not quite, and that is the point.'}
              </p>
              {q.explanation && <p className="mt-1 text-white/90">{q.explanation}</p>}
              <p className="mt-2 text-white/80">Keep reading to see why.</p>
            </div>
          )}
        </fieldset>
      )}
    </div>
  );
}
