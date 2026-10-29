import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useThemeStore, applyThemeToDocument } from './use-theme-store';

describe('useThemeStore', () => {
  beforeEach(() => {
    document.documentElement.className = '';
    localStorage.clear();
    useThemeStore.setState({ theme: 'system', resolvedTheme: 'light' });
  });

  it('debe aplicar la clase .dark cuando el tema resuelto es dark', () => {
    applyThemeToDocument('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    applyThemeToDocument('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('debe cambiar el tema a light y sincronizar el DOM', () => {
    const { setTheme } = useThemeStore.getState();
    setTheme('light');

    expect(useThemeStore.getState().theme).toBe('light');
    expect(useThemeStore.getState().resolvedTheme).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('debe cambiar el tema a dark y agregar la clase .dark al elemento raíz', () => {
    const { setTheme } = useThemeStore.getState();
    setTheme('dark');

    expect(useThemeStore.getState().theme).toBe('dark');
    expect(useThemeStore.getState().resolvedTheme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('debe alternar entre light y dark con toggleTheme', () => {
    const { setTheme, toggleTheme } = useThemeStore.getState();
    setTheme('light');
    expect(useThemeStore.getState().resolvedTheme).toBe('light');

    toggleTheme();
    expect(useThemeStore.getState().resolvedTheme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    toggleTheme();
    expect(useThemeStore.getState().resolvedTheme).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('debe escuchar cambios del sistema cuando el tema es "system"', () => {
    let changeHandler: (() => void) | null = null;

    vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({
      matches: true, // Simula que el sistema cambia a dark
      media: query,
      onchange: null,
      addEventListener: vi.fn((event: string, handler: () => void) => {
        if (event === 'change') changeHandler = handler;
      }),
      removeEventListener: vi.fn(),
    })));

    const { setTheme, initThemeListener } = useThemeStore.getState();
    setTheme('system');

    const cleanup = initThemeListener();
    expect(changeHandler).toBeDefined();

    // Disparar cambio de preferencia del SO
    if (typeof changeHandler === 'function') {
      (changeHandler as () => void)();
    }

    expect(useThemeStore.getState().resolvedTheme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    cleanup();
  });
});
