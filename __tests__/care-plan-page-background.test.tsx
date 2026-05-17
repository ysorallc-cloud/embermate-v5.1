// ============================================================================
// Care Plan flow page-bg contract — Phase 2.6.1 (→ Phase 33 F1a realignment).
//
// Phase 2.5 fixed the high-contrast override that was forcing the four
// main tabs to read near-black. Device review of 2.5 surfaced a second
// path: every Care Plan screen (and 35+ other sub-screens) wraps its
// SafeAreaView in a <LinearGradient> reading from
// `colors.backgroundGradientStart` / `colors.backgroundGradientEnd` —
// tokens hardcoded at '#000000' / '#050505'. The gradient overlay
// covered the SafeAreaView's `c.background` (lifted by Phase 0),
// so the warm bg never reached the device.
//
// 2.6.1 fix: lift both gradient tokens to equal `background` so the
// LinearGradient renders flat at the page-bg color. The gradient JSX
// stays in place — retiring the JSX outright would touch 35 screens and
// is a larger structural change. Flat-lifting the tokens preserves that
// JSX surface for a future deliberate design call.
//
// Phase 33 F1a (2026-05-17) moved `background` to '#1a1612' (website
// source-of-truth); both gradient tokens flipped in lockstep so the
// gradient-equals-bg contract holds.
//
// Pins:
//   1. Both gradient tokens equal #1a1612 (Phase 33 F1a target).
//   2. Both gradient tokens equal `colors.background` so the overlay
//      produces no visible color delta vs the SafeAreaView underneath
//      (lockstep contract — survives future bg value changes).
//   3. Every Care Plan screen's <LinearGradient> reads from those tokens
//      (not from a hardcoded color array) — pins the wiring.
// ============================================================================

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { getDarkColors } from '../theme/theme-tokens';

const dark = getDarkColors() as unknown as Record<string, string>;

describe('Gradient tokens flat-lifted (Phase 2.6.1 lockstep → Phase 33 F1a value)', () => {
  it('backgroundGradientStart equals #1a1612 (Phase 33 F1a page-bg lockstep)', () => {
    expect(dark.backgroundGradientStart).toBe('#1a1612');
  });

  it('backgroundGradientEnd equals #1a1612 (Phase 33 F1a page-bg lockstep)', () => {
    expect(dark.backgroundGradientEnd).toBe('#1a1612');
  });

  it('both gradient stops equal colors.background — gradient renders flat', () => {
    // The structural lockstep — survives any future bg value change.
    expect(dark.backgroundGradientStart).toBe(dark.background);
    expect(dark.backgroundGradientEnd).toBe(dark.background);
  });
});

describe('Phase 2.6.1 — Care Plan screens consume gradient tokens (not hardcoded)', () => {
  const ROOT = join(__dirname, '..');
  const CP_DIR = join(ROOT, 'app/care-plan');
  const carePlanFiles = readdirSync(CP_DIR)
    .filter((n) => n.endsWith('.tsx') && n !== '_layout.tsx')
    .map((n) => join(CP_DIR, n));

  it('every Care Plan screen renders <LinearGradient> with the token-driven colors prop', () => {
    const offenders: string[] = [];
    for (const file of carePlanFiles) {
      const src = readFileSync(file, 'utf8');
      // Skip files that don't render a LinearGradient at all (e.g. errands,
      // self-care, shifts may not — they're not all part of the bg path).
      if (!/<LinearGradient/.test(src)) continue;
      // Must consume the gradient tokens, not a hardcoded array.
      const ok = /colors=\{\[\s*colors\.backgroundGradientStart\s*,\s*colors\.backgroundGradientEnd\s*\]\}/.test(src);
      if (!ok) {
        offenders.push(file.replace(ROOT, ''));
      }
    }
    if (offenders.length > 0) {
      throw new Error(
        `Care Plan screens with non-token-driven gradient colors:\n  ${offenders.join('\n  ')}`,
      );
    }
  });
});
