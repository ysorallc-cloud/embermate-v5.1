// ============================================================================
// themeTokens33Alignment — Phase 33 brand-alignment contract.
//
// Pins the shipped token values from Phase 33 F1a/F1b/F2/F3 against drift.
// These tokens are the canonical surface — every consumer in the app
// resolves text/bg/spacing through them, so a token-value regression
// cascades silently.
//
// Token values pinned here are the SHIPPED state (not the spec-time
// values). Three drift items documented in F11 commit `<sha>` body:
//   1. `coral` is a hard rename from `red`, not an alias (per F1b lock)
//   2. New caregiverAccent ladder rungs use `Mid` / `Bold` naming, not
//      `Solid` / `Text` (forced by collision with existing
//      `caregiverAccentText: '#5a7a9a'` token; F1b fallback)
//   3. `Fonts.serif` carries a single RN-compatible font name
//      ('Poppins_400Regular'), not the spec's CSS font stack;
//      `sans` token dropped entirely (Q-33.6 skipped Inter loading)
//
// SectionEyebrow letterSpacing NOT pinned here — Phase 33b Lock 4
// (eyebrow canon reconciliation) may relock from 2 to canon 1.5.
// ============================================================================

import { Colors, Fonts, Spacing, Sizing, getDarkColors } from '../../theme/theme-tokens';

const dark = getDarkColors() as unknown as Record<string, string>;

// ── Colors — Phase 33 F1a (value flips) ──────────────────────────────────

describe('themeTokens33 — F1a color value flips', () => {
  it('background = #141a16 (warm-restore; website --bg)', () => {
    // Migration chain: #141612 → #1f201c → #141a16 (Phase 33 F1a) →
    // [#0d0b08 slice-1 superseded] → #141a16 (warm restore). The warm
    // page bg pairs with the new `zonePanel` token (#19211b) so the
    // Now zone wrappers sit on quiet warm panels and the page bg
    // reads as a gutter between them.
    expect(dark.background).toBe('#141a16');
  });

  it('backgroundGradientStart/End mirror background (Phase 2.6.1 lockstep)', () => {
    expect(dark.backgroundGradientStart).toBe(dark.background);
    expect(dark.backgroundGradientEnd).toBe(dark.background);
  });

  it('tabBarBackground mirrors background (Phase 0 lockstep)', () => {
    expect(dark.tabBarBackground).toBe(dark.background);
  });

  it('textPrimary = #edf0ea (website --text, warm cream)', () => {
    expect(dark.textPrimary).toBe('#edf0ea');
  });

  it('textBright = #fff4d6 (website --text-bright, emphasis cream)', () => {
    expect(dark.textBright).toBe('#fff4d6');
  });

  // WCAG-AA-4.5 pass (2026-09) superseded the website source-of-truth
  // value pinned here: #5e685f measured 3.05:1 against the page bg (and
  // worse against card surfaces) — under the 4.5:1 AA floor for real
  // text. textMuted/textTertiary lightened to #89988b; textSecondary
  // nudged from #949e94 to #98a298 (a second, narrower gap found on
  // surfaceElevated, which turned out lighter than the `glass` surface
  // textSecondary was originally calibrated against). See
  // theme/theme-tokens.ts inline comments for the full contrast math.
  it('textMuted = #89988b (WCAG-AA-4.5 pass, 2026-09 — supersedes website --text-muted #5e685f)', () => {
    expect(dark.textMuted).toBe('#89988b');
  });

  it('textSecondary = #98a298 (WCAG-AA-4.5 pass, 2026-09 — supersedes website --text-secondary #949e94)', () => {
    expect(dark.textSecondary).toBe('#98a298');
  });

  it('textTertiary = #89988b (WCAG-AA-4.5 pass, 2026-09 — supersedes website --text-tertiary #5e685f)', () => {
    expect(dark.textTertiary).toBe('#89988b');
  });

  it('glassStrong = rgba(255, 255, 255, 0.18) (website --border-strong RGB-aligned)', () => {
    expect(dark.glassStrong.replace(/\s+/g, '')).toBe('rgba(255,255,255,0.18)');
  });
});

// ── Colors — Phase 33 F1b (renames + adds) ───────────────────────────────

describe('themeTokens33 — F1b token renames + ladder extensions', () => {
  it('coral = #e3a684 (renamed from `red`; website --coral hex)', () => {
    expect(dark.coral).toBe('#e3a684');
  });

  it('coral* alpha ladder present (renamed from red* family)', () => {
    expect(dark.coralFaint.replace(/\s+/g, '')).toBe('rgba(227,166,132,0.06)');
    expect(dark.coralLight.replace(/\s+/g, '')).toBe('rgba(227,166,132,0.10)');
    expect(dark.coralHint.replace(/\s+/g, '')).toBe('rgba(227,166,132,0.12)');
    expect(dark.coralMuted.replace(/\s+/g, '')).toBe('rgba(227,166,132,0.15)');
    expect(dark.coralBorder.replace(/\s+/g, '')).toBe('rgba(227,166,132,0.20)');
    expect(dark.coralStrong.replace(/\s+/g, '')).toBe('rgba(227,166,132,0.25)');
    expect(dark.coralBright).toBe('#e3a684');
  });

  it('caregiverAccentMid = rgba(143, 168, 200, 0.35) (NEW, F1b Option C, sageMuted alias target)', () => {
    expect(dark.caregiverAccentMid.replace(/\s+/g, '')).toBe('rgba(143,168,200,0.35)');
  });

  it('caregiverAccentBold = rgba(143, 168, 200, 0.70) (NEW, F1b Option C, sageStrong alias target)', () => {
    expect(dark.caregiverAccentBold.replace(/\s+/g, '')).toBe('rgba(143,168,200,0.70)');
  });

  it('ember = #ff8c42 (NEW, website --ember warm-glow accent)', () => {
    expect(dark.ember).toBe('#ff8c42');
  });

  it('emberDeep = #e8642a (NEW, website --ember-deep)', () => {
    expect(dark.emberDeep).toBe('#e8642a');
  });

  it('bgRaised = #19211b (NEW, website --bg-elevated semantic; preserves app `backgroundElevated: #26302a` per F1-1 split)', () => {
    expect(dark.bgRaised).toBe('#19211b');
  });

  it('backgroundElevated preserved at #26302a (Phase 2.6.2 lift; 7 care-plan consumers depend on it)', () => {
    expect(dark.backgroundElevated).toBe('#26302a');
  });

  it('v7-reserved coral hex (#e89a7a) is GONE from tokens (F1b deletion)', () => {
    const allValues = Object.values(dark);
    expect(allValues.includes('#e89a7a')).toBe(false);
  });
});

// ── Sage* lavender-alias ladder — F1b @deprecated aliases ────────────────

describe('themeTokens33 — F1b sage* @deprecated lavender-alias ladder', () => {
  it('sage (solid) aliased to caregiverAccent', () => {
    expect(dark.sage).toBe(dark.caregiverAccent);
  });

  it('sageFaint aliased to caregiverAccentBg (✓ exact alpha match)', () => {
    expect(dark.sageFaint).toBe(dark.caregiverAccentBg);
  });

  it('sageMuted aliased to caregiverAccentMid (NEW alpha rung)', () => {
    expect(dark.sageMuted).toBe(dark.caregiverAccentMid);
  });

  it('sageStrong aliased to caregiverAccentBold (NEW alpha rung)', () => {
    expect(dark.sageStrong).toBe(dark.caregiverAccentBold);
  });

  it('sageDim aliased to accentDim (correctly-sage RGB; per user instruction)', () => {
    expect(dark.sageDim).toBe(dark.accentDim);
  });

  it('sageSoft and sageBright deleted (0 consumers pre-F1b)', () => {
    expect((dark as any).sageSoft).toBeUndefined();
    expect((dark as any).sageBright).toBeUndefined();
  });
});

// ── Fonts — Phase 33 F2 (corrected in F4) ────────────────────────────────

describe('themeTokens33 — F2 font tokens (RN-compatible single names)', () => {
  it('Fonts.serif = Poppins_400Regular (RN font name, not CSS stack)', () => {
    expect(Fonts.serif).toBe('Poppins_400Regular');
  });

  it('Fonts.serifItalic = Poppins_300Light_Italic', () => {
    expect(Fonts.serifItalic).toBe('Poppins_300Light_Italic');
  });

  it('Fonts.serifMedium = Poppins_500Medium', () => {
    expect(Fonts.serifMedium).toBe('Poppins_500Medium');
  });

  it('Fonts.serifSemiBold = Poppins_600SemiBold', () => {
    expect(Fonts.serifSemiBold).toBe('Poppins_600SemiBold');
  });

  it('Fonts.sans token NOT present (Q-33.6 skip; consumers omit fontFamily for system sans)', () => {
    expect((Fonts as any).sans).toBeUndefined();
  });
});

// ── Spacing — Phase 33 F2 (numeric s1..s12 added alongside xxs..xl) ──────

describe('themeTokens33 — F2 numeric spacing scale (website canonical)', () => {
  it('Spacing.s1..s12 exposes the website canonical scale', () => {
    expect((Spacing as any).s1).toBe(4);
    expect((Spacing as any).s2).toBe(8);
    expect((Spacing as any).s3).toBe(12);
    expect((Spacing as any).s4).toBe(16);
    expect((Spacing as any).s5).toBe(24);
    expect((Spacing as any).s6).toBe(32);
    expect((Spacing as any).s7).toBe(48);
    expect((Spacing as any).s8).toBe(64);
    expect((Spacing as any).s9).toBe(96);
    expect((Spacing as any).s10).toBe(128);
    expect((Spacing as any).s11).toBe(160);
    expect((Spacing as any).s12).toBe(200);
  });

  it('Phase 3.5 t-shirt scale (xxs..xl) coexists with deliberate lift baseline', () => {
    expect(Spacing.xxs).toBe(4);
    expect(Spacing.xs).toBe(8);
    expect(Spacing.sm).toBe(12);
    expect(Spacing.md).toBe(20); // Phase 3.5 lift
    expect(Spacing.lg).toBe(28);
    expect(Spacing.xl).toBe(36);
  });
});

// ── Sizing — Phase 33 F2 radius alignment ────────────────────────────────

describe('themeTokens33 — F2 radius alignment', () => {
  it('Sizing.cardRadius = 14 (website --radius)', () => {
    expect(Sizing.cardRadius).toBe(14);
  });
});

// ── Live Colors export mirrors getDarkColors() ───────────────────────────

describe('themeTokens33 — Colors export mirrors dark palette', () => {
  // StyleSheet.create() captures Colors.X at module load — the exported
  // object must equal the dark palette set so static styles match
  // dynamic theme reads.
  it('Colors.textPrimary equals dark.textPrimary', () => {
    expect(Colors.textPrimary).toBe(dark.textPrimary);
  });

  it('Colors.background equals dark.background', () => {
    expect(Colors.background).toBe(dark.background);
  });

  it('Colors.coral equals dark.coral', () => {
    expect((Colors as any).coral).toBe(dark.coral);
  });

  it('Colors.bgRaised equals dark.bgRaised', () => {
    expect((Colors as any).bgRaised).toBe(dark.bgRaised);
  });
});
