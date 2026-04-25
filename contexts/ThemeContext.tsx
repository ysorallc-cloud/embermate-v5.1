// ============================================================================
// THEME CONTEXT
// Provides dynamic theming (dark/light/high-contrast) across the app
// ============================================================================

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useColorScheme, Appearance } from 'react-native';
import { safeGetItem, safeSetItem } from '../utils/safeStorage';
import { Colors, _syncColors, getDarkColors } from '../theme/theme-tokens';
import { LightColors } from '../theme/light-tokens';
import { HighContrastDarkOverrides, HighContrastLightOverrides } from '../theme/high-contrast-tokens';
import { StorageKeys } from '../utils/storageKeys';

// ============================================================================
// TYPES
// ============================================================================

export type ThemeMode = 'dark' | 'light' | 'auto';

interface ThemeContextValue {
  /** The resolved color map (dark or light, with optional high-contrast overrides) */
  colors: typeof Colors;
  /** Current appearance mode preference */
  mode: ThemeMode;
  /** Update the appearance mode and persist to storage */
  setMode: (mode: ThemeMode) => void;
  /** @deprecated Use `mode` instead. Alias kept for back-compat. */
  themeMode: ThemeMode;
  /** The resolved theme (always 'dark' or 'light', never 'auto') */
  resolvedTheme: 'dark' | 'light';
  /** Whether high contrast is enabled */
  highContrast: boolean;
  /** @deprecated Use `setMode` instead. Alias kept for back-compat. */
  setThemeMode: (mode: ThemeMode) => void;
  /** Toggle high contrast on/off */
  setHighContrast: (enabled: boolean) => void;
}

// Persistence key — distinct from the legacy StorageKeys.THEME so existing
// 'system' values don't collide with the new 'auto' vocabulary.
const APPEARANCE_KEY = 'embermate.appearance.mode';
const HC_STORAGE_KEY = StorageKeys.HIGH_CONTRAST;

// ============================================================================
// CONTEXT
// ============================================================================

const ThemeContext = createContext<ThemeContextValue>({
  colors: Colors,
  mode: 'auto',
  setMode: () => {},
  themeMode: 'auto',
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
  // Fresh installs default to 'auto' (follow OS). The upgrade-detection
  // logic below overrides this to 'dark' for existing users so they don't
  // get a surprise light-mode flip on upgrade.
  const [themeMode, setThemeModeState] = useState<ThemeMode>('auto');
  const [highContrast, setHighContrastState] = useState(false);
  const [loaded, setLoaded] = useState(false);
  // Track the live OS scheme for 'auto' mode. useColorScheme provides
  // the initial value; Appearance.addChangeListener keeps it in sync
  // when the OS setting flips while the app is foregrounded.
  const [osScheme, setOsScheme] = useState<'light' | 'dark'>(
    systemScheme === 'light' ? 'light' : 'dark',
  );

  // Subscribe to live OS appearance changes so 'auto' mode reacts
  // immediately when the user toggles dark/light in system settings.
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setOsScheme(colorScheme === 'light' ? 'light' : 'dark');
    });
    return () => subscription.remove();
  }, []);

  // Load saved preferences + detect upgrade scenario
  useEffect(() => {
    Promise.all([
      safeGetItem<string | null>(APPEARANCE_KEY, null),
      // Also check the legacy key for migration
      safeGetItem<string | null>(StorageKeys.THEME, null),
      safeGetItem<string | null>(HC_STORAGE_KEY, null),
      // Detect existing user: if ONBOARDING_COMPLETE is set, this is an
      // upgrade — not a fresh install.
      safeGetItem<string | null>(StorageKeys.ONBOARDING_COMPLETE, null),
    ]).then(([modeValue, legacyTheme, hcValue, onboardingDone]) => {
      if (modeValue === 'dark' || modeValue === 'light' || modeValue === 'auto') {
        // Explicit saved preference — use it.
        setThemeModeState(modeValue);
      } else if (legacyTheme === 'dark' || legacyTheme === 'light') {
        // Migrate from legacy 'system' → 'auto', or keep dark/light.
        const migrated: ThemeMode = legacyTheme === 'dark' ? 'dark' : 'light';
        setThemeModeState(migrated);
        safeSetItem(APPEARANCE_KEY, migrated);
      } else if (legacyTheme === 'system') {
        // Legacy 'system' maps to our 'auto'.
        setThemeModeState('auto');
        safeSetItem(APPEARANCE_KEY, 'auto');
      } else if (onboardingDone) {
        // Existing user upgrade with no theme preference persisted:
        // default to 'dark' to avoid a surprise flip.
        setThemeModeState('dark');
      }
      // else: fresh install — keep the 'auto' default from useState.

      if (hcValue === 'true') {
        setHighContrastState(true);
      }
      setLoaded(true);
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

  // Resolve 'auto' to the live OS color scheme
  const resolvedTheme: 'dark' | 'light' =
    themeMode === 'auto'
      ? osScheme
      : themeMode;

  // Build final colors: pick base theme, then overlay high-contrast if enabled
  const colors = useMemo(() => {
    const base = resolvedTheme === 'light'
      ? (LightColors as typeof Colors)
      : (getDarkColors() as typeof Colors);

    if (!highContrast) return base;

    const overrides = resolvedTheme === 'light'
      ? HighContrastLightOverrides
      : HighContrastDarkOverrides;

    return { ...base, ...overrides } as typeof Colors;
  }, [resolvedTheme, highContrast]);

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
