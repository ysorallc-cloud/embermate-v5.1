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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from './_theme/theme-tokens';
import { getMedications, markMedicationTaken, Medication } from '../utils/medicationStorage';
import { hapticSuccess } from '../utils/hapticFeedback';

const SIDE_EFFECTS = [
  { id: 'none', label: 'None' },
  { id: 'dizzy', label: 'Dizzy' },
  { id: 'nausea', label: 'Nausea' },
  { id: 'tired', label: 'Tired' },
  { id: 'other', label: 'Other' },
];

export default function MedicationConfirmScreen() {
  const router = useRouter();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [checkedMeds, setCheckedMeds] = useState<Set<string>>(new Set());
  const [sideEffect, setSideEffect] = useState('none');

  useFocusEffect(
    useCallback(() => {
      loadMedications();
    }, [])
  );

  const loadMedications = async () => {
    try {
      const allMeds = await getMedications();
      const hour = new Date().getHours();
      const timeSlot = hour < 12 ? 'morning' : 'evening';

      const relevantMeds = allMeds.filter(
        (m) => m.active && m.timeSlot === timeSlot && !m.taken
      );

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

  const getTimeLabel = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning';
    return 'Evening';
  };

  const getTimeString = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '8:00 AM';
    return '6:00 PM';
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
            <Text style={styles.headerTime}>{getTimeString()}</Text>
            <Text style={styles.headerTitle}>{getTimeLabel()} Medications</Text>
          </View>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Medication List */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>MEDICATIONS</Text>
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
});
