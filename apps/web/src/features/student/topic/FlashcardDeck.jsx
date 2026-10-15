import { useCallback, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';
import { get, post } from '../../../api/client';
import { Button, LoadingBlock, ProgressBar } from '../../../components/ui';
import { useSession } from '../../auth/session';
import { Flashcard } from '../practice/Flashcard';
import { keys } from '../api';

/** Inline deck on the topic page (F4 Remember step). Ratings feed the FSRS schedule. */
export function FlashcardDeck({ topicId, onDone }) {
  const isStudent = useSession((s) => s.user.role === 'student');
  const qc = useQueryClient();
  const cards = useQuery({
    queryKey: ['topics', topicId, 'flashcards'],
    queryFn: () => get(`/topics/${topicId}/flashcards`),
  });
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const rate = useMutation({
    mutationFn: ({ id, rating }) => post(`/flashcards/${id}/rate`, { rating }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.revision });
      qc.invalidateQueries({ queryKey: keys.progress });
    },
  });

  const list = cards.data ?? [];
  const card = list[index];
  const next = useCallback(() => {
    setFlipped(false);
    if (index + 1 >= list.length) onDone?.();
    setIndex(index + 1);
  }, [index, list.length, onDone]);

  const onRate = useCallback(
    (rating) => {
      if (!card) return;
      if (!isStudent) return next();
      rate.mutate({ id: card.id, rating }, { onSuccess: next });
    },
    [card, isStudent, next, rate],
  );

  if (cards.isPending) return <LoadingBlock label="Loading flashcards" />;
  if (list.length === 0) return null;
  if (!card) {
    return (
      <div
        className="flex flex-col items-center gap-3 rounded-card border border-gold-border bg-gold-tint p-6 text-center"
        role="status"
      >
        <CheckCircle2 className="h-8 w-8 text-navy" aria-hidden />
        <p className="font-heading text-lg font-bold text-navy">Deck done: {list.length} cards</p>
        <p className="text-sm">
          They will come back in Revision just before you would forget them.
        </p>
        <Button
          variant="secondary"
          onClick={() => {
            setIndex(0);
            setFlipped(false);
          }}
        >
          Go through again
        </Button>
      </div>
    );
  }
  return (
    <div>
      <ProgressBar
        value={(index / list.length) * 100}
        label={`Card ${index + 1} of ${list.length}`}
        size="sm"
        className="mb-3"
      />
      <Flashcard
        front={card.front}
        back={card.back}
        flipped={flipped}
        onFlip={() => setFlipped((f) => !f)}
        onRate={onRate}
        busy={rate.isPending}
      />
    </div>
  );
}
