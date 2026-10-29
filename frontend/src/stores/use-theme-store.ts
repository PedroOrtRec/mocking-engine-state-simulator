import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'light';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyThemeToDocument(resolvedTheme: ResolvedTheme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (resolvedTheme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

interface ThemeState {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  initThemeListener: () => () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      resolvedTheme: getSystemTheme(),
      setTheme: (theme: Theme) => {
        const resolvedTheme = theme === 'system' ? getSystemTheme() : theme;
        applyThemeToDocument(resolvedTheme);
        set({ theme, resolvedTheme });
      },
      toggleTheme: () => {
        const currentResolved = get().resolvedTheme;
        const nextTheme = currentResolved === 'dark' ? 'light' : 'dark';
        get().setTheme(nextTheme);
      },
      initThemeListener: () => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
          return () => {};
        }

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = () => {
          if (get().theme === 'system') {
            const nextResolved = mediaQuery.matches ? 'dark' : 'light';
            applyThemeToDocument(nextResolved);
            set({ resolvedTheme: nextResolved });
          }
        };

        // Escuchador de cambios en la preferencia del sistema
        if (typeof mediaQuery.addEventListener === 'function') {
          mediaQuery.addEventListener('change', handleChange);
          return () => mediaQuery.removeEventListener('change', handleChange);
        } else if (typeof mediaQuery.addListener === 'function') {
          // Soporte para navegadores o entornos de test más antiguos
          mediaQuery.addListener(handleChange);
          return () => mediaQuery.removeListener(handleChange);
        }

        return () => {};
      },
    }),
    {
      name: 'mockengine-theme-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          const resolved = state.theme === 'system' ? getSystemTheme() : state.theme;
          applyThemeToDocument(resolved);
          state.resolvedTheme = resolved;
        }
      },
    }
  )
);
