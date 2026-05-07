// ============================================================================
// EMBERMATE MIDNIGHT CALM THEME TOKENS
// Deep midnight with soft purple accents.
// TODO: light mode disabled in v6.7 — light-tokens module is preserved on disk
// for future re-enablement but is intentionally not imported here.
// NOTE: Not a route - utility file only
// ============================================================================

// Prevent Expo Router warning (this is not a route component)
export default null;

// ============================================================================
// DARK THEME — Midnight Calm
// ============================================================================

const DarkColors = {
  // ── Sage warm-dark surfaces (v6.7 hue shift) ─────────────────────────────
  // Lightness values match the previous palette so the L* delta tests still
  // pass; only the hue rotates from cool blue-black to warm sage-cream.
  // Phase 0 of the v6.7 May 1 sizing pass lifted the page bg from the prior
  // very-dark #141612 to #1f201c — calibrated half-step toward charcoal that
  // holds the warm cast without reading washed-out on device. Fallback if
  // device check fails: drop to #1c1d1a.
  background: '#1f201c',
  backgroundAlt: '#050505',
  // Phase 0 lockstep lift — when bg moved from #141612 (L* 6.92) to #1f201c
  // (L* 12.01), the prior glass #2a2c25 (L* 17.59) only lifted L* 5.57 above
  // the new bg, breaking the L* ≥ 8 dim-room legibility contract. Glass and
  // its siblings are lifted in lockstep so cards keep the "object on a
  // surface" affordance. New deltas: glass→bg L* 11.08, surfaceElevated→bg
  // L* 12.54, youCardSurface→bg L* 10.08. See cardContrast.test.ts.
  glass: '#363830',
  glassHover: 'rgba(255, 245, 220, 0.06)',
  // Phase 3.5 — bumped opacity 0.08 → 0.10 so card edges read more
  // visibly against the warm-charcoal page bg. Border still reads as a
  // separator, not an edge; the lift just keeps cards from blending into
  // the surface at a glance.
  glassBorder: 'rgba(255, 240, 215, 0.10)',
  // v6.7 — inset row hairline (12pt inset inside cards). Quieter than
  // glassBorder (0.08) so it reads as a separator, not an edge.
  hairlineInset: 'rgba(255, 240, 215, 0.06)',
  glassActive: 'rgba(255, 245, 220, 0.12)',
  // glassDim now occupies the slot the previous glass held (#2a2c25),
  // preserving the dim-vs-glass tonal relationship after the lockstep lift.
  glassDim: '#2a2c25',
  glassFaint: 'rgba(255, 245, 220, 0.03)',
  glassSubtle: 'rgba(255, 245, 220, 0.12)',
  glassStrong: 'rgba(255, 245, 220, 0.18)',
  glassBold: 'rgba(255, 245, 220, 0.25)',
  surface: '#363830',
  surfaceElevated: '#3e3a31',
  surfaceAlt: 'rgba(255, 255, 255, 0.03)',
  surfaceHighlight: 'rgba(95, 184, 138, 0.08)',
  // ── Warm surfaces — re-tuned in v6.7 to lift L* ≥ 6 above the warmer
  //    sage-cream background (Phase 0: #1f201c, was #141612). Hues now share
  //    the warm-dark family rather than the previous cool blue tint. ────────
  warmSurface: '#32352b',
  warmSurfaceBorder: '#3e4036',
  warmSurfaceAlert: '#352c26',
  warmSurfaceAlertBorder: '#46392e',
  warmSurfaceQuiet: '#2c2e2a',
  warmSurfaceQuietBorder: '#343636',
  warmSurfaceGreen: '#303830',
  warmSurfaceGreenBorder: '#3e483e',
  warmSurfacePurple: '#322f3b',
  warmSurfacePurpleBorder: '#403c50',
  auroraTeal: 'hsla(160, 40%, 12%, 0.4)',
  auroraPurple: 'hsla(160, 50%, 15%, 0.35)',
  auroraBlue: 'hsla(165, 40%, 10%, 0.3)',
  auroraViolet: 'hsla(155, 45%, 12%, 0.25)',
  auroraRose: 'hsla(160, 35%, 10%, 0.2)',
  accent: '#5fb88a',
  accentLight: 'rgba(95, 184, 138, 0.15)',
  accentBorder: 'rgba(95, 184, 138, 0.25)',
  accentGlow: 'rgba(95, 184, 138, 0.40)',
  accentFaint: 'rgba(95, 184, 138, 0.06)',
  accentTint: 'rgba(95, 184, 138, 0.07)',
  accentDim: 'rgba(95, 184, 138, 0.10)',
  accentHint: 'rgba(95, 184, 138, 0.14)',
  accentSubtle: 'rgba(95, 184, 138, 0.14)',
  accentMuted: 'rgba(95, 184, 138, 0.50)',
  accentGradientStart: '#5fb88a',
  accentGradientMid: '#059669',
  accentGradientEnd: '#6EE7B7',
  green: '#5fb88a',
  greenTint: 'rgba(95, 184, 138, 0.10)',
  greenLight: 'rgba(95, 184, 138, 0.13)',
  greenHint: 'rgba(95, 184, 138, 0.16)',
  greenMuted: 'rgba(95, 184, 138, 0.20)',
  greenBorder: 'rgba(95, 184, 138, 0.25)',
  greenStrong: 'rgba(95, 184, 138, 0.30)',
  greenGlow: 'rgba(95, 184, 138, 0.40)',
  amber: '#e5b04a',
  amberFaint: 'rgba(229, 176, 74, 0.06)',
  amberLight: 'rgba(229, 176, 74, 0.10)',
  amberHint: 'rgba(229, 176, 74, 0.12)',
  amberMuted: 'rgba(229, 176, 74, 0.15)',
  amberBorder: 'rgba(229, 176, 74, 0.20)',
  amberGlow: 'rgba(229, 176, 74, 0.35)',
  red: '#e6776e',
  redFaint: 'rgba(230, 119, 110, 0.06)',
  redLight: 'rgba(230, 119, 110, 0.10)',
  redHint: 'rgba(230, 119, 110, 0.12)',
  redMuted: 'rgba(230, 119, 110, 0.15)',
  redBorder: 'rgba(230, 119, 110, 0.20)',
  redStrong: 'rgba(230, 119, 110, 0.25)',
  rose: '#FB7185',
  roseLight: 'rgba(251, 113, 133, 0.10)',
  roseBorder: 'rgba(251, 113, 133, 0.20)',
  purple: '#A78BFA',
  purpleFaint: 'rgba(167, 139, 250, 0.06)',
  purpleMuted: 'rgba(167, 139, 250, 0.08)',
  purpleLight: 'rgba(167, 139, 250, 0.10)',
  purpleHint: 'rgba(167, 139, 250, 0.12)',
  purpleWash: 'rgba(167, 139, 250, 0.15)',
  purpleBorder: 'rgba(167, 139, 250, 0.20)',
  purpleStrong: 'rgba(167, 139, 250, 0.25)',
  sky: '#7DD3FC',
  skyLight: 'rgba(125, 211, 252, 0.10)',
  skyBorder: 'rgba(125, 211, 252, 0.20)',
  gold: '#e5b04a',
  goldLight: 'rgba(229, 176, 74, 0.10)',
  goldBorder: 'rgba(229, 176, 74, 0.20)',
  violet: '#C4B5FD',
  violetLight: 'rgba(196, 181, 253, 0.10)',
  violetBorder: 'rgba(196, 181, 253, 0.20)',
  violetBright: 'rgba(196, 181, 253, 0.9)',
  blue: '#93C5FD',
  blueFaint: 'rgba(147, 197, 253, 0.06)',
  blueTint: 'rgba(147, 197, 253, 0.08)',
  blueLight: 'rgba(147, 197, 253, 0.10)',
  blueWash: 'rgba(147, 197, 253, 0.15)',
  blueBorder: 'rgba(147, 197, 253, 0.20)',
  indigo: '#A5B4FC',
  indigoLight: 'rgba(165, 180, 252, 0.10)',
  indigoBorder: 'rgba(165, 180, 252, 0.20)',
  orange: '#FB923C',
  orangeLight: 'rgba(251, 146, 60, 0.10)',
  orangeBorder: 'rgba(251, 146, 60, 0.20)',
  cyan: '#67E8F9',
  cyanLight: 'rgba(103, 232, 249, 0.10)',
  cyanBorder: 'rgba(103, 232, 249, 0.20)',
  sage: '#C4B5FD',
  sageHint: 'rgba(196, 181, 253, 0.04)',
  sageTint: 'rgba(196, 181, 253, 0.05)',
  sageFaint: 'rgba(196, 181, 253, 0.06)',
  sageLight: 'rgba(196, 181, 253, 0.08)',
  sageSubtle: 'rgba(196, 181, 253, 0.10)',
  sageBorder: 'rgba(196, 181, 253, 0.12)',
  sageWash: 'rgba(196, 181, 253, 0.15)',
  sageGlow: 'rgba(196, 181, 253, 0.22)',
  sageMuted: 'rgba(196, 181, 253, 0.35)',
  sageSoft: 'rgba(196, 181, 253, 0.55)',
  sageStrong: 'rgba(196, 181, 253, 0.70)',
  sageBright: 'rgba(196, 181, 253, 0.85)',
  sageDim: 'rgba(95, 184, 138, 0.06)',
  purpleBright: '#C4B5FD',
  amberBright: '#e5b04a',
  amberBrightTint: 'rgba(229, 176, 74, 0.08)',
  amberBrightStrong: 'rgba(229, 176, 74, 0.75)',
  greenBright: '#5fb88a',
  redBright: '#e6776e',
  blueBright: '#93C5FD',
  skyBright: '#7DD3FC',
  success: '#5fb88a',
  warning: '#e5b04a',
  warningLight: 'rgba(229, 176, 74, 0.10)',
  warningBorder: 'rgba(229, 176, 74, 0.25)',
  error: '#e6776e',
  // criticalAlert is the canonical name in the v6.7 spec; aliased to error
  // so existing call sites continue working while new code can prefer the
  // semantic name.
  criticalAlert: '#e6776e',
  // Coral — v7-reserved.
  // Phase 7 of the v6.7 May 1 sizing pass enforces a strict 3-accent
  // budget (sage / lavender / criticalAlert). Coral was the 4th accent,
  // formerly carrying the Meals tile ring (Phase 3a neutralized) and the
  // Helpline pill (Phase 6 neutralized). The token stays declared so a
  // future v7 design pass can re-introduce it deliberately without
  // re-establishing the hex value, but it is NOT in the current budget
  // and must not be referenced from app/ or components/. See
  // __tests__/colorBudgetPhase7.test.ts for the source-level guard.
  coral: '#e89a7a',
  coralLight: 'rgba(232, 154, 122, 0.10)',
  coralBorder: 'rgba(232, 154, 122, 0.25)',
  textPrimary: '#FFFFFF',
  // v6.7 visual-consistency lock: text colors moved from rgba-on-white to
  // solid hex so the apparent color stays constant across page-bg / glass
  // / youCardSurface and contrast is deterministic. textSecondary doubles
  // as the eyebrow color (>= 4.5:1 on both #1f201c and #2a2c25).
  textSecondary: '#c4c1b3',
  textTertiary: '#8a8a82',
  textSoft: 'rgba(255, 255, 255, 0.42)',
  textMuted: 'rgba(255, 255, 255, 0.48)',
  textDisabled: 'rgba(255, 255, 255, 0.28)',
  textHalf: 'rgba(255, 255, 255, 0.42)',
  textPlaceholder: 'rgba(255, 255, 255, 0.35)',
  // ── Caregiver accent (lavender) ──
  // Phase 8.1 — opacity ladder mirrors the legacy purple* family so the
  // 64-site purple migration in Phase 8.2 is a 1:1 token rename rather
  // than a visual judgment call. caregiverAccentBorder shifts from 0.25
  // → 0.20 to match purpleBorder; the 0.25 value is now caregiverAccentStrong.
  caregiverAccent: '#aa8adc',
  caregiverAccentText: '#d4baff',
  caregiverAccentBg: 'rgba(170, 138, 220, 0.06)',
  caregiverAccentFaint: 'rgba(170, 138, 220, 0.06)',
  caregiverAccentMuted: 'rgba(170, 138, 220, 0.08)',
  caregiverAccentLight: 'rgba(170, 138, 220, 0.10)',
  caregiverAccentHint: 'rgba(170, 138, 220, 0.12)',
  caregiverAccentWash: 'rgba(170, 138, 220, 0.15)',
  caregiverAccentBorder: 'rgba(170, 138, 220, 0.20)',
  caregiverAccentStrong: 'rgba(170, 138, 220, 0.25)',
  // ── You tab — slightly warmer card surface for content warmth (Prompt 2) ──
  // Lifted in lockstep with bg (Phase 0): L* 22.09 vs bg L* 12.01 = delta
  // 10.08, restoring "warm card sitting on a surface" affordance.
  youCardSurface: '#383528',
  youCardBorder: 'rgba(255, 240, 215, 0.10)',
  youAffirmationText: '#d4d1c3',
  // Reset pills sit slightly darker than the You card surface so they read
  // as recessed buttons within the card (their old #252420 was lower L*
  // than glassDim; now lifted to keep the same relative depth).
  youResetPillSurface: '#2f2d24',
  youResetPillBorder: 'rgba(255, 235, 205, 0.10)',
  // ── Warm text ──
  textWarmPrimary: '#e0e8f0',
  textWarmSecondary: '#b0b8c0',
  textWarmMuted: '#6a7a8a',
  textWarmHint: '#4a5a6a',
  textWarmDim: '#3a4a5a',
  textAlertLabel: '#e0a84e',
  textAlertPrimary: '#e0d8c8',
  textAlertSecondary: '#a09880',
  textAlertHint: '#8a7a5a',
  textBright: 'rgba(255, 255, 255, 0.88)',
  textAlmostFull: 'rgba(255, 255, 255, 0.92)',
  textNearFull: 'rgba(255, 255, 255, 0.96)',
  textHighContrast: '#FFFFFF',
  border: 'rgba(255, 255, 255, 0.08)',
  borderLight: 'rgba(255, 255, 255, 0.05)',
  borderMedium: 'rgba(95, 184, 138, 0.22)',
  borderStrong: 'rgba(95, 184, 138, 0.35)',
  // Mirrors the page background (Phase 0 lifted both in lockstep so the
  // tab strip stays seamless with the surface above it).
  tabBarBackground: '#1f201c',
  tabBarBorder: 'rgba(95, 184, 138, 0.15)',
  tabBarActive: '#5fb88a',
  tabBarInactive: 'rgba(255, 255, 255, 0.40)',
  overlay: 'rgba(0, 0, 0, 0.90)',
  menuSurface: '#0A0A0A',
  gradientBackground: ['#000000', '#050505'],
  gradientAuroraToday: ['rgba(95, 184, 138, 0.10)', 'transparent'],
  gradientAuroraHub: ['rgba(95, 184, 138, 0.06)', 'transparent'],
  gradientAuroraFamily: ['rgba(95, 184, 138, 0.08)', 'transparent'],
  // Phase 2.6.1 — flat-lifted to the page-bg charcoal. Pre-lift these
  // were '#000000' / '#050505', and every sub-screen (Care Plan flow,
  // log forms, settings, etc.) wraps its SafeAreaView in a
  // <LinearGradient> reading from these tokens — so the near-black
  // gradient covered the lifted #1f201c page bg before reaching the
  // device. Flat lift to the same value as `background` so the gradient
  // overlay produces no visible color delta vs the SafeAreaView
  // underneath. The gradient JSX surface itself is preserved (40+
  // screens) for a future deliberate design call that wants depth back.
  backgroundGradientStart: '#1f201c',
  backgroundGradientEnd: '#1f201c',
  cardBackground: '#111111',
  backgroundDark: '#000000',
  backgroundDeep: '#050505',
  // Phase 2.6.2 — lifted to the Phase 0 glass-tier value (#363830). Pre-lift
  // was '#1A1A1A', which sat L* 2.7 BELOW the new warm-charcoal bg — making
  // buttons read darker than the page they sat on. Same root cause as the
  // gradient tokens (Phase 2.6.1): pre-warmth-lift legacy that escaped
  // Phase 0's audit because it's consumed mainly by sub-screens (Care Plan,
  // log forms, medication form), not the four main tabs. If on device this
  // reads too prominent for back-button purposes, drop one step to #2e2f29.
  backgroundElevated: '#363830',
  inputBackground: '#111111',
  switchThumbOn: '#FFFFFF',
  switchThumbOff: '#F4F3F4',
  switchThumb: '#F4F3F4',
  switchTrackOff: 'rgba(255, 255, 255, 0.15)',
};

// ============================================================================
// EXPORTED Colors — initialized based on system appearance at module load.
// This ensures static StyleSheet.create() calls (148 files) capture the
// correct theme values before any component mounts.
// ============================================================================

// Always initialize with dark theme — dark mode is the primary design
export const Colors: typeof DarkColors = { ...DarkColors };

/** Mutate the exported Colors object in-place so every file that reads Colors.X
 *  at render time picks up the active theme without needing a hook. */
export function _syncColors(newColors: Partial<typeof Colors>) {
  Object.assign(Colors, newColors);
}

/** Get the dark color palette (used by ThemeContext) */
export function getDarkColors(): typeof DarkColors {
  return DarkColors;
}
// Canonical 4pt spacing scale (May 1 spacing-rhythm pass — Phase 1).
// All values are multiples of 4. The legacy block (xs=4, sm=8, md=12,
// lg=16, xl=20, xxl=24, xxxl=32, huge=48) was migrated key-by-key with a
// codemod across ~700 call sites, preserving each site's pixel value.
// One deliberate lift: previously-xl values at 20pt step up to lg=24pt
// per the user's "prefer breathing room over tight" guidance.
//
// Rename map:
//   xs (4)   → xxs (4)    same value
//   sm (8)   → xs (8)     same value
//   md (12)  → sm (12)    same value
//   lg (16)  → md (16)    same value
//   xl (20)  → lg (24)    +4 lift (deliberate)
//   xxl (24) → lg (24)    same value
//   xxxl(32) → xl (32)    same value
//   huge(48) → removed    was unused
export const Spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  // Phase 3.5 — bumped md/lg/xl by 4pt each. Device review of Phase 3
  // showed cards at 16pt sibling gaps reading cramped on iOS, sections
  // at 24pt reading too tight for a clear break. The new 20/28/36
  // baseline gives breath without stretching content off-screen.
  md: 20,  // was 16 — sibling-card gaps
  lg: 28,  // was 24 — section breaks (eyebrow above card)
  xl: 36,  // was 32 — major section separations
};

// v6.7 sizing tokens (May 1 sizing pass) — locked numeric heights / radii /
// stat-tile ring + icon dimensions referenced across the app.
export const Sizing = {
  buttonHeight: 36,        // standard touch target — clears Apple HIG min
  buttonHeightCompact: 28, // secondary inline buttons
  textareaMinHeight: 36,   // empty placeholder height
  cardRadius: 13,
  pillRadius: 10,
  buttonRadius: 10,
  ringSize: 30,            // stat tile ring diameter
  iconSize: 18,            // standard inline icon
  // ── Spacing-rhythm pass extensions (May 1 — Phase 1) ──
  pageHorizontalPadding: 14, // every tab ScrollView's left/right padding
  cardInternalPadding: 12,   // every card's symmetric inner padding
  hairlineInset: 12,         // inset for inline row hairlines (matches card padding)
  quickActionMinHeight: 64,  // You-tab quick-action card minHeight
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

export const Typography = {
  // Display
  displayLarge: {
    fontSize: 42,
    fontWeight: '200' as const,
    letterSpacing: -1,
  },
  displayMedium: {
    fontSize: 32,
    fontWeight: '200' as const,
    letterSpacing: -0.5,
  },
  displaySmall: {
    fontSize: 28,
    fontWeight: '300' as const,
    letterSpacing: -0.5,
  },

  // Headings
  h1: {
    fontSize: 24,
    fontWeight: '400' as const,
  },
  h2: {
    fontSize: 20,
    fontWeight: '500' as const,
  },
  h3: {
    fontSize: 18,
    fontWeight: '500' as const,
  },

  // Body
  bodyLarge: {
    fontSize: 16,
    fontWeight: '400' as const,
  },
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as const,
  },

  // Labels
  label: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  labelSmall: {
    fontSize: 12,
    fontWeight: '400' as const,
  },

  // Captions
  caption: {
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 2,
  },
  captionSmall: {
    fontSize: 10,
    fontWeight: '500' as const,
    letterSpacing: 1,
  },
};

export const Shadows = {
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  }),
  glowSmall: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  }),
  soft: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  elevated: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
    elevation: 6,
  },
};
// Animation constants
export const Animation = {
  aurora: {
    duration: 8000,
    hueShiftRange: 30,
  },
  breathe: {
    duration: 6000,
    scaleRange: [1, 1.03],
  },
  transition: {
    fast: 150,
    normal: 250,
    slow: 400,
  },
};

export const Breakpoints = {
  sm: 375,
  mobile: 430,
  lg: 600,
  tablet: 768,
  desktop: 1024,
};

export const Layout = {
  maxWidth: 430,
  maxWidthTablet: 600,
  maxWidthDesktop: 768,
  paddingHorizontal: 20,
};
