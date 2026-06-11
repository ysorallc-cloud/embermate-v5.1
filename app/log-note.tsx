// ============================================================================
// LOG NOTE — Phase 9.5 migration to LogScreen.
//
// Smallest screen in the log family — single textarea + Save. Wraps in
// <LogScreen>, drops LinearGradient + SubScreenHeader. No counter
// subtitle (notes are not a scheduled instance type). Disclaimer at top.
// Storage write paths and instance-completion call preserved.
// ============================================================================

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { navigateBack } from '../lib/navigate';
import { Colors } from '../theme/theme-tokens';
import { useTheme } from '../contexts/ThemeContext';
import { saveNote } from '../utils/noteStorage';
import { logError } from '../utils/devLog';
import { emitDataUpdate } from '../lib/events';
import { hapticSuccess } from '../utils/hapticFeedback';
import { EVENT } from '../lib/eventNames';
import { getTodayDateString } from '../services/carePlanGenerator';
import { logInstanceCompletion, DEFAULT_PATIENT_ID } from '../storage/carePlanRepo';
import { LogScreen } from '../components/logging/LogScreen';

export default function LogNoteScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const params = useLocalSearchParams();
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  const canSave = content.trim().length > 0 && !saving;

  const handleSave = useCallback(async () => {
    if (!canSave) {
      if (!content.trim()) Alert.alert('Required', 'Please enter a note');
      return;
    }
    setSaving(true);
    try {
      const now = new Date();
      await saveNote({
        content: content.trim(),
        timestamp: now.toISOString(),
        date: getTodayDateString(),
      });
      emitDataUpdate(EVENT.NOTES);

      const instanceId = params.instanceId as string | undefined;
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
          logError('LogNoteScreen.completeInstance', err);
        }
      }

      await hapticSuccess();
      navigateBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to save note');
      logError('LogNoteScreen.handleSave', error);
      setSaving(false);
    }
  }, [canSave, content, params.instanceId]);

  return (
    <LogScreen
      title="Note"
      onBack={navigateBack}
      primaryAction={{
        label: saving ? 'Saving…' : 'Save note',
        onPress: handleSave,
        disabled: !canSave,
      }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <Text testID="log-note-disclaimer" style={styles.disclaimer}>
          For caregiver record-keeping. Not medical advice.
        </Text>

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
            autoFocus
            accessibilityLabel="Care note"
          />
        </View>
      </KeyboardAvoidingView>
    </LogScreen>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  kav: { flex: 1 },
  disclaimer: {
    fontSize: 12,
    fontStyle: 'italic',
    color: c.textTertiary,
    marginBottom: 20,
  },
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
