import { useId, useMemo } from 'react';
import { Star, Upload, X } from 'lucide-react';
import { FORM_FILE_EXTS, FORM_FILE_KINDS, youtubeId } from '@acet/shared';
import { Badge, IconButton, Select } from '../../../components/ui';
import { cn } from '../../../lib/cn';

const control =
  'block w-full rounded-md border border-line bg-card px-4 text-navy placeholder:text-ink-subtle focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15';
const ACCEPT = {
  pdf: '.pdf',
  png: '.png',
  jpg: '.jpg,.jpeg',
  webp: '.webp',
  docx: '.docx',
  pptx: '.pptx',
};

/** Fisher–Yates with a fixed seed, so the order stays put while the student answers. */
export function seededShuffle(list, seed) {
  const out = [...list];
  let s = seed || 1;
  for (let i = out.length - 1; i > 0; i -= 1) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function ChoiceList({ q, value, onChange, seed, describedBy }) {
  const multi = q.type === 'checkboxes';
  const name = useId();
  const options = useMemo(
    () => (q.shuffleOptions ? seededShuffle(q.options, seed) : q.options),
    [q.options, q.shuffleOptions, seed],
  );
  const labels = q.options.map((o) => o.label);
  const selected = multi ? (value ?? []) : value;
  const otherValue = multi
    ? (selected.find((v) => !labels.includes(v)) ?? null)
    : selected != null && !labels.includes(selected)
      ? selected
      : null;
  const otherOn = otherValue !== null;

  const toggle = (label) => {
    if (!multi) return onChange(label);
    onChange(selected.includes(label) ? selected.filter((x) => x !== label) : [...selected, label]);
  };
  const setOther = (text, on = true) => {
    if (!multi) return onChange(on ? text : null);
    const rest = selected.filter((v) => labels.includes(v));
    onChange(on ? [...rest, text] : rest);
  };
  return (
    <fieldset className="space-y-1" aria-describedby={describedBy}>
      <legend className="sr-only">{q.title}</legend>
      {options.map((o) => {
        const checked = multi ? selected.includes(o.label) : selected === o.label;
        return (
          <label
            key={o.id}
            className={cn(
              'flex min-h-[44px] cursor-pointer items-center gap-3 rounded-md px-3 transition-colors hover:bg-brand-soft',
              checked && 'bg-brand-soft',
            )}
          >
            <input
              type={multi ? 'checkbox' : 'radio'}
              name={name}
              className="h-5 w-5 accent-brand"
              checked={checked}
              onChange={() => toggle(o.label)}
            />
            <span className="text-navy">{o.label}</span>
          </label>
        );
      })}
      {q.hasOther && (
        <div className="flex min-h-[44px] items-center gap-3 px-3">
          <input
            type={multi ? 'checkbox' : 'radio'}
            name={name}
            aria-label="Other"
            className="h-5 w-5 accent-brand"
            checked={otherOn}
            onChange={(e) => setOther(otherValue ?? '', multi ? e.target.checked : true)}
          />
          <span className="text-navy">Other:</span>
          <input
            type="text"
            aria-label="Other answer"
            className="flex-1 border-b border-line bg-transparent py-1 text-navy focus:border-brand focus:outline-none"
            value={otherValue ?? ''}
            onChange={(e) => setOther(e.target.value)}
          />
        </div>
      )}
      {!multi && selected != null && !q.required && (
        <button
          type="button"
          className="ml-3 text-xs font-semibold text-brand"
          onClick={() => onChange(null)}
        >
          Clear selection
        </button>
      )}
    </fieldset>
  );
}

function Grid({ q, value, onChange }) {
  const multi = q.type === 'checkboxGrid';
  const v = value ?? {};
  const set = (row, col) => {
    if (!multi) return onChange({ ...v, [row]: col });
    const cur = v[row] ?? [];
    const next = cur.includes(col) ? cur.filter((x) => x !== col) : [...cur, col];
    const out = { ...v, [row]: next };
    if (!next.length) delete out[row];
    onChange(out);
  };
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[20rem] text-sm">
        <thead>
          <tr>
            <th className="p-2" />
            {q.columns.map((c) => (
              <th key={c} scope="col" className="p-2 text-center font-semibold text-navy">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {q.rows.map((row) => (
            <tr key={row} className="border-t border-line">
              <th scope="row" className="p-2 text-left font-medium text-navy">
                {row}
              </th>
              {q.columns.map((col) => (
                <td key={col} className="p-2 text-center">
                  <input
                    type={multi ? 'checkbox' : 'radio'}
                    name={`${q.id}-${row}`}
                    aria-label={`${row}: ${col}`}
                    className="h-5 w-5 accent-brand"
                    checked={multi ? (v[row] ?? []).includes(col) : v[row] === col}
                    onChange={() => set(row, col)}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FileInput({ q, files, existing, onFiles }) {
  const kinds = q.fileKinds?.length ? q.fileKinds : FORM_FILE_KINDS;
  const accept = kinds.flatMap((k) => FORM_FILE_EXTS[k].map((e) => ACCEPT[e])).join(',');
  return (
    <div className="space-y-2">
      {existing.length > 0 && !files.length && (
        <p className="text-sm">
          Submitted: {existing.map((f) => f.name).join(', ')} (kept unless you upload new files)
        </p>
      )}
      <ul className="space-y-1">
        {files.map((f, i) => (
          <li key={`${f.name}-${i}`} className="flex items-center gap-2 text-sm text-navy">
            <Badge>{f.name}</Badge>
            <IconButton
              icon={X}
              label={`Remove ${f.name}`}
              onClick={() => onFiles(files.filter((_x, j) => j !== i))}
            />
          </li>
        ))}
      </ul>
      {files.length < q.maxFiles && (
        <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full border border-line bg-card px-5 text-sm font-semibold text-brand hover:border-brand/40 hover:bg-brand-soft">
          <Upload className="h-4 w-4" aria-hidden /> Add file
          <input
            type="file"
            className="sr-only"
            accept={accept}
            multiple={q.maxFiles > 1}
            onChange={(e) => {
              onFiles([...files, ...e.target.files].slice(0, q.maxFiles));
              e.target.value = '';
            }}
          />
        </label>
      )}
      <p className="text-xs">
        Up to {q.maxFiles} file{q.maxFiles > 1 ? 's' : ''}: {kinds.join(', ').toUpperCase()}
      </p>
    </div>
  );
}

/** One item of the form as a respondent sees it. `error` comes from validateAnswer(). */
export function QuestionInput({
  q,
  value,
  onChange,
  error,
  files = [],
  existingFiles = [],
  onFiles,
  seed,
  result,
}) {
  const errId = useId();
  const describedBy = error ? errId : undefined;
  if (q.type === 'textBlock') {
    return (
      <div>
        <h3 className="text-xl">{q.title}</h3>
        {q.description && <p className="mt-1 whitespace-pre-line">{q.description}</p>}
      </div>
    );
  }
  if (q.type === 'image') {
    return (
      <figure>
        {q.title && <figcaption className="mb-2 font-semibold text-navy">{q.title}</figcaption>}
        {q.mediaUrl && (
          <img
            src={q.mediaUrl}
            alt={q.description || q.title || ''}
            className="max-h-96 rounded-md"
          />
        )}
      </figure>
    );
  }
  if (q.type === 'video') {
    const vid = youtubeId(q.mediaUrl);
    return (
      <div>
        {q.title && <p className="mb-2 font-semibold text-navy">{q.title}</p>}
        {vid && (
          <iframe
            title={q.title || 'Video'}
            className="aspect-video w-full rounded-md"
            src={`https://www.youtube-nocookie.com/embed/${vid}`}
            allowFullScreen
          />
        )}
      </div>
    );
  }

  const titleId = `${errId}-title`;
  let body;
  switch (q.type) {
    case 'shortText':
      body = (
        <input
          aria-labelledby={titleId}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className={cn(control, 'min-h-[44px]')}
          type={q.validation?.kind === 'email' ? 'email' : 'text'}
          inputMode={['number', 'integer'].includes(q.validation?.kind) ? 'decimal' : undefined}
          placeholder="Your answer"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      );
      break;
    case 'paragraph':
      body = (
        <textarea
          aria-labelledby={titleId}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          rows={4}
          className={cn(control, 'py-3')}
          placeholder="Your answer"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      );
      break;
    case 'multipleChoice':
    case 'checkboxes':
      body = (
        <ChoiceList q={q} value={value} onChange={onChange} seed={seed} describedBy={describedBy} />
      );
      break;
    case 'dropdown':
      body = (
        <Select
          label={q.title}
          hideLabel
          className="sm:w-80"
          placeholder="Choose"
          options={(q.shuffleOptions ? seededShuffle(q.options, seed) : q.options).map((o) => ({
            value: o.label,
            label: o.label,
          }))}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value || null)}
        />
      );
      break;
    case 'linearScale': {
      const { min = 1, max = 5, minLabel, maxLabel } = q.scale ?? {};
      const vals = Array.from({ length: max - min + 1 }, (_x, i) => min + i);
      body = (
        <fieldset aria-describedby={describedBy}>
          <legend className="sr-only">{q.title}</legend>
          <div className="flex items-end gap-2 overflow-x-auto pb-1">
            {minLabel && <span className="shrink-0 pb-2 text-xs">{minLabel}</span>}
            {vals.map((v) => (
              <label
                key={v}
                className="flex min-w-[44px] shrink-0 cursor-pointer flex-col items-center gap-1"
              >
                <span className="text-sm text-navy">{v}</span>
                <input
                  type="radio"
                  name={q.id}
                  className="h-5 w-5 accent-brand"
                  checked={value === v}
                  onChange={() => onChange(v)}
                />
              </label>
            ))}
            {maxLabel && <span className="shrink-0 pb-2 text-xs">{maxLabel}</span>}
          </div>
        </fieldset>
      );
      break;
    }
    case 'rating':
      body = (
        <div className="flex flex-wrap gap-1" role="radiogroup" aria-labelledby={titleId}>
          {Array.from({ length: q.ratingMax }, (_x, i) => i + 1).map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={value === v}
              aria-label={`${v} of ${q.ratingMax}`}
              onClick={() => onChange(v)}
              className="rounded-md p-1.5 hover:bg-brand-soft"
            >
              <Star
                className={cn('h-8 w-8', value >= v ? 'fill-gold text-gold-border' : 'text-line')}
                aria-hidden
              />
            </button>
          ))}
        </div>
      );
      break;
    case 'date':
      body =
        q.includeYear === false ? (
          <input
            aria-labelledby={titleId}
            className={cn(control, 'min-h-[44px] sm:w-48')}
            placeholder="MM-DD"
            pattern="\d{2}-\d{2}"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
          />
        ) : (
          <input
            aria-labelledby={titleId}
            type="date"
            className={cn(control, 'min-h-[44px] sm:w-56')}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      break;
    case 'time':
      body = (
        <input
          aria-labelledby={titleId}
          type="time"
          className={cn(control, 'min-h-[44px] sm:w-40')}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      );
      break;
    case 'multipleChoiceGrid':
    case 'checkboxGrid':
      body = <Grid q={q} value={value} onChange={onChange} />;
      break;
    case 'fileUpload':
      body = <FileInput q={q} files={files} existing={existingFiles} onFiles={onFiles} />;
      break;
    default:
      body = null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <p id={titleId} className="font-semibold text-navy">
          {q.title}
          {q.required && (
            <span className="text-red-dark" aria-label="required">
              {' '}
              *
            </span>
          )}
        </p>
        {q.points > 0 && (
          <Badge tone="gold">
            {q.points} pt{q.points > 1 ? 's' : ''}
          </Badge>
        )}
      </div>
      {q.description && <p className="-mt-2 whitespace-pre-line text-sm">{q.description}</p>}
      {body}
      {error && (
        <p id={errId} role="alert" className="text-sm font-semibold text-red-dark">
          {error}
        </p>
      )}
      {result && <ResultNote result={result} />}
    </div>
  );
}

function ResultNote({ result }) {
  const tone = result.pending
    ? 'orange'
    : result.correct === false
      ? 'red'
      : result.correct
        ? 'green'
        : 'neutral';
  return (
    <div className="space-y-1 rounded-md border border-line bg-surface p-3 text-sm">
      <Badge tone={tone}>
        {result.pending ? 'Awaiting marking' : `${result.earned} / ${result.points} points`}
      </Badge>
      {result.correctAnswers && result.correct === false && (
        <p>
          Correct answer: <strong className="text-navy">{result.correctAnswers.join(', ')}</strong>
        </p>
      )}
      {result.feedback && <p>{result.feedback}</p>}
    </div>
  );
}
