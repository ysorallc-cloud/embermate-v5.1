// ============================================================================
// ZONE-PANEL TOKEN + warm-background restore.
//
// Supersedes the slice-1 token flip at 07843628 ("Now schedule floats on
// page bg + page/card tokens"). That slice took `background` to the
// deeper near-black #0d0b08 + `glass` to #211e18 to pair with a card-less
// schedule float. The follow-on visual review (embermate-now-full-approved
// target) decided the warm v6.7 surfaces should be restored AND a new
// quiet-warm zone-panel surface token should be added so the Now zones
// can sit on quiet panels with the warm page bg showing as a gutter
// between them — rather than the slice-1 "float on near-black" register.
//
// CONTRACT BUNDLE
//
//   A. WARM SURFACE RESTORE
//      1. DarkColors.background === '#141a16' (Phase 33 F1a warm value
//         restored from slice-1's #0d0b08).
//      2. DarkColors.glass === '#26302a' (Phase 0 lockstep lift value
//         restored from slice-1's #211e18). The slice-1 narrative that
//         dropped glass to one-step-from-bg is superseded.
//      3. Lockstep siblings track `background`:
//           - DarkColors.tabBarBackground === '#141a16'
//           - DarkColors.backgroundGradientStart === '#141a16'
//           - DarkColors.backgroundGradientEnd === '#141a16'
//
//   B. NEW ZONE-PANEL SURFACE TOKEN
//      4. DarkColors.zonePanel exists and equals '#19211b'. This is the
//         quiet-warm panel surface the Now zones (Schedule / Health /
//         Reflection) will sit on. Distinct from `glass` (cool, +15 L*
//         lift — "card on surface") in both hue and lift; zonePanel is
//         a low-lift warm panel that lets the warm bg read as a gutter
//         between zones.
//      5. The zonePanel value is NOT '#26302a' — explicit guard against
//         accidental aliasing back to glass.
//
//   C. PERCEPTUAL CONTRACTS
//      6. glass L* - bg L* ≥ 8 — the cardContrast contract for cards
//         that still card. Restored to the Phase 0 ~15-point lift after
//         the slice-1 narrowing to ~8.3.
//      7. zonePanel L* > bg L* — positive lift (the panel must register
//         as a distinct surface), but no minimum delta requirement
//         beyond positive — "low lift" is the design intent.
//      8. zonePanel L* < glass L* — zonePanel sits BELOW glass in the
//         elevation hierarchy. Cards on a panel = panel L* < card L*.
// ============================================================================

import { getDarkColors } from '../../theme/theme-tokens';

const dark = getDarkColors() as unknown as Record<string, string>;

// ── L* helpers (sRGB → linear Y → CIE L*) ──────────────────────────────────
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

describe('Zone-panel surface token + warm-background restore', () => {
  describe('A. Warm surface restore (supersedes slice-1 07843628)', () => {
    it('background is the warm v6.7 #141a16 (slice-1 #0d0b08 superseded)', () => {
      expect(dark.background).toBe('#141a16');
    });

    it('glass is the cool warm-charcoal #26302a (slice-1 #211e18 superseded)', () => {
      expect(dark.glass).toBe('#26302a');
    });

    it('tabBarBackground mirrors background (#141a16)', () => {
      expect(dark.tabBarBackground).toBe('#141a16');
    });

    it('backgroundGradientStart equals #141a16 (lockstep with background)', () => {
      expect(dark.backgroundGradientStart).toBe('#141a16');
    });

    it('backgroundGradientEnd equals #141a16 (lockstep with background)', () => {
      expect(dark.backgroundGradientEnd).toBe('#141a16');
    });
  });

  describe('B. New zonePanel surface token', () => {
    it('zonePanel token exists and equals #19211b (quiet-warm panel)', () => {
      expect(dark.zonePanel).toBe('#19211b');
    });

    it('zonePanel is NOT aliased to glass (#26302a) — distinct semantic', () => {
      expect(dark.zonePanel).not.toBe(dark.glass);
    });
  });

  describe('C. Perceptual contracts', () => {
    const bgL = lstar(dark.background);
    const glassL = lstar(dark.glass);

    it('glass → bg L* delta ≥ 8 (Phase 0 cardContrast lift restored)', () => {
      expect(glassL - bgL).toBeGreaterThanOrEqual(8);
    });

    it('zonePanel → bg L* delta > 0 (positive lift; low-lift by design)', () => {
      const panelL = lstar(dark.zonePanel);
      expect(panelL - bgL).toBeGreaterThan(0);
    });

    it('zonePanel L* < glass L* — panels sit BELOW cards in the elevation hierarchy', () => {
      const panelL = lstar(dark.zonePanel);
      expect(panelL).toBeLessThan(glassL);
    });
  });
});
