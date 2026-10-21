import { useRef } from 'react';
import { cn } from '../../../lib/cn';

const INDENT = '  ';

/**
 * A small code editor: a plain textarea (so screen readers, mobile keyboards and autofill
 * behave) with a line-number gutter. Tab indents, Shift+Tab outdents, Ctrl/Cmd+Enter runs
 * and Ctrl/Cmd+Shift+Enter submits.
 */
export function CodeEditor({
  id,
  value,
  onChange,
  onRun,
  onSubmit,
  label = 'Your SQL',
  className,
}) {
  const ref = useRef(null);
  const gutter = useRef(null);
  const lines = Math.max(value.split('\n').length, 8);

  const replaceSelection = (text, selStart, selEnd) => {
    const el = ref.current;
    const next = value.slice(0, el.selectionStart) + text + value.slice(el.selectionEnd);
    onChange(next);
    requestAnimationFrame(() => el.setSelectionRange(selStart, selEnd));
  };

  const onKeyDown = (e) => {
    const el = e.currentTarget;
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      (e.shiftKey ? onSubmit : onRun)?.();
      return;
    }
    if (e.key !== 'Tab' || e.altKey || e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    const { selectionStart: s, selectionEnd: end } = el;
    const lineStart = value.lastIndexOf('\n', s - 1) + 1;
    if (!e.shiftKey && s === end) {
      replaceSelection(INDENT, s + INDENT.length, s + INDENT.length);
      return;
    }
    // Indent or outdent every selected line.
    const block = value.slice(lineStart, end);
    const changed = e.shiftKey ? block.replace(/^ {1,2}/gm, '') : block.replace(/^/gm, INDENT);
    const next = value.slice(0, lineStart) + changed + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => el.setSelectionRange(lineStart, lineStart + changed.length));
  };

  return (
    <div
      className={cn(
        'flex overflow-hidden rounded-2xl border border-navy/20 bg-[#0B1F40] font-mono text-[13px] leading-6 text-white focus-within:ring-4 focus-within:ring-blue/40',
        className,
      )}
    >
      <div
        ref={gutter}
        aria-hidden
        className="select-none overflow-hidden border-r border-white/10 px-3 py-3 text-right text-white/40"
      >
        {Array.from({ length: lines }, (_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <textarea
        id={id}
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onScroll={(e) => {
          if (gutter.current) gutter.current.scrollTop = e.currentTarget.scrollTop;
        }}
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        rows={lines}
        aria-describedby={`${id}-keys`}
        className="min-h-[220px] w-full resize-y whitespace-pre bg-transparent px-3 py-3 text-white caret-gold outline-none placeholder:text-white/40"
        placeholder="SELECT …"
      />
      <span id={`${id}-keys`} className="sr-only">
        Tab indents. Control plus Enter runs. Control plus Shift plus Enter submits.
      </span>
    </div>
  );
}
