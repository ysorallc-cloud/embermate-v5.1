// ============================================================================
// PRIVACY + DISCLAIMER SCREEN — Onboarding redesign C2 (pre-launch).
//
// Screen 2 of the 4-screen flow. Two fixes per the C2 spec:
//   1. Emoji-in-a-row iconography on the four privacy points retired
//      in favor of the thin-rule hairline treatment established by
//      Welcome (C1). The padlock hero at the top stays — it's the
//      screen's emotional anchor, not iconography-in-a-row.
//   2. Terms helper line ("Please accept the terms to continue.")
//      appears ONLY after a Next tap-attempt while the checkbox is
//      unchecked. No scolding before the user has done anything.
//
// Other pre-existing copy preserved verbatim: title, subtitle,
// disclaimer card, terms-of-use link, checkbox label.
//
// The screen now owns its own ember-gradient "Continue" CTA — the
// shared footer Next hides on Privacy (currentIndex === 1 in the
// orchestrator), matching C1's pattern. Tapping Continue while
// unchecked flips the helper-visible flag instead of advancing;
// tapping while checked calls onContinue.
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Linking,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StaticAuroraBackground } from '../components/StaticAuroraBackground';
import { Colors, Fonts, Spacing, BorderRadius } from '../../../theme/theme-tokens';
import { useTheme } from '../../../contexts/ThemeContext';
import { ONBOARDING_CTA_GRADIENT } from '../onboardingTokens';

// Post-walk width single-sourcing fix — root style is flex:1 only.

interface Props {
  onDisclaimerAccepted: (accepted: boolean) => void;
  /** Advance to the next screen. Wired by the orchestrator. The
   *  screen calls this only when the disclaimer checkbox is
   *  checked; otherwise the helper line surfaces. */
  onContinue?: () => void;
}

// Privacy points — text preserved verbatim from the prior screen
// (caregiver-tested copy); emoji decorations dropped per the C2 spec.
const PRIVACY_POINTS: { label: string; desc: string }[] = [
  { label: 'Stays on your phone', desc: 'Nothing is uploaded — no accounts, no cloud' },
  { label: 'Encrypted storage', desc: 'Protected like your online banking' },
  { label: 'You choose what to share', desc: 'Journal and reports only go where you send them' },
  { label: 'No ads, no data selling', desc: 'Ever' },
];

export const PrivacyDisclaimerScreen: React.FC<Props> = ({
  onDisclaimerAccepted,
  onContinue,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [accepted, setAccepted] = useState(false);
  // Phase 34 onboarding redesign C2 — Terms helper visibility flag.
  // Flips to true ONLY after the caregiver taps Continue with the
  // checkbox unchecked. First-render guard ensures no scolding
  // before any input attempt.
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  const toggleAccepted = () => {
    const newValue = !accepted;
    setAccepted(newValue);
    onDisclaimerAccepted(newValue);
    if (newValue) {
      // Once accepted, retire the helper so a re-uncheck doesn't
      // flash the line again until a fresh attempt.
      setHasAttemptedSubmit(false);
    }
  };

  const handleContinuePress = () => {
    if (!accepted) {
      setHasAttemptedSubmit(true);
      return;
    }
    if (onContinue) onContinue();
  };

  const showHelper = hasAttemptedSubmit && !accepted;

  return (
    <View style={styles.container}>
      <StaticAuroraBackground variant="welcome" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.emoji}>{'\u{1F512}'}</Text>
        <Text style={styles.title}>
          Your family's health{'\n'}data is safe here.
        </Text>
        <Text style={styles.subtitle}>
          Here's how we protect it.
        </Text>

        {/* Privacy points — thin-rule treatment per C2 spec. */}
        <View style={styles.privacyContainer}>
          {PRIVACY_POINTS.map((point, index) => (
            <View key={index} style={styles.privacyRow}>
              <Text style={styles.privacyLabel}>{point.label}</Text>
              <Text style={styles.privacyDesc}>{point.desc}</Text>
            </View>
          ))}
        </View>

        {/* Medical disclaimer — softened in v6.7. Notice, not alarm. */}
        <View style={styles.disclaimerCard}>
          <Text style={styles.disclaimerText}>
            EmberMate is a personal tracking tool to help you stay organized {'—'} not a substitute for your doctor's advice.
          </Text>
        </View>

        {/* Checkbox */}
        <View style={styles.checkboxContainer}>
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={toggleAccepted}
            activeOpacity={0.7}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: accepted }}
            accessibilityLabel="I understand and accept the terms of use"
          >
            <View style={[styles.checkbox, accepted && styles.checkboxChecked]}>
              {accepted && <Text style={styles.checkmark}>{'✓'}</Text>}
            </View>
            <Text style={styles.checkboxLabel}>
              I understand and accept the{' '}
              <Text
                style={styles.link}
                onPress={() => Linking.openURL('https://embermate.app/terms')}
              >
                terms of use
              </Text>
              {' and '}
              <Text
                style={styles.link}
                onPress={() => Linking.openURL('https://embermate.app/privacy')}
              >
                privacy policy
              </Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* Continue CTA — ember gradient at 40% opacity until accepted. */}
        <Pressable
          onPress={handleContinuePress}
          accessibilityRole="button"
          accessibilityLabel="Continue"
          accessibilityState={{ disabled: !accepted }}
          style={({ pressed }) => [
            styles.ctaWrapper,
            !accepted && styles.ctaWrapperUnchecked,
            pressed && accepted && styles.ctaPressed,
          ]}
        >
          <LinearGradient
            colors={ONBOARDING_CTA_GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaGradient}
          >
            <Text style={styles.ctaText}>Continue</Text>
          </LinearGradient>
        </Pressable>

        {/* Helper line — appears only AFTER an attempt while unchecked. */}
        {showHelper && (
          <Text style={styles.termsHelper} accessibilityLiveRegion="polite">
            Please accept the terms to continue.
          </Text>
        )}
      </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  safe: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: 32, // allow: C2 spec — 32px safe inset for CTA
    paddingTop: Spacing.xl, // allow: layout pass — top breathes via safe area not hardcoded 80px
  },
  emoji: {
    fontSize: 56,
    marginBottom: Spacing.lg,
  },
  title: {
    fontFamily: Fonts.serif,
    fontSize: 28, // allow: C2 spec — serif display headline
    fontWeight: '300',
    lineHeight: 36, // allow: C2 spec — 1.29× serif title rhythm
    letterSpacing: -0.3,
    color: c.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontFamily: Fonts.serifItalic,
    fontSize: 15, // allow: C2 spec — serif italic supporting line
    color: c.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  privacyContainer: {
    width: '100%',
    // Thin left hairline rule (1px ember 30% opacity) matches C1's
    // value-points treatment for visual coherence.
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 140, 66, 0.30)',
    paddingLeft: Spacing.md,
    marginBottom: Spacing.lg,
  },
  privacyRow: {
    marginBottom: 20, // allow: C2 spec — 20px gap matches C1 cadence
  },
  privacyLabel: {
    fontFamily: Fonts.serif,
    fontSize: 15, // allow: C2 spec — serif label
    color: c.textPrimary,
    marginBottom: 2,
  },
  privacyDesc: {
    fontFamily: Fonts.serif,
    fontSize: 13, // allow: C2 spec — serif sub-line
    color: c.textSecondary,
    lineHeight: 18,
  },
  disclaimerCard: {
    width: '100%',
    backgroundColor: 'rgba(245, 158, 11, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.18)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  disclaimerText: {
    fontFamily: Fonts.serif,
    fontSize: 13, // allow: C2 spec — serif body
    color: c.textSecondary,
    lineHeight: 20,
  },
  checkboxContainer: {
    width: '100%',
    marginBottom: Spacing.lg,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: c.textPlaceholder,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: c.accent,
    borderColor: c.accent,
  },
  checkmark: {
    fontSize: 14,
    fontWeight: '700',
    color: c.textPrimary,
  },
  checkboxLabel: {
    fontFamily: Fonts.serif,
    fontSize: 13, // allow: C2 spec — serif body
    color: c.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  link: {
    color: c.accent,
    textDecorationLine: 'underline',
  },
  ctaWrapper: {
    width: '100%',
    borderRadius: 14, // allow: C2 CTA matches C1 shape
    overflow: 'hidden',
  },
  ctaWrapperUnchecked: {
    opacity: 0.4,
  },
  ctaPressed: {
    opacity: 0.85,
  },
  ctaGradient: {
    paddingVertical: 18, // allow: C2 CTA tap-target (Apple HIG ≥44pt)
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontFamily: Fonts.serif,
    fontSize: 16, // allow: C2 CTA matches C1 label scale
    // Layout pass — near-black charcoal #1a1612 on ember fill.
    color: '#1a1612',
    letterSpacing: 0.3,
    fontWeight: '600' as const,
  },
  termsHelper: {
    fontFamily: Fonts.serifItalic,
    fontSize: 13, // allow: C2 spec — serif italic helper
    color: c.textMuted,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});

export default PrivacyDisclaimerScreen;
