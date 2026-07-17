// ============================================================================
// AddMedicationsPrompt — empty-meds discoverability affordance (Now tab).
//
// THE GAP IT CLOSES: onboarding's "Medications" checkbox sets
// config.meds.enabled = true but collects no drug names, so a caregiver who
// checks Medications lands on a schedule with NO meds and no explanation —
// which reads as broken. This warm affordance guides them to the existing
// (working) Care Plan med-add flow. It changes NO data: it only links to
// /medication-form?source=careplan (the same route the Care Plan meds drawer
// uses).
//
// VISIBILITY CONTRACT (self-gating — the component owns the predicate so the
// call site stays a one-liner and the gate is unit-testable in isolation):
//   • medsEnabled === true  AND  medicationCount === 0  → shown.
//   • meds exist (medicationCount > 0)                  → null (job done).
//   • meds bucket not enabled                           → null (not tracking).
//
// Warm, inviting — an invitation, not an error. Styled off ProfileNamePrompt's
// glass-card whisper, but with a sage-tinted chevron so it reads as a gentle
// next step rather than a dismissable nag (there's nothing to dismiss — the
// caregiver asked to track meds).
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors, Fonts, Spacing, BorderRadius } from '../../theme/theme-tokens';
import { navigate } from '../../lib/navigate';

export interface AddMedicationsPromptProps {
  /** config.meds.enabled — the caregiver turned on medication tracking. */
  medsEnabled: boolean;
  /** config.meds.medications.length — how many meds are actually entered. */
  medicationCount: number;
  /** Patient's name, when known, for a warmer "Add Mom's medications →". */
  patientName?: string;
}

export const AddMedicationsPrompt: React.FC<AddMedicationsPromptProps> = ({
  medsEnabled,
  medicationCount,
  patientName,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Self-gating: only the enabled-but-empty state surfaces this.
  if (!medsEnabled || medicationCount > 0) return null;

  const trimmedName = patientName?.trim();
  const cta = trimmedName
    ? `Add ${trimmedName}’s medications →`
    : 'Add medications →';

  const handlePress = () => {
    navigate('/medication-form?source=careplan');
  };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={
        trimmedName
          ? `Add ${trimmedName}'s medications`
          : 'Add medications'
      }
      testID="add-medications-prompt"
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.textBlock}>
        <Text style={styles.cta}>{cta}</Text>
        <Text style={styles.subtext} numberOfLines={2}>
          You’re tracking medications — add them to see them on your schedule.
        </Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={18}
        color={colors.accent}
        style={styles.chevron}
      />
    </Pressable>
  );
};

const createStyles = (c: typeof Colors) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.glass,
    borderWidth: 1,
    borderColor: c.glassBorder,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14, // allow: inviting affordance vertical rhythm
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
  },
  cardPressed: {
    opacity: 0.75,
  },
  textBlock: {
    flex: 1,
    paddingRight: Spacing.sm,
  },
  cta: {
    fontFamily: Fonts.serif,
    fontSize: 15, // allow: inviting CTA — serif, one step above whisper
    fontWeight: '600' as const,
    color: c.textPrimary,
    marginBottom: 3,
  },
  subtext: {
    fontFamily: Fonts.serif,
    fontSize: 13, // allow: gentle explanatory line
    lineHeight: 18, // allow: comfortable serif rhythm
    color: c.textSecondary,
  },
  chevron: {
    marginLeft: Spacing.sm,
  },
});

export default AddMedicationsPrompt;
