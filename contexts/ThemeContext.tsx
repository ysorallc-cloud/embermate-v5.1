// ============================================================================
// THEME CONTEXT
// TODO: light mode disabled in v6.7 — the app ships dark-only. The mode/setMode
// API stays in place so a future re-enable can wire light tokens back in
// without churning consumers.
// ============================================================================

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { safeGetItem, safeSetItem } from '../utils/safeStorage';
import { Colors, _syncColors, getDarkColors, getLightColors } from '../theme/theme-tokens';
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
  // DARK is the v1 launch default. Design-Lock §2 makes light primary, but
  // light-mode is DEFERRED to a post-launch fast-follow — all the light work
  // (light tokens, parity reconcile, WCAG fix, getLightColors) stays wired and
  // reachable via setMode('light'); only the DEFAULT ships dark, which is what
  // we build + QA against pre-launch. A stored preference is still honored.
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
      // v6.7: HC toggle retired; storage may have stale 'true' from prior
      // versions. Force-clear on read so the override never reaches the
      // render path. Migration is one-shot per device — once written false,
      // future reads short-circuit harmlessly. The HC code path itself
      // stays in place so a future accessibility-driven HC mode can wire
      // it back in without re-plumbing the merge logic.
      if (hcValue === 'true') {
        safeSetItem(HC_STORAGE_KEY, 'false');
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

  // Resolve the active theme from the mode. v1 ships DARK-primary (light
  // deferred post-launch), so the default themeMode 'dark' resolves dark;
  // light is reachable only when the user explicitly sets 'light'. ('auto' →
  // follow-system is deferred — needs useColorScheme, absent from the RN test
  // mock — so it currently resolves light; not on the pre-launch path.)
  const resolvedTheme: 'dark' | 'light' = themeMode === 'dark' ? 'dark' : 'light';

  // Build final colors from the resolved theme. High-contrast overrides are
  // dark-tuned, so they apply only in dark for now (a light HC set is a later
  // accessibility task, out of scope for the parity reconcile).
  const colors = useMemo(() => {
    const base = (resolvedTheme === 'light' ? getLightColors() : getDarkColors()) as typeof Colors;
    if (!highContrast || resolvedTheme !== 'dark') return base;
    return { ...base, ...HighContrastDarkOverrides } as typeof Colors;
  }, [highContrast, resolvedTheme]);

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
