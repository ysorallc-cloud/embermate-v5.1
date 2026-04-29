// ============================================================================
// SAMPLE MODE BANNER
// Slim caregiver-accent pill shown on Now while the user is exploring with
// example data. Tap opens ManageSampleDataSheet (set up vs. remove).
// Replaces the heavier purple SampleDataBanner discoverability surface.
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
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: c.caregiverAccentBg,
    borderWidth: 0.5,
    borderColor: c.caregiverAccentBorder,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  glyph: {
    fontSize: 13,
    color: c.caregiverAccent,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: c.caregiverAccentText,
    letterSpacing: 0.1,
  },
  chevron: {
    fontSize: 16,
    color: c.caregiverAccent,
    fontWeight: '500',
  },
});

export default SampleModeBanner;
