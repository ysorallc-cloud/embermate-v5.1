/**
 * ThemeContext appearance mode — structural tests.
 *
 * Verifies the ThemeProvider supports 'light' | 'dark' | 'auto', persists
 * under the correct key, defaults correctly for fresh installs vs upgrades,
 * and resolves 'auto' via the OS color scheme.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const src = readFileSync(
  join(__dirname, '../../contexts/ThemeContext.tsx'),
  'utf8',
);

describe('ThemeContext — appearance mode', () => {
  describe('mode type', () => {
    it("ThemeMode includes 'auto' (not just 'system')", () => {
      expect(src).toMatch(/type ThemeMode\s*=.*'auto'/);
    });

    it("ThemeMode includes 'light' and 'dark'", () => {
      expect(src).toMatch(/type ThemeMode\s*=.*'dark'/);
      expect(src).toMatch(/type ThemeMode\s*=.*'light'/);
    });
  });

  describe('persistence', () => {
    it("persists to 'embermate.appearance.mode' storage key", () => {
      expect(src).toContain("'embermate.appearance.mode'");
    });
  });

  describe('fresh install default', () => {
    it("defaults to 'auto' when no persisted value exists", () => {
      // The useState initializer should be 'auto', not 'dark' or 'system'.
      // Fresh installs have no saved preference and should follow the OS.
      expect(src).toMatch(/useState<ThemeMode>\('auto'\)/);
    });
  });

  describe('existing user upgrade default', () => {
    it("detects existing users and defaults to 'dark' to avoid surprise flip", () => {
      // When app data exists (e.g. ONBOARDING_COMPLETE) but no theme
      // preference is persisted, the provider should set mode to 'dark'
      // rather than 'auto' so existing dark-mode users aren't surprised
      // by a light-mode flip on upgrade.
      expect(src).toMatch(/ONBOARDING_COMPLETE|existingUser|isUpgrade/i);
      expect(src).toContain("'dark'");
    });
  });

  describe('auto resolution', () => {
    it("resolves 'auto' via useColorScheme / Appearance", () => {
      expect(src).toMatch(/useColorScheme/);
      // The resolved theme for 'auto' should read from systemScheme.
      expect(src).toMatch(/themeMode === 'auto'/);
    });
  });

  describe('color sets', () => {
    it("resolved 'light' loads LightColors", () => {
      expect(src).toMatch(/resolvedTheme === 'light'[\s\S]*?LightColors/);
    });

    it("resolved 'dark' loads getDarkColors", () => {
      expect(src).toMatch(/getDarkColors\(\)/);
    });
  });

  describe('context value exposes mode + setMode', () => {
    it("context value includes 'mode' (not just themeMode)", () => {
      // The provider value must expose `mode` so consumers can read the
      // current appearance preference directly.
      expect(src).toMatch(/value=\{\{[^}]*\bmode\b/);
    });

    it("context value includes 'setMode' setter", () => {
      expect(src).toMatch(/value=\{\{[^}]*\bsetMode\b/);
    });

    it("ThemeContextValue interface declares mode and setMode", () => {
      expect(src).toMatch(/mode:\s*ThemeMode/);
      expect(src).toMatch(/setMode:\s*\(mode:\s*ThemeMode\)\s*=>\s*void/);
    });
  });

  describe('live OS scheme subscription for auto mode', () => {
    it("subscribes to Appearance changes so 'auto' updates live", () => {
      // When the OS dark/light setting flips while the app is foregrounded,
      // the provider must react. Appearance.addChangeListener provides
      // this (useColorScheme alone may not trigger in all RN versions).
      expect(src).toMatch(/Appearance\.addChangeListener|Appearance\s*,/);
    });
  });
});
