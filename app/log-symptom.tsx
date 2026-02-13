// ============================================================================
// LOG SYMPTOM - Functional symptom logging
// ============================================================================

import React, { useState } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Colors } from '../theme/theme-tokens';
import { saveSymptom } from '../utils/symptomStorage';
import { logError } from '../utils/devLog';

const COMMON_SYMPTOMS = [
  'Pain', 'Nausea', 'Dizziness', 'Fatigue',
  'Headache', 'Shortness of Breath', 'Fever', 'Other',
];

export default function LogSymptomScreen() {
  const router = useRouter();
  const [selectedSymptom, setSelectedSymptom] = useState('');
  const [customSymptom, setCustomSymptom] = useState('');
  const [severity, setSeverity] = useState(5);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const symptomToLog = selectedSymptom === 'Other' ? customSymptom : selectedSymptom;

    if (!symptomToLog.trim()) {
      Alert.alert('Required', 'Please select or enter a symptom');
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
        date: now.toISOString().split('T')[0],
      });

      Alert.alert(
        'Success',
        'Symptom logged successfully',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to log symptom. Please try again.');
      logError('LogSymptomScreen.handleSave', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.back()}
                accessibilityLabel="Go back"
                accessibilityRole="button"
              >
                <Text style={styles.backText}>← Back</Text>
              </TouchableOpacity>
              <Text style={styles.icon}>🩹</Text>
              <Text style={styles.title}>Log Symptom</Text>
              <Text style={styles.subtitle}>Track pain, discomfort, or health changes</Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              {/* Symptom Selection */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>What symptom? *</Text>
                <View style={styles.symptomGrid}>
                  {COMMON_SYMPTOMS.map((symptom) => (
                    <TouchableOpacity
                      key={symptom}
                      style={[
                        styles.symptomChip,
                        selectedSymptom === symptom && styles.symptomChipSelected,
                      ]}
                      onPress={() => setSelectedSymptom(symptom)}
                      accessibilityLabel={`${symptom} symptom`}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: selectedSymptom === symptom }}
                    >
                      <Text
                        style={[
                          styles.symptomChipText,
                          selectedSymptom === symptom && styles.symptomChipTextSelected,
                        ]}
                      >
                        {symptom}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Custom Symptom */}
              {selectedSymptom === 'Other' && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Specify symptom</Text>
                  <TextInput
                    style={styles.input}
                    value={customSymptom}
                    onChangeText={setCustomSymptom}
                    placeholder="Enter symptom name"
                    placeholderTextColor={Colors.textMuted}
                    accessibilityLabel="Custom symptom name"
                  />
                </View>
              )}

              {/* Severity */}
              <View style={styles.formGroup}>
                <View style={styles.severityHeader}>
                  <Text style={styles.label}>Severity</Text>
                  <Text style={styles.severityValue}>{severity}/10</Text>
                </View>
                <View style={styles.severityScale}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <TouchableOpacity
                      key={num}
                      style={[
                        styles.severityButton,
                        severity === num && styles.severityButtonSelected,
                      ]}
                      onPress={() => setSeverity(num)}
                      accessibilityLabel={`Severity ${num} out of 10`}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: severity === num }}
                    >
                      <Text
                        style={[
                          styles.severityButtonText,
                          severity === num && styles.severityButtonTextSelected,
                        ]}
                      >
                        {num}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Description */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Additional notes (optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="When did it start? What makes it better/worse?"
                  placeholderTextColor={Colors.textMuted}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  accessibilityLabel="Symptom notes"
                />
              </View>

              {/* Save Button */}
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={saving}
                accessibilityLabel={saving ? 'Saving symptom' : 'Log symptom'}
                accessibilityHint="Saves the symptom with severity rating"
                accessibilityRole="button"
                accessibilityState={{ disabled: saving }}
              >
                <Text style={styles.saveButtonText}>
                  {saving ? 'Saving...' : 'Log Symptom'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  gradient: { flex: 1 },
  scrollView: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 32 },
  backButton: { alignSelf: 'flex-start', marginBottom: 16 },
  backText: { fontSize: 14, color: Colors.accent, fontWeight: '500' },
  icon: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '300', color: Colors.textPrimary, marginBottom: 8 },
  subtitle: { fontSize: 13, color: Colors.textMuted, textAlign: 'center' },
  form: { gap: 24 },
  formGroup: { gap: 8 },
  label: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  textArea: { minHeight: 100, paddingTop: 14 },
  symptomGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  symptomChip: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  symptomChipSelected: {
    backgroundColor: Colors.accentLight,
    borderColor: Colors.accent,
  },
  symptomChipText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  symptomChipTextSelected: {
    color: Colors.accent,
    fontWeight: '500',
  },
  severityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  severityValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.accent,
  },
  severityScale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  severityButton: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  severityButtonSelected: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  severityButtonText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  severityButtonTextSelected: {
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: Colors.textPrimary, fontSize: 15, fontWeight: '600' },
});
