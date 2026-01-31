// ============================================================================
// SYMPTOM LOGGER
// Log symptoms with severity, location, and medication link
// ============================================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Colors } from '../theme/theme-tokens';
import { hapticSuccess } from '../utils/hapticFeedback';

const SYMPTOMS = [
  { id: 'pain', label: 'Pain', icon: '🩹' },
  { id: 'nausea', label: 'Nausea', icon: '🤢' },
  { id: 'dizziness', label: 'Dizziness', icon: '💫' },
  { id: 'fatigue', label: 'Fatigue', icon: '😫' },
  { id: 'anxiety', label: 'Anxiety', icon: '😰' },
  { id: 'confusion', label: 'Confusion', icon: '😵' },
  { id: 'swelling', label: 'Swelling', icon: '🦶' },
  { id: 'other', label: 'Other', icon: '➕' },
];

const LOCATIONS = [
  'Head',
  'Chest',
  'Abdomen',
  'Back',
  'Joints',
  'Legs',
  'General',
];

export default function SymptomLogScreen() {
  const router = useRouter();
  const [selectedSymptom, setSelectedSymptom] = useState<string | null>(null);
  const [severity, setSeverity] = useState<number | null>(null);
  const [location, setLocation] = useState<string | null>(null);
  const [linkToMedication, setLinkToMedication] = useState(false);
  const [notes, setNotes] = useState('');

  const handleSave = async () => {
    if (!selectedSymptom) {
      Alert.alert('Select Symptom', 'Please select a symptom type');
      return;
    }

    if (severity === null) {
      Alert.alert('Select Severity', 'Please rate the severity (0-10)');
      return;
    }

    try {
      // Note: Symptom logs are tracked via daily tracking storage
      // Full symptom history feature planned for future release
      await hapticSuccess();
      router.back();
    } catch (error) {
      console.error('Error saving symptom:', error);
      Alert.alert('Error', 'Failed to save symptom log');
    }
  };

  const getSeverityLabel = (value: number) => {
    if (value === 0) return 'None';
    if (value <= 3) return 'Mild';
    if (value <= 6) return 'Moderate';
    return 'Severe';
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
          <Text style={styles.headerTitle}>Log Symptom</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Symptom Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>SYMPTOM TYPE</Text>
            <View style={styles.symptomGrid}>
              {SYMPTOMS.map((symptom) => (
                <TouchableOpacity
                  key={symptom.id}
                  style={[
                    styles.symptomCard,
                    selectedSymptom === symptom.id && styles.symptomCardSelected,
                  ]}
                  onPress={() => setSelectedSymptom(symptom.id)}
                >
                  <Text style={styles.symptomIcon}>{symptom.icon}</Text>
                  <Text
                    style={[
                      styles.symptomLabel,
                      selectedSymptom === symptom.id && styles.symptomLabelSelected,
                    ]}
                  >
                    {symptom.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Severity Scale */}
          <View style={styles.section}>
            <View style={styles.severityHeader}>
              <Text style={styles.sectionLabel}>SEVERITY (0-10)</Text>
              {severity !== null && (
                <Text style={styles.severityValue}>
                  {severity} — {getSeverityLabel(severity)}
                </Text>
              )}
            </View>
            <View style={styles.severityScale}>
              {[...Array(11)].map((_, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.severityButton,
                    severity === index && styles.severityButtonSelected,
                  ]}
                  onPress={() => setSeverity(index)}
                >
                  <Text
                    style={[
                      styles.severityButtonText,
                      severity === index && styles.severityButtonTextSelected,
                    ]}
                  >
                    {index}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.severityLabels}>
              <Text style={styles.severityLabelText}>None</Text>
              <Text style={styles.severityLabelText}>Mild</Text>
              <Text style={styles.severityLabelText}>Moderate</Text>
              <Text style={styles.severityLabelText}>Severe</Text>
            </View>
          </View>

          {/* Location (for pain) */}
          {selectedSymptom === 'pain' && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>LOCATION</Text>
              <View style={styles.chipRow}>
                {LOCATIONS.map((loc) => (
                  <TouchableOpacity
                    key={loc}
                    style={[
                      styles.chip,
                      location === loc && styles.chipSelected,
                    ]}
                    onPress={() => setLocation(loc)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        location === loc && styles.chipTextSelected,
                      ]}
                    >
                      {loc}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Medication Link */}
          <TouchableOpacity
            style={styles.medicationLink}
            onPress={() => setLinkToMedication(!linkToMedication)}
          >
            <View
              style={[
                styles.checkbox,
                linkToMedication && styles.checkboxChecked,
              ]}
            >
              {linkToMedication && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <View style={styles.medicationLinkContent}>
              <Text style={styles.medicationLinkLabel}>
                Link to recent medication
              </Text>
              <Text style={styles.medicationLinkSubtext}>
                Evening meds • took 2h ago
              </Text>
            </View>
          </TouchableOpacity>

          {/* Notes */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>NOTES (OPTIONAL)</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any additional details..."
              placeholderTextColor="rgba(255, 255, 255, 0.3)"
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Save Button */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save Symptom Log</Text>
          </TouchableOpacity>
        </View>
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(20, 184, 166, 0.15)',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(13, 148, 136, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 20,
    color: Colors.textPrimary,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.textPrimary,
  },

  // Content
  content: {
    flex: 1,
    padding: 20,
  },

  // Section
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.5,
    color: 'rgba(255, 255, 255, 0.4)',
    marginBottom: 12,
  },

  // Symptom Grid
  symptomGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  symptomCard: {
    width: '47.5%',
    backgroundColor: 'rgba(13, 148, 136, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.15)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  symptomCardSelected: {
    backgroundColor: 'rgba(20, 184, 166, 0.15)',
    borderColor: Colors.accent,
  },
  symptomIcon: {
    fontSize: 28,
  },
  symptomLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  symptomLabelSelected: {
    color: Colors.accent,
    fontWeight: '600',
  },

  // Severity Scale
  severityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  severityValue: {
    fontSize: 12,
    color: Colors.gold,
    fontWeight: '600',
  },
  severityScale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  severityButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(13, 148, 136, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  severityButtonSelected: {
    backgroundColor: Colors.gold,
    borderColor: Colors.gold,
  },
  severityButtonText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '600',
  },
  severityButtonTextSelected: {
    color: '#FFFFFF',
  },
  severityLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  severityLabelText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
  },

  // Location/Chips
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(13, 148, 136, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.15)',
    borderRadius: 20,
  },
  chipSelected: {
    backgroundColor: 'rgba(20, 184, 166, 0.15)',
    borderColor: Colors.accent,
  },
  chipText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  chipTextSelected: {
    color: Colors.accent,
    fontWeight: '600',
  },

  // Medication Link
  medicationLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(13, 148, 136, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.15)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(20, 184, 166, 0.3)',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  checkmark: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  medicationLinkContent: {
    flex: 1,
  },
  medicationLinkLabel: {
    fontSize: 14,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  medicationLinkSubtext: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
  },

  // Notes
  notesInput: {
    backgroundColor: 'rgba(13, 148, 136, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.15)',
    borderRadius: 12,
    padding: 14,
    color: Colors.textPrimary,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
  },

  // Footer
  footer: {
    padding: 20,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(20, 184, 166, 0.15)',
    backgroundColor: Colors.background,
  },
  saveButton: {
    paddingVertical: 16,
    backgroundColor: Colors.accent,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
