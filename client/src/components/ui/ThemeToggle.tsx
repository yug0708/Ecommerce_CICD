import { Button } from './Button';
import { useThemeStore } from '@/store/useThemeStore';

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleTheme}
      className={className}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? 'Dark' : 'Light'} mode
    </Button>
  );
}
