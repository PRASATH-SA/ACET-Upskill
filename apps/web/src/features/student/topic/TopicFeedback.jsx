import { useEffect, useId, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Lock, Pencil, Send, Star } from 'lucide-react';
import { TOPIC_RATING_MAX } from '@acet/shared';
import { Button, Card, ProgressBar, Textarea, toast } from '../../../components/ui';
import { cn } from '../../../lib/cn';
import { bouncy, soft } from '../../../lib/motion';
import { useSaveTopicFeedback } from '../api';

const RATING_LABEL = { 1: 'Needs work', 2: 'Good', 3: 'Excellent' };
const STARS = Array.from({ length: TOPIC_RATING_MAX }, (_, i) => i + 1);

/** Read-only row of stars. */
function Stars({ value, className }) {
  return (
    <span className={cn('inline-flex gap-0.5', className)} aria-hidden>
      {STARS.map((n) => (
        <Star
          key={n}
          className={cn('h-5 w-5', n <= value ? 'text-gold' : 'text-line')}
          fill="currentColor"
        />
      ))}
    </span>
  );
}

/** Three stars as a radio group: arrow keys move, and the label under them names the choice. */
function StarPicker({ value, onChange }) {
  const name = useId();
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-semibold text-navy">
        Your rating
        <span className="text-red-dark" aria-hidden>
          {' '}
          *
        </span>
      </legend>
      <div className="flex items-center gap-3">
        <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
          {STARS.map((n) => (
            <label key={n} className="cursor-pointer" onMouseEnter={() => setHover(n)}>
              <input
                type="radio"
                name={name}
                value={n}
                checked={value === n}
                onChange={() => onChange(n)}
                className="peer sr-only"
              />
              <span className="sr-only">
                {n} of {TOPIC_RATING_MAX} stars, {RATING_LABEL[n]}
              </span>
              <motion.span
                aria-hidden
                whileHover={{ scale: 1.15, rotate: -8 }}
                whileTap={{ scale: 0.85 }}
                animate={value === n ? { scale: [1, 1.3, 1] } : { scale: 1 }}
                transition={bouncy}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full peer-focus-visible:ring-2 peer-focus-visible:ring-brand peer-focus-visible:ring-offset-2"
              >
                <Star
                  className={cn(
                    'h-8 w-8 transition-colors',
                    n <= shown ? 'text-gold' : 'text-line',
                  )}
                  fill="currentColor"
                  strokeWidth={1.5}
                />
              </motion.span>
            </label>
          ))}
        </div>
        <span className="text-sm font-semibold text-navy" aria-hidden>
          {RATING_LABEL[shown] ?? 'Tap a star'}
        </span>
      </div>
    </fieldset>
  );
}

/**
 * The last card on a topic page: a 1–3 star rating with remarks. The form and its submit
 * button appear only once every step with content is done; before that the card says how
 * many steps are left. A submitted rating can be edited (sending again replaces it).
 * @param {{ topicId: string, total: number, doneCount: number, saved: object | null, onSaved: (f: object) => void }} props
 */
export function TopicFeedback({ topicId, total, doneCount, saved, onSaved }) {
  const allDone = total > 0 && doneCount >= total;
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(saved?.rating ?? 0);
  const [remarks, setRemarks] = useState(saved?.remarks ?? '');
  const save = useSaveTopicFeedback(topicId);

  // A new topic (or the saved rating arriving from the open call) resets the form.
  useEffect(() => {
    setRating(saved?.rating ?? 0);
    setRemarks(saved?.remarks ?? '');
    setEditing(false);
  }, [topicId, saved]);

  const submit = (e) => {
    e.preventDefault();
    if (!rating) return;
    save.mutate(
      { rating, remarks },
      {
        onSuccess: (f) => {
          onSaved(f);
          toast.success('Topic submitted', 'Thanks for rating this topic.');
        },
      },
    );
  };

  const view = !allDone ? 'locked' : saved && !editing ? 'saved' : 'form';
  return (
    <section id="topic-feedback" aria-labelledby="topic-feedback-h" className="no-print">
      <Card className="p-5 sm:p-6">
        <p className="eyebrow">Finish</p>
        <h2 id="topic-feedback-h" className="mt-1">
          Rate this topic
        </h2>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={soft}
            className="mt-3"
          >
            {view === 'locked' && (
              <div>
                <p className="flex items-center gap-2 text-sm">
                  <Lock className="h-4 w-4 shrink-0 text-navy" aria-hidden />
                  Finish every step to rate and submit this topic.
                </p>
                <ProgressBar
                  className="mt-3"
                  value={total ? (doneCount / total) * 100 : 0}
                  label={`${doneCount} of ${total} steps done`}
                />
              </div>
            )}

            {view === 'saved' && (
              <div>
                <p className="flex items-center gap-2 font-semibold text-navy">
                  <CheckCircle2 className="h-5 w-5 text-success" aria-hidden />
                  Submitted. You rated this topic {saved.rating} of {TOPIC_RATING_MAX}.
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <Stars value={saved.rating} />
                  <span className="text-sm font-semibold text-navy">
                    {RATING_LABEL[saved.rating]}
                  </span>
                </div>
                {saved.remarks && (
                  <blockquote className="mt-3 whitespace-pre-line border-l-2 border-brand/40 pl-3 text-sm italic">
                    {saved.remarks}
                  </blockquote>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  icon={Pencil}
                  className="mt-3"
                  onClick={() => setEditing(true)}
                >
                  Edit rating
                </Button>
              </div>
            )}

            {view === 'form' && (
              <form onSubmit={submit} className="space-y-4">
                <p className="text-sm">
                  You finished every step. How useful was this topic? Your faculty sees the ratings
                  without your name.
                </p>
                <StarPicker value={rating} onChange={setRating} />
                <Textarea
                  label="Remarks"
                  hint="Optional. What helped, or what could be clearer?"
                  rows={3}
                  maxLength={1000}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" icon={Send} disabled={!rating} loading={save.isPending}>
                    Submit
                  </Button>
                  {saved && (
                    <Button variant="ghost" onClick={() => setEditing(false)}>
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            )}
          </motion.div>
        </AnimatePresence>
      </Card>
    </section>
  );
}
