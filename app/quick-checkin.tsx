// ============================================================================
// QUICK CHECK-IN FLOW - Single page matching Progress card items
// Covers: Medications, Vitals, Mood, Meals
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
import { Colors, Spacing, BorderRadius } from '../theme/theme-tokens';
import { GlassCard } from '../components/aurora/GlassCard';
import { getMedications, Medication, markMedicationTaken } from '../utils/medicationStorage';
import { saveVital } from '../utils/vitalsStorage';
import { saveMoodLog, saveMealsLog } from '../utils/centralStorage';

interface CheckinData {
  // Medications
  selectedMeds: string[];
  // Vitals
  systolic: string;
  diastolic: string;
  heartRate: string;
  // Mood
  mood: number | null;
  // Meals
  meals: string[];
}

const MOOD_OPTIONS = [
  { value: 1, emoji: '😢', label: 'Struggling' },
  { value: 2, emoji: '😕', label: 'Difficult' },
  { value: 3, emoji: '😐', label: 'Managing' },
  { value: 4, emoji: '🙂', label: 'Good' },
  { value: 5, emoji: '😊', label: 'Great' },
];

const MEAL_OPTIONS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

export default function QuickCheckinScreen() {
  const router = useRouter();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [saving, setSaving] = useState(false);
  const [checkinData, setCheckinData] = useState<CheckinData>({
    selectedMeds: [],
    systolic: '',
    diastolic: '',
    heartRate: '',
    mood: null,
    meals: [],
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

  const toggleMeal = (meal: string) => {
    setCheckinData(prev => ({
      ...prev,
      meals: prev.meals.includes(meal)
        ? prev.meals.filter(m => m !== meal)
        : [...prev.meals, meal],
    }));
  };

  const handleSave = async () => {
    setSaving(true);
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

      // Mark selected medications as taken
      for (const medId of checkinData.selectedMeds) {
        await markMedicationTaken(medId, true);
      }

      // Save mood if selected
      if (checkinData.mood !== null) {
        await saveMoodLog({
          date: today,
          mood: checkinData.mood,
          timestamp: new Date().toISOString(),
        });
      }

      // Save meals if any selected
      if (checkinData.meals.length > 0) {
        await saveMealsLog({
          date: today,
          meals: checkinData.meals,
          timestamp: new Date().toISOString(),
        });
      }

      router.back();
    } catch (error) {
      console.error('Error saving check-in data:', error);
      Alert.alert('Error', 'Failed to save check-in data. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const hasAnyData = () => {
    return (
      checkinData.selectedMeds.length > 0 ||
      checkinData.systolic !== '' ||
      checkinData.diastolic !== '' ||
      checkinData.heartRate !== '' ||
      checkinData.mood !== null ||
      checkinData.meals.length > 0
    );
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
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Check-In</Text>
              <Text style={styles.headerSubtitle}>Log what you need</Text>
            </View>
            <View style={styles.placeholder} />
          </View>

          {/* Content */}
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Medications Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionIcon}>💊</Text>
                <Text style={styles.sectionTitle}>Medications</Text>
                {medications.length > 0 && (
                  <Text style={styles.sectionCount}>
                    {checkinData.selectedMeds.length}/{medications.length}
                  </Text>
                )}
              </View>
              <GlassCard style={styles.sectionCard}>
                {medications.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>✓</Text>
                    <Text style={styles.emptyText}>All medications taken</Text>
                  </View>
                ) : (
                  <>
                    {medications.map((med) => (
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
                          <Text style={styles.medDosage}>{med.dosage}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </>
                )}
              </GlassCard>
            </View>

            {/* Vitals Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionIcon}>📊</Text>
                <Text style={styles.sectionTitle}>Vitals</Text>
              </View>
              <GlassCard style={styles.sectionCard}>
                <View style={styles.vitalsRow}>
                  <View style={styles.vitalInput}>
                    <Text style={styles.vitalLabel}>BP</Text>
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
                    </View>
                  </View>
                  <View style={styles.vitalInput}>
                    <Text style={styles.vitalLabel}>Heart Rate</Text>
                    <View style={styles.hrInputRow}>
                      <TextInput
                        style={styles.hrInput}
                        placeholder="72"
                        placeholderTextColor={Colors.textMuted}
                        keyboardType="numeric"
                        value={checkinData.heartRate}
                        onChangeText={(text) => setCheckinData(prev => ({ ...prev, heartRate: text }))}
                      />
                      <Text style={styles.hrUnit}>bpm</Text>
                    </View>
                  </View>
                </View>
              </GlassCard>
            </View>

            {/* Mood Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionIcon}>😊</Text>
                <Text style={styles.sectionTitle}>Mood</Text>
              </View>
              <GlassCard style={styles.sectionCard}>
                <View style={styles.moodGrid}>
                  {MOOD_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.moodOption,
                        checkinData.mood === option.value && styles.moodOptionSelected
                      ]}
                      onPress={() => setCheckinData(prev => ({ ...prev, mood: option.value }))}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.moodEmoji}>{option.emoji}</Text>
                      <Text style={[
                        styles.moodLabel,
                        checkinData.mood === option.value && styles.moodLabelSelected
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </GlassCard>
            </View>

            {/* Meals Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionIcon}>🍽️</Text>
                <Text style={styles.sectionTitle}>Meals</Text>
                {checkinData.meals.length > 0 && (
                  <Text style={styles.sectionCount}>
                    {checkinData.meals.length}/{MEAL_OPTIONS.length}
                  </Text>
                )}
              </View>
              <GlassCard style={styles.sectionCard}>
                <View style={styles.mealsGrid}>
                  {MEAL_OPTIONS.map((meal) => (
                    <TouchableOpacity
                      key={meal}
                      style={[
                        styles.mealOption,
                        checkinData.meals.includes(meal) && styles.mealOptionSelected
                      ]}
                      onPress={() => toggleMeal(meal)}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.mealLabel,
                        checkinData.meals.includes(meal) && styles.mealLabelSelected
                      ]}>
                        {meal}
                      </Text>
                      {checkinData.meals.includes(meal) && (
                        <Text style={styles.mealCheck}>✓</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </GlassCard>
            </View>
          </ScrollView>

          {/* Save Button */}
          <View style={styles.navigation}>
            <TouchableOpacity
              style={[
                styles.saveButton,
                !hasAnyData() && styles.saveButtonDisabled
              ]}
              onPress={handleSave}
              activeOpacity={0.7}
              disabled={saving || !hasAnyData()}
            >
              <Text style={styles.saveButtonText}>
                {saving ? 'Saving...' : '✓ Save Check-In'}
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
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  backButton: {
    width: 36,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 20,
    color: Colors.textPrimary,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 1,
  },
  placeholder: {
    width: 36,
  },

  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },

  // Sections
  section: {
    marginBottom: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  sectionIcon: {
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
  },
  sectionCount: {
    fontSize: 11,
    color: Colors.accent,
    fontWeight: '500',
  },
  sectionCard: {
    padding: 10,
  },

  // Medications
  medItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
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
    color: '#000',
    fontSize: 10,
    fontWeight: '700',
  },
  medInfo: {
    flex: 1,
  },
  medName: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  medDosage: {
    fontSize: 11,
    color: Colors.textMuted,
  },

  // Empty states
  emptyState: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  emptyIcon: {
    fontSize: 18,
    color: Colors.success,
    marginBottom: 2,
  },
  emptyText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },

  // Vitals
  vitalsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  vitalInput: {
    flex: 1,
  },
  vitalLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  bpInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bpInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 6,
    padding: 8,
    color: Colors.textPrimary,
    fontSize: 14,
    textAlign: 'center',
  },
  bpSlash: {
    fontSize: 14,
    color: Colors.textMuted,
    marginHorizontal: 3,
  },
  hrInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hrInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 6,
    padding: 8,
    color: Colors.textPrimary,
    fontSize: 14,
    textAlign: 'center',
  },
  hrUnit: {
    fontSize: 11,
    color: Colors.textMuted,
    marginLeft: 4,
  },

  // Mood
  moodGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  moodOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  moodOptionSelected: {
    backgroundColor: 'rgba(94, 234, 212, 0.15)',
    borderColor: Colors.accent,
  },
  moodEmoji: {
    fontSize: 18,
    marginBottom: 2,
  },
  moodLabel: {
    fontSize: 9,
    color: Colors.textMuted,
  },
  moodLabelSelected: {
    color: Colors.accent,
    fontWeight: '600',
  },

  // Meals
  mealsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  mealOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 4,
  },
  mealOptionSelected: {
    backgroundColor: 'rgba(94, 234, 212, 0.15)',
    borderColor: Colors.accent,
  },
  mealLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  mealLabelSelected: {
    color: Colors.accent,
    fontWeight: '500',
  },
  mealCheck: {
    fontSize: 10,
    color: Colors.accent,
    fontWeight: '700',
  },

  // Navigation
  navigation: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  saveButton: {
    backgroundColor: Colors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
});
