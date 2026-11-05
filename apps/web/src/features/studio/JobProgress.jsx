import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, CircleX, Loader2, Square, TriangleAlert } from 'lucide-react';
import { post } from '../../api/client';
import { streamSse } from '../../api/sse';
import { Badge, Button, Card, ProgressBar } from '../../components/ui';
import { cn } from '../../lib/cn';

const TERMINAL = ['succeeded', 'failed', 'cancelled'];

/**
 * Follows an AI job over SSE (F6). The job id lives in the caller's URL, so a page refresh
 * reconnects and the server's `snapshot` event restores the full state and logs.
 * Reconnects with backoff if the stream drops before the job ends.
 */
export function useJobStream(jobId) {
  const [job, setJob] = useState(null);
  const [error, setError] = useState(null);
  const qc = useQueryClient();

  useEffect(() => {
    if (!jobId) return undefined;
    const ctrl = new AbortController();
    let attempt = 0;
    let done = false;
    setJob(null);
    setError(null);

    const run = async () => {
      while (!done && !ctrl.signal.aborted) {
        try {
          await streamSse(`/ai/jobs/${jobId}/events`, {
            signal: ctrl.signal,
            onEvent: ({ event, data }) => {
              attempt = 0;
              if (event === 'snapshot') setJob(data);
              else if (event === 'progress')
                setJob((j) => ({
                  ...(j ?? {}),
                  ...data,
                  logs: [...(j?.logs ?? []), ...(data.logs ?? [])],
                }));
              else if (event === 'done') {
                done = true;
                setJob((j) => ({ ...data, logs: data.logs ?? j?.logs ?? [] }));
              }
            },
          });
        } catch (err) {
          if (ctrl.signal.aborted) return;
          if (err?.status && err.status < 500) {
            setError(err);
            return;
          }
        }
        if (done) break;
        attempt += 1;
        await new Promise((r) => setTimeout(r, Math.min(10_000, 500 * 2 ** attempt)));
      }
      if (done) {
        // Whatever the job created should show up straight away.
        qc.invalidateQueries({ queryKey: ['subjects'] });
        qc.invalidateQueries({ queryKey: ['topics'] });
        qc.invalidateQueries({ queryKey: ['review-queue'] });
        qc.invalidateQueries({ queryKey: ['materials'] });
        qc.invalidateQueries({ queryKey: ['ai', 'jobs'] });
      }
    };
    run();
    return () => ctrl.abort();
  }, [jobId, qc]);

  return { job, error };
}

const STATUS = {
  queued: { label: 'Queued', tone: 'neutral', icon: Loader2 },
  running: { label: 'Running', tone: 'blue', icon: Loader2 },
  succeeded: { label: 'Done', tone: 'green', icon: CheckCircle2 },
  failed: { label: 'Failed', tone: 'red', icon: CircleX },
  cancelled: { label: 'Cancelled', tone: 'neutral', icon: Square },
};

/** Live job panel: step name, %, logs, result, and a cancel button. */
export function JobProgress({ jobId, title = 'AI job', onClose, renderResult }) {
  const { job, error } = useJobStream(jobId);
  const [cancelling, setCancelling] = useState(false);
  const logRef = useRef(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [job?.logs?.length]);

  if (!jobId) return null;
  const s = STATUS[job?.status ?? 'queued'];
  const Icon = s.icon;
  const finished = job && TERMINAL.includes(job.status);

  return (
    <Card aria-live="polite" aria-busy={!finished}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg">{title}</h2>
          <Badge tone={s.tone} icon={Icon}>
            {s.label}
          </Badge>
        </div>
        <div className="flex gap-2">
          {!finished && (
            <Button
              size="sm"
              variant="secondary"
              loading={cancelling}
              onClick={async () => {
                setCancelling(true);
                try {
                  await post(`/ai/jobs/${jobId}/cancel`);
                } finally {
                  setCancelling(false);
                }
              }}
            >
              Cancel
            </Button>
          )}
          {finished && onClose && (
            <Button size="sm" variant="ghost" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>
      {error ? (
        <p className="mt-3 text-sm font-semibold text-red-dark">
          Could not follow this job: {error.message}
        </p>
      ) : (
        <>
          <ProgressBar
            className="mt-4"
            value={job?.progress ?? 0}
            label={job?.step || 'Waiting to start'}
            showValue
          />
          {job?.status === 'succeeded' && job.result === 'needsMaterial' && (
            <p
              role="status"
              className="mt-4 flex items-start gap-2 rounded-2xl border border-warning/40 bg-warning/10 p-3 text-sm text-warning-dark"
            >
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>
                <strong>Needs material.</strong>{' '}
                {job.output?.reason ?? 'Upload notes for this topic first.'} Nothing was created.
              </span>
            </p>
          )}
          {job?.status === 'failed' && (
            <p
              role="alert"
              className="mt-4 rounded-2xl border border-red/30 bg-red/5 p-3 text-sm text-red-dark"
            >
              {job.error?.message ?? 'The job failed.'}
            </p>
          )}
          {finished && renderResult?.(job)}
          {job?.logs?.length > 0 && (
            <details className="mt-4" open={!finished}>
              <summary className="cursor-pointer text-sm font-semibold text-navy">
                Log ({job.logs.length})
              </summary>
              <ol
                ref={logRef}
                className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-xl bg-surface p-3 font-mono text-xs"
              >
                {job.logs.map((l, i) => (
                  <li
                    key={i}
                    className={cn(
                      l.level === 'error' && 'text-red-dark',
                      l.level === 'warn' && 'text-warning-dark',
                    )}
                  >
                    {new Date(l.at).toLocaleTimeString('en-IN')} · {l.message}
                  </li>
                ))}
              </ol>
            </details>
          )}
        </>
      )}
    </Card>
  );
}
