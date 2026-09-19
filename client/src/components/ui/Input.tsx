import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, hint, error, id, ...props }, ref) => {
    const inputId = id ?? props.name;

    return (
      <label className="flex w-full flex-col gap-1.5">
        {label ? (
          <span className="text-sm font-medium text-content">{label}</span>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'h-10 w-full rounded-xl border bg-surface-raised px-3 text-sm text-content shadow-soft',
            'placeholder:text-content-subtle',
            'transition duration-150 ease-smooth',
            'focus-ring',
            error
              ? 'border-danger-500 focus-visible:ring-danger-500/30'
              : 'border-border hover:border-border-strong',
            className,
          )}
          aria-invalid={Boolean(error)}
          {...props}
        />
        {error ? (
          <span className="text-xs text-danger-600 dark:text-danger-400">{error}</span>
        ) : hint ? (
          <span className="text-xs text-content-subtle">{hint}</span>
        ) : null}
      </label>
    );
  },
);

Input.displayName = 'Input';
