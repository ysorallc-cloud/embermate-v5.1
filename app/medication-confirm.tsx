// ============================================================================
// MEDICATION CONFIRMATION
// Quick medication checklist with side effects
// ============================================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../theme/theme-tokens';
import { getMedications, markMedicationTaken, createMedication, Medication } from '../utils/medicationStorage';
import { hapticSuccess } from '../utils/hapticFeedback';

// Common medications for quick selection
const COMMON_MEDICATIONS = [
  { name: 'Metformin', dosages: ['500mg', '850mg', '1000mg'] },
  { name: 'Lisinopril', dosages: ['5mg', '10mg', '20mg', '40mg'] },
  { name: 'Amlodipine', dosages: ['2.5mg', '5mg', '10mg'] },
  { name: 'Metoprolol', dosages: ['25mg', '50mg', '100mg'] },
  { name: 'Atorvastatin', dosages: ['10mg', '20mg', '40mg', '80mg'] },
  { name: 'Omeprazole', dosages: ['20mg', '40mg'] },
  { name: 'Levothyroxine', dosages: ['25mcg', '50mcg', '75mcg', '100mcg'] },
  { name: 'Gabapentin', dosages: ['100mg', '300mg', '400mg', '600mg'] },
  { name: 'Losartan', dosages: ['25mg', '50mg', '100mg'] },
  { name: 'Furosemide', dosages: ['20mg', '40mg', '80mg'] },
  { name: 'Aspirin', dosages: ['81mg', '325mg'] },
  { name: 'Warfarin', dosages: ['1mg', '2mg', '2.5mg', '5mg', '7.5mg', '10mg'] },
  { name: 'Prednisone', dosages: ['5mg', '10mg', '20mg'] },
  { name: 'Vitamin D', dosages: ['1000IU', '2000IU', '5000IU'] },
  { name: 'Vitamin B12', dosages: ['500mcg', '1000mcg'] },
  { name: 'Fish Oil', dosages: ['1000mg', '1200mg'] },
  { name: 'Calcium', dosages: ['500mg', '600mg'] },
  { name: 'Multivitamin', dosages: ['1 tablet'] },
  { name: 'Acetaminophen', dosages: ['325mg', '500mg', '650mg'] },
  { name: 'Ibuprofen', dosages: ['200mg', '400mg', '600mg', '800mg'] },
];

const SIDE_EFFECTS = [
  { id: 'none', label: 'None' },
  { id: 'dizzy', label: 'Dizzy' },
  { id: 'nausea', label: 'Nausea' },
  { id: 'tired', label: 'Tired' },
  { id: 'other', label: 'Other' },
];

export default function MedicationConfirmScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [checkedMeds, setCheckedMeds] = useState<Set<string>>(new Set());
  const [sideEffect, setSideEffect] = useState('none');
  const [timeSlot, setTimeSlot] = useState<'morning' | 'evening'>('morning');

  // Quick add state
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [quickAddMeds, setQuickAddMeds] = useState<Set<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      loadMedications();
    }, [params.ids])
  );

  const loadMedications = async () => {
    try {
      const allMeds = await getMedications();

      // Get medication IDs from params
      const medIds = params.ids
        ? (params.ids as string).split(',').filter(id => id.length > 0)
        : [];

      let relevantMeds: Medication[];

      if (medIds.length > 0) {
        // Load specific medications by ID
        relevantMeds = allMeds.filter(
          (m) => m.active && medIds.includes(m.id)
        );
      } else {
        // No IDs passed - load all active, untaken medications
        relevantMeds = allMeds.filter((m) => m.active && !m.taken);
      }

      // Determine time slot from the medications
      if (relevantMeds.length > 0) {
        setTimeSlot(relevantMeds[0].timeSlot as 'morning' | 'evening');
      }

      setMedications(relevantMeds);
    } catch (error) {
      console.error('Error loading medications:', error);
    }
  };

  const toggleMedication = (medId: string) => {
    setCheckedMeds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(medId)) {
        newSet.delete(medId);
      } else {
        newSet.add(medId);
      }
      return newSet;
    });
  };

  const handleAllTaken = async () => {
    try {
      for (const med of medications) {
        if (checkedMeds.has(med.id) || checkedMeds.size === 0) {
          await markMedicationTaken(med.id);
        }
      }

      await hapticSuccess();
      router.back();
    } catch (error) {
      console.error('Error marking medications taken:', error);
      Alert.alert('Error', 'Failed to save medication log');
    }
  };

  const handleSkipDose = () => {
    Alert.alert(
      'Skip Dose',
      'Are you sure you want to skip this dose?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          style: 'destructive',
          onPress: () => router.back(),
        },
      ]
    );
  };

  // Filter common medications based on search
  const filteredMedications = COMMON_MEDICATIONS.filter(med =>
    med.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Toggle quick add medication selection
  const toggleQuickAddMed = (medName: string, dosage: string) => {
    const key = `${medName}|${dosage}`;
    setQuickAddMeds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  // Handle recording quick add medications
  const handleRecordQuickAdd = async () => {
    try {
      const medsToAdd = Array.from(quickAddMeds);
      for (const key of medsToAdd) {
        const [name, dosage] = key.split('|');
        // Create the medication and mark it as taken
        const newMed = await createMedication({
          name,
          dosage,
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
          timeSlot: 'morning',
          taken: true,
          active: true,
        });
        await markMedicationTaken(newMed.id);
      }

      await hapticSuccess();
      router.back();
    } catch (error) {
      console.error('Error recording medications:', error);
      Alert.alert('Error', 'Failed to record medications');
    }
  };

  const getTimeLabel = () => {
    return timeSlot.charAt(0).toUpperCase() + timeSlot.slice(1);
  };

  const getTimeString = () => {
    // Get the time from the first medication's scheduled time
    if (medications.length > 0) {
      return medications[0].time;
    }
    return timeSlot === 'morning' ? '8:00 AM' : '6:00 PM';
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
          <View style={styles.headerCenter}>
            {medications.length > 0 ? (
              <>
                <Text style={styles.headerTime}>{getTimeString()}</Text>
                <Text style={styles.headerTitle}>{getTimeLabel()} Medications</Text>
              </>
            ) : (
              <>
                <Text style={styles.headerTitle}>Record Medication</Text>
                <Text style={styles.headerSubtitle}>Select from common medications</Text>
              </>
            )}
          </View>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Scheduled Medication List */}
          {medications.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>SCHEDULED MEDICATIONS</Text>
              {medications.map((med) => (
                <TouchableOpacity
                  key={med.id}
                  style={[
                    styles.medCard,
                    checkedMeds.has(med.id) && styles.medCardChecked,
                  ]}
                  onPress={() => toggleMedication(med.id)}
                >
                  <View
                    style={[
                      styles.checkbox,
                      checkedMeds.has(med.id) && styles.checkboxChecked,
                    ]}
                  >
                    {checkedMeds.has(med.id) && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </View>
                  <View style={styles.medInfo}>
                    <Text style={styles.medName}>{med.name}</Text>
                    <Text style={styles.medDose}>{med.dosage}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Quick Add Section */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.quickAddHeader}
              onPress={() => setShowQuickAdd(!showQuickAdd)}
            >
              <Text style={styles.sectionLabel}>
                {medications.length > 0 ? 'RECORD OTHER MEDICATION' : 'RECORD MEDICATION'}
              </Text>
              <Text style={styles.expandIcon}>{showQuickAdd ? '−' : '+'}</Text>
            </TouchableOpacity>

            {(showQuickAdd || medications.length === 0) && (
              <View style={styles.quickAddContent}>
                {/* Search Input */}
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search medications..."
                  placeholderTextColor="rgba(255, 255, 255, 0.4)"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />

                {/* Medication List */}
                <View style={styles.medList}>
                  {filteredMedications.slice(0, 10).map((med) => (
                    <View key={med.name} style={styles.quickMedItem}>
                      <Text style={styles.quickMedName}>{med.name}</Text>
                      <View style={styles.dosageRow}>
                        {med.dosages.map((dosage) => {
                          const key = `${med.name}|${dosage}`;
                          const isSelected = quickAddMeds.has(key);
                          return (
                            <TouchableOpacity
                              key={dosage}
                              style={[
                                styles.dosageChip,
                                isSelected && styles.dosageChipSelected,
                              ]}
                              onPress={() => toggleQuickAddMed(med.name, dosage)}
                            >
                              <Text
                                style={[
                                  styles.dosageText,
                                  isSelected && styles.dosageTextSelected,
                                ]}
                              >
                                {dosage}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  ))}
                </View>

                {/* Quick Add Button */}
                {quickAddMeds.size > 0 && (
                  <TouchableOpacity
                    style={styles.quickAddButton}
                    onPress={handleRecordQuickAdd}
                  >
                    <Text style={styles.quickAddButtonText}>
                      Record {quickAddMeds.size} Medication{quickAddMeds.size > 1 ? 's' : ''} ✓
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* Side Effects */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>ANY SIDE EFFECTS?</Text>
            <View style={styles.chipRow}>
              {SIDE_EFFECTS.map((effect) => (
                <TouchableOpacity
                  key={effect.id}
                  style={[
                    styles.chip,
                    sideEffect === effect.id && styles.chipSelected,
                  ]}
                  onPress={() => setSideEffect(effect.id)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      sideEffect === effect.id && styles.chipTextSelected,
                    ]}
                  >
                    {effect.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Footer Buttons */}
        {medications.length > 0 && (
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkipDose}
            >
              <Text style={styles.skipButtonText}>Skip Dose</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleAllTaken}
            >
              <Text style={styles.confirmButtonText}>All Taken ✓</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Back button when no scheduled meds */}
        {medications.length === 0 && quickAddMeds.size === 0 && (
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.backButtonLarge}
              onPress={() => router.back()}
            >
              <Text style={styles.backButtonLargeText}>← Back</Text>
            </TouchableOpacity>
          </View>
        )}
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
  headerCenter: {
    alignItems: 'center',
  },
  headerTime: {
    fontSize: 13,
    color: Colors.gold,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 2,
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

  // Medication Card
  medCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(13, 148, 136, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.15)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    gap: 14,
  },
  medCardChecked: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(20, 184, 166, 0.3)',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.green,
    borderColor: Colors.green,
  },
  checkmark: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  medInfo: {
    flex: 1,
  },
  medName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  medDose: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
  },

  // Side Effects Chips
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

  // Footer
  footer: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: 24,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(20, 184, 166, 0.15)',
    backgroundColor: Colors.background,
  },
  skipButton: {
    flex: 1,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: Colors.redBorder,
    borderRadius: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.red,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 16,
    backgroundColor: Colors.green,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Quick Add Styles
  quickAddHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expandIcon: {
    fontSize: 18,
    color: Colors.accent,
    fontWeight: '600',
  },
  quickAddContent: {
    marginTop: 12,
  },
  searchInput: {
    backgroundColor: 'rgba(13, 148, 136, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.15)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  medList: {
    gap: 12,
  },
  quickMedItem: {
    marginBottom: 4,
  },
  quickMedName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  dosageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dosageChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(13, 148, 136, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.15)',
    borderRadius: 16,
  },
  dosageChipSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: Colors.green,
  },
  dosageText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  dosageTextSelected: {
    color: Colors.green,
    fontWeight: '600',
  },
  quickAddButton: {
    marginTop: 16,
    paddingVertical: 14,
    backgroundColor: Colors.accent,
    borderRadius: 12,
    alignItems: 'center',
  },
  quickAddButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  backButtonLarge: {
    flex: 1,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.3)',
    borderRadius: 12,
    alignItems: 'center',
  },
  backButtonLargeText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
});
