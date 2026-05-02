// ============================================================================
// Care Plan ALWAYS ON pill contrast — Phase 2.6.6.
//
// The "ALWAYS ON" pill near the CORE section header on the Care Plan
// landing was rendering sage text (`c.accent`, #5fb88a) on a 10% sage
// tint (`c.accentDim`) — a low-contrast filled-pill treatment that read
// illegible in dim viewing. Per the spec, the CORE label is
// informational (not a CTA), so an OUTLINED pill at lower visual weight
// matches its semantic role.
//
// Phase 2.6.6 fix:
//   • backgroundColor: c.accentDim (10% sage)  → 'transparent'
//   • borderColor:     c.accentBorder (25%)    → c.accentMuted (50%)
//   • text color:      c.accent (unchanged — full sage on the page bg)
//
// Effective text-on-bg contrast jumps from ~5.2:1 (sage on
// accentDim-over-page-bg) to ~6.9:1 (sage directly on the warm-charcoal
// page) — both pass AA-body, but the outlined treatment carries the
// "informational, not action" semantic the spec wants.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';
import { getDarkColors } from '../theme/theme-tokens';

const ROOT = join(__dirname, '..');
const src = readFileSync(join(ROOT, 'app/care-plan/index.tsx'), 'utf8');
const dark = getDarkColors() as unknown as Record<string, string>;

function extractBlock(name: string): string {
  const open = src.indexOf(`${name}: {`);
  if (open < 0) return '';
  const start = open + `${name}: {`.length;
  let depth = 1;
  let i = start;
  while (i < src.length && depth > 0) {
    if (src[i] === '{') depth += 1;
    else if (src[i] === '}') depth -= 1;
    i += 1;
  }
  return src.slice(start, i - 1);
}

// WCAG luminance helpers.
function hexToRgb(hex: string): [number, number, number] {
  const v = parseInt(hex.replace('#', ''), 16);
  return [(v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff];
}
function srgbToLinear(c: number): number {
  const cs = c / 255;
  return cs <= 0.04045 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
}
function relLum(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(srgbToLinear) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrastRatio(a: string, b: string): number {
  const la = relLum(a), lb = relLum(b);
  const L1 = Math.max(la, lb), L2 = Math.min(la, lb);
  return (L1 + 0.05) / (L2 + 0.05);
}

describe('Phase 2.6.6 — ALWAYS ON pill outlined for legibility', () => {
  it('alwaysOnBadge bg is transparent (outlined pill, not filled)', () => {
    const body = extractBlock('alwaysOnBadge');
    expect(body).toMatch(/backgroundColor:\s*['"]transparent['"]/);
    expect(body).not.toMatch(/backgroundColor:\s*c\.accentDim\b/);
  });

  it('alwaysOnBadge border uses accentMuted (sage @ 50%) — heavier than dim', () => {
    const body = extractBlock('alwaysOnBadge');
    expect(body).toMatch(/borderColor:\s*c\.accentMuted\b/);
  });

  it('alwaysOnBadgeText color stays at c.accent (full sage)', () => {
    const body = extractBlock('alwaysOnBadgeText');
    expect(body).toMatch(/color:\s*c\.accent\b/);
  });

  it('text contrast on the new bg passes AA-body (≥ 4.5:1)', () => {
    // With bg transparent, text-on-page contrast is what reaches the eye.
    const ratio = contrastRatio(dark.accent, dark.background);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});
