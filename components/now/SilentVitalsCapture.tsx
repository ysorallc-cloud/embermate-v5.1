// ============================================================================
// SILENT VITALS CAPTURE
//
// Single-screen capture for the silent vital signs — sleep, mood, and energy.
// Replaces the legacy 5-page wellness wizard. Three emoji rows (1–5 scale)
// plus an optional one-sentence reflection. Save is gated on at least one
// row having a value, matching the v6.7 caregiver-natural framing: even a
// partial day is worth keeping.
//
// Eyebrow + serif italic subtitle name the framing explicitly — clinicians
// treat sleep / mood / energy as critical context, but the wizard didn't
// surface that. Cards inherit the standard glass + internal-eyebrow shape
// shared with the Now-tab Reflection card.
// ============================================================================

import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import type { ReflectionScore } from '../../storage/dailyReflectionRepo';

export interface SilentVitalsValues {
  sleepQuality?: ReflectionScore;
  mood?: ReflectionScore;
  energyLevel?: ReflectionScore;
  reflection?: string;
}

export interface SilentVitalsCaptureProps {
  initial?: SilentVitalsValues;
  /** Used to substitute the patient's name into the question copy. */
  patientName?: string;
  onSave: (values: SilentVitalsValues) => void;
  onCancel?: () => void;
}

type RowKey = 'sleep' | 'mood' | 'energy';

interface EmojiOption {
  value: ReflectionScore;
  emoji: string;
  label: string;
}

const SLEEP: EmojiOption[] = [
  { value: 1, emoji: '😫', label: 'Very poor' },
  { value: 2, emoji: '😕', label: 'Poor' },
  { value: 3, emoji: '😐', label: 'Fair' },
  { value: 4, emoji: '😌', label: 'Good' },
  { value: 5, emoji: '😴', label: 'Excellent' },
];

const MOOD: EmojiOption[] = [
  { value: 1, emoji: '😢', label: 'Struggling' },
  { value: 2, emoji: '😟', label: 'Difficult' },
  { value: 3, emoji: '😐', label: 'Managing' },
  { value: 4, emoji: '🙂', label: 'Good' },
  { value: 5, emoji: '😄', label: 'Great' },
];

const ENERGY: EmojiOption[] = [
  { value: 1, emoji: '😴', label: 'Exhausted' },
  { value: 2, emoji: '📉', label: 'Low' },
  { value: 3, emoji: '😐', label: 'Moderate' },
  { value: 4, emoji: '👍', label: 'Good' },
  { value: 5, emoji: '⚡', label: 'Energetic' },
];

const ROWS: Array<{ key: RowKey; options: EmojiOption[]; question: (n: string) => string }> = [
  { key: 'sleep', options: SLEEP, question: (n) => `How did ${n} sleep?` },
  { key: 'mood', options: MOOD, question: (n) => `How did ${n}'s mood feel today?` },
  { key: 'energy', options: ENERGY, question: (n) => `How was ${n}'s energy?` },
];

const FIELD_BY_ROW: Record<RowKey, keyof SilentVitalsValues> = {
  sleep: 'sleepQuality',
  mood: 'mood',
  energy: 'energyLevel',
};

export function SilentVitalsCapture({
  initial,
  patientName = 'they',
  onSave,
  onCancel,
}: SilentVitalsCaptureProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [sleep, setSleep] = useState<ReflectionScore | undefined>(initial?.sleepQuality);
  const [mood, setMood] = useState<ReflectionScore | undefined>(initial?.mood);
  const [energy, setEnergy] = useState<ReflectionScore | undefined>(initial?.energyLevel);
  const [reflection, setReflection] = useState<string>(initial?.reflection ?? '');

  const setForRow = useCallback((row: RowKey, value: ReflectionScore) => {
    if (row === 'sleep') setSleep(value);
    else if (row === 'mood') setMood(value);
    else setEnergy(value);
  }, []);

  const valueForRow = (row: RowKey): ReflectionScore | undefined =>
    row === 'sleep' ? sleep : row === 'mood' ? mood : energy;

  const filledCount =
    (sleep != null ? 1 : 0) + (mood != null ? 1 : 0) + (energy != null ? 1 : 0);
  const canSave = filledCount > 0;

  const handleSave = useCallback(() => {
    const values: SilentVitalsValues = {};
    if (sleep != null) values.sleepQuality = sleep;
    if (mood != null) values.mood = mood;
    if (energy != null) values.energyLevel = energy;
    const trimmed = reflection.trim();
    if (trimmed) values.reflection = trimmed;
    onSave(values);
  }, [sleep, mood, energy, reflection, onSave]);

  return (
    <View style={styles.card} accessibilityLabel="Silent vital signs capture">
      <View style={styles.header}>
        <Text style={styles.eyebrow}>{'THE SILENT VITAL SIGNS'}</Text>
        <Text style={styles.subtitle}>
          What clinicians treat as critical context.
        </Text>
      </View>

      <View style={styles.body}>
        {ROWS.map((row) => {
          const selected = valueForRow(row.key);
          const filled = selected != null;
          return (
            <View
              key={row.key}
              testID={`silent-vitals-row-${row.key}`}
              style={styles.row}
            >
              <View style={styles.rowHeader}>
                <Text style={styles.question}>{row.question(patientName)}</Text>
                {filled && <Text style={styles.rowCheck}>{'✓'}</Text>}
              </View>
              <View style={styles.emojiRow}>
                {row.options.map((opt) => {
                  const isSelected = selected === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      testID={`silent-vitals-${row.key}-${opt.value}`}
                      style={[styles.emojiButton, isSelected && styles.emojiButtonSelected]}
                      onPress={() => setForRow(row.key, opt.value)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={`${opt.label} (${opt.value} of 5)`}
                      accessibilityState={{ selected: isSelected }}
                    >
                      <Text style={styles.emojiGlyph}>{opt.emoji}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        })}

        <TextInput
          testID="silent-vitals-reflection"
          style={styles.reflectionInput}
          placeholder="One sentence — anything you'd want to remember tomorrow?"
          placeholderTextColor={colors.textTertiary}
          value={reflection}
          onChangeText={setReflection}
          multiline
          numberOfLines={2}
          maxLength={200}
          accessibilityLabel="Optional one-sentence reflection"
        />
      </View>

      <View style={styles.footer}>
        {onCancel && (
          <TouchableOpacity
            testID="silent-vitals-cancel"
            onPress={onCancel}
            style={styles.cancelButton}
            accessibilityRole="button"
            accessibilityLabel="Cancel without saving"
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          testID="silent-vitals-save"
          onPress={handleSave}
          disabled={!canSave}
          style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Save silent vital signs"
          accessibilityState={{ disabled: !canSave }}
        >
          <Text style={[styles.saveText, !canSave && styles.saveTextDisabled]}>{'Save'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (c: any) => StyleSheet.create({
  card: {
    backgroundColor: c.glass,
    borderWidth: 0.5,
    borderColor: c.glassBorder,
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    paddingTop: 12,
    paddingBottom: 10,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255, 235, 205, 0.025)',
    borderBottomWidth: 0.5,
    borderBottomColor: c.glassBorder,
  },
  eyebrow: {
    fontSize: 9,
    fontWeight: '500',
    letterSpacing: 0.5,
    color: c.textTertiary,
  },
  subtitle: {
    fontFamily: 'Georgia',
    fontStyle: 'italic',
    fontSize: 11,
    lineHeight: 15.4,
    color: c.textSecondary,
    marginTop: 4,
  },
  body: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 8,
  },
  row: {
    marginBottom: 16,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  question: {
    fontSize: 12,
    fontWeight: '500',
    color: c.textPrimary,
    flex: 1,
  },
  rowCheck: {
    fontSize: 12,
    color: c.accent,
    fontWeight: '600',
    marginLeft: 8,
  },
  emojiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emojiButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  emojiButtonSelected: {
    backgroundColor: 'rgba(95, 184, 138, 0.15)',
    borderColor: c.accent,
  },
  emojiGlyph: {
    fontSize: 22,
  },
  reflectionInput: {
    minHeight: 44,
    maxHeight: 88,
    backgroundColor: c.menuSurface || c.glass,
    borderWidth: 0.5,
    borderColor: c.glassBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: c.textPrimary,
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 14,
    gap: 10,
    borderTopWidth: 0.5,
    borderTopColor: c.glassBorder,
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  cancelText: {
    fontSize: 13,
    color: c.textSecondary,
    fontWeight: '500',
  },
  saveButton: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: c.accent,
  },
  saveButtonDisabled: {
    backgroundColor: 'transparent',
    borderWidth: 0.5,
    borderColor: c.glassBorder,
  },
  saveText: {
    fontSize: 13,
    fontWeight: '600',
    color: c.textPrimary,
  },
  saveTextDisabled: {
    color: c.textTertiary,
  },
});

export default SilentVitalsCapture;
