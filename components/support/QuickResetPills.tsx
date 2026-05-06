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
        <Text testID="quick-reset-label-breathe" style={[styles.label, { color: colors.accent }]}>Breathe</Text>
        <Text testID="quick-reset-subtitle-breathe" style={styles.subtitle}>60 sec</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.pill}
        onPress={onHelpline}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Helpline"
        accessibilityHint="Calls the caregiver helpline — free and confidential"
      >
        {/* v6.7 May 1 sizing pass — Phase 6: previously coral, which read
            as a soft "alert" affordance and over-pulled the eye. Coral is
            now reserved (Phase 7) for genuine emergency cues. The Helpline
            CTA reverts to textPrimary so the three-pill row reads as
            peers; semantic weight comes from the icon + 24/7 subtitle. */}
        <Text style={[styles.icon, { color: colors.textPrimary }]}>☎</Text>
        <Text testID="quick-reset-label-helpline" style={[styles.label, { color: colors.textPrimary }]}>Helpline</Text>
        <Text testID="quick-reset-subtitle-helpline" style={styles.subtitle}>24/7</Text>
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
        <Text testID="quick-reset-label-community" style={[styles.label, { color: colors.caregiverAccent }]}>Community</Text>
        <Text testID="quick-reset-subtitle-community" style={styles.subtitle}>Read</Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 14, // allow: off-scale gap (intentional)
  },
  pill: {
    flex: 1,
    // Slightly darker / warmer than the You-tab card surface so the pill
    // reads as a "physical button" rather than a navigation tab.
    backgroundColor: (c as any).youResetPillSurface || c.glass,
    borderWidth: 0.5,
    borderColor: (c as any).youResetPillBorder || c.glassBorder,
    borderRadius: 18,
    // Phase 7.2 — lift to a primary-action tap target. minHeight: 52
    // pins the floor above the HIG ≥ 44pt baseline; the shadow gives
    // the pill physical weight against the warm-cream page surface.
    minHeight: 52, // allow: primary tap-target floor (Apple HIG ≥44pt)
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  icon: {
    // Phase 7.2 — bump 18 → 20 so the icon reads from arm's length
    // (typical Quick Reset usage is mid-stress, one-glance scan).
    fontSize: 20,
    opacity: 0.95,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    // Per-pill colour is set inline via the category accent — see pill markup.
    color: (c as any).youAffirmationText || c.textSecondary,
  },
  subtitle: {
    fontSize: 9,
    color: c.textTertiary,
    marginTop: 1,
  },
});
