// ============================================================================
// SAMPLE MODE BANNER
// Slim pill shown on Now while the user is exploring with example data.
// Tap opens ManageSampleDataSheet (set up vs. remove).
//
// Phase 33b Scope 2 — Surface 5 lavender scale reduction. Per Q-33b.7
// lock: cream pill, optional small lavender sparkle icon, no border.
// Pre-33b the entire pill carried lavender chrome (~100% footprint —
// border + bg + icon + text + chevron). 33b retains the sparkle glyph
// at lavender as a wayfinding garnish; everything else migrates to
// cream tones. The sample-mode state is meta/system, not section
// chrome — canon allows a tiny garnish accent for wayfinding without
// using lavender as primary chrome.
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export interface SampleModeBannerProps {
  isSampleMode: boolean;
  onPress: () => void;
}

export function SampleModeBanner({ isSampleMode, onPress }: SampleModeBannerProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!isSampleMode) return null;

  return (
    <TouchableOpacity
      style={styles.pill}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel="Viewing example data. Tap to manage."
      accessibilityHint="Opens the example data sheet to set up your own profile or remove the example."
    >
      <View style={styles.content}>
        <Text style={styles.glyph}>{'✦'}</Text>
        <Text style={styles.label}>Viewing example data</Text>
      </View>
      <Text style={styles.chevron}>{'›'}</Text>
    </TouchableOpacity>
  );
}

const createStyles = (c: any) => StyleSheet.create({
  // Phase 33b Scope 2 — cream pill, no border. Pre-33b carried full
  // lavender chrome (border + bg + label + chevron all lavender);
  // 33b retains only the glyph as a lavender wayfinding garnish.
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: c.glass,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14, // allow: tap-target padding (Apple HIG ≥44pt)
    marginHorizontal: 16, // allow: off-scale gap (intentional)
    marginBottom: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  // Lavender sparkle garnish — the only lavender on this pill post-33b.
  glyph: {
    fontSize: 13,
    color: c.caregiverAccent,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: c.textPrimary,
    letterSpacing: 0.1,
  },
  chevron: {
    fontSize: 16,
    color: c.textTertiary,
    fontWeight: '500',
  },
});

export default SampleModeBanner;
