// ============================================================================
// NAME SCREEN — Onboarding redesign C3 + post-walk complete fix.
//
// Screen 3 of the 4-screen flow. Captures the patient's name and only
// the patient's name. The caregiver's own name is DEFERRED entirely —
// recovered later by the post-onboarding ProfileNamePrompt nudge on
// the Now tab, after the caregiver has felt the app's value.
//
// Post-walk complete-fix locks:
//   • NO auto-focus-on-mount prop on the TextInput. Mount-time focus
//     fires before the FlatList settles and iOS scrolls the paging
//     scroller to the focused input — which is why the app was opening
//     on this slide instead of Welcome. Focus is now driven by the
//     isActive prop + a ~350ms settle delay so the keyboard rises only
//     AFTER the slide transition lands.
//   • Disabled-Continue feedback: tapping Continue while the field is
//     empty surfaces a serifItalic hint below the CTA. The hint clears
//     on the next keystroke and never shows before the first tap.
//   • Field hint "You can change this anytime." (serifItalic 12px
//     textMuted) sits below the input to fill the void and complete
//     the design.
//   • Placeholder shows a soft "e.g. Mom, Dad, Linda" cue.
//   • Headline scaled 28 → 26 + paddingRight Spacing.sm so the "?"
//     never kisses the right margin.
//   • Field height pinned at 60 (was rendering ~80) — paddingVertical
//     zero, paddingHorizontal 18, TextInput vertical-centers within
//     the fixed height.
//   • Disabled CTA wrapper opacity 0.55 + label color rgba(26,22,18,
//     0.85) so the dim state still reads.
//   • Root style is flex:1 only — width comes from the orchestrator's
//     slide wrapper (single-sourced via useWindowDimensions) so an
//     adjacent-slide bleed can't appear.
// ============================================================================

import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StaticAuroraBackground } from '../components/StaticAuroraBackground';
import { Colors, Fonts, Spacing } from '../../../theme/theme-tokens';
import { useTheme } from '../../../contexts/ThemeContext';
import { ONBOARDING_CTA_GRADIENT } from '../onboardingTokens';
import type { CareRelationship } from '../../../utils/onboardingToPlan';

export interface NameScreenProps {
  /** Initial value (when re-entering from C4 via back navigation,
   *  the orchestrator can rehydrate). */
  initialValue?: string;
  /** True when this slide is the active one in the paged FlatList.
   *  Drives focus-on-arrival: a useEffect watches false→true and
   *  focuses the TextInput inside a ~350ms settle window so the
   *  keyboard rises only AFTER the slide transition completes. */
  isActive?: boolean;
  /** Advance to the next screen with the entered name and (optionally)
   *  the relationship. Relationship is OPTIONAL — the caregiver can
   *  continue on the name alone; when skipped the orchestrator leaves
   *  registry.relationship undefined (never defaults to 'self'). */
  onContinue?: (name: string, relationship?: CareRelationship) => void;
}

// "Who are they to you?" — folded onto this screen (no third slide).
// Maps onto the existing CareRelationship enum; 'self' is intentionally
// never produced (self-care is a distinct case we don't mislabel).
const RELATIONSHIP_OPTIONS: { label: string; value: CareRelationship }[] = [
  { label: 'Parent', value: 'parent' },
  { label: 'Partner', value: 'spouse' },
  { label: 'Other family', value: 'other' },
  { label: 'Someone else', value: 'other' },
];

const FOCUS_SETTLE_MS = 350;

export const NameScreen: React.FC<NameScreenProps> = ({
  initialValue = '',
  isActive = false,
  onContinue,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [name, setName] = useState(initialValue);
  const [relIndex, setRelIndex] = useState<number | null>(null);
  const [showEmptyHint, setShowEmptyHint] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const trimmed = name.trim();
  const canContinue = trimmed.length > 0;

  // Focus-on-arrival per the post-walk spec. Replaces the prior
  // mount-time focus prop (which fired at mount and stole the
  // FlatList's initial scroll position). The timeout lets the
  // paging transition settle before the keyboard rises — keyboard
  // up during the slide would jank the animation.
  useEffect(() => {
    if (!isActive) return;
    const id = setTimeout(() => {
      inputRef.current?.focus();
    }, FOCUS_SETTLE_MS);
    return () => clearTimeout(id);
  }, [isActive]);

  const handleNameChange = useCallback(
    (next: string) => {
      setName(next);
      // First keystroke clears the empty-hint so the caregiver isn't
      // nagged once they've started typing.
      if (showEmptyHint && next.trim().length > 0) {
        setShowEmptyHint(false);
      }
    },
    [showEmptyHint],
  );

  const handleContinue = useCallback(() => {
    if (!canContinue) {
      setShowEmptyHint(true);
      return;
    }
    Keyboard.dismiss();
    const relationship =
      relIndex !== null ? RELATIONSHIP_OPTIONS[relIndex].value : undefined;
    if (onContinue) onContinue(trimmed, relationship);
  }, [canContinue, trimmed, relIndex, onContinue]);

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
                ref={inputRef}
                testID="name-screen-input"
                style={styles.field}
                value={name}
                onChangeText={handleNameChange}
                placeholder="e.g. Mom, Dad, Linda"
                placeholderTextColor={colors.textPlaceholder}
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={handleContinue}
                accessibilityLabel="Their name"
              />
              <Text style={styles.fieldHint}>
                You can change this anytime.
              </Text>
            </View>

            {/* "Who are they to you?" — optional. Lets the report and
                Journal read "caring for your parent". Skippable: continue
                on the name alone and no relationship is stored. */}
            <View style={styles.relBlock}>
              <Text style={styles.fieldCaption}>WHO ARE THEY TO YOU? (OPTIONAL)</Text>
              <View style={styles.relRow}>
                {RELATIONSHIP_OPTIONS.map((opt, i) => {
                  const selected = relIndex === i;
                  return (
                    <Pressable
                      key={opt.label}
                      testID={`rel-option-${i}`}
                      onPress={() => setRelIndex(selected ? null : i)}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={opt.label}
                      style={[styles.relChip, selected && styles.relChipSelected]}
                    >
                      <Text style={[styles.relChipText, selected && styles.relChipTextSelected]}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Spacer absorbs the empty middle of the screen without
                using justifyContent: 'space-between' (which pushed the
                field into a mid-screen dead zone on the prior walk). */}
            <View style={styles.spacer} />

            <Pressable
              onPress={handleContinue}
              accessibilityRole="button"
              accessibilityLabel="Continue"
              accessibilityState={{ disabled: !canContinue }}
              style={({ pressed }) => [
                styles.ctaWrapper,
                !canContinue && styles.ctaWrapperDisabled,
                pressed && canContinue && styles.ctaPressed,
              ]}
            >
              <LinearGradient
                colors={ONBOARDING_CTA_GRADIENT}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.ctaGradient}
              >
                <Text
                  style={[
                    styles.ctaText,
                    !canContinue && styles.ctaTextDisabled,
                  ]}
                >
                  Continue
                </Text>
              </LinearGradient>
            </Pressable>

            {showEmptyHint && !canContinue && (
              <Text style={styles.emptyHint} accessibilityLiveRegion="polite">
                Just their name to continue.
              </Text>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const createStyles = (c: typeof Colors) => StyleSheet.create({
  // Root is flex:1 only — width comes from the orchestrator's slide
  // wrapper. Per the width single-sourcing spec.
  root: {
    flex: 1,
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
    paddingTop: Spacing.xl, // allow: title ~10% from top of safe area
    paddingBottom: 32, // allow: 32px safe inset for CTA per spec
  },
  topBlock: {
    alignItems: 'flex-start',
  },
  headline: {
    fontFamily: Fonts.serif,
    fontSize: 26, // allow: post-walk fix — 26 (was 28) so "?" doesn't kiss the edge
    fontWeight: '300',
    lineHeight: 34, // allow: 1.30× rhythm matched to the smaller size
    letterSpacing: -0.3,
    color: c.textPrimary,
    marginBottom: Spacing.md,
    paddingRight: Spacing.sm, // allow: trailing margin so the "?" glyph breathes
  },
  sub: {
    fontFamily: Fonts.serifItalic,
    fontSize: 15, // allow: C3 spec — serif italic supporting line
    lineHeight: 22, // allow: C3 spec — comfortable italic rhythm
    color: c.textSecondary,
  },
  fieldBlock: {
    width: '100%',
    marginTop: Spacing.xl, // allow: Spacing.xl gap, no dead zone
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
    height: 60, // allow: post-walk fix — explicit field height
    backgroundColor: c.glass,
    borderWidth: 1,
    borderColor: c.glassBorder,
    borderRadius: 14, // allow: C3 spec — field corner radius
    paddingVertical: 0, // allow: rely on height for vertical centering
    paddingHorizontal: 18, // allow: C3 spec — 18px internal padding
    fontFamily: Fonts.serif,
    fontSize: 18, // allow: C3 spec — serif input text
    color: c.textPrimary,
  },
  fieldHint: {
    fontFamily: Fonts.serifItalic,
    fontSize: 12, // allow: post-walk fix — field hint, fills the void
    color: c.textMuted,
    marginTop: Spacing.sm,
  },
  relBlock: {
    width: '100%',
    marginTop: Spacing.lg,
  },
  relRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  relChip: {
    paddingVertical: 8,
    paddingHorizontal: 14, // allow: chip tap target
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.glassBorder,
    backgroundColor: c.glass,
  },
  relChipSelected: {
    backgroundColor: c.accentChipFill,
    borderColor: c.accentBorder,
  },
  relChipText: {
    fontFamily: Fonts.serif,
    fontSize: 14,
    color: c.textSecondary,
  },
  relChipTextSelected: {
    color: c.textPrimary,
    fontWeight: '500' as const,
  },
  spacer: {
    flex: 1,
  },
  ctaWrapper: {
    width: '100%',
    borderRadius: 14, // allow: CTA shape matches C1/C2/C4 cadence
    overflow: 'hidden',
  },
  ctaWrapperDisabled: {
    opacity: 0.55, // allow: post-walk fix — 0.55 (was 0.4) so disabled still reads
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
    color: '#1a1612', // allow: near-black charcoal on ember fill
    letterSpacing: 0.3,
    fontWeight: '600' as const,
  },
  ctaTextDisabled: {
    // allow: post-walk fix — slightly translucent label keeps the
    // disabled CTA legible after the wrapper opacity drops to 0.55.
    color: 'rgba(26, 22, 18, 0.85)',
  },
  emptyHint: {
    fontFamily: Fonts.serifItalic,
    fontSize: 13, // allow: post-walk fix — empty-state hint below CTA
    color: c.textMuted,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});

export default NameScreen;
