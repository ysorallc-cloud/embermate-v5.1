// ============================================================================
// LOG PAIN — Phase 9.5 multi-step exception wrap.
//
// LogScreen exception: multi-step companion to log-symptom. Reached
// from log-symptom.tsx when the caregiver picks "Pain" from the
// symptom list, plus a fragile case-insensitive itemName-includes
// match in app/(tabs)/now.tsx (~line 506) — that match is tracked
// as a post-Phase-9 follow-up ("Investigate now.tsx pain-name-match
// route"). Classified as a multi-step exception in the Phase 9.0
// reachability audit.
//
// Phase 9.5 wraps the existing body in <LogScreen>; the NRS 0–10
// scale + body location chips + character chips + notes textarea
// preserve their current shape. The clinical traffic-light severity
// gradient (Colors.green→amber→orange→red→rose) stays — those are
// semantic clinical signals, not decorative palette violations.
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
import { navigateBack } from '../lib/navigate';
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

const BODY_LOCATIONS = [
  'Head', 'Neck', 'Chest', 'Abdomen', 'Back',
  'Hip', 'Shoulder', 'Arm', 'Leg', 'Incision Site',
];

const PAIN_CHARACTERS = [
  'Aching', 'Sharp', 'Burning', 'Throbbing',
  'Stabbing', 'Cramping', 'Tingling', 'Dull',
];

function getSeverityColor(value: number): string {
  if (value <= 2) return Colors.green;
  if (value <= 4) return Colors.amber;
  if (value <= 6) return Colors.orange;
  if (value <= 8) return Colors.red;
  return Colors.rose;
}

function getSeverityLabel(value: number): string {
  if (value === 0) return 'No Pain';
  if (value <= 2) return 'Mild';
  if (value <= 4) return 'Moderate';
  if (value <= 6) return 'Severe';
  if (value <= 8) return 'Very Severe';
  return 'Worst Possible';
}

export default function LogPainScreen() {
  const params = useLocalSearchParams();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [severity, setSeverity] = useState<number | null>(null);
  const [bodyLocation, setBodyLocation] = useState<string | null>(null);
  const [character, setCharacter] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const canSave = severity !== null && !saving;

  const handleSave = useCallback(async () => {
    if (!canSave || severity === null) return;
    setSaving(true);
    try {
      const now = new Date();
      await saveSymptom({
        symptom: 'Pain',
        severity,
        description: notes.trim() || undefined,
        bodyLocation: bodyLocation || undefined,
        character: character || undefined,
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
            {
              type: 'custom',
              pain: {
                severity,
                bodyLocation: bodyLocation || undefined,
                character: character || undefined,
              },
            } as any,
            { source: 'record' },
          );
          emitDataUpdate(EVENT.DAILY_INSTANCES);
        } catch (err) {
          logError('LogPainScreen.completeInstance', err);
        }
      }

      await hapticSuccess();
      navigateBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to log pain. Please try again.');
      logError('LogPainScreen.handleSave', error);
      setSaving(false);
    }
  }, [canSave, severity, bodyLocation, character, notes, params.instanceId]);

  return (
    <LogScreen
      title="Pain"
      onBack={navigateBack}
      primaryAction={{
        label: saving ? 'Saving…' : 'Save pain',
        onPress: handleSave,
        disabled: !canSave,
      }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <Text testID="log-pain-disclaimer" style={styles.disclaimer}>
          For caregiver record-keeping. Not medical advice.
        </Text>

        <View style={styles.formGroup}>
          <View style={styles.severityHeader}>
            <Text style={styles.label}>Pain intensity</Text>
            {severity !== null && (
              <Text style={[styles.severityValue, { color: getSeverityColor(severity) }]}>
                {severity}/10 — {getSeverityLabel(severity)}
              </Text>
            )}
          </View>
          <View style={styles.severityScale}>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
              const color = getSeverityColor(num);
              const selected = severity === num;
              return (
                <Pressable
                  key={num}
                  testID={`log-pain-severity-${num}`}
                  style={[
                    styles.severityButton,
                    selected && { backgroundColor: color, borderColor: color },
                  ]}
                  onPress={() => setSeverity(num)}
                  accessibilityRole="radio"
                  accessibilityLabel={`Pain level ${num} out of 10, ${getSeverityLabel(num)}`}
                  accessibilityState={{ selected }}
                >
                  <Text
                    style={[styles.severityButtonText, selected && styles.severityButtonTextSelected]}
                  >
                    {num}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.scaleLabels}>
            <Text style={styles.scaleLabel}>No pain</Text>
            <Text style={styles.scaleLabel}>Worst</Text>
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Location (optional)</Text>
          <View style={styles.chipGrid}>
            {BODY_LOCATIONS.map((location) => {
              const selected = bodyLocation === location;
              return (
                <Pressable
                  key={location}
                  testID={`log-pain-location-${location.replace(/\s+/g, '-')}`}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => setBodyLocation(selected ? null : location)}
                  accessibilityRole="radio"
                  accessibilityLabel={`Body location: ${location}`}
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {location}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Character (optional)</Text>
          <View style={styles.chipGrid}>
            {PAIN_CHARACTERS.map((ch) => {
              const selected = character === ch;
              return (
                <Pressable
                  key={ch}
                  testID={`log-pain-character-${ch}`}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => setCharacter(selected ? null : ch)}
                  accessibilityRole="radio"
                  accessibilityLabel={`Pain character: ${ch}`}
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {ch}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            testID="log-pain-notes"
            style={[styles.input, styles.textArea]}
            value={notes}
            onChangeText={setNotes}
            placeholder="When did it start? What makes it better/worse?"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            accessibilityLabel="Pain notes"
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
  severityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  severityValue: {
    fontSize: 13,
    fontWeight: '600',
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
  severityButtonText: {
    fontSize: 12,
    color: c.textSecondary,
  },
  severityButtonTextSelected: {
    color: c.textPrimary,
    fontWeight: '600',
  },
  scaleLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  scaleLabel: {
    fontSize: 11,
    color: c.textTertiary,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14, // allow: tap-target padding (Apple HIG ≥44pt)
    paddingVertical: 10,
    backgroundColor: c.surfaceElevated,
    borderWidth: 0.5,
    borderColor: c.glassBorder,
    borderRadius: 20,
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
});
