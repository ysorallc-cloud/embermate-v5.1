// ============================================================================
// THEME CONTEXT
// Provides dynamic theming (dark/light) across the app
// ============================================================================

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../theme/theme-tokens';
import { LightColors } from '../theme/light-tokens';

// ============================================================================
// TYPES
// ============================================================================

export type ThemeMode = 'dark' | 'light' | 'system';

interface ThemeContextValue {
  /** The resolved color map (dark or light) */
  colors: typeof Colors;
  /** Current theme mode preference */
  themeMode: ThemeMode;
  /** The resolved theme (always 'dark' or 'light', never 'system') */
  resolvedTheme: 'dark' | 'light';
  /** Update the theme mode */
  setThemeMode: (mode: ThemeMode) => void;
}

const STORAGE_KEY = '@embermate_theme';

// ============================================================================
// CONTEXT
// ============================================================================

const ThemeContext = createContext<ThemeContextValue>({
  colors: Colors,
  themeMode: 'dark',
  resolvedTheme: 'dark',
  setThemeMode: () => {},
});

// ============================================================================
// PROVIDER
// ============================================================================

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark');
  const [loaded, setLoaded] = useState(false);

  // Load saved preference
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(value => {
      if (value === 'dark' || value === 'light' || value === 'system') {
        setThemeModeState(value);
      }
      setLoaded(true);
    });
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    AsyncStorage.setItem(STORAGE_KEY, mode);
  }, []);

  // Resolve 'system' to actual theme
  const resolvedTheme: 'dark' | 'light' =
    themeMode === 'system'
      ? (systemScheme === 'light' ? 'light' : 'dark')
      : themeMode;

  const colors = resolvedTheme === 'light' ? (LightColors as typeof Colors) : Colors;

  return (
    <ThemeContext.Provider value={{ colors, themeMode, resolvedTheme, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function useTheme() {
  return useContext(ThemeContext);
}
