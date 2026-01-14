// ============================================================================
// TODAY TAB - Timeline Design with Tinted Header
// Daily medication tracking with smart greeting
// ============================================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../_theme/theme-tokens';
import { getMedications, markMedicationTaken, Medication } from '../../utils/medicationStorage';
import { getUpcomingAppointments, Appointment } from '../../utils/appointmentStorage';
import { hapticSuccess } from '../../utils/hapticFeedback';

export default function TodayScreen() {
  const router = useRouter();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => {
    loadData();
  }, []));

  const loadData = async () => {
    try {
      const meds = await getMedications();
      setMedications(meds.filter(m => m.active));
    } catch (e) {
      console.error('Error loading medications:', e);
    }
    try {
      const appts = await getUpcomingAppointments();
      setAppointments(appts);
    } catch (e) {
      console.error('Error loading appointments:', e);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  // Helper functions
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const formatDate = () => {
    const now = new Date();
    return now.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTasksRemaining = () => {
    return medications.filter(m => m.active && !m.taken).length;
  };

  const isToday = (dateStr: string) => {
    const today = new Date();
    const apptDate = new Date(dateStr);
    return (
      today.getDate() === apptDate.getDate() &&
      today.getMonth() === apptDate.getMonth() &&
      today.getFullYear() === apptDate.getFullYear()
    );
  };

  // Medication helpers
  const getMorningMeds = () => {
    return medications.filter(m => m.active && m.timeSlot === 'morning');
  };

  const getEveningMeds = () => {
    return medications.filter(m => m.active && m.timeSlot === 'evening');
  };

  const isMorningComplete = () => {
    const morningMeds = getMorningMeds();
    return morningMeds.length > 0 && morningMeds.every(m => m.taken);
  };

  const isEveningComplete = () => {
    const eveningMeds = getEveningMeds();
    return eveningMeds.length > 0 && eveningMeds.every(m => m.taken);
  };

  const getMorningStatus = () => {
    const morningMeds = getMorningMeds();
    const takenCount = morningMeds.filter(m => m.taken).length;
    if (isMorningComplete()) {
      return `${takenCount} taken`;
    }
    return `${morningMeds.length - takenCount} to take`;
  };

  const getEveningStatus = () => {
    const eveningMeds = getEveningMeds();
    const takenCount = eveningMeds.filter(m => m.taken).length;
    if (isEveningComplete()) {
      return `${takenCount} taken`;
    }
    return `${eveningMeds.length - takenCount} to take`;
  };

  const handleToggleMorningMeds = async () => {
    const morningMeds = getMorningMeds();
    const allTaken = isMorningComplete();

    for (const med of morningMeds) {
      if (!allTaken) {
        await markMedicationTaken(med.id);
      }
    }

    hapticSuccess();
    await loadData();
  };

  const handleToggleEveningMeds = async () => {
    const eveningMeds = getEveningMeds();
    const allTaken = isEveningComplete();

    for (const med of eveningMeds) {
      if (!allTaken) {
        await markMedicationTaken(med.id);
      }
    }

    hapticSuccess();
    await loadData();
  };

  const formatAppointmentDate = (appt: Appointment) => {
    if (!appt?.date) return '';
    const date = new Date(appt.date);

    if (isToday(appt.date)) {
      return `Today at ${appt.time || date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    }

    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const getAppointmentPrep = (appt: Appointment) => {
    if (appt?.specialty?.toLowerCase().includes('cardio')) {
      return 'Bring BP readings from last week';
    }
    return 'Bring medication list';
  };

  const getEncouragementMessage = () => {
    const hour = new Date().getHours();
    const hasAppointmentToday = appointments.some(appt => {
      if (!appt?.date) return false;
      return isToday(appt.date);
    });

    const upcomingAppt = appointments.find(appt => {
      if (!appt?.date) return false;
      const apptDate = new Date(appt.date);
      return isToday(appt.date) && apptDate > new Date();
    });

    // Context: Appointment coming up today
    if (upcomingAppt) {
      return `All care tasks complete. ${upcomingAppt.provider} at ${upcomingAppt.time || '—'} — you're prepared.`;
    }

    // Context: Morning complete, more to come
    if (hour < 12) {
      return "Great start to the day. You've got this.";
    }

    // Context: Afternoon
    if (hour < 17) {
      return "Care tasks complete. Take a moment for yourself.";
    }

    // Context: Evening - day is done
    return "You've taken great care today. Rest well.";
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <LinearGradient
        colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.greeting}>{getGreeting()} ☀️</Text>
              <Text style={styles.dateText}>{formatDate()}</Text>
              <Text style={styles.taskCount}>
                {getTasksRemaining()} task{getTasksRemaining() !== 1 ? 's' : ''} remaining
              </Text>
            </View>
            <TouchableOpacity
              style={styles.coffeeButton}
              onPress={() => router.push('/coffee')}
            >
              <Text style={styles.coffeeIcon}>☕</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.accent}
            />
          }
        >
          {/* Timeline */}
          <View style={styles.timeline}>
            <View style={styles.timelineLine} />

            {/* Morning medications */}
            {getMorningMeds().length > 0 && (
              <View style={styles.timelineItem}>
                <TouchableOpacity
                  style={[
                    styles.timelineDot,
                    isMorningComplete() && styles.timelineDotComplete
                  ]}
                  onPress={handleToggleMorningMeds}
                  activeOpacity={0.7}
                >
                  {isMorningComplete() && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTime}>8:00 AM</Text>
                  <Text style={styles.timelineTitle}>Morning medications</Text>
                  <Text style={[
                    styles.timelineStatus,
                    isMorningComplete() && styles.timelineStatusComplete
                  ]}>
                    {getMorningStatus()}
                  </Text>
                </View>
              </View>
            )}

            {/* Evening medications */}
            {getEveningMeds().length > 0 && (
              <View style={styles.timelineItem}>
                <TouchableOpacity
                  style={[
                    styles.timelineDot,
                    isEveningComplete() && styles.timelineDotComplete
                  ]}
                  onPress={handleToggleEveningMeds}
                  activeOpacity={0.7}
                >
                  {isEveningComplete() && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTime}>6:00 PM</Text>
                  <Text style={styles.timelineTitle}>Evening medication</Text>
                  <Text style={[
                    styles.timelineStatus,
                    isEveningComplete() && styles.timelineStatusComplete
                  ]}>
                    {getEveningStatus()}
                  </Text>
                </View>
              </View>
            )}

            {/* Appointments - not tappable, just info */}
            {appointments.length > 0 && appointments[0] && (
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, styles.timelineDotAppointment]}>
                  <Text style={styles.appointmentIcon}>🩺</Text>
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTimeWarning}>
                    {formatAppointmentDate(appointments[0])}
                  </Text>
                  <Text style={styles.timelineTitle}>
                    {appointments[0].provider} — {appointments[0].specialty}
                  </Text>
                  <Text style={styles.timelinePrep}>
                    💡 {getAppointmentPrep(appointments[0])}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Encouragement Card - shows when tasks complete */}
          {getTasksRemaining() === 0 && (
            <View style={styles.encouragementCard}>
              <Text style={styles.encouragementIcon}>🌿</Text>
              <View style={styles.encouragementContent}>
                <Text style={styles.encouragementText}>
                  {getEncouragementMessage()}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.encouragementButton}
                onPress={() => router.push('/coffee')}
              >
                <Text style={styles.encouragementButtonText}>Take a break</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* Calendar + Quick Access */}
        <View style={styles.bottomSection}>
          <TouchableOpacity
            style={styles.calendarCard}
            onPress={() => router.push('/calendar')}
          >
            <View style={styles.calendarLeft}>
              <Text style={styles.calendarIcon}>📅</Text>
              <Text style={styles.calendarText}>Calendar</Text>
            </View>
            <View style={styles.quickAccessRow}>
              <TouchableOpacity onPress={() => router.push('/medications')}>
                <Text style={styles.quickAccessIcon}>💊</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/vitals-log')}>
                <Text style={styles.quickAccessIcon}>❤️</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/care-summary-export')}>
                <Text style={styles.quickAccessIcon}>📊</Text>
              </TouchableOpacity>
            </View>
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
    backgroundColor: 'rgba(139, 168, 136, 0.03)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 168, 136, 0.15)',
    paddingTop: Platform.OS === 'ios' ? 56 : 48,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 24,
    color: Colors.textPrimary,
  },
  dateText: {
    fontSize: 14,
    color: Colors.textTertiary,
    marginTop: 4,
  },
  taskCount: {
    fontSize: 14,
    color: Colors.accent,
    marginTop: 8,
  },
  coffeeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(139, 90, 43, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(139, 90, 43, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coffeeIcon: {
    fontSize: 22,
  },

  // Body content
  content: {
    flex: 1,
    padding: 20,
  },

  // Timeline
  timeline: {
    position: 'relative',
    paddingLeft: 28,
  },
  timelineLine: {
    position: 'absolute',
    left: 9,
    top: 10,
    bottom: 10,
    width: 2,
    backgroundColor: Colors.border,
  },
  timelineItem: {
    position: 'relative',
    marginBottom: 28,
  },
  timelineDot: {
    position: 'absolute',
    left: -26,
    top: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotComplete: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  timelineDotAppointment: {
    backgroundColor: '#fbbf24',
    borderColor: '#fbbf24',
  },
  checkmark: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  appointmentIcon: {
    fontSize: 10,
  },
  timelineContent: {
    paddingLeft: 4,
  },
  timelineTime: {
    fontSize: 13,
    color: Colors.textTertiary,
    marginBottom: 2,
  },
  timelineTimeWarning: {
    fontSize: 13,
    color: '#fbbf24',
    marginBottom: 2,
  },
  timelineTitle: {
    fontSize: 16,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  timelineStatus: {
    fontSize: 14,
    color: Colors.textTertiary,
  },
  timelineStatusComplete: {
    color: Colors.success,
  },
  timelinePrep: {
    fontSize: 13,
    color: Colors.accent,
    marginTop: 4,
  },

  // Bottom section
  bottomSection: {
    padding: 16,
    paddingHorizontal: 20,
  },
  calendarCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  calendarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  calendarIcon: {
    fontSize: 20,
  },
  calendarText: {
    fontSize: 15,
    color: Colors.textPrimary,
  },
  quickAccessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  quickAccessIcon: {
    fontSize: 20,
    opacity: 0.8,
  },

  // Encouragement Card
  encouragementCard: {
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 8,
    padding: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(139, 168, 136, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(139, 168, 136, 0.15)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  encouragementIcon: {
    fontSize: 24,
  },
  encouragementContent: {
    flex: 1,
  },
  encouragementText: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
  },
  encouragementButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(139, 168, 136, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(139, 168, 136, 0.3)',
  },
  encouragementButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.accent,
  },
});
