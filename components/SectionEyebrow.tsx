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
}

export function SectionEyebrow({ text, tint }: SectionEyebrowProps) {
  const { colors } = useTheme();
  const colour = (tint && (colors as any)[tint]) || colors.textTertiary;
  const style = useMemo(
    () => StyleSheet.flatten([baseStyle.eyebrow, { color: colour }]),
    [colour],
  );
  return (
    <Text style={style} accessibilityRole="header">
      {text.toUpperCase()}
    </Text>
  );
}

const baseStyle = StyleSheet.create({
  eyebrow: {
    fontSize: 8,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
});

export default SectionEyebrow;
