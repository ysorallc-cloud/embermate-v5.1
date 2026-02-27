// ============================================================================
// THEME CONTEXT
// Provides dynamic theming (dark/light/high-contrast) across the app
// ============================================================================

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../theme/theme-tokens';
import { LightColors } from '../theme/light-tokens';
import { HighContrastDarkOverrides, HighContrastLightOverrides } from '../theme/high-contrast-tokens';

// ============================================================================
// TYPES
// ============================================================================

export type ThemeMode = 'dark' | 'light' | 'system';

interface ThemeContextValue {
  /** The resolved color map (dark or light, with optional high-contrast overrides) */
  colors: typeof Colors;
  /** Current theme mode preference */
  themeMode: ThemeMode;
  /** The resolved theme (always 'dark' or 'light', never 'system') */
  resolvedTheme: 'dark' | 'light';
  /** Whether high contrast is enabled */
  highContrast: boolean;
  /** Update the theme mode */
  setThemeMode: (mode: ThemeMode) => void;
  /** Toggle high contrast on/off */
  setHighContrast: (enabled: boolean) => void;
}

const STORAGE_KEY = '@embermate_theme';
const HC_STORAGE_KEY = '@embermate_high_contrast';

// ============================================================================
// CONTEXT
// ============================================================================

const ThemeContext = createContext<ThemeContextValue>({
  colors: Colors,
  themeMode: 'dark',
  resolvedTheme: 'dark',
  highContrast: false,
  setThemeMode: () => {},
  setHighContrast: () => {},
});

// ============================================================================
// PROVIDER
// ============================================================================

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark');
  const [highContrast, setHighContrastState] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load saved preferences
  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(STORAGE_KEY),
      AsyncStorage.getItem(HC_STORAGE_KEY),
    ]).then(([themeValue, hcValue]) => {
      if (themeValue === 'dark' || themeValue === 'light' || themeValue === 'system') {
        setThemeModeState(themeValue);
      }
      if (hcValue === 'true') {
        setHighContrastState(true);
      }
      setLoaded(true);
    });
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    AsyncStorage.setItem(STORAGE_KEY, mode);
  }, []);

  const setHighContrast = useCallback((enabled: boolean) => {
    setHighContrastState(enabled);
    AsyncStorage.setItem(HC_STORAGE_KEY, enabled ? 'true' : 'false');
  }, []);

  // Resolve 'system' to actual theme
  const resolvedTheme: 'dark' | 'light' =
    themeMode === 'system'
      ? (systemScheme === 'light' ? 'light' : 'dark')
      : themeMode;

  // Build final colors: base theme + optional high-contrast overrides
  const colors = useMemo(() => {
    const base = resolvedTheme === 'light' ? (LightColors as typeof Colors) : Colors;
    if (!highContrast) return base;

    const overrides = resolvedTheme === 'light'
      ? HighContrastLightOverrides
      : HighContrastDarkOverrides;

    return { ...base, ...overrides } as typeof Colors;
  }, [resolvedTheme, highContrast]);

  return (
    <ThemeContext.Provider value={{ colors, themeMode, resolvedTheme, highContrast, setThemeMode, setHighContrast }}>
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
