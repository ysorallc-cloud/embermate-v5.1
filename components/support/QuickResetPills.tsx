// ============================================================================
// QUICK RESET PILLS — Three small circular pills on the You tab.
//
// Replaces the older 2×2 contact-tile grid (Helpline / Community / Take a
// breath cards). Each pill is a compact tap target: small icon + short
// label, glass surface with a hairline border. Handlers are passed in by
// the parent screen (which owns the breath modal + helpline + community
// destinations) so the component stays presentational.
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';

export interface QuickResetPillsProps {
  /** Open the breathing-exercise modal. */
  onBreathe: () => void;
  /** Open the helpline call action (typically dials a confirmed number). */
  onHelpline: () => void;
  /** Open the community resource (link or sheet). */
  onCommunity: () => void;
}

export function QuickResetPills({ onBreathe, onHelpline, onCommunity }: QuickResetPillsProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={styles.pill}
        onPress={onBreathe}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Breathe"
        accessibilityHint="Opens the guided breathing exercise"
      >
        <Text style={[styles.icon, { color: colors.accent }]}>▶</Text>
        <Text style={styles.label}>Breathe</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.pill}
        onPress={onHelpline}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Helpline"
        accessibilityHint="Calls the caregiver helpline — free and confidential"
      >
        <Text style={[styles.icon, { color: colors.error }]}>☎</Text>
        <Text style={styles.label}>Helpline</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.pill}
        onPress={onCommunity}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Community"
        accessibilityHint="Opens the caregiver community"
      >
        <Text style={[styles.icon, { color: colors.caregiverAccent }]}>♡</Text>
        <Text style={styles.label}>Community</Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 14,
  },
  pill: {
    flex: 1,
    // Slightly darker / warmer than the You-tab card surface so the pill
    // reads as a "physical button" rather than a navigation tab.
    backgroundColor: (c as any).youResetPillSurface || c.glass,
    borderWidth: 0.5,
    borderColor: (c as any).youResetPillBorder || c.glassBorder,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  icon: {
    fontSize: 14,
    opacity: 0.92,
  },
  label: {
    fontSize: 10,
    color: (c as any).youAffirmationText || c.textSecondary,
  },
});
