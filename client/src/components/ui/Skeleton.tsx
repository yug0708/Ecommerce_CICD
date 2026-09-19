import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type SkeletonProps = HTMLAttributes<HTMLDivElement> & {
  rounded?: 'md' | 'lg' | 'xl' | '2xl' | 'full';
};

export function Skeleton({ className, rounded = 'xl', ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden bg-secondary-200/80 dark:bg-secondary-800',
        rounded === 'md' && 'rounded-md',
        rounded === 'lg' && 'rounded-lg',
        rounded === 'xl' && 'rounded-xl',
        rounded === '2xl' && 'rounded-2xl',
        rounded === 'full' && 'rounded-full',
        className,
      )}
      {...props}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/50 to-transparent dark:via-white/10" />
    </div>
  );
}
