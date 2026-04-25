// ============================================================================
// 3_POLISH_AND_TESTING Fix 14 — Light theme warm token parity
// ============================================================================
//
// Asserts that every warm-surface and warm-text token added to DarkColors
// during the v6 redesign is also present in LightColors. The two palettes
// don't have to share values — they just have to share KEYS so any
// `c.warmSurface` reference renders without crashing in either theme.
//
// CLAUDE.md flags the light theme as "currently disabled" but that should
// be a runtime decision (e.g. a settings toggle that defaults to dark),
// not a structural shape mismatch in the tokens themselves. Surfacing key
// gaps here means the theme can be re-enabled cleanly when product wants.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

/**
 * Pull the top-level token KEYS out of a palette object literal source file.
 * We rely on the source-file shape `const Foo = { key: value, ... }` rather
 * than evaluating the module — the dark/light files import from React
 * Native packages that don't run cleanly under ts-jest's `node`
 * environment.
 */
function extractKeys(src: string, constName: string): Set<string> {
  const startMarker = `${constName} = {`;
  const start = src.indexOf(startMarker);
  if (start === -1) throw new Error(`Could not find ${constName} declaration`);
  // Walk forward, balancing braces, to find the matching close.
  let depth = 0;
  let i = start + startMarker.length - 1; // first '{'
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) break;
    }
  }
  const body = src.slice(start + startMarker.length, i);
  const keys = new Set<string>();
  // Match top-level `keyName:` declarations. Skip nested object members by
  // requiring the key to start at the beginning of a line (after optional
  // whitespace) followed by `:` and a value.
  const lineRegex = /^\s{2,4}([a-zA-Z_][a-zA-Z0-9_]*):/gm;
  let m: RegExpExecArray | null;
  while ((m = lineRegex.exec(body)) !== null) {
    keys.add(m[1]);
  }
  return keys;
}

const darkSrc = read('theme/theme-tokens.ts');
const lightSrc = read('theme/light-tokens.ts');
const darkKeys = extractKeys(darkSrc, 'DarkColors');
const lightKeys = extractKeys(lightSrc, 'LightColors');

// The token names that v6 redesign added — both palettes must declare them.
const REQUIRED_WARM_KEYS = [
  'warmSurface',
  'warmSurfaceBorder',
  'warmSurfaceAlert',
  'warmSurfaceAlertBorder',
  'warmSurfaceQuiet',
  'warmSurfaceQuietBorder',
  'warmSurfaceGreen',
  'warmSurfaceGreenBorder',
  'warmSurfacePurple',
  'warmSurfacePurpleBorder',
  'textWarmPrimary',
  'textWarmSecondary',
  'textWarmMuted',
  'textWarmHint',
  'textWarmDim',
  'textAlertLabel',
  'textAlertPrimary',
  'textAlertSecondary',
  'textAlertHint',
] as const;

describe('theme — warm token parity (Fix 14)', () => {
  describe('DarkColors declares every warm token', () => {
    for (const key of REQUIRED_WARM_KEYS) {
      it(`has ${key}`, () => {
        expect(darkKeys.has(key)).toBe(true);
      });
    }
  });

  describe('LightColors declares every warm token', () => {
    for (const key of REQUIRED_WARM_KEYS) {
      it(`has ${key}`, () => {
        expect(lightKeys.has(key)).toBe(true);
      });
    }
  });

  it('LightColors warm-surface values are visibly distinct from the linen background', () => {
    // The point of warm surfaces in light mode is to lift cards above the
    // base linen — they cannot all be the same hex as `background`.
    const bgMatch = lightSrc.match(/background:\s*['"](#[0-9A-Fa-f]{3,8})['"]/);
    expect(bgMatch).toBeTruthy();
    const bg = bgMatch![1];
    const warmSurfaceMatch = lightSrc.match(/warmSurface:\s*['"](#[0-9A-Fa-f]{3,8})['"]/);
    expect(warmSurfaceMatch).toBeTruthy();
    expect(warmSurfaceMatch![1].toLowerCase()).not.toBe(bg.toLowerCase());
  });

  it('DarkColors warm-surface is darker than its background (lift via lightness)', () => {
    // Spot-check that the dark warm surface (#131820) is brighter than the
    // dark background (#0a0c0a) — the surface lifts off the page rather
    // than sinking into it.
    const bgMatch = darkSrc.match(/background:\s*['"](#[0-9A-Fa-f]{6})['"]/);
    const surfaceMatch = darkSrc.match(/warmSurface:\s*['"](#[0-9A-Fa-f]{6})['"]/);
    expect(bgMatch).toBeTruthy();
    expect(surfaceMatch).toBeTruthy();
    const luma = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    expect(luma(surfaceMatch![1])).toBeGreaterThan(luma(bgMatch![1]));
  });
});
