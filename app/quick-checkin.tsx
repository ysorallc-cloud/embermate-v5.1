// ============================================================================
// QUICK CHECK-IN FLOW - Batch entry for daily routine
// Reduces 10 navigation steps to 1 flow
// ============================================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius } from './_theme/theme-tokens';
import { GlassCard } from '../components/aurora/GlassCard';
import { getMedications, Medication, markMedicationTaken } from '../utils/medicationStorage';
import { saveVital } from '../utils/vitalsStorage';
import { saveDailyTracking } from '../utils/dailyTrackingStorage';
import { saveNote } from '../utils/noteStorage';

const STEPS = ['Vitals', 'Medications', 'Feelings', 'Notes'];

interface CheckinData {
  // Vitals
  systolic: string;
  diastolic: string;
  heartRate: string;
  temperature: string;
  // Feelings
  mood: number;
  energy: number;
  pain: number;
  // Notes
  notes: string;
  // Meds
  selectedMeds: string[];
}

export default function QuickCheckinScreen() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [checkinData, setCheckinData] = useState<CheckinData>({
    systolic: '',
    diastolic: '',
    heartRate: '',
    temperature: '',
    mood: 7,
    energy: 3,
    pain: 2,
    notes: '',
    selectedMeds: [],
  });

  useFocusEffect(
    useCallback(() => {
      loadMedications();
    }, [])
  );

  const loadMedications = async () => {
    try {
      const meds = await getMedications();
      const activeMeds = meds.filter(m => m.active && !m.taken);
      setMedications(activeMeds);
      // Pre-select all due medications
      setCheckinData(prev => ({
        ...prev,
        selectedMeds: activeMeds.map(m => m.id),
      }));
    } catch (error) {
      console.error('Error loading medications:', error);
    }
  };

  const toggleMedication = (medId: string) => {
    setCheckinData(prev => ({
      ...prev,
      selectedMeds: prev.selectedMeds.includes(medId)
        ? prev.selectedMeds.filter(id => id !== medId)
        : [...prev.selectedMeds, medId],
    }));
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSaveAll();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      router.back();
    }
  };

  const handleSaveAll = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Save vitals if entered
      if (checkinData.systolic && checkinData.diastolic) {
        await saveVital({
          type: 'systolic',
          value: parseInt(checkinData.systolic),
          timestamp: new Date().toISOString(),
          unit: 'mmHg',
        });
        await saveVital({
          type: 'diastolic',
          value: parseInt(checkinData.diastolic),
          timestamp: new Date().toISOString(),
          unit: 'mmHg',
        });
      }

      if (checkinData.heartRate) {
        await saveVital({
          type: 'heartRate',
          value: parseInt(checkinData.heartRate),
          timestamp: new Date().toISOString(),
          unit: 'bpm',
        });
      }

      if (checkinData.temperature) {
        await saveVital({
          type: 'temperature',
          value: parseFloat(checkinData.temperature),
          timestamp: new Date().toISOString(),
          unit: '°F',
        });
      }

      // Mark selected medications as taken
      for (const medId of checkinData.selectedMeds) {
        await markMedicationTaken(medId, true);
      }

      // Save daily tracking (mood, energy, pain)
      await saveDailyTracking(today, {
        mood: checkinData.mood,
        energy: checkinData.energy,
        pain: checkinData.pain,
      });

      // Save notes if entered
      if (checkinData.notes.trim()) {
        await saveNote({
          date: today,
          timestamp: new Date().toISOString(),
          content: `[Quick Check-In] ${checkinData.notes}`,
        });
      }

      Alert.alert(
        'Check-in Complete',
        'All data has been saved successfully.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error saving check-in data:', error);
      Alert.alert('Error', 'Failed to save check-in data. Please try again.');
    }
  };

  const getMoodLabel = (value: number) => {
    if (value >= 8) return 'Great';
    if (value >= 6) return 'Good';
    if (value >= 4) return 'Okay';
    if (value >= 2) return 'Low';
    return 'Struggling';
  };

  const getEnergyLabel = (value: number) => {
    if (value >= 4) return 'Energetic';
    if (value >= 3) return 'Moderate';
    if (value >= 2) return 'Low';
    return 'Exhausted';
  };

  const getPainLabel = (value: number) => {
    if (value === 0) return 'None';
    if (value <= 2) return 'Minimal';
    if (value <= 4) return 'Mild';
    if (value <= 6) return 'Moderate';
    if (value <= 8) return 'Severe';
    return 'Extreme';
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>📊 Vitals</Text>
            <Text style={styles.stepSubtitle}>Quick vitals check (all optional)</Text>

            <GlassCard style={styles.formCard}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Blood Pressure</Text>
                <View style={styles.bpInputRow}>
                  <TextInput
                    style={styles.bpInput}
                    placeholder="120"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="numeric"
                    value={checkinData.systolic}
                    onChangeText={(text) => setCheckinData(prev => ({ ...prev, systolic: text }))}
                  />
                  <Text style={styles.bpSlash}>/</Text>
                  <TextInput
                    style={styles.bpInput}
                    placeholder="80"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="numeric"
                    value={checkinData.diastolic}
                    onChangeText={(text) => setCheckinData(prev => ({ ...prev, diastolic: text }))}
                  />
                  <Text style={styles.bpUnit}>mmHg</Text>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Heart Rate</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.input}
                    placeholder="72"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="numeric"
                    value={checkinData.heartRate}
                    onChangeText={(text) => setCheckinData(prev => ({ ...prev, heartRate: text }))}
                  />
                  <Text style={styles.inputUnit}>bpm</Text>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Temperature (optional)</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.input}
                    placeholder="98.6"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="decimal-pad"
                    value={checkinData.temperature}
                    onChangeText={(text) => setCheckinData(prev => ({ ...prev, temperature: text }))}
                  />
                  <Text style={styles.inputUnit}>°F</Text>
                </View>
              </View>
            </GlassCard>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>💊 Medications</Text>
            <Text style={styles.stepSubtitle}>
              {medications.length > 0
                ? `${checkinData.selectedMeds.length} of ${medications.length} selected`
                : 'No medications due right now'}
            </Text>

            {medications.length > 0 && (
              <TouchableOpacity
                style={styles.selectAllButton}
                onPress={() => {
                  const allSelected = checkinData.selectedMeds.length === medications.length;
                  setCheckinData(prev => ({
                    ...prev,
                    selectedMeds: allSelected ? [] : medications.map(m => m.id),
                  }));
                }}
              >
                <Text style={styles.selectAllText}>
                  {checkinData.selectedMeds.length === medications.length
                    ? 'Deselect All'
                    : 'Select All'}
                </Text>
              </TouchableOpacity>
            )}

            <GlassCard style={styles.formCard}>
              {medications.length === 0 ? (
                <View style={styles.emptyMeds}>
                  <Text style={styles.emptyMedsIcon}>✓</Text>
                  <Text style={styles.emptyMedsText}>All medications taken!</Text>
                </View>
              ) : (
                medications.map((med) => (
                  <TouchableOpacity
                    key={med.id}
                    style={styles.medItem}
                    onPress={() => toggleMedication(med.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.checkbox,
                      checkinData.selectedMeds.includes(med.id) && styles.checkboxChecked
                    ]}>
                      {checkinData.selectedMeds.includes(med.id) && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </View>
                    <View style={styles.medInfo}>
                      <Text style={styles.medName}>{med.name}</Text>
                      <Text style={styles.medDosage}>{med.dosage} • {med.time}</Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </GlassCard>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>😊 How are you feeling?</Text>
            <Text style={styles.stepSubtitle}>Rate your current state</Text>

            <GlassCard style={styles.formCard}>
              <View style={styles.sliderGroup}>
                <View style={styles.sliderHeader}>
                  <Text style={styles.sliderLabel}>Mood</Text>
                  <Text style={styles.sliderValue}>
                    {checkinData.mood} - {getMoodLabel(checkinData.mood)}
                  </Text>
                </View>
                <View style={styles.sliderContainer}>
                  <Text style={styles.sliderMin}>😞</Text>
                  <View style={styles.sliderTrack}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => (
                      <TouchableOpacity
                        key={val}
                        style={[
                          styles.sliderDot,
                          val <= checkinData.mood && styles.sliderDotActive
                        ]}
                        onPress={() => setCheckinData(prev => ({ ...prev, mood: val }))}
                      />
                    ))}
                  </View>
                  <Text style={styles.sliderMax}>😊</Text>
                </View>
              </View>

              <View style={styles.sliderGroup}>
                <View style={styles.sliderHeader}>
                  <Text style={styles.sliderLabel}>Energy Level</Text>
                  <Text style={styles.sliderValue}>
                    {checkinData.energy} - {getEnergyLabel(checkinData.energy)}
                  </Text>
                </View>
                <View style={styles.sliderContainer}>
                  <Text style={styles.sliderMin}>🔋</Text>
                  <View style={styles.sliderTrack}>
                    {[1, 2, 3, 4, 5].map((val) => (
                      <TouchableOpacity
                        key={val}
                        style={[
                          styles.sliderDot,
                          styles.sliderDotLarge,
                          val <= checkinData.energy && styles.sliderDotActive
                        ]}
                        onPress={() => setCheckinData(prev => ({ ...prev, energy: val }))}
                      />
                    ))}
                  </View>
                  <Text style={styles.sliderMax}>⚡</Text>
                </View>
              </View>

              <View style={styles.sliderGroup}>
                <View style={styles.sliderHeader}>
                  <Text style={styles.sliderLabel}>Pain Level</Text>
                  <Text style={styles.sliderValue}>
                    {checkinData.pain} - {getPainLabel(checkinData.pain)}
                  </Text>
                </View>
                <View style={styles.sliderContainer}>
                  <Text style={styles.sliderMin}>0</Text>
                  <View style={styles.sliderTrack}>
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => (
                      <TouchableOpacity
                        key={val}
                        style={[
                          styles.sliderDot,
                          val <= checkinData.pain && styles.sliderDotPain
                        ]}
                        onPress={() => setCheckinData(prev => ({ ...prev, pain: val }))}
                      />
                    ))}
                  </View>
                  <Text style={styles.sliderMax}>10</Text>
                </View>
              </View>
            </GlassCard>
          </View>
        );

      case 4:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>📝 Anything else?</Text>
            <Text style={styles.stepSubtitle}>Optional notes about how you're feeling</Text>

            <GlassCard style={styles.formCard}>
              <TextInput
                style={styles.notesInput}
                placeholder="Optional notes about symptoms, concerns, or anything else..."
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                value={checkinData.notes}
                onChangeText={(text) => setCheckinData(prev => ({ ...prev, notes: text }))}
              />
            </GlassCard>

            {/* Summary */}
            <GlassCard style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>✓ Ready to Save</Text>
              <View style={styles.summaryItems}>
                {(checkinData.systolic && checkinData.diastolic) && (
                  <Text style={styles.summaryItem}>
                    • Vitals: BP {checkinData.systolic}/{checkinData.diastolic}
                    {checkinData.heartRate && `, HR ${checkinData.heartRate} bpm`}
                  </Text>
                )}
                <Text style={styles.summaryItem}>
                  • Medications: {checkinData.selectedMeds.length} of {medications.length} marked
                </Text>
                <Text style={styles.summaryItem}>
                  • Mood: {checkinData.mood}/10 ({getMoodLabel(checkinData.mood)})
                </Text>
                <Text style={styles.summaryItem}>
                  • Energy: {checkinData.energy}/5 ({getEnergyLabel(checkinData.energy)})
                </Text>
                <Text style={styles.summaryItem}>
                  • Pain: {checkinData.pain}/10 ({getPainLabel(checkinData.pain)})
                </Text>
                {checkinData.notes.trim() && (
                  <Text style={styles.summaryItem}>• Note added</Text>
                )}
              </View>
            </GlassCard>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerLabel}>QUICK CHECK-IN</Text>
              <Text style={styles.headerTitle}>Morning Routine</Text>
            </View>
            <View style={styles.placeholder} />
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              {STEPS.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.progressSegment,
                    index + 1 <= currentStep && styles.progressSegmentActive
                  ]}
                />
              ))}
            </View>
            <Text style={styles.progressText}>Step {currentStep} of 4</Text>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {renderStepContent()}
          </ScrollView>

          {/* Navigation Buttons */}
          <View style={styles.navigation}>
            {currentStep > 1 && (
              <TouchableOpacity
                style={styles.backNavButton}
                onPress={handleBack}
                activeOpacity={0.7}
              >
                <Text style={styles.backNavText}>← Back</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.nextButton,
                currentStep === 4 && styles.saveButton
              ]}
              onPress={handleNext}
              activeOpacity={0.7}
            >
              <Text style={styles.nextButtonText}>
                {currentStep === 4 ? '✓ Save All' : 'Next →'}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
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
  headerCenter: {
    alignItems: 'center',
  },
  headerLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 1,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '300',
    color: Colors.textPrimary,
  },
  placeholder: {
    width: 44,
  },

  // Progress
  progressContainer: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  progressBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
  },
  progressSegmentActive: {
    backgroundColor: Colors.accent,
  },
  progressText: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'right',
  },

  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  stepContent: {},
  stepTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },

  // Form Card
  formCard: {
    marginBottom: Spacing.lg,
  },

  // Vitals inputs
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: 12,
    color: Colors.textPrimary,
    fontSize: 16,
  },
  inputUnit: {
    fontSize: 14,
    color: Colors.textMuted,
    width: 40,
  },
  bpInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bpInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: 12,
    color: Colors.textPrimary,
    fontSize: 16,
    textAlign: 'center',
  },
  bpSlash: {
    fontSize: 18,
    color: Colors.textMuted,
  },
  bpUnit: {
    fontSize: 14,
    color: Colors.textMuted,
    marginLeft: 4,
  },

  // Medications
  selectAllButton: {
    alignSelf: 'flex-end',
    marginBottom: 8,
  },
  selectAllText: {
    fontSize: 14,
    color: Colors.accent,
    fontWeight: '500',
  },
  medItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  medInfo: {
    flex: 1,
  },
  medName: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  medDosage: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  emptyMeds: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyMedsIcon: {
    fontSize: 32,
    color: Colors.success,
    marginBottom: 8,
  },
  emptyMedsText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },

  // Sliders
  sliderGroup: {
    marginBottom: Spacing.xl,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sliderLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  sliderValue: {
    fontSize: 14,
    color: Colors.accent,
    fontWeight: '600',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sliderMin: {
    fontSize: 16,
    width: 24,
    textAlign: 'center',
  },
  sliderMax: {
    fontSize: 16,
    width: 24,
    textAlign: 'center',
  },
  sliderTrack: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 32,
  },
  sliderDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  sliderDotLarge: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  sliderDotActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  sliderDotPain: {
    backgroundColor: Colors.error,
    borderColor: Colors.error,
  },

  // Notes
  notesInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: 12,
    color: Colors.textPrimary,
    fontSize: 14,
    minHeight: 120,
  },

  // Summary
  summaryCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.success,
    marginBottom: 12,
  },
  summaryItems: {},
  summaryItem: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 22,
  },

  // Navigation
  navigation: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  backNavButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  backNavText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  nextButton: {
    flex: 2,
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: Colors.success,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
