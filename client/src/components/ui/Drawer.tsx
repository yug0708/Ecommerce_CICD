import { useEffect, useId, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';

type DrawerProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  widthClassName?: string;
};

export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
  widthClassName = 'max-w-lg',
}: DrawerProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close drawer"
        className="absolute inset-0 bg-secondary-950/40 backdrop-blur-[1px] animate-fade-in"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          'absolute inset-y-0 right-0 flex w-full flex-col border-l border-border bg-surface-overlay shadow-elevated animate-slide-up',
          widthClassName,
          className,
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 id={titleId} className="text-base font-semibold text-content">
              {title}
            </h2>
            {description ? <p className="mt-1 text-sm text-content-muted">{description}</p> : null}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            ×
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? (
          <div className="border-t border-border px-5 py-4">{footer}</div>
        ) : null}
      </aside>
    </div>,
    document.body,
  );
}
