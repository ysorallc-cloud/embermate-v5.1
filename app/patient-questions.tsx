// ============================================================================
// PATIENT QUESTIONS — "Questions for the doctor" entry surface.
//
// Caregiver builds a running list across the period; the Visit Prep PDF
// reads the list (and clears it once shared). Reachable from Care Plan and
// You-tab quick links — Phase 4 of Prompt 5.
// ============================================================================

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { Colors } from '../theme/theme-tokens';
import { SubScreenHeader } from '../components/SubScreenHeader';
import {
  listQuestions,
  addQuestion,
  removeQuestion,
  type PatientQuestion,
} from '../services/patientQuestionsRepo';
import { usePatient } from '../contexts/PatientContext';
import { DEFAULT_PATIENT_ID } from '../storage/carePlanRepo';
import { logError } from '../utils/devLog';

export default function PatientQuestionsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { activePatient } = usePatient();
  const patientId = activePatient?.id || DEFAULT_PATIENT_ID;

  const [questions, setQuestions] = useState<PatientQuestion[]>([]);
  const [draft, setDraft] = useState('');

  const refresh = useCallback(async () => {
    try {
      const list = await listQuestions(patientId);
      setQuestions(list);
    } catch (err) {
      logError('patient-questions.refresh', err);
    }
  }, [patientId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleAdd = useCallback(async () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    try {
      await addQuestion(patientId, trimmed);
      setDraft('');
      await refresh();
    } catch (err) {
      logError('patient-questions.add', err);
      Alert.alert('Could not save', 'Please try again.');
    }
  }, [draft, patientId, refresh]);

  const handleRemove = useCallback(async (id: string) => {
    try {
      await removeQuestion(patientId, id);
      await refresh();
    } catch (err) {
      logError('patient-questions.remove', err);
    }
  }, [patientId, refresh]);

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <SubScreenHeader
          title="Questions for the doctor"
          subtitle="They'll appear in your next Visit Prep PDF — and clear after you share it."
        />
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.composer}>
            <TextInput
              testID="patient-questions-input"
              style={styles.input}
              placeholder="Anything you want to remember to ask?"
              placeholderTextColor={colors.textTertiary}
              value={draft}
              onChangeText={setDraft}
              multiline
              numberOfLines={2}
              maxLength={300}
              accessibilityLabel="Type a question to ask the doctor"
            />
            <TouchableOpacity
              testID="patient-questions-add"
              style={[styles.addButton, !draft.trim() && styles.addButtonDisabled]}
              onPress={handleAdd}
              disabled={!draft.trim()}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Add question"
              accessibilityState={{ disabled: !draft.trim() }}
            >
              <Text style={[styles.addButtonText, !draft.trim() && styles.addButtonTextDisabled]}>
                {'Add'}
              </Text>
            </TouchableOpacity>
          </View>

          {questions.length === 0 ? (
            <Text style={styles.emptyText}>
              {'Nothing yet. Add a question whenever something comes up — they pile up surprisingly fast.'}
            </Text>
          ) : (
            <View style={styles.list}>
              {questions.map((q) => (
                <View key={q.id} style={styles.row}>
                  <Text style={styles.rowText}>{q.text}</Text>
                  <TouchableOpacity
                    onPress={() => handleRemove(q.id)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove question: ${q.text}`}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.removeGlyph}>{'×'}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  content: { padding: 20, paddingBottom: 60 },
  composer: {
    backgroundColor: c.glass,
    borderWidth: 0.5,
    borderColor: c.glassBorder,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    gap: 10,
  },
  input: {
    minHeight: 44,
    maxHeight: 120,
    fontSize: 13,
    color: c.textPrimary,
    paddingVertical: 4,
  },
  addButton: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: c.accent,
  },
  addButtonDisabled: {
    backgroundColor: 'transparent',
    borderWidth: 0.5,
    borderColor: c.glassBorder,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: c.textPrimary,
  },
  addButtonTextDisabled: {
    color: c.textTertiary,
  },
  emptyText: {
    fontSize: 12,
    color: c.textTertiary,
    fontStyle: 'italic',
    paddingHorizontal: 4,
    lineHeight: 18,
  },
  list: {
    backgroundColor: c.glass,
    borderWidth: 0.5,
    borderColor: c.glassBorder,
    borderRadius: 10,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: c.glassBorder,
    gap: 12,
  },
  rowText: {
    flex: 1,
    fontSize: 13,
    color: c.textPrimary,
    lineHeight: 19,
  },
  removeGlyph: {
    fontSize: 18,
    color: c.textTertiary,
    paddingHorizontal: 4,
  },
});
