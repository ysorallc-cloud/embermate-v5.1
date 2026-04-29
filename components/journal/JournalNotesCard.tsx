// ============================================================================
// JOURNAL NOTES CARD
//
// Single-card replacement for the floating-eyebrow + ReflectionPrompt pair.
// Internal header: "TODAY'S NOTES". Body: text input that fills the card.
// Footer: privacy line + Save pill (outlined → mint when there are unsaved
// edits → outlined again after save). Owns its own dirty state and forwards
// to the same saveReflection / onDirtyChange contracts as before.
// ============================================================================

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export interface JournalNotesCardProps {
  date: string;
  savedText?: string;
  savedAt?: string;
  onSave: (text: string) => Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
  /** Past-date view: lock the input, swap the placeholder, hide the Save pill. */
  readOnly?: boolean;
}

export function JournalNotesCard({
  savedText,
  onSave,
  onDirtyChange,
  readOnly = false,
}: JournalNotesCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [text, setText] = useState(savedText ?? '');
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  // Sync incoming saved text (e.g. when the parent loads a different day).
  useEffect(() => {
    setText(savedText ?? '');
    setJustSaved(false);
  }, [savedText]);

  const isDirty = text.trim() !== (savedText ?? '').trim() && text.trim().length > 0;

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
      setTimeout(() => setJustSaved(false), 1500);
    } finally {
      setSaving(false);
    }
  }, [isDirty, saving, text, onSave]);

  const saveLabel = saving ? 'Saving…' : justSaved ? 'Saved' : 'Save';
  const showDirty = isDirty && !justSaved && !saving;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.eyebrow}>{"TODAY'S NOTES"}</Text>
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
        <Text style={styles.privacy}>{'🔒 Private · on this device'}</Text>
        {!readOnly && (
          <TouchableOpacity
            style={[styles.saveButton, showDirty && styles.saveButtonDirty]}
            onPress={handleSave}
            disabled={!isDirty || saving}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={saveLabel}
            accessibilityState={{ selected: showDirty, disabled: !isDirty || saving }}
          >
            <Text style={[styles.saveText, showDirty && styles.saveTextDirty]}>
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
    privacy: {
      fontSize: 9,
      color: c.textTertiary,
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
      paddingVertical: 3,
    },
    saveButtonDirty: {
      backgroundColor: c.accent,
      borderColor: c.accent,
    },
    saveText: {
      fontSize: 11,
      color: c.textSecondary,
      fontWeight: '500',
    },
    saveTextDirty: {
      color: c.textPrimary,
    },
  });

export default JournalNotesCard;
