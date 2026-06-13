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
//      1. DarkColors.background === '#1a1612' (Phase 33 F1a warm value
//         restored from slice-1's #0d0b08).
//      2. DarkColors.glass === '#363830' (Phase 0 lockstep lift value
//         restored from slice-1's #211e18). The slice-1 narrative that
//         dropped glass to one-step-from-bg is superseded.
//      3. Lockstep siblings track `background`:
//           - DarkColors.tabBarBackground === '#1a1612'
//           - DarkColors.backgroundGradientStart === '#1a1612'
//           - DarkColors.backgroundGradientEnd === '#1a1612'
//
//   B. NEW ZONE-PANEL SURFACE TOKEN
//      4. DarkColors.zonePanel exists and equals '#221d15'. This is the
//         quiet-warm panel surface the Now zones (Schedule / Health /
//         Reflection) will sit on. Distinct from `glass` (cool, +15 L*
//         lift — "card on surface") in both hue and lift; zonePanel is
//         a low-lift warm panel that lets the warm bg read as a gutter
//         between zones.
//      5. The zonePanel value is NOT '#363830' — explicit guard against
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
    it('background is the warm v6.7 #1a1612 (slice-1 #0d0b08 superseded)', () => {
      expect(dark.background).toBe('#1a1612');
    });

    it('glass is the cool warm-charcoal #363830 (slice-1 #211e18 superseded)', () => {
      expect(dark.glass).toBe('#363830');
    });

    it('tabBarBackground mirrors background (#1a1612)', () => {
      expect(dark.tabBarBackground).toBe('#1a1612');
    });

    it('backgroundGradientStart equals #1a1612 (lockstep with background)', () => {
      expect(dark.backgroundGradientStart).toBe('#1a1612');
    });

    it('backgroundGradientEnd equals #1a1612 (lockstep with background)', () => {
      expect(dark.backgroundGradientEnd).toBe('#1a1612');
    });
  });

  describe('B. New zonePanel surface token', () => {
    it('zonePanel token exists and equals #221d15 (quiet-warm panel)', () => {
      expect(dark.zonePanel).toBe('#221d15');
    });

    it('zonePanel is NOT aliased to glass (#363830) — distinct semantic', () => {
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
