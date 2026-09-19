import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';
import { useToastStore, type ToastVariant } from '@/store/useToastStore';

const variantStyles: Record<ToastVariant, string> = {
  default: 'border-border bg-surface-overlay text-content',
  success:
    'border-success-200 bg-success-50 text-success-900 dark:border-success-800 dark:bg-success-900/50 dark:text-success-100',
  error:
    'border-danger-200 bg-danger-50 text-danger-900 dark:border-danger-800 dark:bg-danger-900/50 dark:text-danger-100',
  warning:
    'border-warning-200 bg-warning-50 text-warning-950 dark:border-warning-800 dark:bg-warning-900/50 dark:text-warning-100',
};

export function ToastViewport() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-end gap-2 p-4 sm:p-6"
      aria-live="polite"
    >
      {toasts.map((item) => (
        <div
          key={item.id}
          className={cn(
            'pointer-events-auto w-full max-w-sm rounded-2xl border px-4 py-3 shadow-elevated animate-slide-up',
            variantStyles[item.variant],
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{item.title}</p>
              {item.description ? (
                <p className="mt-0.5 text-sm opacity-80">{item.description}</p>
              ) : null}
            </div>
            <button
              type="button"
              className="rounded-lg px-1.5 text-lg leading-none opacity-60 transition hover:opacity-100"
              onClick={() => dismiss(item.id)}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>,
    document.body,
  );
}
