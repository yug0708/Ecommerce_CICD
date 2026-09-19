import {
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/cn';
import { Button } from './Button';

export type DropdownItem = {
  id: string;
  label: string;
  onSelect?: () => void;
  disabled?: boolean;
  danger?: boolean;
};

type DropdownProps = {
  label: ReactNode;
  items: DropdownItem[];
  align?: 'left' | 'right';
  buttonProps?: ButtonHTMLAttributes<HTMLButtonElement>;
};

export function Dropdown({ label, items, align = 'left', buttonProps }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative inline-flex">
      <Button
        variant="outline"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        {...buttonProps}
      >
        {label}
        <span className="text-content-subtle" aria-hidden>
          ▾
        </span>
      </Button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className={cn(
            'absolute z-40 mt-2 min-w-[12rem] overflow-hidden rounded-xl border border-border bg-surface-overlay p-1 shadow-elevated animate-slide-up',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              className={cn(
                'flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition duration-150',
                'hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:outline-none',
                'disabled:cursor-not-allowed disabled:opacity-50',
                item.danger
                  ? 'text-danger-600 dark:text-danger-400'
                  : 'text-content',
              )}
              onClick={() => {
                if (item.disabled) return;
                item.onSelect?.();
                setOpen(false);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
