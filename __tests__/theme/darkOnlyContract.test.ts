// ============================================================================
// Dark-only contract — light mode is disabled in v6.7.
// Asserts the ThemeContext no longer subscribes to OS appearance, never
// imports the light token set, and always resolves to dark tokens —
// while the mode/setMode API stays intact for forward compatibility.
// ============================================================================

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const themeContextSrc = readFileSync(
  join(ROOT, 'contexts/ThemeContext.tsx'),
  'utf8',
);

describe('ThemeContext — dark-only contract', () => {
  it('does not subscribe to OS appearance changes', () => {
    expect(themeContextSrc).not.toMatch(/Appearance\.addChangeListener/);
    expect(themeContextSrc).not.toMatch(/Appearance\.getColorScheme/);
  });

  it('does not import the light token set', () => {
    expect(themeContextSrc).not.toMatch(/from\s+['"][\.\/]*theme\/light-tokens['"]/);
    expect(themeContextSrc).not.toMatch(/import\s*\{[^}]*LightColors[^}]*\}/);
  });

  it('marks light mode as deferred with a TODO comment', () => {
    expect(themeContextSrc).toMatch(/light mode disabled in v6\.7/i);
  });

  it('keeps `mode` and `setMode` in the public API (back-compat)', () => {
    // The context value object should still expose mode + setMode
    expect(themeContextSrc).toMatch(/\bmode:/);
    expect(themeContextSrc).toMatch(/\bsetMode\b/);
  });

  it('preserves the ThemeMode union (dark | light | auto) for forward compat', () => {
    // The type stays intact so a future re-enable doesn't have to widen the
    // union from a single literal back to three values across consumers.
    expect(themeContextSrc).toMatch(/type\s+ThemeMode\s*=[^;]*'dark'/);
    expect(themeContextSrc).toMatch(/type\s+ThemeMode\s*=[^;]*'light'/);
    expect(themeContextSrc).toMatch(/type\s+ThemeMode\s*=[^;]*'auto'/);
  });

  it('ThemeContextValue interface declares mode and setMode with ThemeMode signatures', () => {
    expect(themeContextSrc).toMatch(/mode:\s*ThemeMode/);
    expect(themeContextSrc).toMatch(/setMode:\s*\(mode:\s*ThemeMode\)\s*=>\s*void/);
  });

  it('persists mode value via safeSetItem (forward compatibility)', () => {
    // setMode body must still write the chosen mode to storage so a
    // future re-enable of light mode picks up the user's preference.
    expect(themeContextSrc).toMatch(/safeSetItem\([^)]*APPEARANCE_KEY[^)]*\)/);
  });

  it("uses the 'embermate.appearance.mode' storage key", () => {
    // Persistence key is part of the on-disk contract — changing it would
    // strand any preference saved by a prior install.
    expect(themeContextSrc).toContain("'embermate.appearance.mode'");
  });

  it('hard-codes resolvedTheme to "dark"', () => {
    // No conditional branching on `themeMode === 'light'` for the
    // resolvedTheme value. Either a literal 'dark' or always-dark assignment.
    expect(themeContextSrc).toMatch(/resolvedTheme[^=]*=\s*['"]dark['"]/);
  });

  it('exported Colors object equals the dark token set', () => {
    // The exported Colors (read directly by static StyleSheet.create calls
    // across the codebase) must match the dark palette, with no light-mode
    // fallback path possible.
    const { Colors, getDarkColors } = require('../../theme/theme-tokens');
    const dark = getDarkColors();
    expect(Colors.background).toBe(dark.background);
    expect(Colors.glass).toBe(dark.glass);
    expect(Colors.textPrimary).toBe(dark.textPrimary);
  });
});

describe('Codebase — no remaining light-tokens imports', () => {
  // Walk the source tree and find any TS/TSX file (outside node_modules and
  // tests) that still imports from '/theme/light-tokens'. The file itself
  // stays on disk for future re-enablement, but no consumer should pull it.
  function listSourceFiles(dir: string): string[] {
    const out: string[] = [];
    const { readdirSync, statSync } = require('fs');
    const walk = (p: string) => {
      for (const entry of readdirSync(p)) {
        const full = join(p, entry);
        const s = statSync(full);
        if (s.isDirectory()) {
          if (entry === 'node_modules' || entry === '.git' || entry.startsWith('.')) continue;
          if (entry === 'light-tokens.ts') continue; // skip the file itself
          walk(full);
        } else if (/\.(tsx|ts)$/.test(entry) && entry !== 'light-tokens.ts') {
          out.push(full);
        }
      }
    };
    walk(dir);
    return out;
  }

  it('no source file imports from theme/light-tokens', () => {
    const dirs = ['app', 'components', 'contexts', 'hooks', 'lib', 'services', 'storage', 'theme', 'types', 'utils'];
    const offenders: { file: string; line: number; text: string }[] = [];

    for (const dir of dirs) {
      const root = join(ROOT, dir);
      if (!existsSync(root)) continue;
      for (const file of listSourceFiles(root)) {
        const lines = readFileSync(file, 'utf8').split('\n');
        lines.forEach((line, i) => {
          if (/from\s+['"][\.\/]*(?:theme\/)?light-tokens['"]/.test(line)) {
            offenders.push({ file: file.replace(ROOT + '/', ''), line: i + 1, text: line.trim() });
          }
        });
      }
    }

    if (offenders.length > 0) {
      const report = offenders.map(o => `  ${o.file}:${o.line} — ${o.text}`).join('\n');
      throw new Error(`Found ${offenders.length} stale light-tokens import(s):\n${report}`);
    }
    expect(offenders.length).toBe(0);
  });
});
