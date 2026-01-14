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

  const getSmartGreeting = () => {
    const hour = new Date().getHours();
    const tasksLeft = medications.filter(m => !m.taken).length;
    const hasApptToday = appointments.some(a => isToday(a.date));

    if (tasksLeft === 0) return "All done today ✨";
    if (tasksLeft === 1) return "Almost there ☀️";
    if (hasApptToday) return "Busy day ahead 📋";
    if (hour < 12) return "Good morning ☀️";
    if (hour < 17) return "Good afternoon 🌤️";
    return "Good evening 🌙";
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

  const formatDate = () => {
    const date = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
  };

  const getTasksRemaining = () => {
    return medications.filter(m => !m.taken).length;
  };

  const getDayName = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
  };

  const formatAppointmentDate = (appt: Appointment) => {
    const date = new Date(appt.date);
    if (isToday(appt.date)) return `Today at ${appt.time}`;
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return `${days[date.getDay()]} at ${appt.time}`;
  };

  const getAppointmentPrep = (appt: Appointment) => {
    // Smart prep suggestions based on appointment type
    if (appt.specialty.toLowerCase().includes('lab')) {
      return 'Fasting may be required';
    }
    if (appt.specialty.toLowerCase().includes('cardio')) {
      return 'Bring BP readings from last week';
    }
    return 'Bring medication list and insurance card';
  };

  // Group medications by time slot
  const morningMeds = medications.filter(m => m.timeSlot === 'morning');
  const eveningMeds = medications.filter(m => m.timeSlot === 'evening');

  const morningComplete = morningMeds.length > 0 && morningMeds.every(m => m.taken);
  const eveningComplete = eveningMeds.length > 0 && eveningMeds.every(m => m.taken);

  const nextAppointment = appointments[0];

  const tasksLeft = getTasksRemaining();
  const taskText = tasksLeft === 1 ? 'task' : 'tasks';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <LinearGradient
        colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        {/* Header with tinted background */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getSmartGreeting()}</Text>
            <Text style={styles.dateSubtitle}>
              {formatDate()} • {tasksLeft} {taskText} left
            </Text>
          </View>
          <TouchableOpacity style={styles.coffeeButton} onPress={() => router.push('/coffee')}>
            <Text style={styles.coffeeIcon}>☕</Text>
          </TouchableOpacity>
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
          <Text style={styles.planTitle}>{getDayName()}'s Plan</Text>

          {/* Timeline with vertical line */}
          <View style={styles.timeline}>
            <View style={styles.timelineLine} />

            {/* Morning meds */}
            {morningMeds.length > 0 && (
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, morningComplete && styles.dotComplete]} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTime}>8:00 AM</Text>
                  <Text style={styles.timelineTitle}>Morning medications</Text>
                  <Text style={[styles.timelineStatus, morningComplete && styles.statusComplete]}>
                    {morningComplete ? `${morningMeds.length} taken` : `${morningMeds.length} to take`}
                  </Text>
                </View>
              </View>
            )}

            {/* Evening meds */}
            {eveningMeds.length > 0 && (
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, eveningComplete && styles.dotComplete]} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTime}>6:00 PM</Text>
                  <Text style={styles.timelineTitle}>Evening medication</Text>
                  <Text style={styles.timelineStatus}>
                    {eveningComplete ? `${eveningMeds.length} taken` : `${eveningMeds.length} to take`}
                  </Text>
                </View>
              </View>
            )}

            {/* Next appointment with prep note */}
            {nextAppointment && (
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, styles.dotAppointment]} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTimeWarning}>{formatAppointmentDate(nextAppointment)}</Text>
                  <Text style={styles.timelineTitle}>
                    {nextAppointment.provider} — {nextAppointment.specialty}
                  </Text>
                  <Text style={styles.timelinePrep}>💡 {getAppointmentPrep(nextAppointment)}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Check-in Icons */}
          <View style={styles.checkInRow}>
            <TouchableOpacity style={styles.checkInIcon} onPress={() => router.push('/medications')}>
              <Text style={styles.checkInEmoji}>💊</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.checkInIcon} onPress={() => router.push('/appointments')}>
              <Text style={styles.checkInEmoji}>📅</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.checkInIcon} onPress={() => router.push('/vitals-log')}>
              <Text style={styles.checkInEmoji}>❤️</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.checkInIcon} onPress={() => router.push('/care-summary-export')}>
              <Text style={styles.checkInEmoji}>📊</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Calendar button at bottom */}
        <View style={styles.bottomAction}>
          <TouchableOpacity style={styles.calendarButton} onPress={() => router.push('/appointments')}>
            <Text style={styles.calendarIcon}>📅</Text>
            <Text style={styles.calendarText}>View full calendar</Text>
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

  // Header with tinted background
  header: {
    backgroundColor: 'rgba(139, 168, 136, 0.03)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 168, 136, 0.15)',
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 24,
    color: Colors.textPrimary,
  },
  dateSubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 6,
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
  planTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 22,
    color: Colors.textPrimary,
    marginBottom: 20,
  },

  // Timeline
  timeline: {
    position: 'relative',
    paddingLeft: 24,
  },
  timelineLine: {
    position: 'absolute',
    left: 6,
    top: 8,
    bottom: 8,
    width: 2,
    backgroundColor: Colors.border,
  },
  timelineItem: {
    position: 'relative',
    marginBottom: 28,
  },
  timelineDot: {
    position: 'absolute',
    left: -22,
    top: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.accent,
  },
  dotComplete: {
    backgroundColor: Colors.success,
  },
  dotAppointment: {
    backgroundColor: '#fbbf24',
  },
  timelineContent: {
    paddingLeft: 0,
  },
  timelineTime: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  timelineTimeWarning: {
    fontSize: 13,
    color: '#fbbf24',
    marginBottom: 4,
  },
  timelineTitle: {
    fontSize: 16,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  timelineStatus: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  statusComplete: {
    color: Colors.success,
  },
  timelinePrep: {
    fontSize: 13,
    color: Colors.accent,
    marginTop: 6,
  },

  // Check-in Icons
  checkInRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 24,
    marginBottom: 16,
  },
  checkInIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkInEmoji: {
    fontSize: 22,
  },

  // Bottom action
  bottomAction: {
    padding: 16,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  calendarButton: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  calendarIcon: {
    fontSize: 18,
  },
  calendarText: {
    fontSize: 14,
    color: Colors.textPrimary,
  },
});
