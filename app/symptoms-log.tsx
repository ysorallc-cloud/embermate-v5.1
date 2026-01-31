// ============================================================================
// SYMPTOMS LOG SCREEN
// Quick symptom logging with chips and severity (Step 2: Confirm)
// Standardized symptoms with 0-10 scale and optional context
// ============================================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius } from '../theme/theme-tokens';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hapticSuccess } from '../utils/hapticFeedback';

interface SymptomLog {
  id: string;
  timestamp: string;
  symptoms: {
    name: string;
    severity: number;
  }[];
  notes?: string;
}

const SYMPTOMS_KEY = '@EmberMate:symptoms';

const COMMON_SYMPTOMS = [
  'Pain',
  'Fatigue',
  'Dizziness',
  'Nausea',
  'Anxiety',
  'Shortness of Breath',
  'Headache',
  'Confusion',
  'Chest Tightness',
  'Weakness',
  'Numbness',
  'Tingling',
];

export default function SymptomsLogScreen() {
  const router = useRouter();

  const [selectedSymptoms, setSelectedSymptoms] = useState<Map<string, number>>(new Map());
  const [notes, setNotes] = useState('');

  const toggleSymptom = (symptom: string) => {
    const newMap = new Map(selectedSymptoms);
    if (newMap.has(symptom)) {
      newMap.delete(symptom);
    } else {
      newMap.set(symptom, 5); // Default severity: 5/10
    }
    setSelectedSymptoms(newMap);
  };

  const updateSeverity = (symptom: string, severity: number) => {
    const newMap = new Map(selectedSymptoms);
    newMap.set(symptom, severity);
    setSelectedSymptoms(newMap);
  };

  const handleSave = async () => {
    if (selectedSymptoms.size === 0) {
      Alert.alert('No Symptoms', 'Please select at least one symptom');
      return;
    }

    try {
      const symptomLog: SymptomLog = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        symptoms: Array.from(selectedSymptoms.entries()).map(([name, severity]) => ({
          name,
          severity,
        })),
        notes: notes.trim() || undefined,
      };

      // Save to storage
      const existingData = await AsyncStorage.getItem(SYMPTOMS_KEY);
      const symptoms: SymptomLog[] = existingData ? JSON.parse(existingData) : [];
      symptoms.unshift(symptomLog);
      
      // Keep last 200 entries
      const trimmedSymptoms = symptoms.slice(0, 200);
      await AsyncStorage.setItem(SYMPTOMS_KEY, JSON.stringify(trimmedSymptoms));

      await hapticSuccess();
      
      Alert.alert(
        'Symptoms Logged',
        'Symptoms have been recorded',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error saving symptoms:', error);
      Alert.alert('Error', 'Failed to save symptoms');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerLabel}>LOG SYMPTOMS</Text>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Log Symptoms</Text>
          <Text style={styles.subtitle}>Select symptoms and rate severity (0-10)</Text>

          {/* Symptom Chips */}
          <View style={styles.chipsContainer}>
            {COMMON_SYMPTOMS.map(symptom => {
              const isSelected = selectedSymptoms.has(symptom);
              return (
                <TouchableOpacity
                  key={symptom}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  onPress={() => toggleSymptom(symptom)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                    {symptom}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Severity Sliders */}
          {selectedSymptoms.size > 0 && (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionTitle}>Rate Severity</Text>

              {Array.from(selectedSymptoms.entries()).map(([symptom, severity]) => (
                <View key={symptom} style={styles.severityCard}>
                  <View style={styles.severityHeader}>
                    <Text style={styles.symptomName}>{symptom}</Text>
                    <Text style={styles.severityValue}>{severity}/10</Text>
                  </View>
                  
                  {/* Severity Buttons */}
                  <View style={styles.severityButtons}>
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(value => (
                      <TouchableOpacity
                        key={value}
                        style={[
                          styles.severityButton,
                          severity === value && styles.severityButtonSelected,
                          value >= 7 && severity === value && styles.severityButtonHigh,
                        ]}
                        onPress={() => updateSeverity(symptom, value)}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.severityButtonText,
                          severity === value && styles.severityButtonTextSelected
                        ]}>
                          {value}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={styles.severityLabels}>
                    <Text style={styles.severityLabelText}>None</Text>
                    <Text style={styles.severityLabelText}>Severe</Text>
                  </View>
                </View>
              ))}
            </>
          )}

          {/* Notes */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Context (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="When did it start? What triggered it?"
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Platform.OS === 'android' ? 20 : 0,
    paddingBottom: Spacing.md,
  },
    backButton: {
    width: 44,
    height: 44,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: Colors.textPrimary,
  },
  headerLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 1,
    fontWeight: '600',
  },
  saveButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  saveButtonText: {
    fontSize: 16,
    color: Colors.accent,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '300',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
  },

  // Symptom Chips
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  chip: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  chipSelected: {
    backgroundColor: Colors.accentLight,
    borderColor: Colors.accent,
  },
  chipText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: Colors.accent,
    fontWeight: '600',
  },

  // Sections
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.xl,
    opacity: 0.3,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },

  // Severity Rating
  severityCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  severityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  symptomName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  severityValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.accent,
  },
  severityButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  severityButton: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  severityButtonSelected: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  severityButtonHigh: {
    backgroundColor: Colors.error,
    borderColor: Colors.error,
  },
  severityButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  severityButtonTextSelected: {
    color: '#FFF',
  },
  severityLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  severityLabelText: {
    fontSize: 11,
    color: Colors.textMuted,
  },

  // Form
  formGroup: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
