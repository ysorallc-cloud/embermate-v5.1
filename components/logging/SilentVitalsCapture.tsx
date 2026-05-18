// ============================================================================
// SILENT VITALS CAPTURE — Phase 9.4 restructure.
//
// Pre-9.4 the component was a self-contained card with eyebrow + 3 emoji
// rows + reflection input + inline Cancel/Save footer. The card-in-card
// look (screen padding holding a glass card holding inner sections), the
// wordy "How did Mom sleep?" question prose, and the inline footer pair
// all conflicted with the LogScreen primary-CTA contract introduced in
// 9.1 and consumed by 9.2/9.3.
//
// Post-9.4:
//   • Controlled component — parent owns `values` + `onChange`. The
//     enclosing LogScreen primitive renders the single sage Save CTA
//     and the ghost cancel link.
//   • No outer card; rows render flat, separated by 0.5px hairlines.
//   • Single-word labels (Sleep / Mood / Energy). Patient-name echo
//     dropped — the disclaimer above already establishes context.
//   • 5-emoji slider per row with redundant selection signals: 28pt
//     selected vs 24pt unselected, opacity 1.0 vs 0.4, plus
//     accessibilityState.selected on the Pressable.
//   • Anchor labels (Rough left / Good right) at textTertiary; tinted
//     to accent when the corresponding extreme emoji is selected.
//   • Optional reflection note field. Italic serif placeholder
//     "anything to remember?" — matches the spec copy.
//
// Note: the components/now/ folder location is a legacy from when this
// was meant to render inline on the Now timeline. Tracked as a
// post-Phase-9 follow-up to relocate; renaming the module path now
// would ripple imports beyond 9.4's scope.
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Spacing, Fonts } from '../../theme/theme-tokens';
import type { ReflectionScore } from '../../storage/dailyReflectionRepo';

export interface SilentVitalsValues {
  sleepQuality?: ReflectionScore;
  mood?: ReflectionScore;
  energyLevel?: ReflectionScore;
  reflection?: string;
}

export interface SilentVitalsCaptureProps {
  values: SilentVitalsValues;
  onChange: (next: SilentVitalsValues) => void;
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

const ROWS: Array<{
  key: RowKey;
  label: string;
  options: EmojiOption[];
  field: keyof SilentVitalsValues;
}> = [
  { key: 'sleep',  label: 'Sleep',  options: SLEEP,  field: 'sleepQuality' },
  { key: 'mood',   label: 'Mood',   options: MOOD,   field: 'mood' },
  { key: 'energy', label: 'Energy', options: ENERGY, field: 'energyLevel' },
];

const ANCHOR_LEFT = 'Rough';
const ANCHOR_RIGHT = 'Good';

export function SilentVitalsCapture({ values, onChange }: SilentVitalsCaptureProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const setForRow = (field: keyof SilentVitalsValues, value: ReflectionScore) => {
    onChange({ ...values, [field]: value });
  };

  const setReflection = (text: string) => {
    onChange({ ...values, reflection: text });
  };

  return (
    <View testID="silent-vitals-capture">
      {ROWS.map((row, idx) => {
        const selected = values[row.field] as ReflectionScore | undefined;
        const isLeftExtreme = selected === 1;
        const isRightExtreme = selected === 5;
        return (
          <View
            key={row.key}
            testID={`silent-vitals-row-${row.key}`}
            style={[styles.row, idx > 0 && styles.rowDivider]}
          >
            <Text testID={`silent-vitals-label-${row.key}`} style={styles.label}>
              {row.label}
            </Text>
            <View style={styles.emojiRow}>
              {row.options.map((opt) => {
                const isSelected = selected === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    testID={`silent-vitals-${row.key}-${opt.value}`}
                    style={styles.emojiButton}
                    onPress={() => setForRow(row.field, opt.value)}
                    accessibilityRole="button"
                    accessibilityLabel={`${opt.label} (${opt.value} of 5)`}
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text
                      testID={`silent-vitals-emoji-${row.key}-${opt.value}`}
                      style={[
                        styles.emojiBase,
                        isSelected ? styles.emojiSelected : styles.emojiUnselected,
                      ]}
                    >
                      {opt.emoji}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.anchorRow}>
              <Text
                testID={`silent-vitals-anchor-left-${row.key}`}
                style={[styles.anchor, isLeftExtreme && styles.anchorSelected]}
              >
                {ANCHOR_LEFT}
              </Text>
              <Text
                testID={`silent-vitals-anchor-right-${row.key}`}
                style={[styles.anchor, isRightExtreme && styles.anchorSelected]}
              >
                {ANCHOR_RIGHT}
              </Text>
            </View>
          </View>
        );
      })}

      <TextInput
        testID="silent-vitals-reflection"
        style={styles.reflectionInput}
        placeholder="anything to remember?"
        placeholderTextColor={colors.textTertiary}
        value={values.reflection ?? ''}
        onChangeText={setReflection}
        multiline
        numberOfLines={2}
        maxLength={200}
        accessibilityLabel="Optional one-sentence reflection"
      />
    </View>
  );
}

const createStyles = (c: any) =>
  StyleSheet.create({
    row: {
      paddingVertical: Spacing.md,
    },
    rowDivider: {
      // 0.5px hairline between rows replaces the pre-9.4 inner card chrome.
      borderTopWidth: 0.5,
      borderTopColor: c.glassBorder,
    },
    label: {
      fontSize: 14,
      fontWeight: '500',
      color: c.textPrimary,
      marginBottom: 12,
    },
    emojiRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    emojiButton: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emojiBase: {
      fontSize: 24,
    },
    emojiSelected: {
      fontSize: 28,
      opacity: 1,
    },
    emojiUnselected: {
      fontSize: 24,
      opacity: 0.4,
    },
    anchorRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    anchor: {
      fontSize: 11,
      color: c.textTertiary,
    },
    anchorSelected: {
      // selectionListContrast a11y contract permits color tint on anchor
      // labels because they are NOT *LabelSelected pattern targets — they
      // are independent text nodes whose role is "label for the slider
      // extreme that's currently chosen." The tint reinforces selection
      // beyond the size+opacity signals on the emoji row.
      color: c.accent,
      fontWeight: '500',
    },
    reflectionInput: {
      fontFamily: Fonts.serifItalic,
      fontStyle: 'italic',
      minHeight: 44,
      backgroundColor: c.menuSurface ?? c.glass,
      borderWidth: 0.5,
      borderColor: c.glassBorder,
      borderRadius: 8,
      paddingHorizontal: 12, // allow: tap-target padding (Apple HIG ≥44pt)
      paddingVertical: 10,
      fontSize: 13,
      color: c.textPrimary,
      marginTop: Spacing.md,
    },
  });

export default SilentVitalsCapture;
