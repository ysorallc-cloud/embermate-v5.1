// ============================================================================
// EMBERMATE THEME TOKENS
// Color Scheme: Dark Teal with Modern Minimalism
// NOTE: Not a route - utility file only
// ============================================================================

// Prevent Expo Router warning (this is not a route component)
export default null;

export const Colors = {
  // Backgrounds - Dark Teal (Almost Black)
  background: '#051614',
  backgroundGradientStart: '#051614',
  backgroundGradientEnd: '#042420',
  
  // Surfaces - Subtle teal contrast
  surface: 'rgba(13, 148, 136, 0.04)',
  surfaceAlt: 'rgba(13, 148, 136, 0.02)',
  surfaceHighlight: 'rgba(20, 184, 166, 0.08)',
  
  // Borders - Teal accent
  border: 'rgba(20, 184, 166, 0.12)',
  borderMedium: 'rgba(20, 184, 166, 0.2)',
  borderStrong: 'rgba(20, 184, 166, 0.3)',
  
  // Text - High contrast for readability
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.85)',
  textTertiary: 'rgba(255, 255, 255, 0.6)',
  textMuted: 'rgba(94, 234, 212, 0.5)',
  
  // Accents - Teal gradient
  accent: '#14B8A6',
  accentLight: 'rgba(20, 184, 166, 0.12)',
  accentBorder: 'rgba(20, 184, 166, 0.3)',
  accentMuted: 'rgba(94, 234, 212, 0.5)',
  accentGradientStart: '#14B8A6',
  accentGradientMid: '#0D9488',
  accentGradientEnd: '#5EEAD4',
  
  // Secondary teal tones
  sage: '#5EEAD4',
  sageMuted: 'rgba(94, 234, 212, 0.4)',
  
  // Status - Modern teal-based
  success: '#10B981',
  warning: '#F59E0B',
  warningLight: 'rgba(245, 158, 11, 0.12)',
  warningBorder: 'rgba(245, 158, 11, 0.3)',
  error: '#EF4444',

  // Alert colors
  red: '#EF4444',
  redLight: 'rgba(239, 68, 68, 0.12)',
  redBorder: 'rgba(239, 68, 68, 0.3)',

  green: '#10B981',
  greenLight: 'rgba(16, 185, 129, 0.12)',
  greenBorder: 'rgba(16, 185, 129, 0.3)',

  blue: '#3B82F6',
  blueLight: 'rgba(59, 130, 246, 0.12)',
  blueBorder: 'rgba(59, 130, 246, 0.25)',

  gold: '#F59E0B',
  goldLight: 'rgba(245, 158, 11, 0.12)',
  goldBorder: 'rgba(245, 158, 11, 0.3)',
  
  // Tab Bar
  tabBarBackground: '#051614',
  tabBarBorder: 'rgba(20, 184, 166, 0.15)',
  tabBarActive: '#14B8A6',
  tabBarInactive: 'rgba(255, 255, 255, 0.4)',
  
  // Overlay & Menu
  overlay: 'rgba(0, 0, 0, 0.85)',
  sageDim: 'rgba(20, 184, 166, 0.08)',
  menuSurface: '#042420',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 14,
  xl: 16,
  xxl: 20,
  full: 9999,
};

export const Typography = {
  h1: {
    fontSize: 40,
    fontWeight: '100' as const,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 24,
    fontWeight: '300' as const,
  },
  h3: {
    fontSize: 18,
    fontWeight: '400' as const,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
  },
  caption: {
    fontSize: 13,
    fontWeight: '400' as const,
  },
  label: {
    fontSize: 9,
    fontWeight: '800' as const,
    letterSpacing: 3,
    textTransform: 'uppercase' as const,
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
