// ============================================================================
// MEDICATION SCHEDULE SCREEN (Level 2 Intake Surface)
// Primary logging surface for medications - accessed from CARE tab
// Level 2: Tap checkbox → mark taken (< 2 seconds)
// Level 3: Optional notes after marking (progressive disclosure)
// ============================================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius } from './_theme/theme-tokens';
import { 
  getMedications, 
  markMedicationTaken, 
  Medication,
  getMedicationsNeedingRefill 
} from '../utils/medicationStorage';
import { hapticSuccess } from '../utils/hapticFeedback';

type TimeSlot = 'morning' | 'afternoon' | 'evening' | 'bedtime';

const TIME_SLOTS: { key: TimeSlot; label: string; icon: string }[] = [
  { key: 'morning', label: 'Morning', icon: '🌅' },
  { key: 'afternoon', label: 'Afternoon', icon: '☀️' },
  { key: 'evening', label: 'Evening', icon: '🌆' },
  { key: 'bedtime', label: 'Bedtime', icon: '🌙' },
];

export default function MedicationScheduleScreen() {
  const router = useRouter();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [refillMeds, setRefillMeds] = useState<Medication[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [undoAction, setUndoAction] = useState<{ medId: string; previousStatus: boolean } | null>(null);
  const [showUndo, setShowUndo] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const loadData = async () => {
    try {
      const meds = await getMedications();
      setMedications(meds.filter(m => m.active));
      
      const needsRefill = await getMedicationsNeedingRefill(7);
      setRefillMeds(needsRefill);
    } catch (error) {
      console.log('Error loading medications:', error);
    }
  };

  const handleToggleTaken = async (med: Medication) => {
    try {
      const previousStatus = med.taken;
      const newTakenStatus = !med.taken;
      
      // Level 2 Action: Fast confirmation
      await markMedicationTaken(med.id, newTakenStatus);
      
      if (newTakenStatus) {
        await hapticSuccess();
      }
      
      await loadData();
      
      // Show undo toast (5-second window per intake model)
      setUndoAction({ medId: med.id, previousStatus });
      setShowUndo(true);
      
      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        setShowUndo(false);
        setUndoAction(null);
      }, 5000);
    } catch (error) {
      console.log('Error toggling medication:', error);
      Alert.alert('Error', 'Failed to update medication status');
    }
  };
  
  const handleUndo = async () => {
    if (!undoAction) return;
    
    try {
      // Revert to previous status
      await markMedicationTaken(undoAction.medId, undoAction.previousStatus);
      await loadData();
      
      // Hide undo toast
      setShowUndo(false);
      setUndoAction(null);
    } catch (error) {
      console.log('Error undoing action:', error);
    }
  };

  const getMedicationsBySlot = (slot: TimeSlot) => {
    return medications.filter(m => m.timeSlot === slot);
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const takenCount = medications.filter(m => m.taken).length;
  const totalCount = medications.length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => router.back()}
            >
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Medications</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push('/medication-form' as any)}
            >
              <Ionicons name="add" size={24} color={Colors.accent} />
            </TouchableOpacity>
          </View>

          {/* Simple Header Text */}
          <Text style={styles.headerText}>Today's medications</Text>

          {/* Refill Warning */}
          {refillMeds.length > 0 && (
            <View style={styles.refillWarning}>
              <Ionicons name="warning" size={20} color={Colors.warning} />
              <Text style={styles.refillText}>
                {refillMeds.length} medication{refillMeds.length !== 1 ? 's' : ''} need refill soon
              </Text>
            </View>
          )}

          {/* Medication Slots */}
          {TIME_SLOTS.map(slot => {
            const slotMeds = getMedicationsBySlot(slot.key);
            if (slotMeds.length === 0) return null;

            return (
              <View key={slot.key} style={styles.slotSection}>
                <View style={styles.slotHeader}>
                  <Text style={styles.slotIcon}>{slot.icon}</Text>
                  <Text style={styles.slotLabel}>{slot.label}</Text>
                </View>

                {slotMeds.map(med => (
                  <TouchableOpacity
                    key={med.id}
                    style={[
                      styles.medCard,
                      med.taken && styles.medCardTaken
                    ]}
                    onPress={() => handleToggleTaken(med)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.medInfo}>
                      <Text style={styles.medTime}>{formatTime(med.time)}</Text>
                      <Text style={[
                        styles.medName,
                        med.taken && styles.medNameTaken
                      ]}>
                        {med.name} {med.dosage}
                      </Text>
                      {med.notes && (
                        <Text style={styles.medNotes}>{med.notes}</Text>
                      )}
                      {med.daysSupply !== undefined && med.daysSupply <= 7 && (
                        <View style={styles.refillBadge}>
                          <Text style={styles.refillBadgeText}>
                            {med.daysSupply} days supply
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={[
                      styles.checkbox,
                      med.taken && styles.checkboxChecked
                    ]}>
                      {med.taken && (
                        <Ionicons name="checkmark" size={18} color="#FFF" />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            );
          })}

          <View style={{ height: 40 }} />
        </ScrollView>
        
        {/* Undo Toast (Level 2 Intake Model Requirement) */}
        {showUndo && undoAction && (
          <View style={styles.undoToast}>
            <Text style={styles.undoText}>Medication marked taken</Text>
            <TouchableOpacity onPress={handleUndo} style={styles.undoButton}>
              <Text style={styles.undoButtonText}>UNDO</Text>
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
  scrollView: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? 20 : 0,
    paddingBottom: Spacing.xl,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  placeholder: {
    width: 40,
  },
  addButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Header Text
  headerText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
    fontWeight: '400',
  },

  // Refill Warning
  refillWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.warningLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  refillText: {
    color: Colors.warning,
    fontSize: 14,
    fontWeight: '500',
  },

  // Slots
  slotSection: {
    marginBottom: Spacing.xl,
  },
  slotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  slotIcon: {
    fontSize: 20,
  },
  slotLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Med Cards
  medCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  medCardTaken: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  medInfo: {
    flex: 1,
  },
  medTime: {
    fontSize: 12,
    color: Colors.accent,
    fontWeight: '500',
    marginBottom: 4,
  },
  medName: {
    fontSize: 16,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  medNameTaken: {
    textDecorationLine: 'line-through',
    opacity: 0.7,
  },
  medNotes: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  refillBadge: {
    backgroundColor: Colors.warningLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.sm,
    alignSelf: 'flex-start',
  },
  refillBadgeText: {
    fontSize: 11,
    color: Colors.warning,
    fontWeight: '600',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.borderMedium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  
  // Undo Toast (Level 2 Intake Model)
  undoToast: {
    position: 'absolute',
    bottom: 100,
    left: Spacing.xl,
    right: Spacing.xl,
    backgroundColor: Colors.textPrimary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.3)',
    elevation: 8,
  },
  undoText: {
    color: Colors.background,
    fontSize: 15,
    fontWeight: '500',
  },
  undoButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  undoButtonText: {
    color: Colors.accent,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
