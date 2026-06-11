// ============================================================================
// WELCOME SCREEN — Onboarding redesign C1 (pre-launch).
//
// Screen 1 of the 4-screen emotional flow. Voice anchored to the
// embermate.app register: serif display, lowercase-feeling, warm.
// Title is the website's own opening line; the rest of the screen
// makes room for that line to land.
//
// Visual lock per the C1 spec:
//   • Title — Fonts.serif 34px weight 300 lineHeight 42 letterSpacing -0.5
//   • Subtitle — Fonts.serifItalic 17px lineHeight 26 textSecondary
//   • Three value points — Fonts.serif 15px, no emoji, thin left
//     hairline rule (1px ember at 30% opacity) running the height of
//     the points container with 20px vertical gap between each
//   • CTA "Begin" — full-width ember → emberDeep gradient,
//     Fonts.serif 16px, 32px bottom inset
//   • Pre-redesign pill / chart / lock emoji iconography is gone
//     (decorative emoji-in-a-row was the second AI-tell)
//   • Sage/slab-green is intentionally absent — ember is the
//     onboarding accent; sage is the in-app confirm color
//
// Phase 28 Batch B note carries forward: StaticAuroraBackground
// instead of AuroraBackground (Reanimated 3.16.7 + Expo Go SDK 52
// blank-render workaround). Re-introduce the animated variant once
// dev-build verification clears.
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, Image, StyleSheet, Pressable, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StaticAuroraBackground } from '../components/StaticAuroraBackground';
import { Colors, Fonts, Spacing } from '../../../theme/theme-tokens';
import { useTheme } from '../../../contexts/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Three value points — text preserved from the prior screen
// (caregiver-tested copy), emoji decorations dropped per the C1 spec.
const VALUE_POINTS: string[] = [
  'Track meds, vitals, and mood — a few taps a day',
  'See patterns a single visit might miss',
  'Stays on your device. No accounts, no cloud.',
];

export interface WelcomeScreenProps {
  /** Advance to the next screen in the onboarding flow. Wired in by
   *  the orchestrator (app/(onboarding)/index.tsx). */
  onContinue?: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onContinue }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.container}>
      <StaticAuroraBackground variant="welcome" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.topBlock}>
          <Image
            source={require('../../../assets/images/embermate-icon.png')}
            style={styles.appIcon}
            accessibilityLabel="EmberMate"
          />
          <Text style={styles.title}>
            You carry more{'\n'}than people can see.
          </Text>
          <Text style={styles.subtitle}>
            A quiet place to put some of it down.
          </Text>
        </View>

        <View style={styles.pointsContainer}>
          {VALUE_POINTS.map((point, index) => (
            <View key={index} style={styles.pointRow}>
              <Text style={styles.pointText}>{point}</Text>
            </View>
          ))}
        </View>

        <Pressable
          onPress={onContinue}
          accessibilityRole="button"
          accessibilityLabel="Begin"
          style={({ pressed }) => [
            styles.ctaWrapper,
            pressed && styles.ctaPressed,
          ]}
        >
          <LinearGradient
            colors={[colors.ember, colors.emberDeep]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaGradient}
          >
            <Text style={styles.ctaText}>Begin</Text>
          </LinearGradient>
        </Pressable>
      </View>
      </SafeAreaView>
    </View>
  );
};

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    flex: 1,
    width: SCREEN_WIDTH,
    backgroundColor: c.background,
  },
  safe: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl, // allow: top third breathes — onboarding rhythm lock
    paddingBottom: 32, // allow: C1 spec — 32px bottom safe inset for the CTA
    justifyContent: 'space-between',
  },
  topBlock: {
    alignItems: 'flex-start',
  },
  appIcon: {
    width: 64,
    height: 64,
    borderRadius: 14,
    marginBottom: Spacing.lg,
  },
  title: {
    fontFamily: Fonts.serif,
    fontSize: 34, // allow: C1 spec — serif display headline
    fontWeight: '300',
    lineHeight: 42, // allow: C1 spec — 1.24× fontSize for serif title rhythm
    letterSpacing: -0.5,
    color: c.textPrimary,
    marginBottom: Spacing.md,
  },
  subtitle: {
    fontFamily: Fonts.serifItalic,
    fontSize: 17, // allow: C1 spec — serif italic subtitle
    lineHeight: 26, // allow: C1 spec — 1.53× fontSize for italic warmth
    color: c.textSecondary,
  },
  pointsContainer: {
    // Thin left hairline rule (1px ember at 30% opacity) runs the
    // height of the points container per C1 spec.
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 140, 66, 0.30)',
    paddingLeft: Spacing.md,
    marginVertical: Spacing.xl,
  },
  pointRow: {
    // 20px vertical gap between value points per C1 spec.
    marginBottom: 20, // allow: C1 spec — 20px between value points
  },
  pointText: {
    fontFamily: Fonts.serif,
    fontSize: 15, // allow: C1 spec — serif value-point text
    lineHeight: 22, // allow: C1 spec — comfortable serif body rhythm
    color: c.textSecondary,
  },
  ctaWrapper: {
    width: '100%',
    borderRadius: 14, // allow: cardRadius equivalent — C1 CTA shape
    overflow: 'hidden',
  },
  ctaPressed: {
    opacity: 0.85,
  },
  ctaGradient: {
    paddingVertical: 18, // allow: C1 CTA tap-target height (Apple HIG ≥44pt)
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontFamily: Fonts.serif,
    fontSize: 16, // allow: C1 spec — serif CTA label
    // Layout pass — near-black charcoal #1a1612 on ember fill;
    // textPrimary cream read washed out on device.
    color: '#1a1612',
    letterSpacing: 0.3,
    fontWeight: '600' as const,
  },
});

export default WelcomeScreen;
