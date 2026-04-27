// ============================================================================
// THEME CONTEXT
// TODO: light mode disabled in v6.7 — the app ships dark-only. The mode/setMode
// API stays in place so a future re-enable can wire light tokens back in
// without churning consumers.
// ============================================================================

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { safeGetItem, safeSetItem } from '../utils/safeStorage';
import { Colors, _syncColors, getDarkColors } from '../theme/theme-tokens';
import { HighContrastDarkOverrides } from '../theme/high-contrast-tokens';
import { StorageKeys } from '../utils/storageKeys';

// ============================================================================
// TYPES
// ============================================================================

export type ThemeMode = 'dark' | 'light' | 'auto';

interface ThemeContextValue {
  /** The resolved color map (dark, with optional high-contrast overrides) */
  colors: typeof Colors;
  /** Persisted appearance preference. Honored on storage but ignored at runtime — see TODO above. */
  mode: ThemeMode;
  /** Persist a new appearance mode. Stored for forward compatibility; runtime stays dark. */
  setMode: (mode: ThemeMode) => void;
  /** @deprecated Use `mode` instead. Alias kept for back-compat. */
  themeMode: ThemeMode;
  /** Always 'dark' in v6.7 — light mode disabled. */
  resolvedTheme: 'dark' | 'light';
  /** Whether high contrast is enabled */
  highContrast: boolean;
  /** @deprecated Use `setMode` instead. Alias kept for back-compat. */
  setThemeMode: (mode: ThemeMode) => void;
  /** Toggle high contrast on/off */
  setHighContrast: (enabled: boolean) => void;
}

const APPEARANCE_KEY = 'embermate.appearance.mode';
const HC_STORAGE_KEY = StorageKeys.HIGH_CONTRAST;

// ============================================================================
// CONTEXT
// ============================================================================

const ThemeContext = createContext<ThemeContextValue>({
  colors: Colors,
  mode: 'dark',
  setMode: () => {},
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
  // Persisted preference is loaded but does NOT influence the rendered theme
  // in v6.7 — see TODO at top of file. Kept in state so the Settings UI (if
  // ever re-enabled) can read/write it without re-plumbing.
  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark');
  const [highContrast, setHighContrastState] = useState(false);

  // Load saved preferences (kept for forward compat — does not change render)
  useEffect(() => {
    Promise.all([
      safeGetItem<string | null>(APPEARANCE_KEY, null),
      safeGetItem<string | null>(HC_STORAGE_KEY, null),
    ]).then(([modeValue, hcValue]) => {
      if (modeValue === 'dark' || modeValue === 'light' || modeValue === 'auto') {
        setThemeModeState(modeValue);
      }
      if (hcValue === 'true') {
        setHighContrastState(true);
      }
    });
  }, []);

  const setMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    safeSetItem(APPEARANCE_KEY, mode);
  }, []);

  // Back-compat alias
  const setThemeMode = setMode;

  const setHighContrast = useCallback((enabled: boolean) => {
    setHighContrastState(enabled);
    safeSetItem(HC_STORAGE_KEY, enabled ? 'true' : 'false');
  }, []);

  // light mode disabled in v6.7 — always resolve to dark.
  const resolvedTheme: 'dark' | 'light' = 'dark';

  // Build final colors: dark base, with high-contrast overlay if enabled.
  const colors = useMemo(() => {
    const base = getDarkColors() as typeof Colors;
    if (!highContrast) return base;
    return { ...base, ...HighContrastDarkOverrides } as typeof Colors;
  }, [highContrast]);

  // Keep global Colors object in sync so files that read Colors.X at render
  // time (including static StyleSheet.create references) pick up updates.
  useEffect(() => {
    _syncColors(colors);
  }, [colors]);

  return (
    <ThemeContext.Provider value={{ colors, mode: themeMode, setMode, themeMode, resolvedTheme, highContrast, setThemeMode, setHighContrast }}>
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
