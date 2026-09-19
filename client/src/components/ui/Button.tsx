import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

const variants = {
  primary:
    'bg-primary-600 text-white shadow-soft hover:bg-primary-700 active:bg-primary-800 disabled:bg-primary-600/50',
  secondary:
    'bg-secondary-900 text-white shadow-soft hover:bg-secondary-800 active:bg-secondary-950 dark:bg-secondary-100 dark:text-secondary-900 dark:hover:bg-white',
  outline:
    'border border-border-strong bg-surface-raised text-content shadow-soft hover:bg-surface-muted active:bg-secondary-100 dark:active:bg-secondary-800',
  ghost:
    'bg-transparent text-content-muted hover:bg-surface-muted hover:text-content active:bg-secondary-100 dark:active:bg-secondary-800',
  danger:
    'bg-danger-600 text-white shadow-soft hover:bg-danger-700 active:bg-danger-800 disabled:bg-danger-600/50',
} as const;

const sizes = {
  sm: 'h-8 gap-1.5 rounded-lg px-3 text-xs',
  md: 'h-10 gap-2 rounded-xl px-4 text-sm',
  lg: 'h-11 gap-2 rounded-xl px-5 text-sm',
  icon: 'h-10 w-10 rounded-xl p-0',
} as const;

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  isLoading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-medium transition duration-150 ease-smooth',
          'focus-ring disabled:cursor-not-allowed disabled:opacity-60',
          variants[variant],
          sizes[size],
          className,
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <span
            className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"
            aria-hidden
          />
        ) : null}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
