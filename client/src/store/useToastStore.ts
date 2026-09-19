import { create } from 'zustand';

export type ToastVariant = 'default' | 'success' | 'error' | 'warning';

export type ToastItem = {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  duration: number;
};

type ToastInput = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
};

type ToastState = {
  toasts: ToastItem[];
  push: (toast: ToastInput) => string;
  dismiss: (id: string) => void;
  clear: () => void;
};

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (toast) => {
    const id = crypto.randomUUID();
    const item: ToastItem = {
      id,
      title: toast.title,
      description: toast.description,
      variant: toast.variant ?? 'default',
      duration: toast.duration ?? 4000,
    };
    set((state) => ({ toasts: [...state.toasts, item] }));

    if (item.duration > 0) {
      window.setTimeout(() => {
        get().dismiss(id);
      }, item.duration);
    }

    return id;
  },
  dismiss: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
  clear: () => set({ toasts: [] }),
}));

export const toast = {
  show: (input: ToastInput) => useToastStore.getState().push(input),
  success: (title: string, description?: string) =>
    useToastStore.getState().push({ title, description, variant: 'success' }),
  error: (title: string, description?: string) =>
    useToastStore.getState().push({ title, description, variant: 'error' }),
  warning: (title: string, description?: string) =>
    useToastStore.getState().push({ title, description, variant: 'warning' }),
};
