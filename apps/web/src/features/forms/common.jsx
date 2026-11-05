import { useId } from 'react';
import {
  AlignLeft,
  Calendar,
  CheckSquare,
  CircleDot,
  Clock,
  Grid3x3,
  Heading,
  Image,
  LayoutGrid,
  ListOrdered,
  SlidersHorizontal,
  Star,
  Text,
  Upload,
  Video,
} from 'lucide-react';
import { cn } from '../../lib/cn';

/** Every item type with its label and icon, in the order the "add" menu shows them. */
export const TYPE_META = {
  shortText: { label: 'Short answer', icon: Text },
  paragraph: { label: 'Paragraph', icon: AlignLeft },
  multipleChoice: { label: 'Multiple choice', icon: CircleDot },
  checkboxes: { label: 'Checkboxes', icon: CheckSquare },
  dropdown: { label: 'Dropdown', icon: ListOrdered },
  linearScale: { label: 'Linear scale', icon: SlidersHorizontal },
  rating: { label: 'Rating', icon: Star },
  multipleChoiceGrid: { label: 'Multiple choice grid', icon: Grid3x3 },
  checkboxGrid: { label: 'Tick box grid', icon: LayoutGrid },
  date: { label: 'Date', icon: Calendar },
  time: { label: 'Time', icon: Clock },
  fileUpload: { label: 'File upload', icon: Upload },
  textBlock: { label: 'Title and description', icon: Heading },
  image: { label: 'Image', icon: Image },
  video: { label: 'Video', icon: Video },
};

/** Header strip colour per theme (tokens, so dark mode follows). */
export const HEADER_BG = {
  brand: 'bg-brand',
  navy: 'bg-navy',
  orange: 'bg-warning',
  green: 'bg-success',
  gold: 'bg-gold',
};
export const HEADER_LABEL = {
  brand: 'Magenta',
  navy: 'Navy',
  orange: 'Orange',
  green: 'Green',
  gold: 'Gold',
};

export const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '';

/** `<input type="datetime-local">` value for a date (local time), and back. */
export const toLocalInput = (d) => {
  if (!d) return '';
  const x = new Date(d);
  const pad = (n) => String(n).padStart(2, '0');
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}T${pad(x.getHours())}:${pad(x.getMinutes())}`;
};
export const fromLocalInput = (v) => (v ? new Date(v).toISOString() : null);

export const CLOSED_REASON = {
  draft: 'Not published',
  notYetOpen: 'Opens later',
  closed: 'Closed',
  full: 'Response limit reached',
};

/** A labelled on/off switch (a native checkbox, so it works with keyboard and screen readers). */
export function Toggle({ label, hint, checked, onChange, className, disabled }) {
  const id = useId();
  return (
    <div className={cn('flex items-start justify-between gap-4 py-2', className)}>
      <label htmlFor={id} className="min-w-0 cursor-pointer">
        <span className="block text-sm font-semibold text-navy">{label}</span>
        {hint && <span className="block text-xs">{hint}</span>}
      </label>
      <span className="relative inline-flex shrink-0 items-center">
        <input
          id={id}
          type="checkbox"
          role="switch"
          className="peer sr-only"
          checked={Boolean(checked)}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span
          aria-hidden
          className="h-6 w-11 rounded-full bg-line transition-colors peer-checked:bg-brand peer-focus-visible:ring-4 peer-focus-visible:ring-brand/25 peer-disabled:opacity-50"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-card shadow transition-transform peer-checked:translate-x-5"
        />
      </span>
    </div>
  );
}

/**
 * Horizontal bars for answer counts (one series, one brand hue). Each bar carries its count and
 * share as text, so the numbers never depend on colour; the hover title repeats them.
 */
export function CountBars({ counts, total }) {
  const max = Math.max(1, ...counts.map((c) => c.count));
  return (
    <ul className="space-y-2">
      {counts.map((c) => {
        const pct = total ? Math.round((c.count / total) * 100) : 0;
        return (
          <li
            key={c.label}
            className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 text-sm"
            title={`${c.label}: ${c.count} (${pct}%)`}
          >
            <span className="truncate text-navy">{c.label}</span>
            <span className="h-3 overflow-hidden rounded-r-[4px] bg-surface">
              <span
                className="block h-full rounded-r-[4px] bg-brand transition-[width] duration-500"
                style={{ width: `${(c.count / max) * 100}%` }}
              />
            </span>
            <span className="w-20 text-right tabular-nums text-body">
              {c.count} · {pct}%
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** The summary of one question (shared by the Responses tab and the respondents' summary). */
export function QuestionSummary({ question, summary, total }) {
  if (!summary) return null;
  return (
    <div>
      <p className="font-semibold text-navy">{question.title || 'Untitled question'}</p>
      <p className="mb-3 text-xs">
        {summary.answered} of {total} answered
        {summary.average != null && ` · average ${summary.average}`}
      </p>
      {summary.counts && <CountBars counts={summary.counts} total={summary.answered} />}
      {summary.otherAnswers?.length > 0 && (
        <p className="mt-2 text-xs">Other: {summary.otherAnswers.join(' · ')}</p>
      )}
      {summary.grid && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[20rem] text-sm">
            <thead>
              <tr>
                <th className="p-2 text-left font-semibold text-navy">Row</th>
                {question.columns.map((c) => (
                  <th key={c} className="p-2 text-right font-semibold text-navy">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {summary.grid.map((g) => (
                <tr key={g.row} className="border-t border-line">
                  <td className="p-2 text-navy">{g.row}</td>
                  {g.counts.map((c) => (
                    <td key={c.label} className="p-2 text-right tabular-nums">
                      {c.count}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {summary.texts && (
        <ul className="max-h-64 space-y-1.5 overflow-y-auto">
          {summary.texts.map((t, i) => (
            <li key={i} className="rounded-md bg-surface px-3 py-2 text-sm text-navy">
              {t}
            </li>
          ))}
        </ul>
      )}
      {summary.files != null && <p className="text-sm">{summary.files} file(s) uploaded</p>}
    </div>
  );
}
