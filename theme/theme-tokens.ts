// ============================================================================
// EMBERMATE AURORA THEME TOKENS
// Aurora design system with glassmorphism
// NOTE: Not a route - utility file only
// ============================================================================

// Prevent Expo Router warning (this is not a route component)
export default null;

export const Colors = {
  // Base
  background: '#051614',
  backgroundAlt: '#042420',

  // Surfaces (Glassmorphism)
  glass: 'rgba(255, 255, 255, 0.03)',
  glassHover: 'rgba(255, 255, 255, 0.06)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
  glassActive: 'rgba(255, 255, 255, 0.1)',
  glassDim: 'rgba(255, 255, 255, 0.04)',
  glassFaint: 'rgba(255, 255, 255, 0.04)',
  glassSubtle: 'rgba(255, 255, 255, 0.15)',
  glassStrong: 'rgba(255, 255, 255, 0.2)',
  glassBold: 'rgba(255, 255, 255, 0.3)',

  // Legacy surface support (map to glass)
  surface: 'rgba(255, 255, 255, 0.03)',
  surfaceElevated: 'rgba(255, 255, 255, 0.05)',
  surfaceAlt: 'rgba(255, 255, 255, 0.02)',
  surfaceHighlight: 'rgba(20, 184, 166, 0.08)',

  // Aurora Colors (for backgrounds)
  auroraTeal: 'hsla(160, 70%, 30%, 0.4)',
  auroraPurple: 'hsla(280, 50%, 40%, 0.3)',
  auroraBlue: 'hsla(220, 60%, 35%, 0.35)',
  auroraViolet: 'hsla(260, 50%, 30%, 0.25)',
  auroraRose: 'hsla(320, 40%, 35%, 0.25)',

  // Primary Accent
  accent: '#14B8A6',
  accentLight: 'rgba(20, 184, 166, 0.12)',
  accentBorder: 'rgba(20, 184, 166, 0.25)',
  accentGlow: 'rgba(20, 184, 166, 0.4)',
  accentFaint: 'rgba(20, 184, 166, 0.05)',
  accentTint: 'rgba(20, 184, 166, 0.06)',
  accentDim: 'rgba(20, 184, 166, 0.1)',
  accentHint: 'rgba(20, 184, 166, 0.15)',
  accentSubtle: 'rgba(20, 184, 166, 0.15)',
  accentMuted: 'rgba(94, 234, 212, 0.5)',
  accentGradientStart: '#14B8A6',
  accentGradientMid: '#0D9488',
  accentGradientEnd: '#5EEAD4',

  // Semantic Colors
  green: '#10B981',
  greenTint: 'rgba(16, 185, 129, 0.1)',
  greenLight: 'rgba(16, 185, 129, 0.12)',
  greenHint: 'rgba(16, 185, 129, 0.15)',
  greenMuted: 'rgba(16, 185, 129, 0.2)',
  greenBorder: 'rgba(16, 185, 129, 0.25)',
  greenStrong: 'rgba(16, 185, 129, 0.3)',
  greenGlow: 'rgba(16, 185, 129, 0.4)',

  amber: '#F59E0B',
  amberFaint: 'rgba(245, 158, 11, 0.08)',
  amberLight: 'rgba(245, 158, 11, 0.12)',
  amberHint: 'rgba(245, 158, 11, 0.15)',
  amberMuted: 'rgba(245, 158, 11, 0.2)',
  amberBorder: 'rgba(245, 158, 11, 0.25)',
  amberGlow: 'rgba(245, 158, 11, 0.4)',

  red: '#EF4444',
  redFaint: 'rgba(239, 68, 68, 0.08)',
  redLight: 'rgba(239, 68, 68, 0.12)',
  redHint: 'rgba(239, 68, 68, 0.15)',
  redMuted: 'rgba(239, 68, 68, 0.2)',
  redBorder: 'rgba(239, 68, 68, 0.25)',
  redStrong: 'rgba(239, 68, 68, 0.3)',

  rose: '#F43F5E',
  roseLight: 'rgba(244, 63, 94, 0.12)',
  roseBorder: 'rgba(244, 63, 94, 0.25)',

  purple: '#8B5CF6',
  purpleFaint: 'rgba(139, 92, 246, 0.08)',
  purpleMuted: 'rgba(139, 92, 246, 0.1)',
  purpleLight: 'rgba(139, 92, 246, 0.12)',
  purpleHint: 'rgba(139, 92, 246, 0.15)',
  purpleWash: 'rgba(139, 92, 246, 0.2)',
  purpleBorder: 'rgba(139, 92, 246, 0.25)',
  purpleStrong: 'rgba(139, 92, 246, 0.3)',
  purpleGlow: 'rgba(139, 92, 246, 0.4)',

  sky: '#0EA5E9',
  skyLight: 'rgba(14, 165, 233, 0.12)',
  skyBorder: 'rgba(14, 165, 233, 0.25)',

  gold: '#EAB308',
  goldLight: 'rgba(234, 179, 8, 0.12)',
  goldBorder: 'rgba(234, 179, 8, 0.25)',

  violet: '#A78BFA',
  violetLight: 'rgba(167, 139, 250, 0.12)',
  violetBorder: 'rgba(167, 139, 250, 0.25)',
  violetBright: 'rgba(167, 139, 250, 0.9)',

  blue: '#3B82F6',
  blueFaint: 'rgba(59, 130, 246, 0.08)',
  blueTint: 'rgba(59, 130, 246, 0.1)',
  blueLight: 'rgba(59, 130, 246, 0.12)',
  blueWash: 'rgba(59, 130, 246, 0.2)',
  blueBorder: 'rgba(59, 130, 246, 0.25)',

  indigo: '#6366F1',
  indigoLight: 'rgba(99, 102, 241, 0.12)',
  indigoBorder: 'rgba(99, 102, 241, 0.25)',

  orange: '#F97316',
  orangeLight: 'rgba(249, 115, 22, 0.12)',
  orangeBorder: 'rgba(249, 115, 22, 0.25)',

  cyan: '#06B6D4',
  cyanLight: 'rgba(6, 182, 212, 0.12)',
  cyanBorder: 'rgba(6, 182, 212, 0.25)',

  // Secondary teal tones
  sage: '#5EEAD4',
  sageHint: 'rgba(94, 234, 212, 0.05)',
  sageTint: 'rgba(94, 234, 212, 0.06)',
  sageFaint: 'rgba(94, 234, 212, 0.08)',
  sageLight: 'rgba(94, 234, 212, 0.1)',
  sageSubtle: 'rgba(94, 234, 212, 0.12)',
  sageBorder: 'rgba(94, 234, 212, 0.15)',
  sageWash: 'rgba(94, 234, 212, 0.2)',
  sageGlow: 'rgba(94, 234, 212, 0.3)',
  sageMuted: 'rgba(94, 234, 212, 0.4)',
  sageSoft: 'rgba(94, 234, 212, 0.7)',
  sageStrong: 'rgba(94, 234, 212, 0.8)',
  sageBright: 'rgba(94, 234, 212, 0.9)',
  sageDim: 'rgba(20, 184, 166, 0.08)',

  // Bright/chart hex variants
  purpleBright: '#A78BFA',
  amberBright: '#FBBF24',
  amberBrightTint: 'rgba(251, 191, 36, 0.1)',
  amberBrightStrong: 'rgba(251, 191, 36, 0.8)',
  greenBright: '#22C55E',
  redBright: '#F87171',
  blueBright: '#60A5FA',
  skyBright: '#38BDF8',

  // Status colors
  success: '#10B981',
  warning: '#F59E0B',
  warningLight: 'rgba(245, 158, 11, 0.12)',
  warningBorder: 'rgba(245, 158, 11, 0.3)',
  error: '#EF4444',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textTertiary: 'rgba(255, 255, 255, 0.6)',
  textSoft: 'rgba(255, 255, 255, 0.5)',
  textMuted: 'rgba(255, 255, 255, 0.6)',
  textDisabled: 'rgba(255, 255, 255, 0.4)',
  textHalf: 'rgba(255, 255, 255, 0.5)',
  textPlaceholder: 'rgba(255, 255, 255, 0.5)',
  textBright: 'rgba(255, 255, 255, 0.8)',
  textAlmostFull: 'rgba(255, 255, 255, 0.9)',
  textNearFull: 'rgba(255, 255, 255, 0.95)',

  // Borders
  border: 'rgba(255, 255, 255, 0.08)',
  borderLight: 'rgba(255, 255, 255, 0.05)',
  borderMedium: 'rgba(20, 184, 166, 0.2)',
  borderStrong: 'rgba(20, 184, 166, 0.3)',

  // Tab Bar
  tabBarBackground: '#051614',
  tabBarBorder: 'rgba(20, 184, 166, 0.15)',
  tabBarActive: '#14B8A6',
  tabBarInactive: 'rgba(255, 255, 255, 0.6)',

  // Overlay & Menu
  overlay: 'rgba(0, 0, 0, 0.85)',
  menuSurface: '#042420',

  // Gradients (as strings for LinearGradient)
  gradientBackground: ['#051614', '#042420'],
  gradientAuroraToday: ['rgba(20, 100, 90, 0.3)', 'transparent'],
  gradientAuroraHub: ['rgba(60, 60, 120, 0.3)', 'transparent'],
  gradientAuroraFamily: ['rgba(80, 60, 80, 0.3)', 'transparent'],

  // Backwards compatibility
  backgroundGradientStart: '#051614',
  backgroundGradientEnd: '#042420',
  cardBackground: '#0a1f1c',

  // Background variants
  backgroundDark: '#0a0a0a',
  backgroundDeep: '#0D1F1C',
  backgroundElevated: '#0d332e',

  // Additional background/input
  inputBackground: '#0D332E',

  // Switch tokens
  switchThumbOn: '#FFFFFF',
  switchThumbOff: '#F4F3F4',
  switchThumb: '#F4F3F4',
  switchTrackOff: 'rgba(255, 255, 255, 0.2)',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
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
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  }),
  glowSmall: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  }),
  soft: {
    shadowColor: Colors.background,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
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
