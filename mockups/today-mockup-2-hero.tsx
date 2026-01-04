// ============================================================================
// TODAY TAB - MOCKUP 2: Hero Card Focus
// 
// Design approach:
// - One dominant "next action" hero card
// - Everything else collapsed/secondary
// - Maximum whitespace
// - Single focus point
// - "What do I do right now?" philosophy
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

export default function TodayScreenMockup2() {
  const router = useRouter();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showAllMeds, setShowAllMeds] = useState(false);

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
  const nextMed = medications.find(m => !m.taken);
  const remainingMeds = medications.filter(m => !m.taken).slice(1);

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

          <View style={styles.content}>
            {/* Progress Indicator - Minimal */}
            {totalCount > 0 && (
              <View style={styles.progressIndicator}>
                <Text style={styles.progressText}>
                  {takenCount} of {totalCount} medications
                </Text>
                <View style={styles.progressDots}>
                  {medications.map((med, i) => (
                    <View 
                      key={med.id} 
                      style={[styles.dot, med.taken && styles.dotFilled]} 
                    />
                  ))}
                </View>
              </View>
            )}

            {/* HERO CARD - Next Action */}
            {nextMed ? (
              <View style={styles.heroCard}>
                <Text style={styles.heroLabel}>Next Up</Text>
                <Text style={styles.heroMedName}>{nextMed.name}</Text>
                <Text style={styles.heroMedDose}>{nextMed.dosage}</Text>
                <Text style={styles.heroMedTime}>{formatTime(nextMed.time)}</Text>
                
                <TouchableOpacity 
                  style={styles.heroButton}
                  onPress={() => handleToggleMedication(nextMed)}
                  activeOpacity={0.9}
                >
                  <Text style={styles.heroButtonText}>Mark as Taken</Text>
                </TouchableOpacity>

                {remainingMeds.length > 0 && (
                  <TouchableOpacity 
                    style={styles.skipButton}
                    onPress={() => setShowAllMeds(!showAllMeds)}
                  >
                    <Text style={styles.skipButtonText}>
                      {showAllMeds ? 'Hide' : `+${remainingMeds.length} more`}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={styles.heroCard}>
                <Ionicons name="checkmark-circle" size={64} color="#22C55E" style={{ marginBottom: 16 }} />
                <Text style={styles.heroMedName}>All Done</Text>
                <Text style={styles.heroMedDose}>You've taken all medications for now</Text>
              </View>
            )}

            {/* Remaining Medications - Collapsed List */}
            {showAllMeds && remainingMeds.length > 0 && (
              <View style={styles.remainingList}>
                <Text style={styles.remainingTitle}>Coming Up</Text>
                {remainingMeds.map(med => (
                  <TouchableOpacity
                    key={med.id}
                    style={styles.remainingRow}
                    onPress={() => handleToggleMedication(med)}
                  >
                    <View style={styles.remainingInfo}>
                      <Text style={styles.remainingName}>{med.name}</Text>
                      <Text style={styles.remainingDose}>{med.dosage}</Text>
                    </View>
                    <Text style={styles.remainingTime}>{formatTime(med.time)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Secondary Information - Minimal Cards */}
            {todayAppointments.length > 0 && (
              <TouchableOpacity 
                style={styles.infoCard}
                onPress={() => router.push('/appointments' as any)}
              >
                <View style={styles.infoIcon}>
                  <Ionicons name="calendar" size={20} color="#3B82F6" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoTitle}>Appointment Today</Text>
                  <Text style={styles.infoText}>{todayAppointments[0].specialty} at {todayAppointments[0].time}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            )}

            {/* Quick Actions - Compact */}
            <View style={styles.quickActions}>
              <TouchableOpacity 
                style={styles.quickActionButton}
                onPress={() => router.push('/vitals-log' as any)}
              >
                <Ionicons name="heart-outline" size={20} color={Colors.textSecondary} />
                <Text style={styles.quickActionText}>Log Vitals</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.quickActionButton}
                onPress={() => router.push('/symptoms-log' as any)}
              >
                <Ionicons name="pulse-outline" size={20} color={Colors.textSecondary} />
                <Text style={styles.quickActionText}>Log Symptoms</Text>
              </TouchableOpacity>
            </View>
          </View>
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

  // Content
  content: {
    padding: 24,
  },

  // Progress Indicator - Minimal
  progressIndicator: {
    marginBottom: 32,
  },
  progressText: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  progressDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(212, 165, 116, 0.3)',
  },
  dotFilled: {
    backgroundColor: Colors.accent,
  },

  // Hero Card - Single Focus
  heroCard: {
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderWidth: 2,
    borderColor: 'rgba(34, 197, 94, 0.2)',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
  },
  heroLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  heroMedName: {
    fontSize: 28,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  heroMedDose: {
    fontSize: 17,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  heroMedTime: {
    fontSize: 20,
    fontWeight: '700',
    color: '#22C55E',
    marginBottom: 24,
  },
  heroButton: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 16,
    minWidth: 200,
  },
  heroButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFF',
    textAlign: 'center',
  },
  skipButton: {
    marginTop: 16,
    paddingVertical: 8,
  },
  skipButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textMuted,
  },

  // Remaining List - Collapsed
  remainingList: {
    backgroundColor: 'rgba(45, 59, 45, 0.15)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  remainingTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  remainingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212, 165, 116, 0.08)',
  },
  remainingInfo: {
    flex: 1,
  },
  remainingName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  remainingDose: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  remainingTime: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textSecondary,
  },

  // Info Card - Secondary
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(45, 59, 45, 0.15)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  infoIcon: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  infoText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },

  // Quick Actions - Compact
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(45, 59, 45, 0.1)',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
});
