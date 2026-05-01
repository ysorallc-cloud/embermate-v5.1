// ============================================================================
// AuroraBackground — dark-mode palette contract.
//
// The Now/Today aurora is the most-visible surface in the app — when its
// gradient stops use heavy cool-blue/teal washes, they paint over the warm
// #141612 background and make the screen read as cool blue-black instead of
// Sage warm-dark. This test pins the dark-mode contract: alpha caps + Sage
// palette inputs.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const auroraSrc = readFileSync(
  join(__dirname, '../../components/aurora/AuroraBackground.tsx'),
  'utf8',
);

// Pull just the dark-mode AURORA_CONFIGS block (between the dark and light
// declarations). This isolates the dark-mode rgba stops we want to police
// without policing the light-theme block too.
function extractDarkConfigsBlock(): string {
  const start = auroraSrc.indexOf('AURORA_CONFIGS');
  const end = auroraSrc.indexOf('LIGHT_AURORA_CONFIGS');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Could not isolate AURORA_CONFIGS block');
  }
  return auroraSrc.slice(start, end);
}

const darkBlock = extractDarkConfigsBlock();

// Match every rgba(r, g, b, a) stop in the dark configs.
function* iterRgbaStops(): Generator<{ r: number; g: number; b: number; a: number; raw: string }> {
  const re = /rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(darkBlock)) !== null) {
    yield {
      r: parseInt(m[1], 10),
      g: parseInt(m[2], 10),
      b: parseInt(m[3], 10),
      a: parseFloat(m[4]),
      raw: m[0],
    };
  }
}

// "Cool" stops bleach out the warm Sage background. The Sage palette has
// r ≥ 95 across all four tints (sage mint #5fb88a → r=95, lavender
// #aa8adc → r=170, amber #e5b04a → r=229, red #e6776e → r=230). Anything
// with r < 75 reads as cool no matter what g/b are doing — that's our
// signal. Sage-warm stops with higher r are exempt by construction.
function isCoolStop(s: { r: number; g: number; b: number }): boolean {
  return s.r < 75;
}

describe('AuroraBackground — dark mode warm-palette contract', () => {
  it('every dark gradient stop has alpha ≤ 0.30 (so the warm background reads through)', () => {
    const violations: string[] = [];
    for (const stop of iterRgbaStops()) {
      if (stop.a > 0.30) violations.push(`${stop.raw} (alpha ${stop.a})`);
    }
    if (violations.length > 0) {
      throw new Error(
        `Dark aurora stops at high alpha override the warm #141612 background:\n  ${violations.join('\n  ')}`,
      );
    }
    expect(violations.length).toBe(0);
  });

  it('no cool blue / cool teal / cool purple stops in dark mode', () => {
    const violations: string[] = [];
    for (const stop of iterRgbaStops()) {
      if (isCoolStop(stop)) violations.push(stop.raw);
    }
    if (violations.length > 0) {
      throw new Error(
        `Dark aurora uses cool-palette stops that fight the Sage warm-dark theme:\n  ${violations.join('\n  ')}`,
      );
    }
    expect(violations.length).toBe(0);
  });

  it('the now / today variant uses Sage-mint tints (r ≥ 80, g ≥ 150) so the glow is warm', () => {
    // Find the now and today entries and confirm the first stop is in the
    // sage mint family rather than cool teal.
    const variants: Array<{ name: string }> = [{ name: 'now' }, { name: 'today' }];
    const violations: string[] = [];
    for (const v of variants) {
      const re = new RegExp(
        `${v.name}:\\s*\\{[^}]*colors:\\s*\\[[\\s\\n]*'(rgba\\([^)]*\\))'`,
      );
      const m = darkBlock.match(re);
      if (!m) continue;
      const stopMatch = m[1].match(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
      if (!stopMatch) continue;
      const r = parseInt(stopMatch[1], 10);
      const g = parseInt(stopMatch[2], 10);
      // Sage mint is around (95, 184, 138). Cool teal is around (20, 140, 110).
      // Require r ≥ 80 to rule out cool teals.
      if (r < 80 || g < 150) violations.push(`${v.name}: ${m[1]}`);
    }
    if (violations.length > 0) {
      throw new Error(
        `now / today aurora variants must use sage-mint stops, not cool teal:\n  ${violations.join('\n  ')}`,
      );
    }
    expect(violations.length).toBe(0);
  });
});
