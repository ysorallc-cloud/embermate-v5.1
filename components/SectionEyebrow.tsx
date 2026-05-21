// ============================================================================
// SECTION EYEBROW
// Small uppercase label that sits above page-level sections. Used across the
// Journal redesign and the HandoffSheet preview to delineate "TODAY'S
// OUTCOMES" / "TODAY'S NOTES" / "HANDOFF NOTES" / etc.
// ============================================================================

import React, { useMemo } from 'react';
import { Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Spacing } from '../theme/theme-tokens';

export interface SectionEyebrowProps {
  text: string;
  /** Theme colour key — defaults to textTertiary. */
  tint?: string;
  /**
   * Weight variant. `'feature'` (600) is the default informational
   * register — confident, brand-aligned eyebrow that holds against
   * the warm-dark surface. `'hero'` (500) is a lighter opt-in for
   * surfaces where the heavier weight reads loud (e.g., dense
   * eyebrow stacks). Q-33.8 lock: default `'feature'`.
   */
  variant?: 'hero' | 'feature';
}

export function SectionEyebrow({ text, tint, variant = 'feature' }: SectionEyebrowProps) {
  const { colors } = useTheme();
  const colour = (tint && (colors as any)[tint]) || colors.textTertiary;
  const weight: '500' | '600' = variant === 'hero' ? '500' : '600';
  const style = useMemo(
    () => StyleSheet.flatten([baseStyle.eyebrow, { color: colour, fontWeight: weight }]),
    [colour, weight],
  );
  return (
    <Text style={style} accessibilityRole="header">
      {text.toUpperCase()}
    </Text>
  );
}

// Phase 33 F8 — fontSize 8 → 11, letterSpacing 0.5 → 2 per Q-33.8 lock.
// Phase 33b Scope 3 — letterSpacing 2 → 1.5 per website canon
// `.phone-section-label` (Q-Scope3.1 lock). Path A: locks canon during
// 33b; 32A section eyebrows + 32C "WHERE THINGS STAND" inherit by spec
// (both consume SectionEyebrow primitive, picking up the canon value
// automatically). The Q-33.8 lock at 2 took precedence during F8 to
// avoid mid-phase re-litigation; 33b reconciles now that all three
// eyebrow surface families are simultaneously visible in the audit.
//
// fontWeight removed from the static block — `'600'` (feature) and
// `'500'` (hero) variants are applied at render time via the merged
// style above.
//
// Phase 33b extension pre-Lock-3 Item B — primitive marginBottom
// Spacing.sm. Lock 2 retired confirm.tsx's local `eyebrow:` style
// which carried `marginBottom: 8`; the migration onto SectionEyebrow
// left eyebrows flush against their next sibling on all 14+ consumer
// sites. Adding the default at the primitive layer gives every
// consumer a consistent canon gap. JournalSection's redundant
// `body: { marginTop: 7 }` is dropped in the same commit so the gap
// doesn't compound for JournalSection-wrapped consumers.
const baseStyle = StyleSheet.create({
  eyebrow: {
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: Spacing.sm,
  },
});

export default SectionEyebrow;
