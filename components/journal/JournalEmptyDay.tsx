// ============================================================================
// JOURNAL EMPTY DAY — Phase 5.12.h.
//
// Restorative composition for days with no events, no notes, no tone.
// Hierarchy: hero → nearby-days continuity → "+ Add a note for this day".
//
// Tone over utility density. The hero leads; the nearby-days section is
// continuity support, not navigation; the "Add a note" affordance is a
// quiet lavender link, not a CTA.
//
// Parent owns the editor state (toggling addNoteMode flips Journal back
// to the populated composition with JournalNotesCard mounted) and the
// day-selection state (tapping a nearby card calls onSelectDay).
//
// Phase 27.5b F8 — the hero copy is time-aware. JournalEmptyDay only
// mounts on TODAY (the shouldRenderJournalEmptyDay gate short-circuits
// past days), so the pre-F8 copy ("A quiet day in the record. No events
// were logged on this day. That doesn't mean nothing happened — it just
// means the record is blank.") was retrospective framing applied to an
// active today — read as broken at noon on an empty day. The fork
// produces three bucket-specific titles using the smartDefaultsEngine
// hour convention:
//   • Morning   (hour < 12)        → "Today is just starting. Nothing logged yet."
//   • Afternoon (12 ≤ hour < 17)   → "Nothing logged this morning. The day is still open."
//   • Evening   (hour ≥ 17)        → "Nothing logged yet today."
// The heroBody Text retires entirely — the title carries the full
// observation per bucket.
// ============================================================================

import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Spacing, Sizing, Fonts } from '../../theme/theme-tokens';
import { useNearbyDaysWithRecords } from '../../hooks/useNearbyDaysWithRecords';

interface JournalEmptyDayProps {
  dateKey: string;
  /** Phase 35 Slice 3-C followup (Bug B) — caregiver-facing save.
   *  The inline note input writes through this callback; the parent
   *  routes it through saveConsolidatedNotes (the single source of
   *  truth the populated Section 4 JournalNotesCard also uses).
   *  Pre-fix this prop was `onAddNote: () => void` which flipped a
   *  parent state flag that unmounted this whole frame — the input
   *  the caregiver expected mounted far below the visible viewport
   *  with no autofocus. User experience: "I tapped a button and my
   *  input vanished." Now the input lives inline: the affordance
   *  promises an input where the caregiver tapped; this honors it
   *  literally. */
  onSave: (text: string) => Promise<void>;
  onSelectDay: (dateKey: string) => void;
}

// Phase 27.5b F8 — time-of-day bucket. Bounds match smartDefaultsEngine.
// Overnight (0-4) falls into morning per Phase 27.5b D3.
function emptyDayHeroCopy(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Today is just starting. Nothing logged yet.';
  if (hour < 17) return 'Nothing logged this morning. The day is still open.';
  return 'Nothing logged yet today.';
}

const SHORT_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SHORT_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function shortDateLabel(dateKey: string): string {
  const d = new Date(`${dateKey}T12:00:00`);
  return `${SHORT_WEEKDAYS[d.getDay()]} ${SHORT_MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function JournalEmptyDay({
  dateKey,
  onSave,
  onSelectDay,
}: JournalEmptyDayProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const nearby = useNearbyDaysWithRecords(dateKey, 2);

  // Phase 35 Slice 3-C followup (Bug B) — inline-note state.
  // Tapping the "+ Add a note for this day" link flips inputOpen → true,
  // revealing a multiline autofocused TextInput in place of the link.
  // saving locks the Save button to prevent double-tap double-write
  // (the standing pattern Slice 3-C established for every caregiver-
  // initiated trust action).
  const [inputOpen, setInputOpen] = useState(false);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  const trimmed = text.trim();
  const canSave = trimmed.length > 0 && !saving;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave(trimmed);
      // Don't reset inputOpen here — the parent's save handler will
      // setReflection, which flips the empty-state predicate, which
      // unmounts this entire JournalEmptyDay frame and mounts the
      // SOAP layout containing the just-saved note in Section 4.
      // The transition is data-driven, not click-driven (calm).
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.section}>
      <View style={styles.hero}>
        <Text style={styles.dash}>{'—'}</Text>
        <Text style={styles.heroTitle}>{emptyDayHeroCopy()}</Text>
        {/* Phase 27.5b F8 — heroBody retired. The pre-F8 body string
            ("No events were logged on this day. That doesn't mean
            nothing happened — it just means the record is blank.")
            was retrospective framing that read broken on an active
            mid-day today. The title now carries the full observation
            per time-of-day bucket. */}
      </View>

      {nearby.length > 0 && (
        <View style={styles.nearbyWrap}>
          <Text style={styles.nearbyEyebrow}>{'NEARBY DAYS WITH RECORDS'}</Text>
          <View style={styles.nearbyRow}>
            {nearby.map((day, i) => (
              <TouchableOpacity
                key={day.dateKey}
                testID={`empty-day-nearby-${i}`}
                style={styles.nearbyCard}
                onPress={() => onSelectDay(day.dateKey)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={`Open ${shortDateLabel(day.dateKey)} — ${day.summary}`}
              >
                <Text style={styles.nearbyDate}>{shortDateLabel(day.dateKey)}</Text>
                <Text style={styles.nearbySummary} numberOfLines={2}>
                  {day.summary}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {!inputOpen ? (
        <TouchableOpacity
          testID="empty-day-add-note"
          style={styles.addNote}
          onPress={() => setInputOpen(true)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Add a note for this day"
        >
          <Text testID="empty-day-add-note-label" style={styles.addNoteText}>
            {'+ Add a note for this day'}
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.inlineNoteWrap}>
          <TextInput
            testID="empty-day-note-input"
            style={styles.inlineNoteInput}
            value={text}
            onChangeText={setText}
            autoFocus
            multiline
            placeholder="A short note about today…"
            placeholderTextColor={colors.textTertiary}
            accessibilityLabel="Note for this day"
            editable={!saving}
          />
          <TouchableOpacity
            testID="empty-day-note-save"
            style={[styles.inlineNoteSave, !canSave && styles.inlineNoteSaveDisabled]}
            onPress={handleSave}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Save note for this day"
            disabled={!canSave}
          >
            <Text style={styles.inlineNoteSaveLabel}>{saving ? 'Saving…' : 'Save'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const createStyles = (c: any) =>
  StyleSheet.create({
    section: {
      paddingTop: Spacing.lg,
      paddingHorizontal: 14, // allow: page-rhythm horizontal inset
    },
    hero: {
      alignItems: 'center' as const,
      paddingVertical: Spacing.lg,
    },
    dash: {
      fontSize: 32,
      color: c.accent,
      opacity: 0.3,
      marginBottom: Spacing.md,
    },
    heroTitle: {
      fontFamily: Fonts.serifItalic,
      fontStyle: 'italic' as const,
      fontSize: 13,
      color: c.textSecondary,
      textAlign: 'center' as const,
      marginBottom: Spacing.sm,
    },
    heroBody: {
      fontSize: 11,
      lineHeight: 18,
      color: c.textSecondary,
      textAlign: 'center' as const,
      maxWidth: 280,
    },
    nearbyWrap: {
      marginTop: Spacing.lg,
      alignItems: 'center' as const,
    },
    nearbyEyebrow: {
      fontSize: 10,
      fontWeight: '600' as const,
      letterSpacing: 0.5,
      color: c.caregiverAccent,
      marginBottom: 10,
    },
    nearbyRow: {
      flexDirection: 'row' as const,
      gap: 10,
      flexWrap: 'wrap' as const,
      justifyContent: 'center' as const,
    },
    nearbyCard: {
      backgroundColor: c.glass,
      borderWidth: 0.5,
      borderColor: c.glassBorder,
      borderRadius: Sizing.cardRadius,
      padding: Sizing.cardInternalPadding,
      maxWidth: 160,
    },
    nearbyDate: {
      fontSize: 11,
      fontWeight: '600' as const,
      color: c.textPrimary,
      marginBottom: 2,
    },
    nearbySummary: {
      fontSize: 10.5,
      color: c.textSecondary,
      lineHeight: 14,
    },
    addNote: {
      alignSelf: 'center' as const,
      marginTop: Spacing.lg,
      paddingVertical: 8,
      paddingHorizontal: 12, // allow: tap-target padding (Apple HIG)
    },
    addNoteText: {
      fontSize: 13,
      color: c.caregiverAccent,
      fontWeight: '500' as const,
    },
    // Phase 35 Slice 3-C followup (Bug B) — inline-note input styles.
    // The input lives WHERE THE LINK WAS so the caregiver gets an
    // input "where they tapped" (option b lock). Sage accent border on
    // the input + sage-filled Save button match the Phase 33 brand
    // language (calm, predictable, no surprise motion).
    inlineNoteWrap: {
      marginTop: Spacing.lg,
      paddingHorizontal: 14, // allow: page-rhythm horizontal inset
    },
    inlineNoteInput: {
      minHeight: 88, // allow: multi-line input target (Apple HIG ≥44pt × 2 lines)
      backgroundColor: 'rgba(255,255,255,0.04)',
      borderWidth: 1,
      borderColor: c.glassBorder,
      borderRadius: Sizing.cardRadius,
      padding: 12,
      fontSize: 14,
      lineHeight: 20,
      color: c.textPrimary,
      textAlignVertical: 'top' as const,
    },
    inlineNoteSave: {
      alignSelf: 'flex-end' as const,
      marginTop: Spacing.sm,
      paddingVertical: 8,
      paddingHorizontal: 16, // allow: tap-target padding (Apple HIG ≥44pt)
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.accent,
      backgroundColor: 'transparent',
    },
    inlineNoteSaveDisabled: {
      opacity: 0.4,
    },
    inlineNoteSaveLabel: {
      fontSize: 13,
      color: c.accent,
      fontWeight: '500' as const,
    },
  });

export default JournalEmptyDay;
