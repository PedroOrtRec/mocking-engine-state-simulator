import { useThemeStore, type Theme } from '@/stores/use-theme-store';
import { Sun, Moon, Monitor } from 'lucide-react';

interface ThemeOption {
  value: Theme;
  label: string;
  icon: typeof Sun;
}

const themeOptions: ThemeOption[] = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Oscuro', icon: Moon },
  { value: 'system', label: 'Sistema', icon: Monitor },
];

export function ThemeToggle({ className = '' }: { className?: string }) {
  const currentTheme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);

  return (
    <div
      role="group"
      aria-label="Selector de tema de color"
      className={`inline-flex items-center p-1 rounded-xl bg-secondary/80 border border-border shadow-inner gap-1 ${className}`}
    >
      {themeOptions.map(({ value, label, icon: Icon }) => {
        const isActive = currentTheme === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            aria-label={`Activar tema ${label}`}
            aria-pressed={isActive}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg transition-all duration-150 ${
              isActive
                ? 'bg-card text-foreground shadow-sm border border-border/60'
                : 'text-muted-foreground hover:text-foreground hover:bg-card/40'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
