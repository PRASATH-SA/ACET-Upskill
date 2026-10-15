import { useState } from 'react';
import { Eye, Pencil, Plus, Trash2 } from 'lucide-react';
import { Markdown } from '../../../components/Markdown';
import {
  Button,
  Card,
  EmptyState,
  Input,
  LoadingBlock,
  Select,
  Textarea,
  toast,
} from '../../../components/ui';
import { useSession } from '../../auth/session';
import { useDeleteItem, useSaveItem, useTopicItems } from '../api';
import { ItemBadges, ItemStatusActions } from './ItemStatus';

/** Markdown textarea with a preview toggle (F6.3). */
export function MarkdownField({ label, value, onChange, rows = 10 }) {
  const [preview, setPreview] = useState(false);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-semibold text-navy">{label}</span>
        <Button
          size="sm"
          variant="ghost"
          icon={preview ? Pencil : Eye}
          onClick={() => setPreview((p) => !p)}
        >
          {preview ? 'Edit' : 'Preview'}
        </Button>
      </div>
      {preview ? (
        <div className="min-h-[120px] rounded-xl border border-line bg-surface p-4">
          <Markdown>{value || '_Nothing yet_'}</Markdown>
        </div>
      ) : (
        <Textarea
          label={label}
          hideLabel
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="font-mono"
        />
      )}
    </div>
  );
}

const useCanApprove = () => useSession((s) => s.user.role === 'faculty');

function ResourceCard({ item, kind }) {
  const save = useSaveItem();
  const remove = useDeleteItem();
  const canApprove = useCanApprove();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(item.title ?? '');
  const [body, setBody] = useState(item.body ?? '');
  const [url, setUrl] = useState(item.url ?? '');
  return (
    <Card padded={false} className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-navy">{item.title || 'Untitled'}</p>
          <ItemBadges item={item} />
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditing((e) => !e)}>
            {editing ? 'Close' : 'Edit'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            icon={Trash2}
            onClick={() => remove.mutate({ type: 'resources', id: item.id })}
          >
            Delete
          </Button>
        </div>
      </div>
      {editing ? (
        <div className="mt-4 space-y-3">
          <Input
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={160}
          />
          {kind === 'video' && (
            <Input
              label="Video URL (YouTube or unlisted)"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          )}
          {kind !== 'video' && (
            <MarkdownField label="Body (markdown)" value={body} onChange={setBody} />
          )}
          <Button
            size="sm"
            variant="navy"
            loading={save.isPending}
            onClick={() =>
              save.mutate(
                {
                  type: 'resources',
                  id: item.id,
                  body: { title: title || undefined, ...(kind === 'video' ? { url } : { body }) },
                },
                { onSuccess: () => (setEditing(false), toast.success('Saved')) },
              )
            }
          >
            Save
          </Button>
        </div>
      ) : (
        <div className="mt-3 max-h-80 overflow-y-auto">
          {kind === 'video' ? (
            <a href={item.url}>{item.url ?? 'Uploaded video'}</a>
          ) : (
            <Markdown>{item.body}</Markdown>
          )}
        </div>
      )}
      <div className="mt-4 border-t border-line pt-3">
        <ItemStatusActions type="resources" item={item} canApprove={canApprove} />
      </div>
    </Card>
  );
}

/** All resources of one kind for a topic, plus "add" (faculty-written). */
export function ResourceTab({ topicId, kind, label }) {
  const items = useTopicItems(topicId, 'resources');
  const save = useSaveItem();
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('');
  const list = (items.data ?? []).filter((r) => r.kind === kind);
  if (items.isPending) return <LoadingBlock />;
  return (
    <div className="space-y-4">
      {list.length === 0 && (
        <p className="text-sm">
          No {label.toLowerCase()} yet. Write one below or draft it with AI.
        </p>
      )}
      {list.map((r) => (
        <ResourceCard key={r.id} item={r} kind={kind} />
      ))}
      <Card tone="surface" padded={false} className="p-4">
        <p className="font-semibold text-navy">Add {label.toLowerCase()}</p>
        <div className="mt-3 space-y-3">
          {kind === 'video' ? (
            <Input
              label="Video URL"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://youtu.be/…"
            />
          ) : (
            <MarkdownField label="Body (markdown)" value={body} onChange={setBody} rows={6} />
          )}
          <Button
            size="sm"
            variant="secondary"
            icon={Plus}
            loading={save.isPending}
            disabled={kind === 'video' ? !url : !body.trim()}
            onClick={() =>
              save.mutate(
                {
                  type: 'resources',
                  topicId,
                  body: kind === 'video' ? { kind, url } : { kind, body },
                },
                { onSuccess: () => (setBody(''), setUrl('')) },
              )
            }
          >
            Add as draft
          </Button>
        </div>
      </Card>
    </div>
  );
}

export function FlashcardsTab({ topicId }) {
  const items = useTopicItems(topicId, 'flashcards');
  const save = useSaveItem();
  const remove = useDeleteItem();
  const canApprove = useCanApprove();
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  if (items.isPending) return <LoadingBlock />;
  return (
    <div className="space-y-3">
      {(items.data ?? []).map((c) => (
        <Card key={c.id} padded={false} className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-navy">{c.front}</p>
              <p className="mt-1 text-sm">{c.back}</p>
            </div>
            <ItemBadges item={c} />
          </div>
          <div className="mt-3 flex flex-wrap justify-between gap-2">
            <ItemStatusActions type="flashcards" item={c} canApprove={canApprove} />
            <Button
              size="sm"
              variant="ghost"
              icon={Trash2}
              onClick={() => remove.mutate({ type: 'flashcards', id: c.id })}
            >
              Delete
            </Button>
          </div>
        </Card>
      ))}
      <Card
        tone="surface"
        padded={false}
        className="grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      >
        <Input
          label="Front"
          value={front}
          onChange={(e) => setFront(e.target.value)}
          maxLength={500}
        />
        <Input
          label="Back"
          value={back}
          onChange={(e) => setBack(e.target.value)}
          maxLength={2000}
        />
        <Button
          variant="secondary"
          icon={Plus}
          disabled={!front.trim() || !back.trim()}
          loading={save.isPending}
          onClick={() =>
            save.mutate(
              { type: 'flashcards', topicId, body: { front, back } },
              { onSuccess: () => (setFront(''), setBack('')) },
            )
          }
        >
          Add
        </Button>
      </Card>
    </div>
  );
}

const blankQuestion = () => ({
  stem: '',
  options: ['', '', '', ''],
  correctIndex: 0,
  explanation: '',
  optionExplanations: ['', '', '', ''],
  difficulty: 'medium',
});

/** Edit form for one MCQ (also used by the question bank and the review queue). */
export function QuestionForm({ initial, onSubmit, saving, submitLabel = 'Save' }) {
  const [q, setQ] = useState(() => ({
    ...blankQuestion(),
    ...initial,
    optionExplanations: initial?.optionExplanations?.length
      ? initial.optionExplanations
      : ['', '', '', ''],
  }));
  const set = (patchObj) => setQ((x) => ({ ...x, ...patchObj }));
  const setAt = (key, i, v) =>
    setQ((x) => ({ ...x, [key]: x[key].map((o, j) => (j === i ? v : o)) }));
  const valid = q.stem.trim().length >= 3 && q.options.every((o) => o.trim());
  return (
    <div className="space-y-3">
      <Textarea
        label="Question"
        rows={2}
        value={q.stem}
        onChange={(e) => set({ stem: e.target.value })}
      />
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-navy">Options (pick the correct one)</legend>
        {q.options.map((o, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[auto_1fr_1fr] sm:items-center">
            <label className="flex min-h-[44px] items-center gap-2 text-sm font-semibold text-navy">
              <input
                type="radio"
                name="correct"
                checked={q.correctIndex === i}
                onChange={() => set({ correctIndex: i })}
                className="h-4 w-4 accent-navy"
              />
              {String.fromCharCode(65 + i)}
            </label>
            <Input
              label={`Option ${String.fromCharCode(65 + i)}`}
              hideLabel
              value={o}
              onChange={(e) => setAt('options', i, e.target.value)}
              placeholder={`Option ${String.fromCharCode(65 + i)}`}
            />
            <Input
              label={`Why ${String.fromCharCode(65 + i)} is right or wrong`}
              hideLabel
              value={q.optionExplanations[i] ?? ''}
              onChange={(e) => setAt('optionExplanations', i, e.target.value)}
              placeholder="Why right / wrong"
            />
          </div>
        ))}
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
        <Textarea
          label="Explanation"
          rows={2}
          value={q.explanation}
          onChange={(e) => set({ explanation: e.target.value })}
        />
        <Select
          label="Difficulty"
          value={q.difficulty}
          onChange={(e) => set({ difficulty: e.target.value })}
          options={['easy', 'medium', 'hard'].map((d) => ({ value: d, label: d }))}
        />
      </div>
      <Button
        size="sm"
        variant="navy"
        loading={saving}
        disabled={!valid}
        onClick={() =>
          onSubmit({
            type: 'mcq',
            stem: q.stem.trim(),
            options: q.options.map((o) => o.trim()),
            correctIndex: q.correctIndex,
            explanation: q.explanation.trim(),
            optionExplanations: q.optionExplanations.some((x) => x?.trim())
              ? q.optionExplanations.map((x) => (x ?? '').trim())
              : [],
            difficulty: q.difficulty,
          })
        }
      >
        {submitLabel}
      </Button>
    </div>
  );
}

export function QuestionsTab({ topicId }) {
  const items = useTopicItems(topicId, 'questions');
  const save = useSaveItem();
  const remove = useDeleteItem();
  const canApprove = useCanApprove();
  const [editing, setEditing] = useState(null);
  if (items.isPending) return <LoadingBlock />;
  const list = (items.data ?? []).filter((q) => q.type === 'mcq');
  return (
    <div className="space-y-3">
      {list.length === 0 && (
        <EmptyState
          title="No quiz questions yet"
          description="Add one below, or use Draft with AI."
        />
      )}
      {list.map((q) => (
        <Card key={q.id} padded={false} className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="min-w-0 flex-1 font-semibold text-navy">{q.stem}</p>
            <ItemBadges item={q} />
          </div>
          {editing === q.id ? (
            <div className="mt-3">
              <QuestionForm
                initial={q}
                saving={save.isPending}
                onSubmit={(body) =>
                  save.mutate(
                    { type: 'questions', id: q.id, body },
                    { onSuccess: () => setEditing(null) },
                  )
                }
              />
            </div>
          ) : (
            <ol className="mt-2 list-[upper-alpha] space-y-0.5 pl-6 text-sm">
              {q.options.map((o, i) => (
                <li key={i} className={i === q.correctIndex ? 'font-semibold text-success' : ''}>
                  {o}
                  {i === q.correctIndex && <span className="sr-only"> (correct)</span>}
                </li>
              ))}
            </ol>
          )}
          <div className="mt-3 flex flex-wrap justify-between gap-2">
            <ItemStatusActions type="questions" item={q} canApprove={canApprove} />
            <span className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                icon={Pencil}
                onClick={() => setEditing(editing === q.id ? null : q.id)}
              >
                {editing === q.id ? 'Close' : 'Edit'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                icon={Trash2}
                onClick={() => remove.mutate({ type: 'questions', id: q.id })}
              >
                Delete
              </Button>
            </span>
          </div>
        </Card>
      ))}
      <Card tone="surface" padded={false} className="p-4">
        <p className="mb-3 font-semibold text-navy">Add a question</p>
        <QuestionForm
          key={list.length}
          saving={save.isPending}
          submitLabel="Add as draft"
          onSubmit={(body) => save.mutate({ type: 'questions', topicId, body })}
        />
      </Card>
    </div>
  );
}
