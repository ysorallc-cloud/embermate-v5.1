// ============================================================================
// NAME SCREEN — Onboarding redesign C3 (pre-launch).
//
// Screen 3 of the 4-screen flow. Captures the patient's name and only
// the patient's name. The caregiver's own name is DEFERRED entirely —
// recovered later by the post-onboarding ProfileNamePrompt nudge on
// the Now tab, after the caregiver has felt the app's value.
//
// Voice + visual lock per the C3 spec:
//   • NO progress dots, NO step indicator. This isn't a form, it's
//     a question. The orchestrator's shared pagination/footer hides
//     on this index; nothing is imported or rendered locally that
//     would reintroduce a step affordance.
//   • Headline — Fonts.serif 28px weight 300 letterSpacing -0.3,
//     "Who are you caring for?"
//   • Sub — Fonts.serifItalic 15px textSecondary, "Just a name. You
//     can add the rest whenever."
//   • ONE TextInput — cardGlass bg, 1px glassBorder, 14px radius,
//     Fonts.serif 18px input, 18px internal padding. Caption label
//     above: "THEIR NAME" Fonts.serif 11px letterSpacing 2 textMuted.
//   • CTA "Continue" — full-width ember → emberDeep gradient,
//     Fonts.serif 16px label, opacity 0.4 until the trimmed name is
//     non-empty, 32px bottom safe inset.
//
// Persistence is intentionally deferred to C4. C3 only collects the
// name and passes it up via onContinue(name: string); C4's Landing
// screen interpolates it into "Meet {name}." and completeOnboarding
// writes the canonical patient name through writePatientName as part
// of the three required onboarding completion writes.
//
// Phase 28 Batch B note carries forward: StaticAuroraBackground per
// the Reanimated 3.16.7 + Expo Go SDK 52 blank-render workaround.
// ============================================================================

import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Dimensions,
  Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StaticAuroraBackground } from '../components/StaticAuroraBackground';
import { Colors, Fonts, Spacing } from '../../../theme/theme-tokens';
import { useTheme } from '../../../contexts/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface NameScreenProps {
  /** Initial value (when re-entering from C4 via back navigation,
   *  the orchestrator can rehydrate). */
  initialValue?: string;
  /** Advance to the next screen with the entered name. The
   *  orchestrator stores it for C4's Landing screen interpolation
   *  and threads it into writePatientName at completion. */
  onContinue?: (name: string) => void;
}

export const NameScreen: React.FC<NameScreenProps> = ({
  initialValue = '',
  onContinue,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [name, setName] = useState(initialValue);
  const trimmed = name.trim();
  const canContinue = trimmed.length > 0;

  const handleContinue = useCallback(() => {
    if (!canContinue) return;
    Keyboard.dismiss();
    if (onContinue) onContinue(trimmed);
  }, [canContinue, trimmed, onContinue]);

  return (
    <View style={styles.container}>
      <StaticAuroraBackground variant="welcome" />
      <View style={styles.content}>
        <View style={styles.topBlock}>
          <Text style={styles.headline}>Who are you caring for?</Text>
          <Text style={styles.sub}>
            Just a name. You can add the rest whenever.
          </Text>
        </View>

        <View style={styles.fieldBlock}>
          <Text style={styles.fieldCaption}>THEIR NAME</Text>
          <TextInput
            testID="name-screen-input"
            style={styles.field}
            value={name}
            onChangeText={setName}
            placeholder=""
            placeholderTextColor={colors.textPlaceholder}
            autoCapitalize="words"
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleContinue}
            accessibilityLabel="Their name"
          />
        </View>

        <Pressable
          onPress={handleContinue}
          accessibilityRole="button"
          accessibilityLabel="Continue"
          accessibilityState={{ disabled: !canContinue }}
          disabled={!canContinue}
          style={({ pressed }) => [
            styles.ctaWrapper,
            !canContinue && styles.ctaWrapperDisabled,
            pressed && canContinue && styles.ctaPressed,
          ]}
        >
          <LinearGradient
            colors={[colors.ember, colors.emberDeep]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaGradient}
          >
            <Text style={styles.ctaText}>Continue</Text>
          </LinearGradient>
        </Pressable>
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
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl, // allow: C3 spec — top third breathes
    paddingBottom: 32, // allow: C3 spec — 32px safe inset for CTA
    justifyContent: 'space-between',
  },
  topBlock: {
    alignItems: 'flex-start',
  },
  headline: {
    fontFamily: Fonts.serif,
    fontSize: 28, // allow: C3 spec — serif display headline
    fontWeight: '300',
    lineHeight: 36, // allow: C3 spec — 1.29× serif headline rhythm
    letterSpacing: -0.3,
    color: c.textPrimary,
    marginBottom: Spacing.md,
  },
  sub: {
    fontFamily: Fonts.serifItalic,
    fontSize: 15, // allow: C3 spec — serif italic supporting line
    lineHeight: 22, // allow: C3 spec — comfortable italic rhythm
    color: c.textSecondary,
  },
  fieldBlock: {
    width: '100%',
  },
  fieldCaption: {
    fontFamily: Fonts.serif,
    fontSize: 11, // allow: C3 spec — caption above field
    letterSpacing: 2,
    color: c.textMuted,
    marginBottom: Spacing.sm,
  },
  field: {
    width: '100%',
    backgroundColor: c.glass,
    borderWidth: 1,
    borderColor: c.glassBorder,
    borderRadius: 14, // allow: C3 spec — field corner radius
    padding: 18, // allow: C3 spec — 18px internal padding
    fontFamily: Fonts.serif,
    fontSize: 18, // allow: C3 spec — serif input text
    color: c.textPrimary,
  },
  ctaWrapper: {
    width: '100%',
    borderRadius: 14, // allow: C3 CTA shape matches C1/C2 cadence
    overflow: 'hidden',
  },
  ctaWrapperDisabled: {
    opacity: 0.4,
  },
  ctaPressed: {
    opacity: 0.85,
  },
  ctaGradient: {
    paddingVertical: 18, // allow: C3 CTA tap-target (Apple HIG ≥44pt)
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontFamily: Fonts.serif,
    fontSize: 16, // allow: C3 CTA matches C1/C2 label scale
    color: c.textPrimary,
    letterSpacing: 0.3,
  },
});

export default NameScreen;
