// ============================================================================
// REFLECTION CARD — You-tab unified mood + free-text reflection.
//
// One card combines:
//   • Mood selector (5 emojis on a horizontal row)
//   • Single fixed prompt
//   • Multiline free-text input
//   • Save pill + private-storage note
//
// Storage: services/reflectionRepo (one entry per calendar day, encrypted
// at rest via the safeStorage 'reflection_' prefix). Save overwrites the
// day's entry. On mount the card prefills mood + text from the repo so
// returning later in the day shows what was already written.
// ============================================================================

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Colors, Sizing } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import {
  saveReflection,
  getReflection,
  ReflectionMood,
} from '../../services/reflectionRepo';
import { InlineSaveToast } from '../shared/InlineSaveToast';

// ============================================================================
// CONSTANTS
// ============================================================================

const PROMPT = 'What was today like for you?';
const PLACEHOLDER = 'A few words, or skip…';
const PRIVACY_NOTE = 'Private · saved on this device';

const MOODS: { value: ReflectionMood; emoji: string; label: string }[] = [
  { value: 'rough',   emoji: '😔', label: 'Rough' },
  { value: 'low',     emoji: '😕', label: 'Low' },
  { value: 'neutral', emoji: '😐', label: 'Neutral' },
  { value: 'okay',    emoji: '🙂', label: 'Okay' },
  { value: 'good',    emoji: '😊', label: 'Good' },
];

function todayKey(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ReflectionCard() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const date = useMemo(todayKey, []);
  const [mood, setMood] = useState<ReflectionMood | null>(null);
  const [text, setText] = useState<string>('');
  const [savedAt, setSavedAt] = useState<string | null>(null);
  // Locked = a save has happened and the user hasn't tapped back in to edit.
  const [locked, setLocked] = useState<boolean>(false);
  const [toastVisible, setToastVisible] = useState<boolean>(false);

  // Prefill from repo on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const existing = await getReflection(date);
      if (cancelled || !existing) return;
      if (existing.mood) setMood(existing.mood);
      if (existing.text) setText(existing.text);
      if (existing.savedAt) {
        setSavedAt(existing.savedAt);
        setLocked(true);
      }
    })();
    return () => { cancelled = true; };
  }, [date]);

  const canSave = (mood !== null) || (text.trim().length > 0);

  const handleMoodPress = useCallback((value: ReflectionMood) => {
    setMood((prev) => (prev === value ? null : value));
    setLocked(false);
  }, []);

  const handleTextFocus = useCallback(() => {
    if (locked) setLocked(false);
  }, [locked]);

  const handleSave = useCallback(async () => {
    if (!canSave) return;
    const entry = await saveReflection({
      date,
      mood,
      text: text.trim().length > 0 ? text : null,
    });
    setSavedAt(entry.savedAt);
    setLocked(true);
    setToastVisible(true);
  }, [canSave, date, mood, text]);

  return (
    <View style={styles.card}>
      {/* Section 1 — section label */}
      <Text style={styles.sectionLabel}>HOW ARE YOU TODAY?</Text>

      {/* Section 2 — mood selector */}
      <View style={styles.moodRow}>
        {MOODS.map((m) => {
          const selected = mood === m.value;
          return (
            <TouchableOpacity
              key={m.value}
              style={[styles.moodButton, selected && styles.moodButtonSelected]}
              onPress={() => handleMoodPress(m.value)}
              accessibilityRole="radio"
              accessibilityLabel={`${m.label} mood, ${selected ? 'selected' : 'not selected'}`}
              accessibilityState={{ selected }}
            >
              <Text style={[styles.moodEmoji, !selected && styles.moodEmojiInactive]}>
                {m.emoji}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Section 3 — prompt */}
      <Text style={styles.prompt}>{PROMPT}</Text>

      {/* Section 4 — text input */}
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={(t) => { setText(t); setLocked(false); }}
        onFocus={handleTextFocus}
        placeholder={PLACEHOLDER}
        placeholderTextColor={colors.textTertiary}
        multiline
        editable={!locked}
        textAlignVertical="top"
        accessibilityLabel="Today's reflection"
        accessibilityHint="Write a few words about your day, or leave blank"
      />

      {/* Section 5 — footer */}
      <View style={styles.footer}>
        <Text style={styles.privacyNote}>{PRIVACY_NOTE}</Text>
        <TouchableOpacity
          style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!canSave}
          accessibilityRole="button"
          accessibilityLabel="Save reflection"
          accessibilityState={{ disabled: !canSave }}
        >
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>

      <InlineSaveToast
        visible={toastVisible}
        message="Saved."
        onDismiss={() => setToastVisible(false)}
        autoDismissMs={2000}
      />
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const createStyles = (c: typeof Colors) => StyleSheet.create({
  card: {
    // You-tab card surface — tinted slightly warmer than the global glass.
    backgroundColor: (c as any).youCardSurface || c.glass,
    borderWidth: 1,
    borderColor: (c as any).youCardBorder || c.glassBorder,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: c.textTertiary,
    letterSpacing: 0.3,
    marginBottom: 12,
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  moodButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  moodButtonSelected: {
    borderWidth: 1.5,
    borderColor: c.accent,
  },
  moodEmoji: {
    fontSize: 22,
    opacity: 1,
  },
  moodEmojiInactive: {
    opacity: 0.4,
  },
  prompt: {
    fontSize: 13,
    fontWeight: '500',
    color: c.textPrimary,
    marginTop: 16,
    marginBottom: 10,
  },
  input: {
    backgroundColor: c.glassDim,
    borderWidth: 0.5,
    borderColor: c.glassBorder,
    borderRadius: 10,
    padding: 12,
    // v6.7 May 1 sizing pass — Phase 6: previously 60pt, which felt
    // disproportionately tall when empty. Drops to the shared sizing
    // token; multiline still expands naturally up to maxHeight.
    minHeight: Sizing.textareaMinHeight,
    maxHeight: 200,
    fontSize: 13,
    color: c.textPrimary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  privacyNote: {
    fontSize: 10,
    color: c.textTertiary,
    flex: 1,
    marginRight: 8,
  },
  // v6.7 Phase 5 — locked filled-sage primary. The button reads as a
  // real button (vs the prior low-contrast teal pill), with dark text on
  // sage so the affordance is unambiguous.
  saveButton: {
    backgroundColor: '#5fb88a',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  saveButtonDisabled: {
    opacity: 0.4,
  },
  saveButtonText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#0a1510',
  },
});
