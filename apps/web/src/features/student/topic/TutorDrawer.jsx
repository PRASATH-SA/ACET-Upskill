import { useRef, useState } from 'react';
import { Bot, CloudOff, Send, Sparkles } from 'lucide-react';
import { ApiError } from '../../../api/client';
import { streamSse } from '../../../api/sse';
import { Markdown } from '../../../components/Markdown';
import { Badge, Button, Drawer, Textarea } from '../../../components/ui';

export const TUTOR_MAX_QUESTION = 500;
const MAX_TURNS = 6;

/** Citation chip: jumps to the topic-page section the source came from. */
function CitationChip({ c, onJump }) {
  return (
    <button
      type="button"
      onClick={() => onJump(c.section)}
      className="inline-flex min-h-[32px] items-center gap-1 rounded-full border border-blue/30 bg-blue/10 px-3 text-xs font-semibold text-blue-dark hover:border-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue"
    >
      {c.title}
    </button>
  );
}

/**
 * "Ask why" tutor (F4 + A4). Streams tokens over SSE, then shows citations as chips that
 * scroll to the cited section. Only topic content and the question are sent (A.7.9).
 */
export function TutorDrawer({ open, onClose, topicId, topicTitle, onJump }) {
  const [turns, setTurns] = useState([]);
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [offline, setOffline] = useState(false);
  const abortRef = useRef(null);

  const ask = async (e) => {
    e.preventDefault();
    const q = question.trim();
    if (!q || busy) return;
    setQuestion('');
    setBusy(true);
    setOffline(false);
    const history = turns.slice(-MAX_TURNS).flatMap((t) => [
      { role: 'user', content: t.q },
      { role: 'assistant', content: t.a },
    ]);
    setTurns((ts) => [...ts, { q, a: '', citations: [], status: 'streaming' }]);
    const update = (fn) => setTurns((ts) => ts.map((t, i) => (i === ts.length - 1 ? fn(t) : t)));
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      await streamSse('/ai/tutor/ask', {
        method: 'POST',
        body: { topicId, question: q, history },
        signal: ctrl.signal,
        onEvent: ({ event, data }) => {
          if (event === 'token') update((t) => ({ ...t, a: t.a + (data.text ?? '') }));
          else if (event === 'done')
            update((t) => ({
              ...t,
              status: 'done',
              citations: data.citations ?? [],
              grounded: data.grounded,
              refused: data.refused,
            }));
          else if (event === 'error')
            update((t) => ({ ...t, status: 'error', error: data.message }));
        },
      });
      update((t) => (t.status === 'streaming' ? { ...t, status: 'done' } : t));
    } catch (err) {
      const isOffline =
        err instanceof ApiError
          ? [503, 404].includes(err.status) || err.code === 'AI_OFFLINE'
          : !navigator.onLine;
      if (isOffline) setOffline(true);
      const msg =
        err instanceof ApiError && err.status === 429
          ? 'You have asked a lot this hour. Try again a little later.'
          : isOffline
            ? 'The AI tutor is offline right now.'
            : err instanceof Error
              ? err.message
              : 'Something went wrong';
      update((t) => ({ ...t, status: 'error', error: msg }));
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  };

  const close = () => {
    abortRef.current?.abort();
    onClose();
  };

  return (
    <Drawer
      open={open}
      onClose={close}
      title="Ask why"
      footer={
        <form onSubmit={ask} className="space-y-2">
          <Textarea
            label={`Ask a question about ${topicTitle}`}
            rows={2}
            maxLength={TUTOR_MAX_QUESTION}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) ask(e);
            }}
            placeholder="e.g. Why do we split one table into two?"
            data-autofocus
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs">
              {question.length}/{TUTOR_MAX_QUESTION}
            </span>
            <Button type="submit" icon={Send} loading={busy} disabled={!question.trim()}>
              Ask
            </Button>
          </div>
        </form>
      }
    >
      <p className="mb-4 flex items-center gap-2 rounded-2xl bg-surface p-3 text-xs">
        <Sparkles className="h-4 w-4 shrink-0 text-navy" aria-hidden />
        AI answer from your faculty&apos;s material. Check anything important with your faculty.
      </p>
      {offline && (
        <div
          role="status"
          className="mb-4 flex items-start gap-3 rounded-2xl border border-line p-4 text-sm"
        >
          <CloudOff className="mt-0.5 h-5 w-5 shrink-0 text-navy" aria-hidden />
          <span>
            <strong className="text-navy">AI service offline.</strong> The rest of the topic page
            still works. Try again later, or ask your faculty.
          </span>
        </div>
      )}
      {turns.length === 0 && !offline && (
        <div className="flex flex-col items-center py-8 text-center">
          <Bot className="h-10 w-10 text-navy" aria-hidden />
          <p className="mt-2 font-semibold text-navy">Stuck on something?</p>
          <p className="text-sm">Ask why, and get an answer grounded in this topic.</p>
        </div>
      )}
      <ol className="space-y-5" aria-live="polite" aria-busy={busy}>
        {turns.map((t, i) => (
          <li key={i} className="space-y-2">
            <p className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-navy px-4 py-2 text-sm text-white">
              {t.q}
            </p>
            <div className="max-w-[95%] rounded-2xl rounded-bl-md border border-line bg-card px-4 py-3 text-sm">
              {t.a ? (
                <Markdown>{t.a}</Markdown>
              ) : t.status === 'streaming' ? (
                <span className="animate-pulse">Thinking…</span>
              ) : null}
              {t.status === 'error' && <p className="font-semibold text-red-dark">{t.error}</p>}
              {t.status === 'done' && t.grounded === false && !t.refused && (
                <Badge tone="orange" className="mt-2">
                  Not found in this topic&apos;s material
                </Badge>
              )}
              {t.citations?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="sr-only">Sources:</span>
                  {t.citations.map((c) => (
                    <CitationChip
                      key={`${c.kind}-${c.id}`}
                      c={c}
                      onJump={(section) => {
                        close();
                        onJump(section);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </Drawer>
  );
}
