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
//      `caregiverAccentText: '#d4baff'` token; F1b fallback)
//   3. `Fonts.serif` carries a single RN-compatible font name
//      ('SourceSerif4_400Regular'), not the spec's CSS font stack;
//      `sans` token dropped entirely (Q-33.6 skipped Inter loading)
//
// SectionEyebrow letterSpacing NOT pinned here — Phase 33b Lock 4
// (eyebrow canon reconciliation) may relock from 2 to canon 1.5.
// ============================================================================

import { Colors, Fonts, Spacing, Sizing, getDarkColors } from '../../theme/theme-tokens';

const dark = getDarkColors() as unknown as Record<string, string>;

// ── Colors — Phase 33 F1a (value flips) ──────────────────────────────────

describe('themeTokens33 — F1a color value flips', () => {
  it('background = #1a1612 (website --bg)', () => {
    expect(dark.background).toBe('#1a1612');
  });

  it('backgroundGradientStart/End mirror background (Phase 2.6.1 lockstep)', () => {
    expect(dark.backgroundGradientStart).toBe(dark.background);
    expect(dark.backgroundGradientEnd).toBe(dark.background);
  });

  it('tabBarBackground mirrors background (Phase 0 lockstep)', () => {
    expect(dark.tabBarBackground).toBe(dark.background);
  });

  it('textPrimary = #f4ddb8 (website --text, warm cream)', () => {
    expect(dark.textPrimary).toBe('#f4ddb8');
  });

  it('textBright = #fff4d6 (website --text-bright, emphasis cream)', () => {
    expect(dark.textBright).toBe('#fff4d6');
  });

  it('textMuted = #6a6a64 (website --text-muted, solid hex)', () => {
    expect(dark.textMuted).toBe('#6a6a64');
  });

  it('textSecondary = #c4c1b3 (website --text-secondary, unchanged pre-Phase-33)', () => {
    expect(dark.textSecondary).toBe('#c4c1b3');
  });

  it('textTertiary = #8a8a82 (website --text-tertiary, unchanged pre-Phase-33)', () => {
    expect(dark.textTertiary).toBe('#8a8a82');
  });

  it('glassStrong = rgba(255, 240, 215, 0.18) (website --border-strong RGB-aligned)', () => {
    expect(dark.glassStrong.replace(/\s+/g, '')).toBe('rgba(255,240,215,0.18)');
  });
});

// ── Colors — Phase 33 F1b (renames + adds) ───────────────────────────────

describe('themeTokens33 — F1b token renames + ladder extensions', () => {
  it('coral = #e6776e (renamed from `red`; website --coral hex)', () => {
    expect(dark.coral).toBe('#e6776e');
  });

  it('coral* alpha ladder present (renamed from red* family)', () => {
    expect(dark.coralFaint.replace(/\s+/g, '')).toBe('rgba(230,119,110,0.06)');
    expect(dark.coralLight.replace(/\s+/g, '')).toBe('rgba(230,119,110,0.10)');
    expect(dark.coralHint.replace(/\s+/g, '')).toBe('rgba(230,119,110,0.12)');
    expect(dark.coralMuted.replace(/\s+/g, '')).toBe('rgba(230,119,110,0.15)');
    expect(dark.coralBorder.replace(/\s+/g, '')).toBe('rgba(230,119,110,0.20)');
    expect(dark.coralStrong.replace(/\s+/g, '')).toBe('rgba(230,119,110,0.25)');
    expect(dark.coralBright).toBe('#e6776e');
  });

  it('caregiverAccentMid = rgba(170, 138, 220, 0.35) (NEW, F1b Option C, sageMuted alias target)', () => {
    expect(dark.caregiverAccentMid.replace(/\s+/g, '')).toBe('rgba(170,138,220,0.35)');
  });

  it('caregiverAccentBold = rgba(170, 138, 220, 0.70) (NEW, F1b Option C, sageStrong alias target)', () => {
    expect(dark.caregiverAccentBold.replace(/\s+/g, '')).toBe('rgba(170,138,220,0.70)');
  });

  it('ember = #ff8c42 (NEW, website --ember warm-glow accent)', () => {
    expect(dark.ember).toBe('#ff8c42');
  });

  it('emberDeep = #e8642a (NEW, website --ember-deep)', () => {
    expect(dark.emberDeep).toBe('#e8642a');
  });

  it('bgRaised = #221d18 (NEW, website --bg-elevated semantic; preserves app `backgroundElevated: #363830` per F1-1 split)', () => {
    expect(dark.bgRaised).toBe('#221d18');
  });

  it('backgroundElevated preserved at #363830 (Phase 2.6.2 lift; 7 care-plan consumers depend on it)', () => {
    expect(dark.backgroundElevated).toBe('#363830');
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
  it('Fonts.serif = SourceSerif4_400Regular (RN font name, not CSS stack)', () => {
    expect(Fonts.serif).toBe('SourceSerif4_400Regular');
  });

  it('Fonts.serifItalic = SourceSerif4_400Regular_Italic', () => {
    expect(Fonts.serifItalic).toBe('SourceSerif4_400Regular_Italic');
  });

  it('Fonts.serifMedium = SourceSerif4_500Medium', () => {
    expect(Fonts.serifMedium).toBe('SourceSerif4_500Medium');
  });

  it('Fonts.serifSemiBold = SourceSerif4_600SemiBold', () => {
    expect(Fonts.serifSemiBold).toBe('SourceSerif4_600SemiBold');
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
