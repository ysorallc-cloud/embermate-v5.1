// ============================================================================
// MEET SAMPLE SCREEN — v6.7 story moment between Privacy and Get Started.
// Caregiver mode introduces "Dad" + meta + a week-of-tracking preview that
// surfaces a missed dose and an elevated reading. Self mode swaps to a
// generic narrative without the avatar/meta but keeps the same week strip.
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AuroraBackground } from '../components/AuroraBackground';
import { Colors, Spacing, BorderRadius } from '../../../theme/theme-tokens';
import { useTheme } from '../../../contexts/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  careMode: 'caregiver' | 'self';
}

const WEEK_DAYS = [
  { key: 'mon', label: 'M' },
  { key: 'tue', label: 'T' },
  { key: 'wed', label: 'W' },
  { key: 'thu', label: 'T' },
  { key: 'fri', label: 'F' },
  { key: 'sat', label: 'S' },
  { key: 'sun', label: 'S' },
] as const;

const CAREGIVER_BODY =
  'Sometimes he forgets a dose. Tracking quietly captures what\'s happening — so you can see what\'s working, what\'s not, and bring real data to his next visit.';
const SELF_BODY =
  'Track yourself for a week. Patterns surface that single days can\'t show — what helps, what doesn\'t, what\'s worth bringing up with your doctor.';

const CAREGIVER_INSIGHT =
  "Thursday's morning dose was missed. BP ran high Tuesday — worth mentioning at his next visit.";
const SELF_INSIGHT =
  'Sleep was rough Thursday — same day energy crashed at 3pm. Worth tracking.';

export const MeetSampleScreen: React.FC<Props> = ({ careMode }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isCaregiver = careMode === 'caregiver';

  // Per-day dot colors. Tuesday flags an elevated reading (warning amber);
  // Thursday flags a missed dose (criticalAlert red — `error` token in this
  // theme); the rest of the week reads as on-track (accent mint).
  const dotColorFor = (key: string): string => {
    if (key === 'tue') return colors.warning;
    if (key === 'thu') return colors.error;
    return colors.accent;
  };

  return (
    <View style={styles.container}>
      <AuroraBackground variant="welcome" />
      <View style={styles.content}>
        <Animated.Text
          entering={FadeInDown.delay(100).duration(300)}
          style={styles.title}
        >
          {isCaregiver ? 'Meet Dad.' : "Here's what a week looks like."}
        </Animated.Text>

        {isCaregiver && (
          <>
            <Animated.View
              entering={FadeInDown.delay(180).duration(300)}
              style={styles.avatar}
              accessibilityLabel="Dad, 72, sample patient"
              accessibilityRole="image"
            >
              <Text style={styles.avatarLetter}>D</Text>
            </Animated.View>
            <Animated.Text
              entering={FadeInDown.delay(220).duration(300)}
              style={styles.metaLine}
            >
              72 · takes meds for blood pressure
            </Animated.Text>
          </>
        )}

        <Animated.Text
          entering={FadeInDown.delay(280).duration(300)}
          style={styles.body}
        >
          {isCaregiver ? CAREGIVER_BODY : SELF_BODY}
        </Animated.Text>

        <Animated.View
          entering={FadeInDown.delay(360).duration(300)}
          style={styles.weekCard}
          accessibilityLabel="Sample week: 5 on-track days, 1 elevated reading, 1 missed dose"
          accessibilityRole="summary"
        >
          <Text style={styles.weekEyebrow}>
            {isCaregiver ? 'A WEEK WITH DAD' : 'YOUR WEEK'}
          </Text>

          <View style={styles.weekStrip}>
            {WEEK_DAYS.map((day) => (
              <View key={day.key} style={styles.weekCell}>
                <Text style={styles.weekDayLabel}>{day.label}</Text>
                <View
                  testID={`meet-week-dot-${day.key}`}
                  style={[
                    styles.weekDot,
                    { backgroundColor: dotColorFor(day.key) },
                  ]}
                />
              </View>
            ))}
          </View>

          <View style={styles.insightCallout}>
            <Text style={styles.insightEyebrow}>PATTERN</Text>
            <Text style={styles.insightBody}>
              {isCaregiver ? CAREGIVER_INSIGHT : SELF_INSIGHT}
            </Text>
          </View>
        </Animated.View>
      </View>
    </View>
  );
};

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    flex: 1,
    width: SCREEN_WIDTH,
    backgroundColor: c.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
    paddingBottom: 100,
  },
  title: {
    fontSize: 26,
    fontWeight: '300',
    color: c.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: c.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  avatarLetter: {
    fontSize: 26,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  metaLine: {
    fontSize: 12,
    color: c.textTertiary,
    textAlign: 'center',
    marginBottom: 18,
  },
  body: {
    fontSize: 14,
    color: c.textSecondary,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  // ── Week preview card ────────────────────────────────────────────────────
  weekCard: {
    width: '100%',
    backgroundColor: c.glass,
    borderWidth: 1,
    borderColor: c.glassBorder,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  weekEyebrow: {
    fontSize: 10,
    fontWeight: '600',
    color: c.textTertiary,
    letterSpacing: 0.4,
    marginBottom: 10,
  },
  weekStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  weekCell: {
    alignItems: 'center',
    gap: 6,
  },
  weekDayLabel: {
    fontSize: 11,
    color: c.textTertiary,
  },
  weekDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  // ── Insight callout ──────────────────────────────────────────────────────
  insightCallout: {
    backgroundColor: 'rgba(183, 148, 244, 0.10)',
    borderWidth: 0.5,
    borderColor: c.caregiverAccent,
    borderRadius: 8,
    padding: 10,
  },
  insightEyebrow: {
    fontSize: 9,
    fontWeight: '500',
    color: c.caregiverAccent,
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  insightBody: {
    fontSize: 11,
    color: c.textPrimary,
    lineHeight: 16,
  },
});

export default MeetSampleScreen;
