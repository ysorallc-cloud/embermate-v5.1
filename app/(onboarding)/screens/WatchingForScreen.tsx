// ============================================================================
// WATCHING-FOR SCREEN — onboarding Q2 (onboarding-personalize).
//
// "What are you keeping an eye on?" — a category-level multi-select that
// builds the careAreas feeding generateCarePlanFromOnboarding so the
// first Now screen shows what matters to this caregiver. Category-level
// only; granular config (which readings/times/specific meds) stays
// in-app. Skippable → the generator falls back to DEFAULT_CARE_AREAS.
// ============================================================================

import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StaticAuroraBackground } from '../components/StaticAuroraBackground';
import { Colors, Fonts, Spacing } from '../../../theme/theme-tokens';
import { useTheme } from '../../../contexts/ThemeContext';
import { ONBOARDING_CTA_GRADIENT } from '../onboardingTokens';
import type { CareArea } from '../../../utils/onboardingToPlan';

const OPTIONS: { label: string; value: CareArea }[] = [
  { label: 'Medications', value: 'medications' },
  { label: 'Blood pressure & vitals', value: 'vitals' },
  { label: 'Meals', value: 'meals' },
  { label: 'Mood & wellness', value: 'wellness' },
  { label: 'Hydration', value: 'hydration' },
];

export interface WatchingForScreenProps {
  /** Continue with the chosen care areas (deduped). Empty array is
   *  allowed and resolves to the sane default downstream. */
  onContinue?: (careAreas: CareArea[]) => void;
  /** Skip → the generator applies DEFAULT_CARE_AREAS. */
  onSkip?: () => void;
}

export const WatchingForScreen: React.FC<WatchingForScreenProps> = ({
  onContinue,
  onSkip,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const toggle = useCallback((i: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }, []);

  const handleContinue = useCallback(() => {
    const areas = Array.from(selected).map((i) => OPTIONS[i].value);
    if (onContinue) onContinue(areas);
  }, [selected, onContinue]);

  return (
    <View style={styles.root}>
      <StaticAuroraBackground variant="welcome" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.content}>
          <View style={styles.topBlock}>
            <Text style={styles.headline}>What are you keeping an eye on?</Text>
            <Text style={styles.sub}>
              So your first screen shows what matters to you.
            </Text>
          </View>

          <View style={styles.optionsBlock}>
            {OPTIONS.map((opt, i) => {
              const isSel = selected.has(i);
              return (
                <Pressable
                  key={opt.value + i}
                  testID={`watching-option-${i}`}
                  onPress={() => toggle(i)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isSel }}
                  accessibilityLabel={opt.label}
                  style={[styles.option, isSel && styles.optionSelected]}
                >
                  <Text style={[styles.optionText, isSel && styles.optionTextSelected]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.spacer} />

          <Pressable
            onPress={handleContinue}
            accessibilityRole="button"
            accessibilityLabel="Continue"
            testID="watching-continue"
            style={({ pressed }) => [styles.ctaWrapper, pressed && styles.ctaPressed]}
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

          <Pressable
            onPress={onSkip}
            accessibilityRole="button"
            accessibilityLabel="Skip"
            testID="watching-skip"
            style={styles.skip}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
};

const createStyles = (c: typeof Colors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  safe: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: 32, // allow: 32px safe inset for CTA per onboarding spec
  },
  topBlock: { alignItems: 'flex-start' },
  headline: {
    fontFamily: Fonts.serif,
    fontSize: 26,
    fontWeight: '300',
    lineHeight: 34,
    letterSpacing: -0.3,
    color: c.textPrimary,
    marginBottom: Spacing.md,
    paddingRight: Spacing.sm,
  },
  sub: {
    fontFamily: Fonts.serifItalic,
    fontSize: 15,
    lineHeight: 22,
    color: c.textSecondary,
  },
  optionsBlock: {
    width: '100%',
    marginTop: Spacing.xl,
    gap: Spacing.sm,
  },
  option: {
    width: '100%',
    paddingVertical: 14, // allow: list-row tap target (Apple HIG ≥44pt)
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.glassBorder,
    backgroundColor: c.glass,
  },
  optionSelected: {
    backgroundColor: c.accentChipFill,
    borderColor: c.accentBorder,
  },
  optionText: {
    fontFamily: Fonts.serif,
    fontSize: 16,
    color: c.textSecondary,
  },
  optionTextSelected: {
    color: c.textPrimary,
    fontWeight: '500' as const,
  },
  spacer: { flex: 1 },
  ctaWrapper: { width: '100%', borderRadius: 14, overflow: 'hidden' },
  ctaPressed: { opacity: 0.85 },
  ctaGradient: {
    paddingVertical: 18, // allow: CTA tap-target (Apple HIG ≥44pt)
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontFamily: Fonts.serif,
    fontSize: 16,
    color: '#1a1612', // allow: near-black charcoal on ember fill
    letterSpacing: 0.3,
    fontWeight: '600' as const,
  },
  skip: {
    alignSelf: 'center',
    paddingVertical: 12,
    marginTop: Spacing.sm,
  },
  skipText: {
    fontFamily: Fonts.serifItalic,
    fontSize: 14,
    color: c.textMuted,
  },
});

export default WatchingForScreen;
