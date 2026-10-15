import { cloneElement, forwardRef, useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/cn';

const control =
  'block w-full rounded-xl border bg-card px-4 text-navy placeholder:text-body/70 transition-colors focus:outline-none focus:ring-2 focus:ring-blue/40 disabled:cursor-not-allowed disabled:bg-surface';

/**
 * Label, hint and error around one form control, wired with aria-describedby / aria-invalid.
 * Every control below uses it, so react-hook-form's `register()` spreads straight onto them.
 */
function Field({ label, hint, error, required, hideLabel, className, children }) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={className}>
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
        <p id={errorId} className="mt-1 text-xs font-semibold text-red-dark" role="alert">
          {error}
        </p>
      )}
    </div>
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
          error ? 'border-red' : 'border-line hover:border-navy/40',
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
          error ? 'border-red' : 'border-line hover:border-navy/40',
        )}
        {...rest}
      />
    </Field>
  );
});

/** Native select (best for keyboard and screen readers). `options`: [{ value, label }]. */
export const Select = forwardRef(function Select(
  { label, hint, error, required, hideLabel, className, options, placeholder, ...rest },
  ref,
) {
  return (
    <Field {...{ label, hint, error, required, hideLabel, className }}>
      <SelectControl
        ref={ref}
        error={error}
        options={options}
        placeholder={placeholder}
        {...rest}
      />
    </Field>
  );
});

const SelectControl = forwardRef(function SelectControl(
  { error, options, placeholder, ...rest },
  ref,
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          control,
          'min-h-[44px] appearance-none pr-10',
          error ? 'border-red' : 'border-line hover:border-navy/40',
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
