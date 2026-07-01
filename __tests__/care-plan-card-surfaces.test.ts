// ============================================================================
// Care Plan card surface lockstep — Phase 2.6.2.
//
// Phase 0 lifted glass / surfaceElevated / youCardSurface / warmSurface in
// lockstep with the bg lift. `backgroundElevated` (#1A1A1A) escaped that
// audit because it sits in a separate token block and is consumed mainly
// by sub-screens (Care Plan, log forms, medication form) — not the four
// main tabs. On device after Phase 2.6.1 fixed the page bg, the
// backgroundElevated buttons (back button, action chips) read flat
// against the new warm-charcoal page — they didn't lift.
//
// Fix: lift backgroundElevated #1A1A1A → #26302a, matching the Phase 0
// glass / surfaceElevated lockstep value. The same L* 11+ delta against
// the page bg that Phase 0 established for cards. If on device this
// reads too prominent for back-button purposes, drop one step to
// #2e2f29; default to the canonical lockstep lift.
//
// Test pins the token value at the canonical lift so we don't silently
// regress to the pre-warmth-lift #1A1A1A.
// ============================================================================

import { getDarkColors } from '../theme/theme-tokens';

const dark = getDarkColors() as unknown as Record<string, string>;

describe('Phase 2.6.2 — card-surface tokens lockstep with Phase 0', () => {
  it('backgroundElevated equals #26302a (glass-tier lockstep)', () => {
    expect(dark.backgroundElevated).toBe('#26302a');
  });

  it('backgroundElevated lifts ≥ L* 8 above the bg (perceptual card delta)', () => {
    // Reuse the L* helper from cardContrast pattern: convert hex → linear Y → L*.
    function hexToRgb(hex: string): [number, number, number] {
      const v = parseInt(hex.replace('#', ''), 16);
      return [(v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff];
    }
    function srgbToLinear(c: number): number {
      const cs = c / 255;
      return cs <= 0.04045 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
    }
    function lstar(hex: string): number {
      const [r, g, b] = hexToRgb(hex).map(srgbToLinear) as [number, number, number];
      const Y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const f = Y > 0.008856 ? Math.cbrt(Y) : 7.787 * Y + 16 / 116;
      return 116 * f - 16;
    }
    const bgL = lstar(dark.background);
    const elevatedL = lstar(dark.backgroundElevated);
    expect(elevatedL - bgL).toBeGreaterThanOrEqual(8);
  });
});
