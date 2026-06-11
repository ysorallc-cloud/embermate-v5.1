// ============================================================================
// LOG NOTE — Phase 9.5 LogScreen wrapper.
//
// Form internals live in components/logging/NoteForm (extracted for reuse
// by the QuickLogSheet on Now per pre-launch UX-1). This screen owns the
// LogScreen chrome (header + primaryAction footer) + the standard medical
// disclaimer (per the Phase 9.6 LogScreen pattern audit) and forwards the
// Save tap through formRef.current.save(); NoteForm owns content + save
// logic.
// ============================================================================

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { navigateBack } from '../lib/navigate';
import { Colors } from '../theme/theme-tokens';
import { useTheme } from '../contexts/ThemeContext';
import { LogScreen } from '../components/logging/LogScreen';
import { NoteForm, type NoteFormHandle } from '../components/logging/NoteForm';

export default function LogNoteScreen() {
  const params = useLocalSearchParams();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const formRef = useRef<NoteFormHandle>(null);
  const [canSave, setCanSave] = useState(false);
  const [saving, setSaving] = useState(false);

  const instanceId = params.instanceId as string | undefined;

  const handleSavePress = useCallback(() => {
    void formRef.current?.save();
  }, []);

  return (
    <LogScreen
      title="Note"
      onBack={navigateBack}
      primaryAction={{
        label: saving ? 'Saving…' : 'Save note',
        onPress: handleSavePress,
        disabled: !canSave,
      }}
    >
      <Text testID="log-note-disclaimer" style={styles.disclaimer}>
        For caregiver record-keeping. Not medical advice.
      </Text>
      <NoteForm
        ref={formRef}
        instanceId={instanceId}
        onSaved={navigateBack}
        onCanSaveChange={setCanSave}
        onSavingChange={setSaving}
        autoFocus
      />
    </LogScreen>
  );
}

const createStyles = (c: typeof Colors) =>
  StyleSheet.create({
    disclaimer: {
      fontSize: 12,
      fontStyle: 'italic',
      color: c.textTertiary,
      marginBottom: 20, // allow: disclaimer rhythm matches Phase 9.5 log-* family
    },
  });
