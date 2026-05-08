// ============================================================================
// FIRST-TIME WELCOME CARD — Phase 5.13.e.
//
// Mounted at the top of Now (between NowHeader and SampleModeBanner). Renders
// once after wizard completion (5.13.d sets the @embermate_first_real_mode_landed
// flag to 'false'). Tapping the primary CTA or the dismiss area marks the
// flag as seen so the card never re-renders.
//
// Greeting personalises by caregiver name when set; falls back to a
// generic "Welcome." otherwise. Body line names the patient and points
// the caregiver at adding a first medication to populate the schedule.
// ============================================================================

import React, { useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Spacing, Sizing } from '../../theme/theme-tokens';
import { useFirstRealMode } from '../../hooks/useFirstRealMode';
import { navigate } from '../../lib/navigate';

interface FirstTimeWelcomeCardProps {
  patientName: string;
  caregiverName: string;
}

export function FirstTimeWelcomeCard({
  patientName,
  caregiverName,
}: FirstTimeWelcomeCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { shouldShow, markSeen } = useFirstRealMode();

  const handlePrimary = useCallback(() => {
    markSeen();
    navigate('/care-plan/meds');
  }, [markSeen]);

  const handleDismiss = useCallback(() => {
    markSeen();
  }, [markSeen]);

  if (!shouldShow) return null;

  const greeting = caregiverName.trim().length > 0
    ? `Welcome, ${caregiverName.trim()}.`
    : 'Welcome.';

  return (
    <View style={styles.card}>
      <TouchableOpacity
        testID="first-welcome-dismiss"
        onPress={handleDismiss}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Dismiss welcome card"
      >
        <Text style={styles.title}>{greeting}</Text>
        <Text style={styles.body}>
          {`${patientName}'s care plan is set. Add their first medication to populate the schedule.`}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        testID="first-welcome-cta"
        style={styles.cta}
        onPress={handlePrimary}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Add a medication"
      >
        <Text style={styles.ctaText}>{'Add a medication →'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (c: any) =>
  StyleSheet.create({
    card: {
      marginHorizontal: 14, // allow: page-rhythm horizontal inset
      marginTop: Spacing.sm,
      padding: Sizing.cardInternalPadding,
      backgroundColor: c.caregiverAccentFaint,
      borderWidth: 0.5,
      borderColor: c.caregiverAccentStrong,
      borderRadius: Sizing.cardRadius,
    },
    title: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: c.textPrimary,
      marginBottom: 6,
    },
    body: {
      fontFamily: 'Georgia',
      fontStyle: 'italic' as const,
      fontSize: 13,
      lineHeight: 20,
      color: c.textSecondary,
      marginBottom: Spacing.sm,
    },
    cta: {
      backgroundColor: c.accent,
      borderRadius: 11,
      paddingVertical: 10,
      alignItems: 'center' as const,
    },
    ctaText: {
      fontSize: 13,
      fontWeight: '600' as const,
      color: c.textPrimary,
    },
  });

export default FirstTimeWelcomeCard;
