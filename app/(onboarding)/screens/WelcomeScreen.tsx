// ============================================================================
// WELCOME SCREEN - Empathy-first introduction
// Screen 1 of 4: Lead with emotional connection, then value points
//
// Phase 28 Batch B sidecar — PATH A SPIKE (single-screen). Reanimated's
// Animated.View / Animated.Text components were rendering blank in Expo
// Go SDK 52 + Reanimated 3.16.7 regardless of `entering` prop value;
// AsYouUseScreen renders correctly because it never used Animated.* at
// all. This spike replaces Animated.View / Animated.Text with plain
// View / Text on WelcomeScreen only, drops AuroraBackground (also uses
// Animated.View internally), and removes the useReduceMotion + entering
// helper from the sidecar fix b41faa92. If the simulator confirms
// WelcomeScreen renders content after this spike, the same pattern
// rolls out across the other 4 onboarding screens in a Path B commit.
// If it stays blank, the bug lives below the Reanimated layer.
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, Image, StyleSheet, Dimensions } from 'react-native';
import { Colors, Spacing } from '../../../theme/theme-tokens';
import { useTheme } from '../../../contexts/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Privacy point lands last so it closes the pitch with reassurance.
const VALUE_POINTS = [
  { icon: '\u{1F48A}', text: 'Track meds, vitals, and mood — a few taps a day' },
  { icon: '\u{1F4CA}', text: 'See patterns a single visit might miss' },
  { icon: '\u{1F512}', text: 'Stays on your device. No accounts, no cloud.' },
];

export const WelcomeScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  // DIAG-ONBOARDING: confirms WelcomeScreen function body executes (so the
  // blank-middle issue is NOT a "renderItem returned null" routing problem
  // and IS a style/layout/opacity problem)
  console.log('[DIAG-ONBOARDING] WelcomeScreen render — colors.background=', colors?.background, 'colors.textPrimary=', colors?.textPrimary, 'SCREEN_WIDTH=', SCREEN_WIDTH);
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View>
          <Image
            source={require('../../../assets/images/embermate-icon.png')}
            style={styles.appIcon}
            accessibilityLabel="EmberMate"
          />
        </View>
        <Text style={styles.title}>
          Caring for someone{'\n'}is a lot to carry.
        </Text>
        <Text style={styles.subtitle}>
          A quiet companion to help you keep track — gently — and see the patterns that matter.
        </Text>
        <View style={styles.pointsContainer}>
          {VALUE_POINTS.map((point, index) => (
            <View
              key={index}
              style={styles.pointRow}
            >
              <Text style={styles.pointIcon}>{point.icon}</Text>
              <Text style={styles.pointText}>{point.text}</Text>
            </View>
          ))}
        </View>
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
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  appIcon: {
    width: 88,
    height: 88,
    borderRadius: 20,
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 22,
    fontWeight: '300',
    color: c.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.md,
    lineHeight: 30,
  },
  subtitle: {
    fontSize: 15,
    color: c.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.sm,
  },
  pointsContainer: {
    width: '100%',
    gap: 16,
    marginTop: Spacing.sm,
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pointIcon: {
    fontSize: 22,
  },
  pointText: {
    fontSize: 14,
    color: c.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
});

export default WelcomeScreen;
