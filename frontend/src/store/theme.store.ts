import { useEffect } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const THEME_STORAGE_KEY = 'bizzw-theme';

export type ThemeMode = 'dark';
type ResolvedTheme = 'dark';

interface ThemeState {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
  setDark: (dark: boolean) => void;
  setResolvedTheme: (theme: ResolvedTheme) => void;
}

function applyTheme() {
  document.documentElement.classList.add('dark');
  document.documentElement.style.colorScheme = 'dark';
}

function createThemeSnapshot() {
  return {
    mode: 'dark' as const,
    resolvedTheme: 'dark' as const,
    isDark: true,
  };
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      ...createThemeSnapshot(),
      setMode: () => set(() => createThemeSnapshot()),
      toggle: () => set(() => createThemeSnapshot()),
      setDark: () => set(() => createThemeSnapshot()),
      setResolvedTheme: () => set(() => createThemeSnapshot()),
    }),
    {
      name: THEME_STORAGE_KEY,
      version: 3,
      partialize: (state) => ({ mode: state.mode }),
      migrate: () => createThemeSnapshot(),
    }
  )
);

/**
 * Forces dark theme on <html> globally.
 * Call this once at app root level.
 */
export function useThemeEffect() {
  useEffect(() => {
    applyTheme();
  }, []);
}
