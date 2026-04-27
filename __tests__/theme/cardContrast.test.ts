// ============================================================================
// Card surface contrast — verifies dark theme cards lift visibly off the page.
// Uses sRGB→linear→Y* (CIE relative luminance) as the brightness metric and
// approximates L* via the standard f-transform. Threshold-based assertions
// pin the perceptual delta between page background and surface tokens.
// ============================================================================

const { Colors, getDarkColors } = require('../../theme/theme-tokens');

// ── Color helpers ─────────────────────────────────────────────────────────
function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.match(/^#?([0-9a-fA-F]{6})$/);
  if (!m) return null;
  const v = parseInt(m[1], 16);
  return [(v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff];
}

function srgbToLinear(c: number): number {
  const cs = c / 255;
  return cs <= 0.04045 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
}

function relativeLuminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map(srgbToLinear) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// L* from CIE Lab — the perceptual lightness axis humans actually use.
// Range: 0 (black) → 100 (white). A 1-point delta is roughly the smallest
// difference perceivable under good viewing conditions.
function lstar(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return NaN;
  const Y = relativeLuminance(rgb);
  // f(Y) per Lab definition with reference white Y_n = 1.
  const f = Y > 0.008856 ? Math.cbrt(Y) : 7.787 * Y + 16 / 116;
  return 116 * f - 16;
}

// rgba(...) parser — needed to read glassBorder opacity.
function parseRgbaAlpha(value: string): number | null {
  const m = value.match(/rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([\d.]+)\s*\)/);
  return m ? parseFloat(m[1]) : null;
}

const dark = getDarkColors();

describe('Dark theme — card lift contract', () => {
  it('background and glass tokens are valid hex', () => {
    expect(hexToRgb(dark.background)).not.toBeNull();
    expect(hexToRgb(dark.glass)).not.toBeNull();
  });

  it('glass is brighter than background by L* delta of at least 8', () => {
    // L* delta of 8 is the threshold at which two surfaces reliably read as
    // distinct objects in dim viewing conditions (per ISO 9241 surface
    // legibility guidance and our own dim-room tuning).
    const bgL = lstar(dark.background);
    const glassL = lstar(dark.glass);
    expect(glassL - bgL).toBeGreaterThanOrEqual(8);
  });

  it('surfaceElevated is brighter than glass', () => {
    // Modals and nested cards should sit one perceptual step further up.
    const glassL = lstar(dark.glass);
    const elevatedL = lstar(dark.surfaceElevated);
    expect(elevatedL).toBeGreaterThan(glassL);
  });

  it('glassBorder opacity is at least 0.07', () => {
    const alpha = parseRgbaAlpha(dark.glassBorder);
    expect(alpha).not.toBeNull();
    expect(alpha as number).toBeGreaterThanOrEqual(0.07);
  });

  it('warmSurface tokens lift off background by at least L* 6', () => {
    // Tinted variants must lift proportionally so warm-tinted cards aren't
    // dimmer than the neutral glass card.
    const bgL = lstar(dark.background);
    const warmTokens = ['warmSurface', 'warmSurfaceAlert', 'warmSurfacePurple'];
    for (const name of warmTokens) {
      const value = dark[name];
      expect(typeof value).toBe('string');
      const wL = lstar(value);
      expect(wL - bgL).toBeGreaterThanOrEqual(6);
    }
  });

  it('exported Colors object exposes the same lifted values', () => {
    // Static StyleSheet.create() calls read Colors.X at module load. Lock
    // in that the live module matches the dark token set we just asserted.
    expect(Colors.glass).toBe(dark.glass);
    expect(Colors.surfaceElevated).toBe(dark.surfaceElevated);
    expect(Colors.warmSurface).toBe(dark.warmSurface);
  });
});
