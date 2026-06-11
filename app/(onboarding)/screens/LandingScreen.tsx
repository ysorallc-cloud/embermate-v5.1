// ============================================================================
// LANDING SCREEN — Onboarding redesign C4 (pre-launch).
//
// Screen 4 of the 4-screen flow. REPLACES the wizard handoff. On the
// CTA tap, completeOnboarding (owned by the orchestrator) writes the
// three required onboarding keys, calls writePatientName for the
// captured value, generates the default care plan, and routes to
// /(tabs)/now. The wizard at /care-plan/setup stays untouched and is
// reachable from the Now tab's Care Plan link.
//
// Voice + visual lock per the C4 spec:
//   • Headline — "Meet {name}." Fonts.serif 32px weight 300
//     letterSpacing -0.4. The patient's name appears in serif display
//     for the first time.
//   • One warm italic line — "{name}'s care starts here. Log what
//     happens, when it happens — a few taps a day, in your own
//     words." Fonts.serifItalic 16px lineHeight 26 textSecondary.
//   • CTA — "Start with {name}" ember → emberDeep gradient,
//     Fonts.serif 16px label. While the completion path runs, the
//     CTA shows an ActivityIndicator and is non-interactive.
//   • NO bullet list. NO feature tour. NO emoji iconography.
//
// Phase 28 Batch B note carries forward: StaticAuroraBackground per
// the Reanimated 3.16.7 + Expo Go SDK 52 blank-render workaround.
// ============================================================================

import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StaticAuroraBackground } from '../components/StaticAuroraBackground';
import { Colors, Fonts, Spacing } from '../../../theme/theme-tokens';
import { useTheme } from '../../../contexts/ThemeContext';
import { ONBOARDING_CTA_GRADIENT } from '../onboardingTokens';

// Post-walk width single-sourcing fix — root style is flex:1 only.

export interface LandingScreenProps {
  /** Patient name captured by C3's NameScreen; the orchestrator
   *  threads it here for headline + sub + CTA interpolation. Falls
   *  back to "your loved one" defensively when empty — but the
   *  4-screen flow guards against empty by gating C3's Continue. */
  patientName: string;
  /** Onboarding completion handler — writes the three required keys,
   *  generates the care plan, and routes to /(tabs)/now. Owned by
   *  the orchestrator. */
  onComplete: () => Promise<void> | void;
}

export const LandingScreen: React.FC<LandingScreenProps> = ({
  patientName,
  onComplete,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [isStarting, setIsStarting] = useState(false);

  const name = (patientName || 'your loved one').trim() || 'your loved one';

  const handleStart = useCallback(async () => {
    if (isStarting) return;
    setIsStarting(true);
    try {
      await onComplete();
    } catch {
      // Orchestrator already logs the failure; release the lock so
      // a retry tap can fire.
      setIsStarting(false);
    }
  }, [isStarting, onComplete]);

  return (
    <View style={styles.container}>
      <StaticAuroraBackground variant="welcome" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.content}>
        {/* Round 3 vertical-centering fix — wrap the title block in
            a flex:1 + justifyContent:'center' container so "Meet
            {name}." floats at the visual center of the screen
            instead of hiding at the top with the entire middle
            empty. The CTA stays pinned at the bottom. */}
        <View style={styles.centerBlock}>
          <View style={styles.topBlock}>
            <Text style={styles.headline}>{`Meet ${name}.`}</Text>
            <Text style={styles.warm}>
              {`${name}'s care starts here. Log what happens, when it happens — a few taps a day, in your own words.`}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={handleStart}
          accessibilityRole="button"
          accessibilityLabel={`Start with ${name}`}
          accessibilityState={{ disabled: isStarting, busy: isStarting }}
          disabled={isStarting}
          style={({ pressed }) => [
            styles.ctaWrapper,
            isStarting && styles.ctaWrapperDisabled,
            pressed && !isStarting && styles.ctaPressed,
          ]}
        >
          <LinearGradient
            colors={ONBOARDING_CTA_GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaGradient}
          >
            {isStarting ? (
              <ActivityIndicator size="small" color="#1a1612" />
            ) : (
              <Text style={styles.ctaText}>{`Start with ${name}`}</Text>
            )}
          </LinearGradient>
        </Pressable>
      </View>
      </SafeAreaView>
    </View>
  );
};

const createStyles = (c: typeof Colors) => StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl, // allow: C4 spec — top third breathes
    paddingBottom: 32, // allow: C4 spec — 32px safe inset for CTA
    // Round 3 vertical-centering fix — centerBlock owns the upper
    // flex region with justifyContent:'center'; the CTA sits at the
    // natural bottom of the column. justify-space-between left the
    // headline glued to the top with the middle empty.
  },
  centerBlock: {
    flex: 1,
    justifyContent: 'center',
  },
  topBlock: {
    alignItems: 'flex-start',
  },
  headline: {
    fontFamily: Fonts.serif,
    fontSize: 32, // allow: C4 spec — serif display headline
    fontWeight: '300',
    lineHeight: 40, // allow: C4 spec — 1.25× serif title rhythm
    letterSpacing: -0.4,
    color: c.textPrimary,
    marginBottom: Spacing.md,
  },
  warm: {
    fontFamily: Fonts.serifItalic,
    fontSize: 16, // allow: C4 spec — serif italic warmth copy
    lineHeight: 26, // allow: C4 spec — generous italic rhythm
    color: c.textSecondary,
  },
  ctaWrapper: {
    width: '100%',
    borderRadius: 14, // allow: C4 CTA shape matches C1/C2/C3 cadence
    overflow: 'hidden',
  },
  ctaWrapperDisabled: {
    opacity: 0.6,
  },
  ctaPressed: {
    opacity: 0.85,
  },
  ctaGradient: {
    paddingVertical: 18, // allow: C4 CTA tap-target (Apple HIG ≥44pt)
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56, // allow: keep height stable when ActivityIndicator swaps in
  },
  ctaText: {
    fontFamily: Fonts.serif,
    fontSize: 16, // allow: C4 CTA matches C1/C2/C3 label scale
    // Layout pass — near-black charcoal #1a1612 on ember fill.
    color: '#1a1612',
    letterSpacing: 0.3,
    fontWeight: '600' as const,
  },
});

export default LandingScreen;
