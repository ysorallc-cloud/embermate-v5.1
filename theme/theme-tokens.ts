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
  background: '#141612',
  backgroundAlt: '#050505',
  glass: '#2a2c25',
  glassHover: 'rgba(255, 245, 220, 0.06)',
  glassBorder: 'rgba(255, 240, 215, 0.08)',
  // v6.7 — inset row hairline (12pt inset inside cards). Quieter than
  // glassBorder (0.08) so it reads as a separator, not an edge.
  hairlineInset: 'rgba(255, 240, 215, 0.06)',
  glassActive: 'rgba(255, 245, 220, 0.12)',
  glassDim: '#1f2019',
  glassFaint: 'rgba(255, 245, 220, 0.03)',
  glassSubtle: 'rgba(255, 245, 220, 0.12)',
  glassStrong: 'rgba(255, 245, 220, 0.18)',
  glassBold: 'rgba(255, 245, 220, 0.25)',
  surface: '#2a2c25',
  surfaceElevated: '#322f27',
  surfaceAlt: 'rgba(255, 255, 255, 0.03)',
  surfaceHighlight: 'rgba(95, 184, 138, 0.08)',
  // ── Warm surfaces — re-tuned in v6.7 to lift L* ≥ 6 above the warmer
  //    sage-cream background (#141612). Hues now share the warm-dark family
  //    rather than the previous cool blue tint. ─────────────────────────────
  warmSurface: '#2c2f25',
  warmSurfaceBorder: '#383a30',
  warmSurfaceAlert: '#2f2620',
  warmSurfaceAlertBorder: '#403328',
  warmSurfaceQuiet: '#262824',
  warmSurfaceQuietBorder: '#2e3030',
  warmSurfaceGreen: '#2a322a',
  warmSurfaceGreenBorder: '#384238',
  warmSurfacePurple: '#2c2935',
  warmSurfacePurpleBorder: '#3a364a',
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
  purpleGlow: 'rgba(167, 139, 250, 0.35)',
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
  // as the eyebrow color (>= 4.5:1 on both #141612 and #2a2c25).
  textSecondary: '#c4c1b3',
  textTertiary: '#8a8a82',
  textSoft: 'rgba(255, 255, 255, 0.42)',
  textMuted: 'rgba(255, 255, 255, 0.48)',
  textDisabled: 'rgba(255, 255, 255, 0.28)',
  textHalf: 'rgba(255, 255, 255, 0.42)',
  textPlaceholder: 'rgba(255, 255, 255, 0.35)',
  // ── Caregiver accent (purple — used by End of Shift + Care Circle) ──
  caregiverAccent: '#aa8adc',
  caregiverAccentText: '#d4baff',
  caregiverAccentBg: 'rgba(170, 138, 220, 0.06)',
  caregiverAccentBorder: 'rgba(170, 138, 220, 0.25)',
  // ── You tab — slightly warmer card surface for content warmth (Prompt 2) ──
  youCardSurface: '#2c2a23',
  youCardBorder: 'rgba(255, 240, 215, 0.10)',
  youAffirmationText: '#d4d1c3',
  youResetPillSurface: '#252420',
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
  tabBarBackground: '#141612',
  tabBarBorder: 'rgba(95, 184, 138, 0.15)',
  tabBarActive: '#5fb88a',
  tabBarInactive: 'rgba(255, 255, 255, 0.40)',
  overlay: 'rgba(0, 0, 0, 0.90)',
  menuSurface: '#0A0A0A',
  gradientBackground: ['#000000', '#050505'],
  gradientAuroraToday: ['rgba(95, 184, 138, 0.10)', 'transparent'],
  gradientAuroraHub: ['rgba(95, 184, 138, 0.06)', 'transparent'],
  gradientAuroraFamily: ['rgba(95, 184, 138, 0.08)', 'transparent'],
  backgroundGradientStart: '#000000',
  backgroundGradientEnd: '#050505',
  cardBackground: '#111111',
  backgroundDark: '#000000',
  backgroundDeep: '#050505',
  backgroundElevated: '#1A1A1A',
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
export const Spacing = {
  // ── Legacy t-shirt scale (kept for back-compat with existing callers) ──
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
  // ── v6.7 semantic spacing tokens (May 1 sizing pass) ──
  // Use these for new code; legacy keys above are preserved for back-compat.
  cardPadding: 12,        // internal card padding
  cardPaddingTight: 10,   // when card holds rows w/ own padding
  cardGap: 10,            // between sibling cards
  sectionGap: 16,         // between named sections
  rowGap: 8,              // within a row of items
  inlineGap: 6,           // tight inline elements
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
