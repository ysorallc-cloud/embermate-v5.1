// ============================================================================
// theme-tokens — locked v6.7 visual-consistency contract.
//
// Pins the dark-theme values that drive the full app's surface + text
// palette so a future refactor can't silently drift them. Includes a WCAG
// AA contrast check for the eyebrow text against the page background.
// ============================================================================

import { getDarkColors } from '../theme/theme-tokens';

const dark = getDarkColors() as unknown as Record<string, string>;

// ── Locked tokens ─────────────────────────────────────────────────────────

describe('Theme tokens — locked dark surfaces', () => {
  it('background (page) is the warm-brown near-black #141a16', () => {
    // Migration chain #141612 → #1f201c → #141a16 → [#0d0b08 superseded]
    // → #141a16. Slice-1 (07843628) briefly dropped to #0d0b08 to pair
    // with a schedule-floats-on-page-bg direction; that pairing was
    // superseded the same day by the embermate-now-full-approved visual
    // target. Warm v6.7 #141a16 stays the page bg ("rest" surface, warm
    // gutter), and a new `zonePanel` token (#19211b) handles the quiet
    // zone-panel surface for the Now zone wrappers.
    expect(dark.background).toBe('#141a16');
  });

  it('glass (default card surface) is the warm-charcoal Phase 0 value', () => {
    // Migration chain glass: #19211b → #26302a → [#211e18 superseded]
    // → #26302a. Slice-1's one-step-from-bg lift was superseded by the
    // visual target: glass stays the Phase 0 / Phase 33 substantial
    // ~L* 15 lift for cards that still card; the new `zonePanel`
    // token holds the lower-lift quiet panel surface.
    expect(dark.glass).toBe('#26302a');
  });

  it('youCardSurface (You-tab capture only) is its own warmer card', () => {
    // Phase 0 lockstep lift: youCardSurface moved from #2c2a23 → #2a342c
    // to keep its warm tonal relationship vs the new bg.
    expect(dark.youCardSurface).toBe('#2a342c');
  });

  it('youCardSurface differs from glass — the You tab has a unique surface', () => {
    expect(dark.youCardSurface).not.toBe(dark.glass);
  });

  it('glassBorder is the warm hairline at Phase 3.5 lifted opacity 0.10', () => {
    // Phase 3.5 (May 3) lifted opacity 0.08 → 0.10 so card edges read
    // more visibly against the lifted warm-charcoal page bg.
    expect(dark.glassBorder.replace(/\s+/g, '')).toBe('rgba(255,255,255,0.10)');
  });
});

describe('Theme tokens — locked text colors (solid hex for deterministic contrast)', () => {
  it('textSecondary is the bright warm muted #8b958c (eyebrow + secondary copy)', () => {
    expect(dark.textSecondary).toBe('#8b958c');
  });

  it('textTertiary is the lower-priority hint #5e685f', () => {
    expect(dark.textTertiary).toBe('#5e685f');
  });

  it('text colors are solid hex, not rgba — so apparent color does not shift between glass and page', () => {
    expect(dark.textSecondary).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(dark.textTertiary).toMatch(/^#[0-9a-fA-F]{6}$/);
  });
});

describe('Theme tokens — semantic accents', () => {
  it('accent (sage mint) is locked', () => {
    expect(dark.accent).toBe('#9ccfa6');
  });

  it('caregiverAccent (dusty blue post-F7 purple retirement) is locked', () => {
    // F7 (2026-06-12) — caregiverAccent flipped from warm lavender to
    // dusty blue. Token name preserved for back-compat across consumers;
    // only the canonical hex flipped.
    expect(dark.caregiverAccent).toBe('#8fa8c8');
  });

  it('warning (sage amber) is locked', () => {
    expect(dark.warning).toBe('#d6ab5e');
  });

  it('criticalAlert (sage red) is locked', () => {
    expect(dark.criticalAlert).toBe('#e3a684');
  });

  it('coral is the canonical coral hue (Phase 33 F1b realignment to website --coral)', () => {
    // Pre-Phase-33 this token was the v7-reserved 4th-accent placeholder
    // (#e89a7a) per Phase 7's 3-accent budget. Phase 33 F1b retired the
    // reservation entirely and renamed the `red*` color-name family
    // (#e3a684 — the actual coral hue the website calls --coral) to
    // claim the `coral*` namespace. Semantic aliases `error` +
    // `criticalAlert` continue to point at the same hex.
    expect(dark.coral).toBe('#e3a684');
  });
});

// ── WCAG AA contrast check ────────────────────────────────────────────────

function relativeLuminance(hex: string): number {
  const m = hex.replace('#', '').match(/^([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/);
  if (!m) throw new Error(`Bad hex: ${hex}`);
  const [r, g, b] = [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('Theme tokens — WCAG AA contrast (eyebrow text vs page bg)', () => {
  it('textSecondary on background clears 4.5:1 (AA for normal text)', () => {
    const ratio = contrastRatio(dark.textSecondary, dark.background);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('textSecondary on glass clears 4.5:1 (eyebrow labels inside cards)', () => {
    const ratio = contrastRatio(dark.textSecondary, dark.glass);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('textTertiary on background clears 3.0:1 (large/non-essential hints only)', () => {
    const ratio = contrastRatio(dark.textTertiary, dark.background);
    expect(ratio).toBeGreaterThanOrEqual(3.0);
  });
});
