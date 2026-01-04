// ============================================================================
// TODAY TAB - MOCKUP 1: Minimal Sectioned Design
// 
// Design approach:
// - Visual section dividers (not just cards)
// - Alternating background treatments
// - Large section headers with icons
// - Grouped time slots (not individual cards)
// - Breathing room between major sections
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../_theme/theme-tokens';
import { getMedications, markMedicationTaken, Medication } from '../../utils/medicationStorage';
import { getUpcomingAppointments, Appointment } from '../../utils/appointmentStorage';
import { hapticSuccess } from '../../utils/hapticFeedback';

type TimeSlot = 'morning' | 'afternoon' | 'evening' | 'bedtime';

const TIME_SLOTS: { 
  key: TimeSlot; 
  label: string; 
  emoji: string;
}[] = [
  { key: 'morning', label: 'Morning', emoji: '🌅' },
  { key: 'afternoon', label: 'Afternoon', emoji: '☀️' },
  { key: 'evening', label: 'Evening', emoji: '🌆' },
  { key: 'bedtime', label: 'Bedtime', emoji: '🌙' },
];

export default function TodayScreenMockup1() {
  const router = useRouter();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const loadData = async () => {
    try {
      const meds = await getMedications();
      setMedications(meds.filter(m => m.active));
    } catch (e) {}
    try {
      const appts = await getUpcomingAppointments();
      setAppointments(appts);
    } catch (e) {}
  };

  const handleToggleMedication = async (med: Medication) => {
    try {
      await markMedicationTaken(med.id, !med.taken);
      if (!med.taken) await hapticSuccess();
      await loadData();
    } catch (error) {}
  };

  const getMedicationsBySlot = (slot: TimeSlot) => {
    return medications.filter(m => m.timeSlot === slot);
  };

  const getTodayDate = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const today = new Date();
    return `${days[today.getDay()]}, ${months[today.getMonth()]} ${today.getDate()}`;
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    return `${hour % 12 || 12}:${minutes} ${ampm}`;
  };

  const takenCount = medications.filter(m => m.taken).length;
  const totalCount = medications.length;
  const progressPercent = totalCount > 0 ? (takenCount / totalCount) * 100 : 0;

  const todayAppointments = appointments.filter(a => {
    const apptDate = new Date(a.date);
    const today = new Date();
    return apptDate.toDateString() === today.toDateString();
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View>
                <Text style={styles.headerLabel}>TODAY</Text>
                <Text style={styles.headerDate}>{getTodayDate()}</Text>
              </View>
              <TouchableOpacity 
                style={styles.settingsButton}
                onPress={() => router.push('/settings' as any)}
              >
                <Ionicons name="settings-outline" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.headerTitle}>Your Daily Care</Text>
          </View>

          {/* Progress Banner - Full Width, No Card */}
          {totalCount > 0 && (
            <View style={styles.progressBanner}>
              <View style={styles.progressContent}>
                <Text style={styles.progressCount}>{takenCount} of {totalCount}</Text>
                <Text style={styles.progressLabel}>medications taken</Text>
              </View>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { width: `${progressPercent}%` }]} />
              </View>
            </View>
          )}

          {/* SECTION: Medications - Grouped List Style */}
          {totalCount > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="medical" size={24} color="#22C55E" />
                <Text style={styles.sectionTitle}>Medications</Text>
              </View>

              <View style={styles.listContainer}>
                {TIME_SLOTS.map(slot => {
                  const slotMeds = getMedicationsBySlot(slot.key);
                  if (slotMeds.length === 0) return null;

                  return (
                    <View key={slot.key} style={styles.timeSlotGroup}>
                      <Text style={styles.timeSlotLabel}>{slot.emoji} {slot.label}</Text>
                      
                      {slotMeds.map((med, index) => (
                        <TouchableOpacity
                          key={med.id}
                          style={[
                            styles.medRow,
                            index === slotMeds.length - 1 && styles.medRowLast
                          ]}
                          onPress={() => handleToggleMedication(med)}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.medCheck, med.taken && styles.medCheckDone]}>
                            {med.taken && <Ionicons name="checkmark" size={18} color="#FFF" />}
                          </View>
                          <View style={styles.medInfo}>
                            <Text style={[styles.medName, med.taken && styles.medNameDone]}>
                              {med.name}
                            </Text>
                            <Text style={styles.medDose}>{med.dosage}</Text>
                          </View>
                          <Text style={styles.medTime}>{formatTime(med.time)}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Divider */}
          {totalCount > 0 && <View style={styles.divider} />}

          {/* SECTION: Quick Actions - Icon Grid, No Cards */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="add-circle-outline" size={24} color={Colors.accent} />
              <Text style={styles.sectionTitle}>Quick Add</Text>
            </View>

            <View style={styles.actionGrid}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => router.push('/vitals-log' as any)}
              >
                <Ionicons name="heart-outline" size={32} color="#EC4899" />
                <Text style={styles.actionButtonText}>Vitals</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => router.push('/symptoms-log' as any)}
              >
                <Ionicons name="pulse-outline" size={32} color="#FB923C" />
                <Text style={styles.actionButtonText}>Symptoms</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => router.push('/medication-form' as any)}
              >
                <Ionicons name="medical-outline" size={32} color="#22C55E" />
                <Text style={styles.actionButtonText}>Medication</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* SECTION: Today's Appointments */}
          {todayAppointments.length > 0 && (
            <>
              <View style={styles.divider} />
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="calendar" size={24} color="#3B82F6" />
                  <Text style={styles.sectionTitle}>Today's Appointments</Text>
                </View>

                {todayAppointments.map(appt => (
                  <TouchableOpacity
                    key={appt.id}
                    style={styles.apptRow}
                    onPress={() => router.push('/appointments' as any)}
                  >
                    <View style={styles.apptTime}>
                      <Text style={styles.apptTimeText}>{appt.time}</Text>
                    </View>
                    <View style={styles.apptInfo}>
                      <Text style={styles.apptTitle}>{appt.specialty}</Text>
                      {appt.location && <Text style={styles.apptLocation}>{appt.location}</Text>}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

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
  scrollView: {
    flex: 1,
  },

  // Header
  header: {
    paddingTop: Platform.OS === 'android' ? 40 : 20,
    paddingHorizontal: 24,
    paddingBottom: 32,
    backgroundColor: 'rgba(45, 59, 45, 0.2)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212, 165, 116, 0.15)',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerLabel: {
    fontSize: 11,
    color: 'rgba(212, 165, 116, 0.7)',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  headerDate: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textMuted,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '300',
    letterSpacing: -0.5,
    color: Colors.textPrimary,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(45, 59, 45, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Progress Banner - Full Width, Tinted Background
  progressBanner: {
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    paddingHorizontal: 24,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(34, 197, 94, 0.15)',
  },
  progressContent: {
    marginBottom: 12,
  },
  progressCount: {
    fontSize: 28,
    fontWeight: '700',
    color: '#22C55E',
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#22C55E',
    borderRadius: 3,
  },

  // Sections
  section: {
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: Colors.textPrimary,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: 'rgba(212, 165, 116, 0.1)',
    marginVertical: 32,
    marginHorizontal: 24,
  },

  // Medication List - No Cards, Just Rows
  listContainer: {
    gap: 24,
  },
  timeSlotGroup: {
    gap: 0,
  },
  timeSlotLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  medRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212, 165, 116, 0.08)',
    gap: 16,
  },
  medRowLast: {
    borderBottomWidth: 0,
  },
  medCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medCheckDone: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  medInfo: {
    flex: 1,
  },
  medName: {
    fontSize: 17,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  medNameDone: {
    color: Colors.textMuted,
    textDecorationLine: 'line-through',
  },
  medDose: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  medTime: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textSecondary,
  },

  // Quick Actions - Simple Icon Grid
  actionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  actionButton: {
    alignItems: 'center',
    gap: 8,
    minWidth: 80,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },

  // Appointments - Simple Row
  apptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212, 165, 116, 0.08)',
  },
  apptTime: {
    width: 72,
  },
  apptTimeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
  },
  apptInfo: {
    flex: 1,
  },
  apptTitle: {
    fontSize: 17,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  apptLocation: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
