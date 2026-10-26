import { cloneElement, forwardRef, useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { bouncy, shake } from '../../lib/motion';
import { cn } from '../../lib/cn';

const control =
  'block w-full rounded-md border bg-card px-4 text-navy placeholder:text-ink-subtle transition-[border-color,box-shadow] focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15 disabled:cursor-not-allowed disabled:bg-surface';

/**
 * Label, hint and error around one form control, wired with aria-describedby / aria-invalid.
 * Every control below uses it, so react-hook-form's `register()` spreads straight onto them.
 * The field shakes when an error appears and the message pops in.
 */
function Field({ label, hint, error, required, hideLabel, className, children }) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  return (
    <motion.div
      className={className}
      animate={error ? { x: shake.x } : { x: 0 }}
      transition={shake.transition}
    >
      <label
        htmlFor={id}
        className={cn('mb-1.5 block text-sm font-semibold text-navy', hideLabel && 'sr-only')}
      >
        {label}
        {required && (
          <span className="text-red-dark" aria-hidden>
            {' '}
            *
          </span>
        )}
      </label>
      {cloneElement(children, {
        id,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
        'aria-required': required || undefined,
      })}
      {hint && !error && (
        <p id={hintId} className="mt-1 text-xs">
          {hint}
        </p>
      )}
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={bouncy}
          id={errorId}
          className="mt-1 text-xs font-semibold text-red-dark"
          role="alert"
        >
          {error}
        </motion.p>
      )}
    </motion.div>
  );
}

export const Input = forwardRef(function Input(
  { label, hint, error, required, hideLabel, className, inputClassName, ...rest },
  ref,
) {
  return (
    <Field {...{ label, hint, error, required, hideLabel, className }}>
      <input
        ref={ref}
        className={cn(
          control,
          'min-h-[44px]',
          error ? 'border-red' : 'border-line hover:border-brand/40',
          inputClassName,
        )}
        {...rest}
      />
    </Field>
  );
});

export const Textarea = forwardRef(function Textarea(
  { label, hint, error, required, hideLabel, className, rows = 4, ...rest },
  ref,
) {
  return (
    <Field {...{ label, hint, error, required, hideLabel, className }}>
      <textarea
        ref={ref}
        rows={rows}
        className={cn(
          control,
          'py-3 leading-body',
          error ? 'border-red' : 'border-line hover:border-brand/40',
        )}
        {...rest}
      />
    </Field>
  );
});

/**
 * Native select (best for keyboard and screen readers). `options`: [{ value, label }].
 * `compact` makes it shorter for dense toolbars (40px on phones, 36px from sm).
 */
export const Select = forwardRef(function Select(
  { label, hint, error, required, hideLabel, className, options, placeholder, compact, ...rest },
  ref,
) {
  return (
    <Field {...{ label, hint, error, required, hideLabel, className }}>
      <SelectControl
        ref={ref}
        error={error}
        options={options}
        placeholder={placeholder}
        compact={compact}
        {...rest}
      />
    </Field>
  );
});

const SelectControl = forwardRef(function SelectControl(
  { error, options, placeholder, compact, ...rest },
  ref,
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          control,
          compact ? 'min-h-[40px] text-sm sm:min-h-[36px]' : 'min-h-[44px]',
          'appearance-none pr-10',
          error ? 'border-red' : 'border-line hover:border-brand/40',
        )}
        {...rest}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy"
        aria-hidden
      />
    </div>
  );
});
