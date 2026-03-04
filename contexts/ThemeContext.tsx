// ============================================================================
// THEME CONTEXT
// Provides dynamic theming (dark/light/high-contrast) across the app
// ============================================================================

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { safeGetItem, safeSetItem } from '../utils/safeStorage';
import { Colors, _syncColors } from '../theme/theme-tokens';
import { LightColors } from '../theme/light-tokens';
import { HighContrastDarkOverrides, HighContrastLightOverrides } from '../theme/high-contrast-tokens';
import { StorageKeys } from '../utils/storageKeys';

// ============================================================================
// TYPES
// ============================================================================

// 'light' is defined but disabled in the UI — StyleSheet.create() at module scope
// captures dark-theme Colors values, making light mode show white-on-white text.
// To re-enable: migrate all 70 screens from static StyleSheet to useTheme() hook.
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

const STORAGE_KEY = StorageKeys.THEME;
const HC_STORAGE_KEY = StorageKeys.HIGH_CONTRAST;

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
      safeGetItem<string | null>(STORAGE_KEY, null),
      safeGetItem<string | null>(HC_STORAGE_KEY, null),
    ]).then(([themeValue, hcValue]) => {
      if (themeValue === 'dark') {
        setThemeModeState('dark');
      } else if (themeValue === 'system') {
        // System theme can resolve to 'light' which is broken,
        // so force dark until light mode StyleSheet migration is done
        setThemeModeState('dark');
        safeSetItem(STORAGE_KEY, 'dark');
      } else {
        // 'light' or any other value — force back to dark
        setThemeModeState('dark');
        safeSetItem(STORAGE_KEY, 'dark');
      }
      if (hcValue === 'true') {
        setHighContrastState(true);
      }
      setLoaded(true);
    });
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    safeSetItem(STORAGE_KEY, mode);
  }, []);

  const setHighContrast = useCallback((enabled: boolean) => {
    setHighContrastState(enabled);
    safeSetItem(HC_STORAGE_KEY, enabled ? 'true' : 'false');
  }, []);

  // Resolve 'system' to actual theme
  const resolvedTheme: 'dark' | 'light' =
    themeMode === 'system'
      ? (systemScheme === 'light' ? 'light' : 'dark')
      : themeMode;

  // Build final colors
  // NOTE: Light theme disabled — StyleSheet.create() at module scope captures
  // dark-theme color values at import time, so switching to light colors
  // only changes backgrounds (read at render) while text stays white (frozen).
  // Always use dark base until all 70 screens migrate to useTheme() hook.
  const colors = useMemo(() => {
    const base = Colors; // Always dark — light mode disabled
    if (!highContrast) return base;
    return { ...base, ...HighContrastDarkOverrides } as typeof Colors;
  }, [highContrast]);

  // Prong 1: keep global Colors object in sync so non-migrated files
  // that read Colors.X at render time get the correct values.
  useEffect(() => {
    _syncColors(colors);
  }, [colors]);

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
