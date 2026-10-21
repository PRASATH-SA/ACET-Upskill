import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ClipboardCheck, ExternalLink, Keyboard, XCircle } from 'lucide-react';
import { get, patch, post } from '../../api/client';
import { Markdown } from '../../components/Markdown';
import { Page } from '../../components/layout/AppShell';
import {
  Button,
  Card,
  Dialog,
  EmptyState,
  EyebrowHeading,
  Input,
  LoadingBlock,
  Select,
  Textarea,
  toast,
} from '../../components/ui';
import { cn } from '../../lib/cn';
import { useSession } from '../auth/session';
import { useSubjects } from '../student/api';
import { MarkdownField, QuestionForm } from './content/editors';
import { ItemBadges } from './content/ItemStatus';

const TYPE_PATH = {
  resource: 'resources',
  flashcard: 'flashcards',
  question: 'questions',
  pyq: 'pyqs',
  rubric: 'rubrics',
  challenge: 'code-challenges',
};
const KIND_OPTIONS = [
  ['easy', 'Easy explanation'],
  ['tenMark', '10-mark answer'],
  ['curiosity', 'Curiosity'],
  ['realWorld', 'Real world'],
  ['workshop', 'Workshop brief'],
  ['video', 'Video'],
  ['flashcard', 'Flashcards'],
  ['question', 'Questions'],
  ['pyq', 'PYQs'],
  ['rubric', 'Explain-it-back rubrics'],
  ['challenge', 'Code problems'],
].map(([value, label]) => ({ value, label }));

function useQueue(filters, page) {
  return useQuery({
    queryKey: ['review-queue', { ...filters, page }],
    queryFn: () =>
      get('/review-queue', {
        query: { ...filters, page, limit: 25 },
        withMeta: true,
      }),
    placeholderData: (prev) => prev,
  });
}

/** Full item for the detail pane (PYQs show their queue preview). */
function useItem(row) {
  return useQuery({
    queryKey: ['review-item', row?.type, row?.id],
    queryFn: () => get(`/${TYPE_PATH[row.type]}/${row.id}`),
    enabled: Boolean(row) && row.type !== 'pyq',
  });
}

function SourceChunks({ ids }) {
  const chunks = useQuery({
    queryKey: ['ai', 'chunks', ids],
    queryFn: () => get('/ai/chunks', { query: { ids: ids.join(',') } }),
    enabled: ids.length > 0,
  });
  if (!ids.length) return <p className="text-sm">Faculty-written: no AI sources.</p>;
  if (chunks.isPending) return <LoadingBlock lines={3} />;
  return (
    <ol className="space-y-3">
      {(chunks.data ?? []).map((c, i) => (
        <li key={c.id} className="rounded-2xl border border-gold-border bg-gold-tint p-3 text-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-navy">
            Source {i + 1} · {c.fileName}
            {c.heading && ` · ${c.heading}`}
          </p>
          <p className="mt-1 whitespace-pre-line">{c.text}</p>
        </li>
      ))}
    </ol>
  );
}

function ItemEditor({ row, item, onSaved }) {
  const qc = useQueryClient();
  const [body, setBody] = useState(item.body ?? '');
  const [front, setFront] = useState(item.front ?? '');
  const [back, setBack] = useState(item.back ?? '');
  const save = useMutation({
    mutationFn: (b) => patch(`/${TYPE_PATH[row.type]}/${row.id}`, b),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['review-item', row.type, row.id] });
      onSaved();
    },
  });
  if (row.type === 'question') {
    return (
      <QuestionForm
        initial={item}
        saving={save.isPending}
        submitLabel="Save and approve"
        onSubmit={(b) => save.mutate(b)}
      />
    );
  }
  if (row.type === 'flashcard') {
    return (
      <div className="space-y-3">
        <Input label="Front" value={front} onChange={(e) => setFront(e.target.value)} />
        <Textarea label="Back" rows={3} value={back} onChange={(e) => setBack(e.target.value)} />
        <Button
          size="sm"
          variant="navy"
          loading={save.isPending}
          onClick={() => save.mutate({ front, back })}
        >
          Save and approve
        </Button>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <MarkdownField label="Body" value={body} onChange={setBody} />
      <Button
        size="sm"
        variant="navy"
        loading={save.isPending}
        onClick={() => save.mutate({ body })}
      >
        Save and approve
      </Button>
    </div>
  );
}

function ItemView({ row, item }) {
  if (row.type === 'pyq' || !item) return <p className="text-navy">{row.preview}</p>;
  if (row.type === 'flashcard') {
    return (
      <div className="space-y-2">
        <p className="font-semibold text-navy">{item.front}</p>
        <p>{item.back}</p>
      </div>
    );
  }
  if (row.type === 'challenge') {
    return (
      <div className="space-y-3">
        <p className="font-semibold text-navy">
          {item.title} <span className="text-xs font-normal text-body">({item.difficulty})</span>
        </p>
        <Markdown>{item.prompt}</Markdown>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-navy">Reference solution</p>
          <pre className="mt-1 overflow-x-auto rounded-xl bg-navy p-3 font-mono text-xs text-white">
            {item.solution}
          </pre>
        </div>
        <Link to={`/code/${item.id}`} className="text-sm">
          Try it as a student
        </Link>
      </div>
    );
  }
  if (row.type === 'rubric') {
    return (
      <div>
        <p className="font-semibold text-navy">{item.prompt}</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          {item.criteria.map((c) => (
            <li key={c.id}>
              {c.text} <span className="text-body">({c.points} pts)</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-sm">Pass mark: {item.passScore}</p>
      </div>
    );
  }
  if (row.type === 'question') {
    return (
      <div>
        <p className="font-semibold text-navy">{item.stem}</p>
        <ol className="mt-2 list-[upper-alpha] space-y-1 pl-6 text-sm">
          {item.options.map((o, i) => (
            <li key={i} className={i === item.correctIndex ? 'font-semibold text-success' : ''}>
              {o}
              {i === item.correctIndex && ' ✓'}
              {item.optionExplanations?.[i] && (
                <span className="block text-xs font-normal text-body">
                  {item.optionExplanations[i]}
                </span>
              )}
            </li>
          ))}
        </ol>
        {item.explanation && <p className="mt-2 text-sm">{item.explanation}</p>}
      </div>
    );
  }
  return (
    <div>
      {item.title && <p className="mb-2 font-semibold text-navy">{item.title}</p>}
      {item.url && <a href={item.url}>{item.url}</a>}
      {item.body && <Markdown>{item.body}</Markdown>}
    </div>
  );
}

/** /studio/review — drafts across my subjects (F6.4). */
export function ReviewQueue() {
  const role = useSession((s) => s.user.role);
  const canApprove = role === 'faculty';
  const [params, setParams] = useSearchParams();
  const filters = useMemo(
    () => ({
      subjectId: params.get('subjectId') ?? undefined,
      kind: params.get('kind') ?? undefined,
      source: params.get('source') ?? undefined,
      needsAttention: params.get('needsAttention') ?? undefined,
    }),
    [params],
  );
  const [page, setPage] = useState(1);
  const queue = useQueue(filters, page);
  const subjects = useSubjects();
  const qc = useQueryClient();
  const rows = useMemo(() => queue.data?.data ?? [], [queue.data]);
  const [index, setIndex] = useState(0);
  const [checked, setChecked] = useState(new Set());
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState('');
  const [editing, setEditing] = useState(false);
  const [help, setHelp] = useState(false);
  const row = rows[Math.min(index, rows.length - 1)];
  const item = useItem(row);

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
    setPage(1);
    setIndex(0);
    setChecked(new Set());
  };

  const act = useMutation({
    mutationFn: ({ action, items, reason: why }) =>
      post('/review-queue/bulk', { action, items, reason: why }),
    onSuccess: (_d, v) => {
      toast.success(
        v.action === 'reject'
          ? `Rejected ${v.items.length}`
          : `Approved and published ${v.items.length}`,
        v.action === 'reject' ? undefined : 'Students can see it now.',
      );
      setChecked(new Set());
      setEditing(false);
      qc.invalidateQueries({ queryKey: ['review-queue'] });
      qc.invalidateQueries({ queryKey: ['topics'] });
    },
  });

  const targets = useCallback(
    () =>
      (checked.size ? rows.filter((r) => checked.has(r.id)) : row ? [row] : []).map((r) => ({
        type: r.type,
        id: r.id,
      })),
    [checked, rows, row],
  );
  const approve = useCallback(() => {
    const items = targets();
    if (items.length && canApprove) act.mutate({ action: 'publish', items });
  }, [targets, canApprove, act]);
  const startReject = useCallback(() => {
    const items = targets();
    if (items.length) {
      setReason('');
      setRejecting(items);
    }
  }, [targets]);

  // Keyboard: a approve, r reject, j/k next/previous, x tick, ? help (F6.4).
  useEffect(() => {
    const onKey = (e) => {
      if (rejecting || editing || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))
        return;
      if (e.key === 'j') setIndex((i) => Math.min(i + 1, rows.length - 1));
      else if (e.key === 'k') setIndex((i) => Math.max(i - 1, 0));
      else if (e.key === 'a') approve();
      else if (e.key === 'r') startReject();
      else if (e.key === 'x' && row)
        setChecked((c) => {
          const n = new Set(c);
          if (n.has(row.id)) n.delete(row.id);
          else n.add(row.id);
          return n;
        });
      else if (e.key === '?') setHelp(true);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [rows.length, approve, startReject, row, rejecting, editing]);

  const total = queue.data?.meta?.total ?? 0;
  return (
    <Page wide>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <EyebrowHeading eyebrow="Review" title="Review queue" level={1}>
          <p className="text-sm">
            {total} draft{total === 1 ? '' : 's'} waiting. Nothing reaches students until you
            approve it.
          </p>
        </EyebrowHeading>
        <Button variant="ghost" size="sm" icon={Keyboard} onClick={() => setHelp(true)}>
          Shortcuts
        </Button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Select
          label="Subject"
          value={filters.subjectId ?? ''}
          onChange={(e) => setFilter('subjectId', e.target.value)}
          placeholder="All my subjects"
          options={(subjects.data ?? []).map((s) => ({
            value: s.id,
            label: `${s.code} · ${s.name}`,
          }))}
        />
        <Select
          label="Kind"
          value={filters.kind ?? ''}
          onChange={(e) => setFilter('kind', e.target.value)}
          placeholder="All kinds"
          options={KIND_OPTIONS}
        />
        <Select
          label="Source"
          value={filters.source ?? ''}
          onChange={(e) => setFilter('source', e.target.value)}
          placeholder="AI and faculty"
          options={[
            { value: 'ai', label: 'AI drafts' },
            { value: 'faculty', label: 'Faculty-written' },
          ]}
        />
        <Select
          label="Flag"
          value={filters.needsAttention ?? ''}
          onChange={(e) => setFilter('needsAttention', e.target.value)}
          placeholder="Any"
          options={[{ value: 'true', label: 'Needs attention (self-check)' }]}
        />
      </div>

      {!canApprove && (
        <p className="mt-4 rounded-2xl bg-surface p-3 text-sm">
          Only the faculty assigned to a subject can approve its content. You can reject or send
          items back.
        </p>
      )}

      {queue.isPending ? (
        <LoadingBlock className="mt-6" lines={6} />
      ) : rows.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={ClipboardCheck}
          title="Nothing to review"
          description="New AI drafts and faculty drafts will appear here."
          action={
            <Button as={Link} to="/studio">
              Back to studio
            </Button>
          }
        />
      ) : (
        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                icon={CheckCircle2}
                disabled={!canApprove || act.isPending}
                onClick={approve}
              >
                Approve {checked.size ? `${checked.size} selected` : 'this'}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                icon={XCircle}
                disabled={act.isPending}
                onClick={startReject}
              >
                Reject {checked.size ? `${checked.size} selected` : 'this'}
              </Button>
            </div>
            <table className="w-full border-separate border-spacing-y-1 text-sm">
              <caption className="sr-only">Drafts waiting for review</caption>
              <thead className="sr-only">
                <tr>
                  <th scope="col">Select</th>
                  <th scope="col">Draft</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={`${r.type}-${r.id}`}
                    aria-selected={i === index}
                    onClick={() => setIndex(i)}
                    className={cn(
                      'cursor-pointer',
                      i === index ? 'bg-blue/10' : 'bg-card hover:bg-surface',
                    )}
                  >
                    <td className="w-10 rounded-l-xl border-y border-l border-line px-2 align-top">
                      <input
                        type="checkbox"
                        aria-label={`Select ${r.preview?.slice(0, 40)}`}
                        className="mt-3 h-4 w-4 accent-navy"
                        checked={checked.has(r.id)}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() =>
                          setChecked((c) => {
                            const n = new Set(c);
                            if (n.has(r.id)) n.delete(r.id);
                            else n.add(r.id);
                            return n;
                          })
                        }
                      />
                    </td>
                    <td className="rounded-r-xl border-y border-r border-line px-3 py-2">
                      <button
                        type="button"
                        className="block w-full text-left focus-visible:outline-none"
                        onClick={() => setIndex(i)}
                      >
                        <span className="text-xs font-bold uppercase tracking-wider text-body">
                          {r.kind}
                        </span>
                        <span className="line-clamp-2 font-semibold text-navy">{r.preview}</span>
                      </button>
                      <ItemBadges item={r} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {total > 25 && (
              <div className="mt-3 flex items-center justify-between text-sm">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <span>
                  Page {page} of {Math.ceil(total / 25)}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={page * 25 >= total}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </div>

          {row && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card aria-label="Draft">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="eyebrow">Draft · {row.kind}</p>
                  {row.topicId && (
                    <Link
                      to={`/studio/topics/${row.topicId}`}
                      className="inline-flex items-center gap-1 text-sm"
                    >
                      Open topic <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                  )}
                </div>
                <div className="mt-3">
                  {item.isPending && row.type !== 'pyq' ? (
                    <LoadingBlock />
                  ) : editing && item.data ? (
                    <ItemEditor
                      key={row.id}
                      row={row}
                      item={item.data}
                      onSaved={() =>
                        act.mutate({ action: 'publish', items: [{ type: row.type, id: row.id }] })
                      }
                    />
                  ) : (
                    <ItemView row={row} item={item.data} />
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-3">
                  <Button
                    size="sm"
                    icon={CheckCircle2}
                    disabled={!canApprove}
                    onClick={() =>
                      act.mutate({ action: 'publish', items: [{ type: row.type, id: row.id }] })
                    }
                  >
                    Approve
                  </Button>
                  {!['pyq', 'challenge', 'rubric'].includes(row.type) && (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={!canApprove}
                      onClick={() => setEditing((e) => !e)}
                    >
                      {editing ? 'Cancel edit' : 'Edit, then approve'}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={XCircle}
                    onClick={() => setRejecting([{ type: row.type, id: row.id }])}
                  >
                    Reject
                  </Button>
                </div>
              </Card>
              <Card aria-label="Source material">
                <p className="eyebrow">Source material</p>
                <div className="mt-3 max-h-[70vh] overflow-y-auto">
                  <SourceChunks ids={(row.aiMeta?.sourceChunkIds ?? []).map(String)} />
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      <Dialog
        open={Boolean(rejecting)}
        onClose={() => setRejecting(null)}
        title={`Reject ${rejecting?.length ?? 0} item${rejecting?.length === 1 ? '' : 's'}`}
        description="The reason is kept with the draft so the next draft can do better."
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejecting(null)}>
              Cancel
            </Button>
            <Button
              loading={act.isPending}
              disabled={!reason.trim()}
              onClick={() =>
                act.mutate(
                  { action: 'reject', items: rejecting, reason: reason.trim() },
                  { onSuccess: () => setRejecting(null) },
                )
              }
            >
              Reject
            </Button>
          </>
        }
      >
        <Textarea
          label="Reason"
          rows={3}
          maxLength={500}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          data-autofocus
        />
      </Dialog>

      <Dialog open={help} onClose={() => setHelp(false)} title="Keyboard shortcuts" size="sm">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          {[
            ['j / k', 'Next / previous draft'],
            ['a', 'Approve (selected, or the current draft)'],
            ['r', 'Reject with a reason'],
            ['x', 'Tick the current draft for bulk actions'],
            ['?', 'This help'],
          ].map(([k, v]) => (
            <div key={k} className="contents">
              <dt>
                <kbd className="rounded-md border border-line bg-surface px-2 py-0.5 font-mono text-navy">
                  {k}
                </kbd>
              </dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </Dialog>
    </Page>
  );
}
