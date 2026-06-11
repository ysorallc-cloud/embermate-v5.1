// ============================================================================
// NAME SCREEN — Onboarding redesign C3 (pre-launch) + layout pass.
//
// Screen 3 of the 4-screen flow. Captures the patient's name and only
// the patient's name. The caregiver's own name is DEFERRED entirely —
// recovered later by the post-onboarding ProfileNamePrompt nudge on
// the Now tab, after the caregiver has felt the app's value.
//
// Voice + visual lock per the C3 spec + the post-walk layout pass:
//   • NO progress dots, NO step indicator. This isn't a form, it's
//     a question. The orchestrator's shared pagination/footer hides
//     on this index; nothing is imported or rendered locally that
//     would reintroduce a step affordance.
//   • SafeAreaView edges={['top','bottom']} so the title isn't flush
//     against the notch and the CTA isn't under the home indicator.
//   • KeyboardAvoidingView (behavior padding on iOS) so the autofocused
//     field stays visible above the keyboard.
//   • Headline — Fonts.serif 28px weight 300 letterSpacing -0.3,
//     "Who are you caring for?" sits ~10% from the top of the safe
//     area (paddingTop: Spacing.xl), not centered, not flush.
//   • Sub — Fonts.serifItalic 15px textSecondary, "Just a name. You
//     can add the rest whenever."
//   • Field block — caption "THEIR NAME" (Fonts.serif 11px
//     letterSpacing 2 textMuted), then a glass-bg input with
//     Fonts.serif 18px. Field group sits directly below the title
//     block (Spacing.xl gap) — NO mid-screen dead zone.
//   • CTA "Continue" — full-width ember → emberDeep gradient with
//     #1a1612 label at full opacity when enabled. The 40% opacity
//     treatment applies to the whole button when the field is empty.
//     32px safe inset from the bottom.
//   • Every block shares the same Spacing.lg horizontal inset.
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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
    <View style={styles.root}>
      <StaticAuroraBackground variant="welcome" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
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

            <View style={styles.spacer} />

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
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const createStyles = (c: typeof Colors) => StyleSheet.create({
  root: {
    flex: 1,
    width: SCREEN_WIDTH,
    backgroundColor: c.background,
  },
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl, // allow: layout pass — title ~10% from top
    paddingBottom: 32, // allow: 32px safe inset for CTA per spec
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
    marginTop: Spacing.xl, // allow: layout pass — Spacing.xl gap, no dead zone
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
  // Spacer absorbs the empty space between the field block and the
  // CTA without using justifyContent: space-between (which created
  // the prior mid-screen dead zone reported in the device walk).
  spacer: {
    flex: 1,
  },
  ctaWrapper: {
    width: '100%',
    borderRadius: 14, // allow: CTA shape matches C1/C2/C4 cadence
    overflow: 'hidden',
  },
  ctaWrapperDisabled: {
    opacity: 0.4,
  },
  ctaPressed: {
    opacity: 0.85,
  },
  ctaGradient: {
    paddingVertical: 18, // allow: CTA tap-target (Apple HIG ≥44pt)
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontFamily: Fonts.serif,
    fontSize: 16, // allow: CTA matches C1/C2/C4 label scale
    // Layout pass — near-black charcoal on ember fill (was textPrimary
    // cream which read as washed out on device). Spec-locked #1a1612.
    color: '#1a1612',
    letterSpacing: 0.3,
    fontWeight: '600' as const,
  },
});

export default NameScreen;
