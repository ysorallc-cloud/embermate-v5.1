// ============================================================================
// Theme-wiring contract (light re-enabled, Lock §2).
// Post light-parity reconcile: ThemeContext wires getLightColors and derives
// resolvedTheme from themeMode (light-default; only explicit 'dark' is dark),
// light-tokens is imported ONLY via the sanctioned theme-tokens getter, and
// the mode/setMode API + ThemeMode union stay intact. (Was the v6.7 dark-only
// contract; inverted in F7 to the committed light-enabled reality.)
// NOTE: filename `darkOnlyContract` is now a misnomer — rename is a follow-up.
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

  it('imports the light color map (getLightColors) — light re-enabled per Lock §2', () => {
    // Light-parity reconcile: ThemeContext now pulls getLightColors so the
    // resolved map can be light. (The raw LightColors import lives in
    // theme-tokens; ThemeContext consumes the getter.)
    expect(themeContextSrc).toMatch(/getLightColors/);
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

  it('derives resolvedTheme from themeMode (light-default, not hardcoded dark)', () => {
    // Light-parity reconcile: resolvedTheme now branches on themeMode
    // (only explicit 'dark' is dark; light is the default), replacing the
    // v6.7 hardcoded `= 'dark'`.
    expect(themeContextSrc).toMatch(/resolvedTheme[^=]*=\s*themeMode\s*===\s*['"]dark['"]/);
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

describe('Codebase — light-tokens imported ONLY via the sanctioned getter', () => {
  // Walk the source tree for any TS/TSX file (outside node_modules and tests)
  // that imports from '/theme/light-tokens'. Post-reconcile the ONLY sanctioned
  // importer is theme-tokens.ts (which wires getLightColors) — it's skipped in
  // the walk. Any OTHER consumer must go through getLightColors, never raw
  // LightColors, so light stays wired through one door.
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
        } else if (
          /\.(tsx|ts)$/.test(entry) &&
          entry !== 'light-tokens.ts' &&
          entry !== 'theme-tokens.ts' // sanctioned importer — wires getLightColors
        ) {
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
