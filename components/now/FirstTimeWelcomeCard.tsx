// ============================================================================
// FIRST-TIME WELCOME CARD — Phase 5.13.e + 5.13.2.
//
// Mounted at the top of Now (between NowHeader and SampleModeBanner). Renders
// once after wizard completion (5.13.d sets the @embermate_first_real_mode_landed
// flag to 'false'). Tapping the primary CTA or the dismiss area marks the
// flag as seen so the card never re-renders.
//
// Greeting personalises by caregiver name when set; falls back to a
// generic "Welcome." otherwise. Body opens with "<patient>'s care plan
// is set:" followed by the configured-state summary (template, buckets,
// medication count).
// ============================================================================

import React, { useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Spacing, Sizing } from '../../theme/theme-tokens';
import { useFirstRealMode } from '../../hooks/useFirstRealMode';
import { navigate } from '../../lib/navigate';

export interface WelcomeSummary {
  /** Display name from CARE_PLAN_TEMPLATES; undefined for "Start blank". */
  appliedTemplateName?: string;
  /** Display labels (e.g. "Medications", "Vitals") for enabled buckets. */
  enabledBucketLabels: string[];
  /** Count of medications currently in the plan. */
  medicationCount: number;
}

interface FirstTimeWelcomeCardProps {
  patientName: string;
  caregiverName: string;
  summary: WelcomeSummary;
}

function formatBucketList(labels: string[]): string {
  if (labels.length === 0) return '';
  const [first, ...rest] = labels;
  if (rest.length === 0) return first;
  return `${first}, ${rest.map((l) => l.toLowerCase()).join(', ')}`;
}

export function FirstTimeWelcomeCard({
  patientName,
  caregiverName,
  summary,
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

  const hasTemplate = !!summary.appliedTemplateName;
  const bucketList = formatBucketList(summary.enabledBucketLabels);
  const showMedCount = hasTemplate && summary.medicationCount > 0;
  const medCountLine = summary.medicationCount === 1
    ? '1 medication added'
    : `${summary.medicationCount} medications added`;

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
          {`${patientName}’s care plan is set:`}
        </Text>

        {hasTemplate && (
          <Text testID="welcome-bullet-template" style={styles.bullet}>
            {`•  ${summary.appliedTemplateName} template applied`}
          </Text>
        )}

        {bucketList.length > 0 && (
          <Text testID="welcome-bullet-buckets" style={styles.bullet}>
            {`•  ${bucketList} tracked`}
          </Text>
        )}

        {showMedCount && (
          <Text testID="welcome-bullet-meds" style={styles.bullet}>
            {`•  ${medCountLine}`}
          </Text>
        )}

        {!hasTemplate && (
          <Text testID="welcome-bullet-prompt" style={styles.bullet}>
            {'•  Add medications, vitals readings, and notes from the schedule below.'}
          </Text>
        )}
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
      marginBottom: 6,
    },
    bullet: {
      fontFamily: 'Georgia',
      fontStyle: 'italic' as const,
      fontSize: 13,
      lineHeight: 20,
      color: c.textSecondary,
      marginLeft: 4,
      marginBottom: 2,
    },
    cta: {
      backgroundColor: c.accent,
      borderRadius: 11,
      paddingVertical: 10,
      alignItems: 'center' as const,
      marginTop: Spacing.sm,
    },
    ctaText: {
      fontSize: 13,
      fontWeight: '600' as const,
      color: c.textPrimary,
    },
  });

export default FirstTimeWelcomeCard;
