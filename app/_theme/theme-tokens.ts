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
  accentMuted: 'rgba(94, 234, 212, 0.5)',
  accentGradientStart: '#14B8A6',
  accentGradientMid: '#0D9488',
  accentGradientEnd: '#5EEAD4',

  // Semantic Colors
  green: '#10B981',
  greenLight: 'rgba(16, 185, 129, 0.12)',
  greenBorder: 'rgba(16, 185, 129, 0.25)',
  greenGlow: 'rgba(16, 185, 129, 0.4)',

  amber: '#F59E0B',
  amberLight: 'rgba(245, 158, 11, 0.12)',
  amberBorder: 'rgba(245, 158, 11, 0.25)',
  amberGlow: 'rgba(245, 158, 11, 0.4)',

  red: '#EF4444',
  redLight: 'rgba(239, 68, 68, 0.12)',
  redBorder: 'rgba(239, 68, 68, 0.25)',

  rose: '#F43F5E',
  roseLight: 'rgba(244, 63, 94, 0.12)',
  roseBorder: 'rgba(244, 63, 94, 0.25)',

  purple: '#8B5CF6',
  purpleLight: 'rgba(139, 92, 246, 0.12)',
  purpleBorder: 'rgba(139, 92, 246, 0.25)',
  purpleGlow: 'rgba(139, 92, 246, 0.4)',

  sky: '#0EA5E9',
  skyLight: 'rgba(14, 165, 233, 0.12)',
  skyBorder: 'rgba(14, 165, 233, 0.25)',

  gold: '#EAB308',
  goldLight: 'rgba(234, 179, 8, 0.12)',
  goldBorder: 'rgba(234, 179, 8, 0.25)',

  blue: '#3B82F6',
  blueLight: 'rgba(59, 130, 246, 0.12)',
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
  sageMuted: 'rgba(94, 234, 212, 0.4)',
  sageDim: 'rgba(20, 184, 166, 0.08)',

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
  textMuted: 'rgba(255, 255, 255, 0.4)',
  textDisabled: 'rgba(255, 255, 255, 0.25)',

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
    shadowColor: '#000',
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
