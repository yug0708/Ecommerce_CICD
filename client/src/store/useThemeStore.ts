import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark';

type ThemeState = {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
};

function applyThemeClass(theme: ThemeMode) {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      setTheme: (theme) => {
        applyThemeClass(theme);
        set({ theme });
      },
      toggleTheme: () => {
        const next = get().theme === 'light' ? 'dark' : 'light';
        applyThemeClass(next);
        set({ theme: next });
      },
    }),
    {
      name: 'ecommerce-theme',
      onRehydrateStorage: () => (state) => {
        applyThemeClass(state?.theme ?? 'light');
      },
    },
  ),
);

/** Call once at app boot before paint if possible */
export function initTheme() {
  try {
    const raw = localStorage.getItem('ecommerce-theme');
    if (raw) {
      const parsed = JSON.parse(raw) as { state?: { theme?: ThemeMode } };
      applyThemeClass(parsed.state?.theme ?? 'light');
    }
  } catch {
    applyThemeClass('light');
  }
}
