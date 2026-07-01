// ============================================================================
// EMBERMATE SAGE LIGHT THEME (Design-Lock §2 light column — PRIMARY mode)
// Sage-green ambient page → sheet → white cards; coral/gold/sage/blue accents.
// Remapped from the retired warm-linen/emerald palette in redesign-p0 F1b.
// STILL UNWIRED: getLightColors + light-default re-enable are deferred to the
// light-screen rebuild (red→coral key-parity gap + 766 dark-assuming literals
// make light-default unreadable until Phase-1 screens migrate).
// NOTE: Not a route - utility file only
// ============================================================================

export default null;

export const LightColors = {
  // Base — deep parchment cream
  background: '#dbe5dc',
  backgroundAlt: '#d0dad1',

  // Surfaces — warm-tinted white card surface
  glass: '#ffffff',
  glassHover: '#ffffff',
  glassBorder: 'rgba(40, 60, 45, 0.08)',
  glassActive: 'rgba(0, 0, 0, 0.08)',
  glassDim: '#e7eee7',
  glassFaint: '#e7eee7',
  glassSubtle: 'rgba(0, 0, 0, 0.07)',
  glassStrong: 'rgba(0, 0, 0, 0.12)',
  glassBold: 'rgba(0, 0, 0, 0.18)',

  // Surfaces — cards + elevated
  surface: '#ffffff',
  surfaceElevated: '#ffffff',
  surfaceAlt: '#e7eee7',
  surfaceHighlight: 'rgba(63, 125, 87, 0.08)',
  // ── Warm surfaces (light) ──
  warmSurface: '#ffffff',
  warmSurfaceBorder: '#E2E4E8',
  warmSurfaceAlert: '#FFF8F0',
  warmSurfaceAlertBorder: '#F0DCC8',
  warmSurfaceQuiet: '#F0F2F4',
  warmSurfaceQuietBorder: '#E0E2E4',
  warmSurfaceGreen: '#e3ede4',
  warmSurfaceGreenBorder: '#D0E8D8',
  warmSurfacePurple: '#F4F0F8',
  warmSurfacePurpleBorder: '#DCD0E8',

  // Aurora Colors — warm washes
  auroraTeal: 'hsla(153, 18%, 85%, 0.5)',
  auroraPurple: 'hsla(30, 20%, 87%, 0.3)',
  auroraBlue: 'hsla(153, 15%, 87%, 0.3)',
  auroraViolet: 'hsla(30, 15%, 87%, 0.2)',
  auroraRose: 'hsla(30, 25%, 85%, 0.2)',

  // Primary Accent — mint green
  accent: '#3f7d57',
  accentButton: '#3f7d57',
  accentSoftBg: '#e3ede4',
  accentSoftBorder: 'rgba(5, 150, 105, 0.4)',
  accentLight: 'rgba(63, 125, 87, 0.10)',
  accentBorder: 'rgba(63, 125, 87, 0.20)',
  accentGlow: 'rgba(63, 125, 87, 0.25)',
  accentFaint: 'rgba(63, 125, 87, 0.04)',
  accentTint: 'rgba(63, 125, 87, 0.05)',
  accentDim: 'rgba(63, 125, 87, 0.06)',
  accentHint: 'rgba(63, 125, 87, 0.10)',
  accentSubtle: 'rgba(63, 125, 87, 0.10)',
  accentMuted: 'rgba(63, 125, 87, 0.35)',
  // Phase 33 F7 — selected-chip fill (light-theme sage). Matches
  // the dark-theme accentChipFill at the light-mode sage RGB
  // (4,120,87). Same role: soft sage chip fill on the drawer ground.
  accentChipFill: 'rgba(63, 125, 87, 0.10)',
  accentGradientStart: '#3f7d57',
  accentGradientMid: '#3f7d57',
  accentGradientEnd: '#5a9e72',

  // Semantic Colors
  green: '#3f7d57',
  greenTint: 'rgba(63, 125, 87, 0.06)',
  greenLight: 'rgba(63, 125, 87, 0.08)',
  greenHint: 'rgba(63, 125, 87, 0.10)',
  greenMuted: 'rgba(63, 125, 87, 0.12)',
  greenBorder: 'rgba(63, 125, 87, 0.18)',
  greenStrong: 'rgba(63, 125, 87, 0.22)',
  greenGlow: 'rgba(63, 125, 87, 0.28)',

  amber: '#b8852f',
  amberFaint: 'rgba(184, 133, 47, 0.05)',
  amberLight: 'rgba(184, 133, 47, 0.08)',
  amberHint: 'rgba(184, 133, 47, 0.10)',
  amberMuted: 'rgba(184, 133, 47, 0.12)',
  amberBorder: 'rgba(184, 133, 47, 0.18)',
  amberGlow: 'rgba(184, 133, 47, 0.25)',

  // Coral family — parity with DarkColors `coral*` (light-mode reconcile).
  // The dark theme's Phase-33 F1b rename (red* → coral*) never reached light;
  // consumers read `colors.coral` (0 read `colors.red`), so the stale `red*`
  // keys are retired and `coral*` added at the same light hue (#c0673f).
  coral: '#c0673f',
  coralFaint: 'rgba(192, 103, 63, 0.05)',
  coralLight: 'rgba(192, 103, 63, 0.08)',
  coralHint: 'rgba(192, 103, 63, 0.10)',
  coralMuted: 'rgba(192, 103, 63, 0.12)',
  coralBorder: 'rgba(192, 103, 63, 0.18)',
  coralStrong: 'rgba(192, 103, 63, 0.22)',

  rose: '#9F1239',
  roseLight: 'rgba(159, 18, 57, 0.08)',
  roseBorder: 'rgba(159, 18, 57, 0.18)',


  sky: '#3D7A8A',
  skyLight: 'rgba(61, 122, 138, 0.08)',
  skyBorder: 'rgba(61, 122, 138, 0.18)',

  gold: '#b8852f',
  goldLight: 'rgba(184, 134, 11, 0.08)',
  goldBorder: 'rgba(184, 134, 11, 0.18)',

  violet: '#6D5A8A',
  violetLight: 'rgba(109, 90, 138, 0.08)',
  violetBorder: 'rgba(109, 90, 138, 0.18)',
  violetBright: '#6D5A8A',

  blue: '#5a78a0',
  blueFaint: 'rgba(90, 120, 160, 0.05)',
  blueTint: 'rgba(90, 120, 160, 0.06)',
  blueLight: 'rgba(90, 120, 160, 0.08)',
  blueWash: 'rgba(90, 120, 160, 0.12)',
  blueBorder: 'rgba(90, 120, 160, 0.18)',

  indigo: '#5A5A8A',
  indigoLight: 'rgba(90, 90, 138, 0.08)',
  indigoBorder: 'rgba(90, 90, 138, 0.18)',

  orange: '#C2622D',
  orangeLight: 'rgba(194, 98, 45, 0.08)',
  orangeBorder: 'rgba(194, 98, 45, 0.18)',

  cyan: '#3D7A7A',
  cyanLight: 'rgba(61, 122, 122, 0.08)',
  cyanBorder: 'rgba(61, 122, 122, 0.18)',

  // Sage tones
  sage: '#3f7d57',
  sageHint: 'rgba(63, 125, 87, 0.03)',
  sageTint: 'rgba(63, 125, 87, 0.04)',
  sageFaint: 'rgba(63, 125, 87, 0.05)',
  sageLight: 'rgba(63, 125, 87, 0.06)',
  sageSubtle: 'rgba(63, 125, 87, 0.08)',
  sageBorder: 'rgba(63, 125, 87, 0.12)',
  sageWash: 'rgba(63, 125, 87, 0.15)',
  sageGlow: 'rgba(63, 125, 87, 0.20)',
  sageMuted: 'rgba(63, 125, 87, 0.28)',
  sageSoft: 'rgba(63, 125, 87, 0.45)',
  sageStrong: 'rgba(63, 125, 87, 0.55)',
  sageBright: 'rgba(63, 125, 87, 0.75)',
  sageDim: 'rgba(63, 125, 87, 0.05)',

  // Chart variants
  amberBright: '#b8852f',
  amberBrightTint: 'rgba(184, 133, 47, 0.06)',
  amberBrightStrong: 'rgba(184, 133, 47, 0.6)',
  greenBright: '#3f7d57',
  coralBright: '#c0673f',
  blueBright: '#5a78a0',
  skyBright: '#3D7A8A',

  // Status — v6.6 semantic palette
  success: '#3f7d57',
  warning: '#b8852f',
  warningLight: 'rgba(184, 133, 47, 0.08)',
  warningBorder: 'rgba(184, 133, 47, 0.20)',
  error: '#c0673f',
  // criticalAlert — coral-family alias, parity with DarkColors (both point at
  // the coral hex, like `error`). Closes the 8 light consumers left undefined
  // by the red→coral rename. Part of the coral reconcile.
  criticalAlert: '#c0673f',
  // Named status tokens for explicit usage
  statusWarning: '#b8852f',
  statusWarningSoft: '#fef3c7',
  statusDanger: '#c0673f',
  statusDangerSoft: '#fee2e2',
  statusSuccess: '#3f7d57',
  statusSuccessSoft: '#d1fae5',

  // Text — v6.6 light palette
  textPrimary: '#26302a',
  textSecondary: '#7f8c82',
  textTertiary: '#a8b3aa',
  textSoft: '#a8b3aa',
  textMuted: '#a8b3aa',
  textDisabled: '#9ca3af',
  textHalf: '#a8b3aa',
  textPlaceholder: '#9ca3af',
  textInverse: '#ffffff',
  // ── Caregiver accent (lavender) ──
  // Phase 8.1 — opacity ladder mirrors the legacy purple* family.
  // caregiverAccentBorder shifts from 0.30 → 0.20 to track the dark-theme
  // recalibration; the 0.30 value is now caregiverAccentStrong.
  // F7 purple retirement (2026-06-12) — light-theme caregiverAccent
  // family migrated from purple to dusty blue. Token names preserved
  // for back-compat; only canonical values flip. (The exact retired
  // purple hexes are deliberately not named in this comment so the
  // post-F7 purple-retirement grep returns zero results outside
  // node_modules.)
  caregiverAccent: '#5a78a0',
  caregiverAccentText: '#5a78a0',
  caregiverAccentBg: 'rgba(90, 120, 160, 0.08)',
  caregiverAccentFaint: 'rgba(90, 120, 160, 0.06)',
  caregiverAccentMuted: 'rgba(90, 120, 160, 0.08)',
  caregiverAccentLight: 'rgba(90, 120, 160, 0.10)',
  caregiverAccentHint: 'rgba(90, 120, 160, 0.12)',
  caregiverAccentWash: 'rgba(90, 120, 160, 0.15)',
  caregiverAccentBorder: 'rgba(90, 120, 160, 0.20)',
  caregiverAccentStrong: 'rgba(90, 120, 160, 0.30)',
  // ── Warm text (light) ──
  textWarmPrimary: '#1A1A2E',
  textWarmSecondary: '#4A4A5A',
  textWarmMuted: '#7A7A8A',
  textWarmHint: '#9A9AA8',
  textWarmDim: '#B0B0BC',
  textAlertLabel: '#b8852f',
  textAlertPrimary: '#4A3520',
  textAlertSecondary: '#7A6A50',
  textAlertHint: '#9A8A70',
  textBright: '#2D3B36',
  textAlmostFull: '#1E2A25',
  textNearFull: '#1A231F',
  textHighContrast: '#1A231F',

  // Borders — v6.6 light palette
  border: 'rgba(40, 60, 45, 0.08)',
  borderLight: 'rgba(0, 0, 0, 0.04)',
  borderSubtle: 'rgba(0, 0, 0, 0.10)',
  borderMedium: 'rgba(63, 125, 87, 0.18)',
  borderStrong: 'rgba(0, 0, 0, 0.18)',

  // Tab Bar
  tabBarBackground: '#FFFFFF',
  tabBarBorder: 'rgba(40, 60, 45, 0.08)',
  tabBarActive: '#3f7d57',
  tabBarInactive: '#A8A29E',

  // Overlay
  overlay: 'rgba(45, 59, 54, 0.55)',
  menuSurface: '#FFFFFF',

  // Gradients
  gradientBackground: ['#cfe0d2', '#dbe5dc'],
  gradientAuroraToday: ['rgba(63, 125, 87, 0.05)', 'transparent'],
  gradientAuroraHub: ['rgba(109, 90, 138, 0.05)', 'transparent'],
  gradientAuroraFamily: ['rgba(184, 134, 11, 0.05)', 'transparent'],

  // Hero-plane gradient (Design-Lock §3 light column) — calm two-stop.
  heroGradientStart: '#cfe0d2',
  heroGradientEnd: '#dbe5dc',
  heroGlow: 'rgba(63, 125, 87, 0.08)',
  // Figure-ground middle tier (Design-Lock §2/§3): page → SHEET → white card.
  sheet: '#e7eee7',

  // Compatibility
  backgroundGradientStart: '#cfe0d2',
  backgroundGradientEnd: '#dbe5dc',

  // Background variants
  backgroundElevated: '#FFFFFF',

  // Switch
  switchThumbOn: '#FFFFFF',
  switchThumbOff: '#FFFFFF',
  switchThumb: '#FFFFFF',
  switchTrackOff: 'rgba(0, 0, 0, 0.15)',
};
