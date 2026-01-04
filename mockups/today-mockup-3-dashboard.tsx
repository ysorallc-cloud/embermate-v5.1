// ============================================================================
// TODAY TAB - MOCKUP 3: Dashboard Panels
// 
// Design approach:
// - Colored panels for different content types
// - Clear visual zones (not just white cards)
// - Alternating backgrounds
// - Hierarchy through color, not just size
// - "At a glance" dashboard feel
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

export default function TodayScreenMockup3() {
  const router = useRouter();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedSlot, setExpandedSlot] = useState<TimeSlot | null>(null);

  useFocusEffect(useCallback(() => { 
    loadData();
    determineCurrentSlot();
  }, []));

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

  const determineCurrentSlot = () => {
    const hour = new Date().getHours();
    if (hour < 12) setExpandedSlot('morning');
    else if (hour < 17) setExpandedSlot('afternoon');
    else if (hour < 21) setExpandedSlot('evening');
    else setExpandedSlot('bedtime');
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

          {/* PANEL: Status Overview - Green Tint */}
          {totalCount > 0 && (
            <View style={styles.statusPanel}>
              <View style={styles.panelHeader}>
                <Ionicons name="pulse" size={20} color="#22C55E" />
                <Text style={styles.panelTitle}>Progress</Text>
              </View>
              <View style={styles.statusRow}>
                <Text style={styles.statusNumber}>{takenCount}/{totalCount}</Text>
                <View style={styles.statusBar}>
                  <View style={[styles.statusBarFill, { width: `${progressPercent}%` }]} />
                </View>
              </View>
            </View>
          )}

          {/* PANEL: Medications - Cream/Neutral */}
          {totalCount > 0 && (
            <View style={styles.medicationPanel}>
              <View style={styles.panelHeader}>
                <Ionicons name="medical" size={20} color={Colors.accent} />
                <Text style={styles.panelTitle}>Medications</Text>
              </View>

              {TIME_SLOTS.map(slot => {
                const slotMeds = getMedicationsBySlot(slot.key);
                if (slotMeds.length === 0) return null;

                const isExpanded = expandedSlot === slot.key;
                const slotComplete = slotMeds.every(m => m.taken);

                return (
                  <View key={slot.key} style={styles.timeSlotPanel}>
                    <TouchableOpacity
                      style={styles.slotHeader}
                      onPress={() => setExpandedSlot(isExpanded ? null : slot.key)}
                    >
                      <Text style={styles.slotEmoji}>{slot.emoji}</Text>
                      <Text style={styles.slotName}>{slot.label}</Text>
                      {slotComplete && (
                        <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
                      )}
                      <Ionicons 
                        name={isExpanded ? "chevron-up" : "chevron-down"} 
                        size={18} 
                        color={Colors.textMuted} 
                        style={{ marginLeft: 'auto' }}
                      />
                    </TouchableOpacity>

                    {isExpanded && slotMeds.map(med => (
                      <TouchableOpacity
                        key={med.id}
                        style={styles.medItem}
                        onPress={() => handleToggleMedication(med)}
                      >
                        <View style={[styles.medCheckbox, med.taken && styles.medCheckboxDone]}>
                          {med.taken && <Ionicons name="checkmark" size={16} color="#FFF" />}
                        </View>
                        <View style={styles.medDetails}>
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
          )}

          {/* PANEL: Appointments - Blue Tint */}
          {todayAppointments.length > 0 && (
            <View style={styles.appointmentPanel}>
              <View style={styles.panelHeader}>
                <Ionicons name="calendar" size={20} color="#3B82F6" />
                <Text style={styles.panelTitle}>Today's Appointments</Text>
              </View>
              {todayAppointments.map(appt => (
                <TouchableOpacity
                  key={appt.id}
                  style={styles.apptItem}
                  onPress={() => router.push('/appointments' as any)}
                >
                  <Text style={styles.apptTime}>{appt.time}</Text>
                  <View style={styles.apptDetails}>
                    <Text style={styles.apptTitle}>{appt.specialty}</Text>
                    {appt.location && <Text style={styles.apptLocation}>{appt.location}</Text>}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* PANEL: Quick Actions - Subtle */}
          <View style={styles.actionsPanel}>
            <Text style={styles.actionsPanelTitle}>Quick Add</Text>
            <View style={styles.actionsGrid}>
              <TouchableOpacity 
                style={styles.actionTile}
                onPress={() => router.push('/vitals-log' as any)}
              >
                <Ionicons name="heart" size={28} color="#EC4899" />
                <Text style={styles.actionTileText}>Vitals</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionTile}
                onPress={() => router.push('/symptoms-log' as any)}
              >
                <Ionicons name="pulse" size={28} color="#FB923C" />
                <Text style={styles.actionTileText}>Symptoms</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionTile}
                onPress={() => router.push('/medication-form' as any)}
              >
                <Ionicons name="add-circle" size={28} color="#22C55E" />
                <Text style={styles.actionTileText}>Med</Text>
              </TouchableOpacity>
            </View>
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

  // Panel Shared Styles
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },

  // Status Panel - Green Tint
  statusPanel: {
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(34, 197, 94, 0.15)',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statusNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#22C55E',
    minWidth: 70,
  },
  statusBar: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  statusBarFill: {
    height: '100%',
    backgroundColor: '#22C55E',
  },

  // Medication Panel - Cream/Neutral
  medicationPanel: {
    backgroundColor: 'rgba(212, 165, 116, 0.05)',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212, 165, 116, 0.1)',
  },
  timeSlotPanel: {
    marginBottom: 16,
  },
  slotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  slotEmoji: {
    fontSize: 20,
  },
  slotName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  medItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingLeft: 32,
    gap: 12,
  },
  medCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medCheckboxDone: {
    backgroundColor: Colors.accent,
  },
  medDetails: {
    flex: 1,
  },
  medName: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  medNameDone: {
    color: Colors.textMuted,
    textDecorationLine: 'line-through',
  },
  medDose: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  medTime: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },

  // Appointment Panel - Blue Tint
  appointmentPanel: {
    backgroundColor: 'rgba(59, 130, 246, 0.06)',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(59, 130, 246, 0.1)',
  },
  apptItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 16,
  },
  apptTime: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3B82F6',
    minWidth: 60,
  },
  apptDetails: {
    flex: 1,
  },
  apptTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  apptLocation: {
    fontSize: 13,
    color: Colors.textSecondary,
  },

  // Actions Panel - Subtle
  actionsPanel: {
    padding: 24,
  },
  actionsPanelTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionTile: {
    flex: 1,
    backgroundColor: 'rgba(45, 59, 45, 0.1)',
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    gap: 8,
  },
  actionTileText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
});
