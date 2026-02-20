// ============================================================================
// EMBERMATE LIGHT THEME TOKENS
// Light color map mirroring the dark theme structure
// NOTE: Not a route - utility file only
// ============================================================================

export default null;

export const LightColors = {
  // Base
  background: '#F8FFFE',
  backgroundAlt: '#EFF8F6',

  // Surfaces
  glass: 'rgba(0, 0, 0, 0.03)',
  glassHover: 'rgba(0, 0, 0, 0.05)',
  glassBorder: 'rgba(0, 0, 0, 0.08)',
  glassActive: 'rgba(0, 0, 0, 0.1)',
  glassDim: 'rgba(0, 0, 0, 0.04)',
  glassFaint: 'rgba(0, 0, 0, 0.03)',
  glassSubtle: 'rgba(0, 0, 0, 0.12)',
  glassStrong: 'rgba(0, 0, 0, 0.18)',
  glassBold: 'rgba(0, 0, 0, 0.25)',

  // Legacy surface support
  surface: 'rgba(0, 0, 0, 0.03)',
  surfaceElevated: 'rgba(0, 0, 0, 0.04)',
  surfaceAlt: 'rgba(0, 0, 0, 0.02)',
  surfaceHighlight: 'rgba(13, 148, 136, 0.08)',

  // Aurora Colors (muted for light theme)
  auroraTeal: 'hsla(160, 50%, 85%, 0.4)',
  auroraPurple: 'hsla(280, 40%, 88%, 0.3)',
  auroraBlue: 'hsla(220, 50%, 88%, 0.35)',
  auroraViolet: 'hsla(260, 40%, 88%, 0.25)',
  auroraRose: 'hsla(320, 35%, 88%, 0.25)',

  // Primary Accent (slightly darker teal for readability on light bg)
  accent: '#0D9488',
  accentLight: 'rgba(13, 148, 136, 0.1)',
  accentBorder: 'rgba(13, 148, 136, 0.25)',
  accentGlow: 'rgba(13, 148, 136, 0.3)',
  accentFaint: 'rgba(13, 148, 136, 0.04)',
  accentTint: 'rgba(13, 148, 136, 0.06)',
  accentDim: 'rgba(13, 148, 136, 0.08)',
  accentHint: 'rgba(13, 148, 136, 0.12)',
  accentSubtle: 'rgba(13, 148, 136, 0.12)',
  accentMuted: 'rgba(13, 148, 136, 0.4)',
  accentGradientStart: '#0D9488',
  accentGradientMid: '#0F766E',
  accentGradientEnd: '#14B8A6',

  // Semantic Colors
  green: '#059669',
  greenTint: 'rgba(5, 150, 105, 0.08)',
  greenLight: 'rgba(5, 150, 105, 0.1)',
  greenHint: 'rgba(5, 150, 105, 0.12)',
  greenMuted: 'rgba(5, 150, 105, 0.15)',
  greenBorder: 'rgba(5, 150, 105, 0.2)',
  greenStrong: 'rgba(5, 150, 105, 0.25)',
  greenGlow: 'rgba(5, 150, 105, 0.3)',

  amber: '#D97706',
  amberFaint: 'rgba(217, 119, 6, 0.06)',
  amberLight: 'rgba(217, 119, 6, 0.1)',
  amberHint: 'rgba(217, 119, 6, 0.12)',
  amberMuted: 'rgba(217, 119, 6, 0.15)',
  amberBorder: 'rgba(217, 119, 6, 0.2)',
  amberGlow: 'rgba(217, 119, 6, 0.3)',

  red: '#DC2626',
  redFaint: 'rgba(220, 38, 38, 0.06)',
  redLight: 'rgba(220, 38, 38, 0.1)',
  redHint: 'rgba(220, 38, 38, 0.12)',
  redMuted: 'rgba(220, 38, 38, 0.15)',
  redBorder: 'rgba(220, 38, 38, 0.2)',
  redStrong: 'rgba(220, 38, 38, 0.25)',

  rose: '#E11D48',
  roseLight: 'rgba(225, 29, 72, 0.1)',
  roseBorder: 'rgba(225, 29, 72, 0.2)',

  purple: '#7C3AED',
  purpleFaint: 'rgba(124, 58, 237, 0.06)',
  purpleMuted: 'rgba(124, 58, 237, 0.08)',
  purpleLight: 'rgba(124, 58, 237, 0.1)',
  purpleHint: 'rgba(124, 58, 237, 0.12)',
  purpleWash: 'rgba(124, 58, 237, 0.15)',
  purpleBorder: 'rgba(124, 58, 237, 0.2)',
  purpleStrong: 'rgba(124, 58, 237, 0.25)',
  purpleGlow: 'rgba(124, 58, 237, 0.3)',

  sky: '#0284C7',
  skyLight: 'rgba(2, 132, 199, 0.1)',
  skyBorder: 'rgba(2, 132, 199, 0.2)',

  gold: '#CA8A04',
  goldLight: 'rgba(202, 138, 4, 0.1)',
  goldBorder: 'rgba(202, 138, 4, 0.2)',

  violet: '#7C3AED',
  violetLight: 'rgba(124, 58, 237, 0.1)',
  violetBorder: 'rgba(124, 58, 237, 0.2)',
  violetBright: '#7C3AED',

  blue: '#2563EB',
  blueFaint: 'rgba(37, 99, 235, 0.06)',
  blueTint: 'rgba(37, 99, 235, 0.08)',
  blueLight: 'rgba(37, 99, 235, 0.1)',
  blueWash: 'rgba(37, 99, 235, 0.15)',
  blueBorder: 'rgba(37, 99, 235, 0.2)',

  indigo: '#4F46E5',
  indigoLight: 'rgba(79, 70, 229, 0.1)',
  indigoBorder: 'rgba(79, 70, 229, 0.2)',

  orange: '#EA580C',
  orangeLight: 'rgba(234, 88, 12, 0.1)',
  orangeBorder: 'rgba(234, 88, 12, 0.2)',

  cyan: '#0891B2',
  cyanLight: 'rgba(8, 145, 178, 0.1)',
  cyanBorder: 'rgba(8, 145, 178, 0.2)',

  // Secondary teal tones
  sage: '#0D9488',
  sageHint: 'rgba(13, 148, 136, 0.04)',
  sageTint: 'rgba(13, 148, 136, 0.05)',
  sageFaint: 'rgba(13, 148, 136, 0.06)',
  sageLight: 'rgba(13, 148, 136, 0.08)',
  sageSubtle: 'rgba(13, 148, 136, 0.1)',
  sageBorder: 'rgba(13, 148, 136, 0.12)',
  sageWash: 'rgba(13, 148, 136, 0.15)',
  sageGlow: 'rgba(13, 148, 136, 0.2)',
  sageMuted: 'rgba(13, 148, 136, 0.3)',
  sageSoft: 'rgba(13, 148, 136, 0.5)',
  sageStrong: 'rgba(13, 148, 136, 0.6)',
  sageBright: 'rgba(13, 148, 136, 0.8)',
  sageDim: 'rgba(13, 148, 136, 0.06)',

  // Bright/chart hex variants (darker for light bg readability)
  purpleBright: '#7C3AED',
  amberBright: '#D97706',
  amberBrightTint: 'rgba(217, 119, 6, 0.08)',
  amberBrightStrong: 'rgba(217, 119, 6, 0.7)',
  greenBright: '#059669',
  redBright: '#DC2626',
  blueBright: '#2563EB',
  skyBright: '#0284C7',

  // Status colors
  success: '#059669',
  warning: '#D97706',
  warningLight: 'rgba(217, 119, 6, 0.1)',
  warningBorder: 'rgba(217, 119, 6, 0.25)',
  error: '#DC2626',

  // Text
  textPrimary: '#0F2421',
  textSecondary: '#374151',
  textTertiary: '#4B5563',
  textSoft: '#6B7280',
  textMuted: '#6B7280',
  textDisabled: '#9CA3AF',
  textHalf: '#6B7280',
  textPlaceholder: '#9CA3AF',
  textBright: '#1F2937',
  textAlmostFull: '#111827',
  textNearFull: '#0F172A',

  // Borders
  border: 'rgba(0, 0, 0, 0.08)',
  borderLight: 'rgba(0, 0, 0, 0.05)',
  borderMedium: 'rgba(13, 148, 136, 0.2)',
  borderStrong: 'rgba(13, 148, 136, 0.3)',

  // Tab Bar
  tabBarBackground: '#F8FFFE',
  tabBarBorder: 'rgba(13, 148, 136, 0.15)',
  tabBarActive: '#0D9488',
  tabBarInactive: '#6B7280',

  // Overlay & Menu
  overlay: 'rgba(0, 0, 0, 0.5)',
  menuSurface: '#FFFFFF',

  // Gradients
  gradientBackground: ['#F8FFFE', '#EFF8F6'],
  gradientAuroraToday: ['rgba(13, 148, 136, 0.06)', 'transparent'],
  gradientAuroraHub: ['rgba(99, 102, 241, 0.06)', 'transparent'],
  gradientAuroraFamily: ['rgba(124, 58, 237, 0.06)', 'transparent'],

  // Backwards compatibility
  backgroundGradientStart: '#F8FFFE',
  backgroundGradientEnd: '#EFF8F6',
  cardBackground: '#FFFFFF',

  // Background variants
  backgroundDark: '#E5E7EB',
  backgroundDeep: '#EFF8F6',
  backgroundElevated: '#FFFFFF',

  // Additional background/input
  inputBackground: '#FFFFFF',

  // Switch tokens
  switchThumbOn: '#FFFFFF',
  switchThumbOff: '#FFFFFF',
  switchThumb: '#FFFFFF',
  switchTrackOff: 'rgba(0, 0, 0, 0.15)',
};
