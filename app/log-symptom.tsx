// ============================================================================
// LOG SYMPTOM — Phase 9.5 multi-step exception wrap.
//
// LogScreen exception: multi-step parent of log-pain. When the user
// selects "Pain" in the symptom picker, the screen hands off to
// app/log-pain.tsx for NRS-scale + body-location capture. Both halves
// of the pair were classified as multi-step exceptions in the Phase 9.0
// reachability audit; the LogScreen pattern still applies (header /
// disclaimer / single sage CTA / ghost cancel) but the parent→child
// handoff stays as-is.
//
// Phase 9.5 wraps the existing body in <LogScreen>; the symptom chip
// grid + severity scale + notes textarea preserve their multi-step
// shape. Drops LinearGradient + SubScreenHeader.
// ============================================================================

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { navigate, navigateBack } from '../lib/navigate';
import { Colors } from '../theme/theme-tokens';
import { useTheme } from '../contexts/ThemeContext';
import { saveSymptom } from '../utils/symptomStorage';
import { logError } from '../utils/devLog';
import { emitDataUpdate } from '../lib/events';
import { hapticSuccess } from '../utils/hapticFeedback';
import { EVENT } from '../lib/eventNames';
import { getTodayDateString } from '../services/carePlanGenerator';
import { logInstanceCompletion, DEFAULT_PATIENT_ID } from '../storage/carePlanRepo';
import { LogScreen } from '../components/logging/LogScreen';

const COMMON_SYMPTOMS = [
  'Pain', 'Nausea', 'Dizziness', 'Fatigue',
  'Headache', 'Shortness of Breath', 'Fever', 'Other',
];

export default function LogSymptomScreen() {
  const params = useLocalSearchParams();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [selectedSymptom, setSelectedSymptom] = useState('');
  const [customSymptom, setCustomSymptom] = useState('');
  const [severity, setSeverity] = useState(5);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSymptomSelect = useCallback((symptom: string) => {
    if (symptom === 'Pain') {
      const instanceId = params.instanceId as string | undefined;
      navigate(instanceId ? `/log-pain?instanceId=${instanceId}` : '/log-pain');
      return;
    }
    setSelectedSymptom(symptom);
  }, [params.instanceId]);

  const symptomToLog = selectedSymptom === 'Other' ? customSymptom : selectedSymptom;
  const canSave = symptomToLog.trim().length > 0 && !saving;

  const handleSave = useCallback(async () => {
    if (!canSave) {
      if (!symptomToLog.trim()) {
        Alert.alert('Required', 'Please select or enter a symptom');
      }
      return;
    }
    setSaving(true);
    try {
      const now = new Date();
      await saveSymptom({
        symptom: symptomToLog.trim(),
        severity,
        description: description.trim(),
        timestamp: now.toISOString(),
        date: getTodayDateString(),
      });
      emitDataUpdate(EVENT.SYMPTOMS);

      const instanceId = params.instanceId as string | undefined;
      if (instanceId) {
        try {
          await logInstanceCompletion(
            DEFAULT_PATIENT_ID,
            getTodayDateString(),
            instanceId,
            'completed',
            { type: 'custom', symptom: { name: symptomToLog.trim(), severity } } as any,
            { source: 'record' },
          );
          emitDataUpdate(EVENT.DAILY_INSTANCES);
        } catch (err) {
          logError('LogSymptomScreen.completeInstance', err);
        }
      }

      await hapticSuccess();
      navigateBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to log symptom. Please try again.');
      logError('LogSymptomScreen.handleSave', error);
      setSaving(false);
    }
  }, [canSave, symptomToLog, severity, description, params.instanceId]);

  return (
    <LogScreen
      title="Symptom"
      onBack={navigateBack}
      primaryAction={{
        label: saving ? 'Saving…' : 'Save symptom',
        onPress: handleSave,
        disabled: !canSave,
      }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <Text testID="log-symptom-disclaimer" style={styles.disclaimer}>
          For caregiver record-keeping. Not medical advice.
        </Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>What symptom?</Text>
          <View style={styles.chipGrid}>
            {COMMON_SYMPTOMS.map((symptom) => {
              const selected = selectedSymptom === symptom;
              return (
                <Pressable
                  key={symptom}
                  testID={`log-symptom-chip-${symptom.replace(/\s+/g, '-')}`}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => handleSymptomSelect(symptom)}
                  accessibilityRole="radio"
                  accessibilityLabel={`${symptom} symptom`}
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {symptom}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {selectedSymptom === 'Other' && (
          <View style={styles.formGroup}>
            <Text style={styles.label}>Specify symptom</Text>
            <TextInput
              testID="log-symptom-custom"
              style={styles.input}
              value={customSymptom}
              onChangeText={setCustomSymptom}
              placeholder="Enter symptom name"
              placeholderTextColor={colors.textMuted}
              accessibilityLabel="Custom symptom name"
            />
          </View>
        )}

        <View style={styles.formGroup}>
          <View style={styles.severityHeader}>
            <Text style={styles.label}>Severity</Text>
            <Text style={styles.severityValue}>{severity}/10</Text>
          </View>
          <View style={styles.severityScale}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
              const selected = severity === num;
              return (
                <Pressable
                  key={num}
                  testID={`log-symptom-severity-${num}`}
                  style={[styles.severityButton, selected && styles.severityButtonSelected]}
                  onPress={() => setSeverity(num)}
                  accessibilityRole="radio"
                  accessibilityLabel={`Severity ${num} out of 10`}
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.severityButtonText, selected && styles.severityButtonTextSelected]}>
                    {num}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            testID="log-symptom-notes"
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="When did it start? What makes it better/worse?"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            accessibilityLabel="Symptom notes"
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
  formGroup: { gap: 8, marginBottom: 20 },
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
    paddingVertical: 12,
    fontSize: 15,
    color: c.textPrimary,
  },
  textArea: { minHeight: 80, paddingTop: 12 },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: c.surfaceElevated,
    borderWidth: 0.5,
    borderColor: c.glassBorder,
    borderRadius: 20,
    paddingHorizontal: 14, // allow: tap-target padding (Apple HIG ≥44pt)
    paddingVertical: 10,
    minHeight: 40,
  },
  chipSelected: {
    backgroundColor: c.accentLight,
    borderColor: c.accentBorder,
  },
  chipText: {
    fontSize: 14,
    color: c.textPrimary,
  },
  chipTextSelected: {
    // selectionListContrast a11y contract — keep label color stable.
    fontWeight: '600',
  },
  severityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  severityValue: {
    fontSize: 14,
    fontWeight: '600',
    color: c.textSecondary,
  },
  severityScale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  severityButton: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: c.surfaceElevated,
    borderWidth: 0.5,
    borderColor: c.glassBorder,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  severityButtonSelected: {
    backgroundColor: c.accentLight,
    borderColor: c.accentBorder,
  },
  severityButtonText: {
    fontSize: 13,
    color: c.textSecondary,
  },
  severityButtonTextSelected: {
    color: c.textPrimary,
    fontWeight: '600',
  },
});
