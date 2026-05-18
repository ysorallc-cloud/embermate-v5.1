// ============================================================================
// SECTION EYEBROW
// Small uppercase label that sits above page-level sections. Used across the
// Journal redesign and the HandoffSheet preview to delineate "TODAY'S
// OUTCOMES" / "TODAY'S NOTES" / "HANDOFF NOTES" / etc.
// ============================================================================

import React, { useMemo } from 'react';
import { Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

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
// Aligns eyebrow scale with the website source-of-truth register so
// section labels read as confident-but-quiet markers rather than
// near-invisible hairlines.
//
// letterSpacing 2 vs website canon 1.5 — Q-33.8 lock takes precedence
// over canon for this commit. Phase 33b eyebrow canon reconciliation
// revisits with SectionEyebrow + 32A section eyebrows + 32C
// "WHERE THINGS STAND" all in view and may relock to canon 1.5.
//
// fontWeight removed from the static block — `'600'` (feature) and
// `'500'` (hero) variants are applied at render time via the merged
// style above.
const baseStyle = StyleSheet.create({
  eyebrow: {
    fontSize: 11,
    letterSpacing: 2,
  },
});

export default SectionEyebrow;
