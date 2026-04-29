// ============================================================================
// JOURNAL NOTES CARD
//
// Single-card replacement for the floating-eyebrow + ReflectionPrompt pair.
// Internal header: "TODAY'S NOTES". Body: text input that fills the card.
// Footer: privacy line + Save pill (outlined → mint when there are unsaved
// edits → outlined again after save). Owns its own dirty state and forwards
// to the same saveReflection / onDirtyChange contracts as before.
// ============================================================================

import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { formatTime } from '../../utils/text/primitives';

export interface JournalNotesCardProps {
  date: string;
  savedText?: string;
  savedAt?: string;
  onSave: (text: string) => Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
  /** Past-date view: lock the input, swap the placeholder, hide the Save pill. */
  readOnly?: boolean;
  /** 24-hour preference for the "last edited" timestamp. Defaults to 12h. */
  use24Hour?: boolean;
}

export function JournalNotesCard({
  savedText,
  savedAt,
  onSave,
  onDirtyChange,
  readOnly = false,
  use24Hour = false,
}: JournalNotesCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [text, setText] = useState(savedText ?? '');
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const justSavedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync incoming saved text (e.g. when the parent loads a different day).
  useEffect(() => {
    setText(savedText ?? '');
    setJustSaved(false);
  }, [savedText]);

  // Clean up the just-saved timer on unmount.
  useEffect(() => {
    return () => {
      if (justSavedTimer.current) clearTimeout(justSavedTimer.current);
    };
  }, []);

  const isDirty = text.trim() !== (savedText ?? '').trim() && text.trim().length > 0;
  const hasSaved = (savedText ?? '').trim().length > 0;

  // Notify the parent on dirty-state transitions so the global "unsaved
  // reflection" guard rails (route changes, day switches) keep working.
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const handleSave = useCallback(async () => {
    if (!isDirty || saving) return;
    const trimmed = text.trim();
    setSaving(true);
    try {
      await onSave(trimmed);
      setJustSaved(true);
      if (justSavedTimer.current) clearTimeout(justSavedTimer.current);
      justSavedTimer.current = setTimeout(() => setJustSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }, [isDirty, saving, text, onSave]);

  // Four-state save UI:
  //   fresh      — never saved, input empty/unchanged → outlined "Save", disabled
  //   dirty      — unsaved edits in the input         → filled mint "Save"
  //   just-saved — transient ~3s after a save         → filled mint "✓ Saved"
  //   saved      — saved, no edits                    → outlined "✓ Saved"
  const saveState: 'fresh' | 'dirty' | 'just-saved' | 'saved' =
    saving ? 'dirty'
    : justSaved ? 'just-saved'
    : isDirty ? 'dirty'
    : hasSaved ? 'saved'
    : 'fresh';

  const saveLabel = saving ? 'Saving…'
    : saveState === 'just-saved' ? '✓ Saved'
    : saveState === 'dirty' ? 'Save'
    : saveState === 'saved' ? '✓ Saved'
    : 'Save';
  const filled = saveState === 'dirty' || saveState === 'just-saved';
  const a11ySelected = saveState === 'dirty';

  const lastEditedLabel = useMemo(() => {
    if (!savedAt) return null;
    const d = new Date(savedAt);
    if (isNaN(d.getTime())) return null;
    return `last edited ${formatTime(d, { format: use24Hour ? '24h' : '12h' })}`;
  }, [savedAt, use24Hour]);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.eyebrow}>{"TODAY'S NOTES"}</Text>
        {lastEditedLabel && (
          <Text
            style={styles.lastEdited}
            accessibilityLabel={lastEditedLabel}
          >
            {lastEditedLabel}
          </Text>
        )}
      </View>

      <View style={styles.body}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={readOnly ? 'Notes from this day' : 'Anything to pass along to the next caregiver?'}
          placeholderTextColor={colors.textTertiary}
          multiline
          textAlignVertical="top"
          editable={!readOnly}
          accessibilityLabel={
            readOnly
              ? 'Notes from this day (read-only)'
              : "Today's notes — type anything to pass along to the next caregiver"
          }
        />
      </View>

      {/* Hidden live region — VoiceOver announces "Saved" when justSaved
          flips to true; the visual state change on the pill alone wouldn't
          fire an a11y announcement on its own. */}
      <Text
        accessibilityLiveRegion="polite"
        accessibilityElementsHidden={!justSaved}
        style={styles.liveRegion}
      >
        {justSaved ? 'Saved' : ''}
      </Text>

      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <Text style={styles.privacy}>{'🔒 Private · on this device'}</Text>
          <Text
            style={styles.destinationHint}
            accessibilityLabel="Used in handoff and visit prep"
          >
            {'→ Used in handoff and visit prep'}
          </Text>
        </View>
        {!readOnly && (
          <TouchableOpacity
            style={[
              styles.saveButton,
              filled && styles.saveButtonFilled,
              saveState === 'saved' && styles.saveButtonSaved,
            ]}
            onPress={handleSave}
            disabled={!isDirty || saving}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={saveLabel}
            accessibilityState={{ selected: a11ySelected, disabled: !isDirty || saving }}
          >
            <Text
              style={[
                styles.saveText,
                filled && styles.saveTextFilled,
                saveState === 'saved' && styles.saveTextSaved,
              ]}
            >
              {saveLabel}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const createStyles = (c: any) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.glass,
      borderWidth: 0.5,
      borderColor: c.glassBorder,
      borderRadius: 10,
      overflow: 'hidden',
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      paddingTop: 11,
      paddingBottom: 8,
      paddingHorizontal: 14,
      backgroundColor: 'rgba(255,255,255,0.025)',
      borderBottomWidth: 0.5,
      borderBottomColor: c.glassBorder,
    },
    eyebrow: {
      fontSize: 9,
      fontWeight: '500',
      color: c.textTertiary,
      letterSpacing: 0.5,
    },
    lastEdited: {
      marginLeft: 'auto',
      fontSize: 8.5,
      fontStyle: 'italic',
      color: c.textTertiary,
    },
    body: {
      paddingTop: 12,
      paddingHorizontal: 14,
      paddingBottom: 10,
    },
    input: {
      fontSize: 14,
      color: c.textPrimary,
      lineHeight: 20,
      minHeight: 64,
      // Deliberately no backgroundColor / borderWidth — the card surface IS
      // the input surface (per the v6.7 internal-header spec).
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: 8,
      paddingBottom: 11,
      paddingHorizontal: 14,
      borderTopWidth: 0.5,
      borderTopColor: c.glassBorder,
    },
    footerLeft: {
      flexShrink: 1,
    },
    privacy: {
      fontSize: 9,
      color: c.textTertiary,
    },
    destinationHint: {
      marginTop: 2,
      fontSize: 8.5,
      fontWeight: '400',
      color: (c as any).caregiverAccent || c.textTertiary,
    },
    liveRegion: {
      // Visually hidden but accessible to VoiceOver via the live region.
      position: 'absolute',
      width: 1,
      height: 1,
      overflow: 'hidden',
      opacity: 0,
    },
    saveButton: {
      marginLeft: 'auto',
      borderWidth: 0.5,
      borderColor: c.glassBorder,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 4,
    },
    saveButtonFilled: {
      backgroundColor: c.accent,
      borderColor: c.accent,
    },
    saveButtonSaved: {
      // Outlined, mint border at ~35% opacity for the settled "saved" look.
      borderColor: 'rgba(95, 184, 138, 0.35)',
      backgroundColor: 'transparent',
    },
    saveText: {
      fontSize: 11,
      color: c.textSecondary,
      fontWeight: '500',
    },
    saveTextFilled: {
      color: c.textPrimary,
    },
    saveTextSaved: {
      color: c.accent,
    },
  });

export default JournalNotesCard;
