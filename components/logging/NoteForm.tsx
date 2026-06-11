// ============================================================================
// NOTE FORM — reusable note-capture surface shared by /log-note (route)
// and QuickLogSheet (bottom-sheet picker on Now).
//
// Owns: content state, save logic, and the textarea visuals (including
// the placeholder copy pinned by __tests__/copy/logNotePlaceholder), plus
// the optional instance-completion side-effect when the form was opened
// from a Care Plan instance.
//
// Does NOT own: the disclaimer (the Phase 9.6 LogScreen pattern audit
// requires it inline in each log-* route screen body), the surrounding
// chrome, or the Save button. The route screen renders the disclaimer
// above <NoteForm/> and wires LogScreen's primaryAction; the sheet
// renders its own disclaimer + sheet-shaped button. Both surfaces wire
// their Save button to `ref.current.save()` and listen for canSave /
// saving via the optional state-change callbacks.
// ============================================================================

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { saveNote } from '../../utils/noteStorage';
import { logError } from '../../utils/devLog';
import { emitDataUpdate } from '../../lib/events';
import { hapticSuccess } from '../../utils/hapticFeedback';
import { EVENT } from '../../lib/eventNames';
import { getTodayDateString } from '../../services/carePlanGenerator';
import {
  logInstanceCompletion,
  DEFAULT_PATIENT_ID,
} from '../../storage/carePlanRepo';

export interface NoteFormHandle {
  save: () => Promise<void>;
}

export interface NoteFormProps {
  /** When the form is opened from a Care Plan daily instance, pass its
   *  id so save also completes the instance. Omitted for the freeform
   *  Quick-Log path. */
  instanceId?: string;
  /** Called after a successful save. Route screen passes navigateBack;
   *  sheet passes its onClose. */
  onSaved: () => void;
  /** Parents that render their own Save button subscribe via this
   *  callback to keep the button's disabled state in sync with the
   *  internal canSave gate. */
  onCanSaveChange?: (canSave: boolean) => void;
  /** Mirror of canSave for surfacing "Saving…" labels. */
  onSavingChange?: (saving: boolean) => void;
  /** Defaults to true. Sheets that animate in MAY want to delay focus
   *  until the slide-in settles; the parent owns that timing. */
  autoFocus?: boolean;
}

export const NoteForm = forwardRef<NoteFormHandle, NoteFormProps>(function NoteForm(
  { instanceId, onSaved, onCanSaveChange, onSavingChange, autoFocus = true },
  ref,
) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  const canSave = content.trim().length > 0 && !saving;

  useEffect(() => {
    onCanSaveChange?.(canSave);
  }, [canSave, onCanSaveChange]);

  useEffect(() => {
    onSavingChange?.(saving);
  }, [saving, onSavingChange]);

  const handleSave = useCallback(async () => {
    if (!content.trim()) {
      Alert.alert('Required', 'Please enter a note');
      return;
    }
    if (saving) return;
    setSaving(true);
    try {
      const now = new Date();
      await saveNote({
        content: content.trim(),
        timestamp: now.toISOString(),
        date: getTodayDateString(),
      });
      emitDataUpdate(EVENT.NOTES);

      if (instanceId) {
        try {
          await logInstanceCompletion(
            DEFAULT_PATIENT_ID,
            getTodayDateString(),
            instanceId,
            'completed',
            { type: 'custom', note: content.trim() } as any,
            { source: 'record' },
          );
          emitDataUpdate(EVENT.DAILY_INSTANCES);
        } catch (err) {
          logError('NoteForm.completeInstance', err);
        }
      }

      await hapticSuccess();
      onSaved();
    } catch (error) {
      Alert.alert('Error', 'Failed to save note');
      logError('NoteForm.handleSave', error);
      setSaving(false);
    }
  }, [content, saving, instanceId, onSaved]);

  useImperativeHandle(
    ref,
    () => ({
      save: handleSave,
    }),
    [handleSave],
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.kav}
    >
      <View style={styles.formGroup}>
        <Text style={styles.label}>Note</Text>
        <TextInput
          testID="log-note-input"
          style={[styles.input, styles.textArea]}
          value={content}
          onChangeText={setContent}
          placeholder="What stood out today? Energy, appetite, anything to ask the doctor…"
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={10}
          textAlignVertical="top"
          autoFocus={autoFocus}
          accessibilityLabel="Care note"
        />
      </View>
    </KeyboardAvoidingView>
  );
});

const createStyles = (c: typeof Colors) =>
  StyleSheet.create({
    kav: { flex: 1 },
    formGroup: { gap: 8 },
    label: {
      fontSize: 9,
      fontWeight: '600',
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      color: c.textTertiary,
    },
    input: {
      backgroundColor: c.surfaceElevated,
      borderWidth: 0.5,
      borderColor: c.glassBorder,
      borderRadius: 12,
      paddingHorizontal: 14, // allow: tap-target padding (Apple HIG ≥44pt)
      paddingVertical: 14, // allow: tap-target padding (Apple HIG ≥44pt)
      fontSize: 15,
      color: c.textPrimary,
    },
    textArea: {
      minHeight: 200,
      paddingTop: 14, // allow: tap-target padding (Apple HIG ≥44pt)
    },
  });

export default NoteForm;
