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
import { Colors, Sizing, Spacing } from '../../theme/theme-tokens';
import { CARD_PADDING_V } from '../../theme/spacing';
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

  // UX-4 pre-launch — mood tap saves immediately. The Save button below
  // stays in place for optional text-only saves (and for re-saving after
  // the user taps the card to edit a locked reflection). Tapping the
  // already-selected mood deselects locally without committing — the
  // user is in edit mode and can pick another mood (which saves) or
  // tap Save to commit a text change.
  const handleMoodPress = useCallback(async (value: ReflectionMood) => {
    setLocked(false);
    if (mood === value) {
      // Toggle-off — clear the local selection without saving. The
      // user is signalling edit intent; a subsequent mood tap or
      // Save tap will commit.
      setMood(null);
      return;
    }
    setMood(value);
    const entry = await saveReflection({
      date,
      mood: value,
      text: text.trim().length > 0 ? text : null,
    });
    setSavedAt(entry.savedAt);
    setLocked(true);
    setToastVisible(true);
  }, [mood, date, text]);

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

// You rebuild (S4) — the check-in is DE-BOXED to open fabric (the mockup
// flattens everything except the SUPPORT tiles). The old lavender lane-card
// styling retired with the full de-purple; the free-text reflection + the
// Save/F6 round-trip are UNCHANGED — only presentation dropped.
const createStyles = (c: typeof Colors) => StyleSheet.create({
  card: {
    // Item 3 (Jul 2 2026) — reflection-lane coral frame, matching the Now
    // zone's emberCard (ReflectionZoneNow). B1 register tint: borderReflect =
    // coral @ 0.26, the reflection/warm register. This re-frames the S4 de-box
    // with the register tint per ruling; border-only (no fill, no lavender).
    // The 0.26 alpha is the SHARED Now+You ruling — do NOT tune it here.
    borderWidth: 1,
    borderColor: c.borderReflect,
    borderRadius: 12,
    padding: CARD_PADDING_V,
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
  // You rebuild (S4) — selected-mood ring → SAGE (the You accent after the
  // de-purple; §5 self-care = sage).
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
    marginTop: Spacing.md,
    marginBottom: 10,
  },
  input: {
    // B3 — check-in field reads INSET/recessed: darkened fill + inset edge.
    // Device-conditional; isolated commit, reverts cheaply.
    backgroundColor: c.background,
    borderWidth: 0.5,
    borderColor: c.borderInset,
    borderRadius: 10,
    padding: 12,
    // Phase 29 Batch B F3 — 3-line minHeight (fontSize 13 × lineHeight
    // ~1.3 × 3 ≈ 51px). Hardcoded literal rather than a new Sizing
    // token; no other consumer needs 3-line specifically. Multiline
    // auto-expands on focus via RN default behavior up to maxHeight 200.
    minHeight: 51,
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
  // Phase 33b extension lavender no-fill canon — site #14. Phase 29 Batch B
  // F3 had recolored this pill from sage to lavender as a Tier-1
  // within-surface coherence move (wrapping card carries lavender lane
  // identity). The new no-fill canon restricts lavender to eyebrow-scale
  // text + thin accents, so the Save pill returns to sage — action-affirmative
  // is the correct lane for "save reflection" regardless. Near-black text
  // (#0a0c0a) reads on sage as it did on lavender. The wrapping card's
  // lavender lane identity now lives in its eyebrow + tint, not in the CTA.
  // Padding + radius + fontSize unchanged from the v6.7 Phase 5 layout.
  saveButton: {
    backgroundColor: c.accent,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 16, // allow: tap-target padding (Apple HIG ≥44pt)
  },
  saveButtonDisabled: {
    opacity: 0.4,
  },
  saveButtonText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#0a0c0a',
  },
});
