// ============================================================================
// MEDICATIONS SCREEN — onboarding enrichment Piece 2.
//
// Collects a few real medications so the account arrives with a real schedule
// (no empty state, no sample-data dependence). Free-text first: any med name +
// any dose works. COMMON_MEDICATIONS autocomplete is a CONVENIENCE ONLY — it
// suggests names + common doses as you type, but an unlisted med (e.g. Eliquis)
// types + adds fully. Skippable — a caregiver without their list is never
// trapped; skipping writes nothing.
//
// On continue, the entered meds are handed up (onContinue) and written by the
// flow via the canonical addMedicationToPlan path (see onboardingMedsWriter).
// ============================================================================

import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, Keyboard } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StaticAuroraBackground } from '../components/StaticAuroraBackground';
import { Colors, Fonts, Spacing } from '../../../theme/theme-tokens';
import { useTheme } from '../../../contexts/ThemeContext';
import { ONBOARDING_CTA_GRADIENT } from '../../../constants/onboardingTokens';
import { COMMON_MEDICATIONS, TIME_SLOTS, type TimeSlot } from '../../../components/medication/medicationFormHelpers';
import type { OnboardingMedEntry } from '../../../utils/onboardingMedsWriter';

export interface MedicationsScreenProps {
  patientName?: string;
  /** Continue with the entered meds (a pending in-progress entry is folded in
   *  so a typed-but-not-added med isn't lost). Empty array is allowed. */
  onContinue?: (meds: OnboardingMedEntry[]) => void;
  /** Skip → advance with no meds written. */
  onSkip?: () => void;
}

const SLOT_LABELS: Record<TimeSlot, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  bedtime: 'Bedtime',
};

export const MedicationsScreen: React.FC<MedicationsScreenProps> = ({
  patientName,
  onContinue,
  onSkip,
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [meds, setMeds] = useState<OnboardingMedEntry[]>([]);
  const [nameQuery, setNameQuery] = useState('');
  const [dose, setDose] = useState('');
  const [timeSlot, setTimeSlot] = useState<TimeSlot>('morning');

  const name = nameQuery.trim();

  // Autocomplete (convenience only) — name suggestions while typing, hidden once
  // the query already exactly matches a listed med.
  const nameSuggestions = useMemo(() => {
    const q = name.toLowerCase();
    if (!q) return [];
    const exact = COMMON_MEDICATIONS.some((m) => m.name.toLowerCase() === q);
    if (exact) return [];
    return COMMON_MEDICATIONS.filter((m) => m.name.toLowerCase().includes(q)).slice(0, 5);
  }, [name]);

  // Dose chips — the matched med's common doses (still free-text otherwise).
  const doseChips = useMemo(() => {
    const matched = COMMON_MEDICATIONS.find((m) => m.name.toLowerCase() === name.toLowerCase());
    return matched?.commonDosages ?? [];
  }, [name]);

  const resetEntry = useCallback(() => {
    setNameQuery('');
    setDose('');
    setTimeSlot('morning');
  }, []);

  const handleAdd = useCallback(() => {
    if (!name) return;
    setMeds((prev) => [...prev, { name, dose: dose.trim(), timeSlot }]);
    resetEntry();
    // Drop the keyboard so the just-added list + the Continue CTA are visible
    // (otherwise the keyboard hides the bottom of the scroll right after adding).
    Keyboard.dismiss();
  }, [name, dose, timeSlot, resetEntry]);

  const handleRemove = useCallback((index: number) => {
    setMeds((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleContinue = useCallback(() => {
    // Fold in a typed-but-not-yet-added entry so it isn't silently lost.
    const pending: OnboardingMedEntry[] = name ? [{ name, dose: dose.trim(), timeSlot }] : [];
    onContinue?.([...meds, ...pending]);
  }, [meds, name, dose, timeSlot, onContinue]);

  const heading = patientName ? `What does ${patientName} take?` : 'What medications?';
  const subtitle = patientName
    ? `Add a few now so ${patientName}'s schedule's ready — you can add more anytime.`
    : `Add a few now so the schedule's ready — you can add more anytime.`;

  return (
    <View style={styles.root}>
      <StaticAuroraBackground variant="welcome" />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          // BUG 1a — flex:1 bounds the ScrollView to the screen so overflowing
          // content (a growing med list) SCROLLS to the Continue CTA instead of
          // expanding the ScrollView to content height and clipping the CTA.
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.headline}>{heading}</Text>
          <Text style={styles.sub}>{subtitle}</Text>

          {/* Added meds */}
          {meds.length > 0 && (
            <View style={styles.addedList}>
              {meds.map((m, i) => (
                <View key={`${m.name}-${i}`} style={styles.addedRow} testID={`onboarding-med-added-${m.name}`}>
                  <Text style={styles.addedText}>
                    {m.name}{m.dose ? `  ·  ${m.dose}` : ''}{`  ·  ${SLOT_LABELS[m.timeSlot]}`}
                  </Text>
                  <Pressable
                    onPress={() => handleRemove(i)}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${m.name}`}
                    testID={`onboarding-med-remove-${m.name}`}
                  >
                    <Text style={styles.removeGlyph}>×</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          {/* Entry form */}
          <View style={styles.field}>
            <TextInput
              style={styles.input}
              value={nameQuery}
              onChangeText={setNameQuery}
              placeholder="Medication name"
              placeholderTextColor={colors.textMuted}
              autoCorrect={false}
              testID="onboarding-med-name"
            />
            {nameSuggestions.length > 0 && (
              <View style={styles.suggestions}>
                {nameSuggestions.map((m) => (
                  <Pressable
                    key={m.name}
                    onPress={() => setNameQuery(m.name)}
                    style={styles.suggestionRow}
                    accessibilityRole="button"
                    accessibilityLabel={`Use ${m.name}`}
                    testID={`onboarding-med-suggestion-${m.name}`}
                  >
                    <Text style={styles.suggestionText}>{m.name}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          <View style={styles.field}>
            <TextInput
              style={styles.input}
              value={dose}
              onChangeText={setDose}
              placeholder="Dose (e.g. 10mg)"
              placeholderTextColor={colors.textMuted}
              autoCorrect={false}
              testID="onboarding-med-dose"
            />
            {doseChips.length > 0 && (
              <View style={styles.doseChips}>
                {doseChips.map((d) => (
                  <Pressable
                    key={d}
                    onPress={() => setDose(d)}
                    style={[styles.doseChip, dose === d && styles.doseChipActive]}
                    accessibilityRole="button"
                    accessibilityLabel={`Dose ${d}`}
                    testID={`onboarding-med-dose-${d}`}
                  >
                    <Text style={[styles.doseChipText, dose === d && styles.doseChipTextActive]}>{d}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* Time of day */}
          <View style={styles.slotRow}>
            {TIME_SLOTS.map((s) => {
              const active = timeSlot === s.key;
              return (
                <Pressable
                  key={s.key}
                  onPress={() => setTimeSlot(s.key)}
                  style={[styles.slot, active && styles.slotActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={SLOT_LABELS[s.key]}
                  testID={`onboarding-med-slot-${s.key}`}
                >
                  <Text style={styles.slotIcon}>{s.icon}</Text>
                  <Text style={[styles.slotLabel, active && styles.slotLabelActive]}>{SLOT_LABELS[s.key]}</Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={handleAdd}
            disabled={!name}
            style={[styles.addBtn, !name && styles.addBtnDisabled]}
            accessibilityRole="button"
            accessibilityLabel="Add a medication"
            testID="onboarding-med-add"
          >
            <Text style={styles.addBtnText}>+ Add a medication</Text>
          </Pressable>

          <View style={styles.spacer} />

          <Pressable
            onPress={handleContinue}
            accessibilityRole="button"
            accessibilityLabel="Continue"
            testID="onboarding-med-continue"
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
            accessibilityLabel="Skip for now"
            testID="onboarding-med-skip"
            style={styles.skip}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.skipText}>Skip for now</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const createStyles = (c: typeof Colors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  headline: {
    fontFamily: Fonts.serif,
    fontSize: 26,
    fontWeight: '300',
    lineHeight: 34,
    letterSpacing: -0.3,
    color: c.textPrimary,
    marginBottom: Spacing.md,
  },
  sub: {
    fontFamily: Fonts.serifItalic,
    fontSize: 15,
    lineHeight: 22,
    color: c.textSecondary,
    marginBottom: Spacing.lg,
  },
  addedList: { gap: 8, marginBottom: Spacing.lg },
  addedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12, // allow: list-row rhythm
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: c.accentChipFill,
    borderWidth: 1,
    borderColor: c.accentBorder,
  },
  addedText: { flex: 1, fontFamily: Fonts.serif, fontSize: 14, color: c.textPrimary },
  removeGlyph: { fontSize: 18, color: c.textMuted, paddingLeft: 8 },
  field: { marginBottom: Spacing.md },
  input: {
    fontFamily: Fonts.serif,
    fontSize: 16,
    color: c.textPrimary,
    paddingVertical: 12, // allow: input tap-target
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.glassBorder,
    backgroundColor: c.glass,
  },
  suggestions: {
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.glassBorder,
    backgroundColor: c.glass,
    overflow: 'hidden',
  },
  suggestionRow: { paddingVertical: 10, paddingHorizontal: 16 },
  suggestionText: { fontFamily: Fonts.serif, fontSize: 15, color: c.textSecondary },
  doseChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  doseChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.glassBorder,
    backgroundColor: c.glass,
  },
  doseChipActive: { backgroundColor: c.accentChipFill, borderColor: c.accentBorder },
  doseChipText: { fontFamily: Fonts.serif, fontSize: 13, color: c.textSecondary },
  doseChipTextActive: { color: c.textPrimary },
  slotRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.md },
  slot: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.glassBorder,
    backgroundColor: c.glass,
  },
  slotActive: { backgroundColor: c.accentChipFill, borderColor: c.accentBorder },
  slotIcon: { fontSize: 18, marginBottom: 2 },
  slotLabel: { fontFamily: Fonts.serif, fontSize: 11, color: c.textSecondary },
  slotLabelActive: { color: c.textPrimary, fontWeight: '500' },
  addBtn: { paddingVertical: 12, alignItems: 'center' },
  addBtnDisabled: { opacity: 0.4 },
  addBtnText: { fontFamily: Fonts.serif, fontSize: 15, color: c.accent, fontWeight: '600' },
  spacer: { height: Spacing.xl },
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
    fontWeight: '600',
  },
  skip: { alignSelf: 'center', paddingVertical: 12, marginTop: Spacing.sm },
  skipText: { fontFamily: Fonts.serifItalic, fontSize: 14, color: c.textMuted },
});

export default MedicationsScreen;
