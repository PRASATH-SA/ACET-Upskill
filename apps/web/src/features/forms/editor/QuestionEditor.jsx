import { useState } from 'react';
import { ArrowDown, ArrowUp, CheckCircle2, Copy, Plus, Trash2, X } from 'lucide-react';
import {
  FORM_AUTO_GRADED_TYPES,
  FORM_BRANCHING_TYPES,
  FORM_CHOICE_TYPES,
  FORM_FILE_KINDS,
  FORM_GRID_TYPES,
  FORM_ITEM_TYPES,
  FORM_MANUAL_GRADED_TYPES,
  FORM_NEXT,
  blankQuestion,
  isInputItem,
  newFormId,
  youtubeId,
} from '@acet/shared';
import { Button, Card, Chip, IconButton, Input, Select, Textarea } from '../../../components/ui';
import { cn } from '../../../lib/cn';
import { TYPE_META, Toggle } from '../common';

const VALIDATIONS = {
  shortText: [
    ['none', 'No validation'],
    ['number', 'Number'],
    ['integer', 'Whole number'],
    ['email', 'Email'],
    ['url', 'Link (URL)'],
    ['length', 'Length'],
    ['regex', 'Regular expression'],
  ],
  paragraph: [
    ['none', 'No validation'],
    ['length', 'Length'],
    ['regex', 'Regular expression'],
  ],
  checkboxes: [
    ['none', 'No validation'],
    ['selectAtLeast', 'Select at least'],
    ['selectAtMost', 'Select at most'],
    ['selectExactly', 'Select exactly'],
  ],
};
const FILE_KIND_LABEL = {
  pdf: 'PDF',
  image: 'Image',
  document: 'Word',
  presentation: 'PowerPoint',
};
const num = (v) => (v === '' || v == null ? null : Number(v));

/** Changing type keeps the title and description and fills what the new type needs. */
function changeType(q, type) {
  const fresh = blankQuestion(type);
  const keepOptions =
    FORM_CHOICE_TYPES.includes(type) && FORM_CHOICE_TYPES.includes(q.type)
      ? q.options
      : fresh.options;
  const keepGrid = FORM_GRID_TYPES.includes(type) && FORM_GRID_TYPES.includes(q.type);
  return {
    ...fresh,
    id: q.id,
    title: q.title,
    description: q.description,
    required: isInputItem(fresh) ? q.required : false,
    options: keepOptions,
    rows: keepGrid ? q.rows : fresh.rows,
    columns: keepGrid ? q.columns : fresh.columns,
    points: q.points,
  };
}

function OptionsEditor({ q, set, sections, sectionIndex }) {
  const goToOptions = [
    { value: FORM_NEXT.next, label: 'Continue to next section' },
    ...sections
      .map((s, i) => ({
        value: s.id,
        label: `Go to section ${i + 1}${s.title ? ` (${s.title})` : ''}`,
      }))
      .filter((_o, i) => i !== sectionIndex),
    { value: FORM_NEXT.submit, label: 'Submit form' },
  ];
  const marker =
    q.type === 'checkboxes' ? 'rounded-sm' : q.type === 'multipleChoice' ? 'rounded-full' : null;
  const update = (i, patch) =>
    set({ options: q.options.map((o, j) => (j === i ? { ...o, ...patch } : o)) });
  return (
    <div className="space-y-2">
      {q.options.map((o, i) => (
        <div key={o.id} className="flex flex-wrap items-center gap-2">
          {marker ? (
            <span aria-hidden className={cn('h-4 w-4 shrink-0 border-2 border-line', marker)} />
          ) : (
            <span className="w-5 shrink-0 text-right text-sm tabular-nums">{i + 1}.</span>
          )}
          <Input
            hideLabel
            label={`Option ${i + 1}`}
            className="min-w-[10rem] flex-1"
            value={o.label}
            onChange={(e) => update(i, { label: e.target.value })}
          />
          {q.branching && FORM_BRANCHING_TYPES.includes(q.type) && (
            <Select
              hideLabel
              compact
              label={`After option ${i + 1}`}
              className="w-full sm:w-56"
              options={goToOptions}
              value={o.goTo}
              onChange={(e) => update(i, { goTo: e.target.value })}
            />
          )}
          <IconButton
            icon={X}
            label={`Remove option ${i + 1}`}
            disabled={q.options.length <= 1}
            onClick={() => set({ options: q.options.filter((_x, j) => j !== i) })}
          />
        </div>
      ))}
      {q.hasOther && (
        <div className="flex items-center gap-2">
          {marker && (
            <span aria-hidden className={cn('h-4 w-4 shrink-0 border-2 border-line', marker)} />
          )}
          <span className="flex-1 border-b border-dashed border-line py-2 text-sm">Other…</span>
          <IconButton icon={X} label="Remove “Other”" onClick={() => set({ hasOther: false })} />
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="ghost"
          icon={Plus}
          onClick={() =>
            set({
              options: [
                ...q.options,
                {
                  id: newFormId('o'),
                  label: `Option ${q.options.length + 1}`,
                  goTo: FORM_NEXT.next,
                },
              ],
            })
          }
        >
          Add option
        </Button>
        {!q.hasOther && q.type !== 'dropdown' && (
          <Button size="sm" variant="ghost" onClick={() => set({ hasOther: true })}>
            Add “Other”
          </Button>
        )}
      </div>
    </div>
  );
}

/** One line per row or column, in a textarea: quick to type and to paste from a sheet. */
function LinesEditor({ label, values, onChange }) {
  const [text, setText] = useState(values.join('\n'));
  return (
    <Textarea
      label={label}
      rows={4}
      hint="One per line"
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        onChange(
          e.target.value
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean),
        );
      }}
    />
  );
}

function ValidationEditor({ q, set }) {
  const kinds = VALIDATIONS[q.type];
  if (!kinds) return null;
  const v = q.validation;
  const setV = (patch) => set({ validation: { ...v, ...patch } });
  const needsMin = ['number', 'integer', 'length', 'selectAtLeast', 'selectExactly'].includes(
    v.kind,
  );
  const needsMax = ['number', 'integer', 'length', 'selectAtMost'].includes(v.kind);
  return (
    <div className="grid gap-3 rounded-md border border-line bg-surface p-3 sm:grid-cols-2">
      <Select
        label="Response validation"
        compact
        options={kinds.map(([value, label]) => ({ value, label }))}
        value={v.kind}
        onChange={(e) => setV({ kind: e.target.value })}
      />
      {v.kind === 'regex' && (
        <Input
          label="Pattern"
          value={v.pattern}
          placeholder="^[0-9]{8}$"
          onChange={(e) => setV({ pattern: e.target.value })}
        />
      )}
      {needsMin && (
        <Input
          label={v.kind === 'selectExactly' ? 'Number' : 'Minimum'}
          type="number"
          value={v.min ?? ''}
          onChange={(e) => setV({ min: num(e.target.value) })}
        />
      )}
      {needsMax && (
        <Input
          label="Maximum"
          type="number"
          value={v.max ?? ''}
          onChange={(e) => setV({ max: num(e.target.value) })}
        />
      )}
      {v.kind !== 'none' && (
        <Input
          label="Custom error text"
          className="sm:col-span-2"
          value={v.message}
          onChange={(e) => setV({ message: e.target.value })}
        />
      )}
    </div>
  );
}

function AnswerKey({ q, set }) {
  const auto = FORM_AUTO_GRADED_TYPES.includes(q.type);
  const manual = FORM_MANUAL_GRADED_TYPES.includes(q.type);
  if (!auto && !manual) return null;
  const toggle = (label) => {
    if (q.type === 'checkboxes') {
      set({
        answerKey: q.answerKey.includes(label)
          ? q.answerKey.filter((x) => x !== label)
          : [...q.answerKey, label],
      });
    } else set({ answerKey: q.answerKey[0] === label ? [] : [label] });
  };
  return (
    <div className="space-y-3 rounded-md border border-gold-border/60 bg-gold-tint p-3">
      <div className="flex flex-wrap items-end gap-3">
        <Input
          label="Points"
          type="number"
          min={0}
          max={1000}
          className="w-28"
          value={q.points}
          onChange={(e) =>
            set({ points: Math.max(0, Math.min(1000, Number(e.target.value) || 0)) })
          }
        />
        {manual && <p className="pb-2 text-xs">You mark this one by hand in the Responses tab.</p>}
      </div>
      {FORM_CHOICE_TYPES.includes(q.type) && (
        <div>
          <p className="mb-1.5 text-sm font-semibold text-navy">
            Correct answer{q.type === 'checkboxes' ? 's' : ''}
          </p>
          <div className="flex flex-wrap gap-2">
            {q.options.map((o) => (
              <Chip
                key={o.id}
                selected={q.answerKey.includes(o.label)}
                icon={q.answerKey.includes(o.label) ? CheckCircle2 : undefined}
                onClick={() => toggle(o.label)}
              >
                {o.label}
              </Chip>
            ))}
          </div>
        </div>
      )}
      {q.type === 'shortText' && (
        <LinesEditor
          label="Accepted answers (not case-sensitive)"
          values={q.answerKey}
          onChange={(answerKey) => set({ answerKey })}
        />
      )}
      {auto && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Feedback when right"
            value={q.feedbackCorrect}
            onChange={(e) => set({ feedbackCorrect: e.target.value })}
          />
          <Input
            label="Feedback when wrong"
            value={q.feedbackIncorrect}
            onChange={(e) => set({ feedbackIncorrect: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}

function TypeBody({ q, set, sections, sectionIndex }) {
  if (FORM_CHOICE_TYPES.includes(q.type)) {
    return <OptionsEditor q={q} set={set} sections={sections} sectionIndex={sectionIndex} />;
  }
  if (FORM_GRID_TYPES.includes(q.type)) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <LinesEditor label="Rows" values={q.rows} onChange={(rows) => set({ rows })} />
        <LinesEditor label="Columns" values={q.columns} onChange={(columns) => set({ columns })} />
      </div>
    );
  }
  if (q.type === 'linearScale') {
    const s = q.scale;
    const setS = (patch) => set({ scale: { ...s, ...patch } });
    return (
      <div className="grid gap-3 sm:grid-cols-4">
        <Select
          label="From"
          compact
          options={[0, 1].map((v) => ({ value: v, label: String(v) }))}
          value={s.min}
          onChange={(e) => setS({ min: Number(e.target.value) })}
        />
        <Select
          label="To"
          compact
          options={[2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => ({ value: v, label: String(v) }))}
          value={s.max}
          onChange={(e) => setS({ max: Number(e.target.value) })}
        />
        <Input
          label={`Label for ${s.min}`}
          value={s.minLabel}
          onChange={(e) => setS({ minLabel: e.target.value })}
        />
        <Input
          label={`Label for ${s.max}`}
          value={s.maxLabel}
          onChange={(e) => setS({ maxLabel: e.target.value })}
        />
      </div>
    );
  }
  if (q.type === 'rating') {
    return (
      <Select
        label="Number of stars"
        compact
        className="w-40"
        options={[3, 4, 5, 6, 7, 8, 9, 10].map((v) => ({ value: v, label: String(v) }))}
        value={q.ratingMax}
        onChange={(e) => set({ ratingMax: Number(e.target.value) })}
      />
    );
  }
  if (q.type === 'date') {
    return (
      <Toggle
        label="Include year"
        checked={q.includeYear}
        onChange={(includeYear) => set({ includeYear })}
      />
    );
  }
  if (q.type === 'fileUpload') {
    const kinds = q.fileKinds;
    return (
      <div className="space-y-3">
        <div>
          <p className="mb-1.5 text-sm font-semibold text-navy">Allowed file types</p>
          <div className="flex flex-wrap gap-2">
            {FORM_FILE_KINDS.map((k) => (
              <Chip
                key={k}
                selected={kinds.includes(k)}
                onClick={() =>
                  set({
                    fileKinds: kinds.includes(k) ? kinds.filter((x) => x !== k) : [...kinds, k],
                  })
                }
              >
                {FILE_KIND_LABEL[k]}
              </Chip>
            ))}
          </div>
          <p className="mt-1 text-xs">None selected = any of these.</p>
        </div>
        <Select
          label="Maximum number of files"
          compact
          className="w-48"
          options={[1, 2, 3, 4, 5].map((v) => ({ value: v, label: String(v) }))}
          value={q.maxFiles}
          onChange={(e) => set({ maxFiles: Number(e.target.value) })}
        />
      </div>
    );
  }
  if (q.type === 'image' || q.type === 'video') {
    const vid = q.type === 'video' ? youtubeId(q.mediaUrl) : null;
    return (
      <div className="space-y-3">
        <Input
          label={q.type === 'image' ? 'Image link (https://…)' : 'YouTube link'}
          value={q.mediaUrl}
          onChange={(e) => set({ mediaUrl: e.target.value.trim() })}
          error={
            q.type === 'video' && q.mediaUrl && !vid ? 'Paste a YouTube video link' : undefined
          }
        />
        {q.type === 'image' && q.mediaUrl && (
          <img
            src={q.mediaUrl}
            alt={q.title || 'Form image'}
            className="max-h-64 rounded-md border border-line"
          />
        )}
        {vid && (
          <iframe
            title={q.title || 'Video'}
            className="aspect-video w-full rounded-md border border-line"
            src={`https://www.youtube-nocookie.com/embed/${vid}`}
            allowFullScreen
          />
        )}
      </div>
    );
  }
  if (q.type === 'shortText' || q.type === 'paragraph') {
    return (
      <p
        className={cn(
          'border-b border-dashed border-line pb-2 text-sm',
          q.type === 'paragraph' && 'pb-8',
        )}
      >
        {q.type === 'shortText' ? 'Short answer text' : 'Long answer text'}
      </p>
    );
  }
  return null;
}

/**
 * Editor card for one item. Every change goes straight to `onChange`; the page autosaves.
 */
export function QuestionEditor({
  question: q,
  sections,
  sectionIndex,
  isQuiz,
  first,
  last,
  onChange,
  onMove,
  onDuplicate,
  onDelete,
}) {
  const set = (patch) => onChange({ ...q, ...patch });
  const input = isInputItem(q);
  const [showDesc, setShowDesc] = useState(Boolean(q.description));
  const [showValidation, setShowValidation] = useState(
    q.validation?.kind && q.validation.kind !== 'none',
  );
  const Icon = TYPE_META[q.type].icon;
  return (
    <Card className="space-y-4 border-l-4 border-l-brand/60">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <Input
          label={q.type === 'textBlock' ? 'Title' : input ? 'Question' : 'Title'}
          hideLabel
          className="flex-1"
          inputClassName="text-base font-semibold"
          placeholder={input ? 'Question' : 'Title'}
          value={q.title}
          onChange={(e) => set({ title: e.target.value })}
        />
        <div className="flex items-center gap-2 sm:w-64">
          <Icon className="h-5 w-5 shrink-0 text-brand" aria-hidden />
          <Select
            label="Question type"
            hideLabel
            className="flex-1"
            options={FORM_ITEM_TYPES.map((t) => ({ value: t, label: TYPE_META[t].label }))}
            value={q.type}
            onChange={(e) => onChange(changeType(q, e.target.value))}
          />
        </div>
      </div>

      {(showDesc || q.type === 'textBlock') && (
        <Textarea
          label="Description"
          hideLabel
          rows={2}
          placeholder="Description"
          value={q.description}
          onChange={(e) => set({ description: e.target.value })}
        />
      )}

      <TypeBody q={q} set={set} sections={sections} sectionIndex={sectionIndex} />
      {showValidation && <ValidationEditor q={q} set={set} />}
      {isQuiz && input && <AnswerKey q={q} set={set} />}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
        <div className="flex flex-wrap items-center gap-x-5">
          {input && (
            <Toggle
              label="Required"
              checked={q.required}
              onChange={(required) => set({ required })}
            />
          )}
          {FORM_BRANCHING_TYPES.includes(q.type) && (
            <Toggle
              label="Go to section by answer"
              checked={q.branching}
              disabled={sections.length < 2 && !q.branching}
              onChange={(branching) => set({ branching })}
            />
          )}
          {FORM_CHOICE_TYPES.includes(q.type) && (
            <Toggle
              label="Shuffle options"
              checked={q.shuffleOptions}
              onChange={(shuffleOptions) => set({ shuffleOptions })}
            />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {q.type !== 'textBlock' && (
            <Button size="sm" variant="ghost" onClick={() => setShowDesc((v) => !v)}>
              {showDesc ? 'Hide description' : 'Description'}
            </Button>
          )}
          {VALIDATIONS[q.type] && (
            <Button size="sm" variant="ghost" onClick={() => setShowValidation((v) => !v)}>
              {showValidation ? 'Hide validation' : 'Validation'}
            </Button>
          )}
          <IconButton icon={ArrowUp} label="Move up" disabled={first} onClick={() => onMove(-1)} />
          <IconButton
            icon={ArrowDown}
            label="Move down"
            disabled={last}
            onClick={() => onMove(1)}
          />
          <IconButton icon={Copy} label="Duplicate" onClick={onDuplicate} />
          <IconButton icon={Trash2} label="Delete" onClick={onDelete} />
        </div>
      </div>
    </Card>
  );
}
