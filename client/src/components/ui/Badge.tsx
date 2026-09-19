import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

const variants = {
  default: 'bg-secondary-100 text-secondary-700 dark:bg-secondary-800 dark:text-secondary-200',
  primary: 'bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-300',
  success: 'bg-success-100 text-success-700 dark:bg-success-900/40 dark:text-success-300',
  warning: 'bg-warning-100 text-warning-800 dark:bg-warning-900/40 dark:text-warning-300',
  danger: 'bg-danger-100 text-danger-700 dark:bg-danger-900/40 dark:text-danger-300',
  outline: 'border border-border bg-transparent text-content-muted',
} as const;

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: keyof typeof variants;
};

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-lg px-2 py-0.5 text-2xs font-semibold tracking-wide',
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
