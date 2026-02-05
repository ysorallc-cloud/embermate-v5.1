// ============================================================================
// SUB-CARD VISUAL TOKENS
// Standardized design tokens for sub-card components
// ============================================================================

import { Colors, Spacing, BorderRadius } from './theme-tokens';
import { ComponentRole } from '../types/componentRoles';

/**
 * Standard sub-card dimensions and spacing
 */
export const SubCardTokens = {
  // Layout
  padding: {
    horizontal: Spacing.lg, // 16px
    vertical: 14,
  },
  borderRadius: BorderRadius.md + 2, // 14px
  leadingSize: 44,
  leadingBorderRadius: BorderRadius.md, // 12px
  gap: Spacing.md, // 12px

  // Variants
  variants: {
    standard: {
      paddingVertical: 14,
      minHeight: 72,
    },
    compact: {
      paddingVertical: 10,
      minHeight: 56,
    },
    expanded: {
      paddingVertical: 18,
      minHeight: 88,
    },
  },
} as const;

/**
 * Role-based color schemes for sub-cards
 */
export const SubCardRoleColors: Record<ComponentRole, {
  background: string;
  border: string;
  accent: string;
  labelBackground: string;
  labelColor: string;
}> = {
  display: {
    background: Colors.glass,
    border: Colors.glassBorder,
    accent: Colors.accent,
    labelBackground: 'rgba(20, 184, 166, 0.15)',
    labelColor: Colors.accent,
  },
  logging: {
    background: Colors.glass,
    border: Colors.glassBorder,
    accent: Colors.green,
    labelBackground: 'rgba(16, 185, 129, 0.15)',
    labelColor: Colors.green,
  },
  configuration: {
    background: Colors.glass,
    border: Colors.glassBorder,
    accent: Colors.purple,
    labelBackground: 'rgba(139, 92, 246, 0.15)',
    labelColor: Colors.purple,
  },
};

/**
 * Status-based color schemes (for task/item states)
 */
export const SubCardStatusColors = {
  pending: {
    background: Colors.glass,
    border: Colors.glassBorder,
    iconBackground: 'rgba(255, 255, 255, 0.05)',
  },
  active: {
    background: Colors.goldLight,
    border: Colors.goldBorder,
    iconBackground: 'rgba(255, 255, 255, 0.1)',
  },
  completed: {
    background: Colors.greenLight,
    border: Colors.greenBorder,
    iconBackground: 'rgba(16, 185, 129, 0.2)',
  },
  skipped: {
    background: Colors.glass,
    border: Colors.glassBorder,
    iconBackground: 'rgba(255, 255, 255, 0.05)',
  },
  overdue: {
    background: Colors.amberLight,
    border: Colors.amberBorder,
    iconBackground: 'rgba(245, 158, 11, 0.2)',
  },
  missed: {
    background: Colors.redLight,
    border: Colors.redBorder,
    iconBackground: 'rgba(239, 68, 68, 0.2)',
  },
} as const;

export type SubCardStatus = keyof typeof SubCardStatusColors;

/**
 * Typography for sub-cards
 */
export const SubCardTypography = {
  label: {
    fontSize: 10,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  title: {
    fontSize: 15,
    fontWeight: '500' as const,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '400' as const,
  },
  roleLabel: {
    fontSize: 8,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
} as const;
