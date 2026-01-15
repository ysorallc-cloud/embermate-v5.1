// ============================================================================
// TODAY PAGE - Quick glance dashboard
// "What do I do now?" — Show next action, complete tasks
// ============================================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../_theme/theme-tokens';
import { getMedications, Medication } from '../../utils/medicationStorage';
import { getUpcomingAppointments, Appointment } from '../../utils/appointmentStorage';
import { getDailyTracking } from '../../utils/dailyTrackingStorage';

export default function TodayScreen() {
  const router = useRouter();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [dailyTracking, setDailyTracking] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      const meds = await getMedications();
      setMedications(meds.filter((m) => m.active));

      const appts = await getUpcomingAppointments();
      setAppointments(appts);

      const today = new Date().toISOString().split('T')[0];
      const tracking = await getDailyTracking(today);
      setDailyTracking(tracking);
    } catch (error) {
      console.error('Error loading TODAY data:', error);
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
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatus = () => {
    const mood = dailyTracking?.mood;
    if (!mood) return { label: 'Steady', color: Colors.green };
    if (mood >= 7) return { label: 'Great', color: Colors.green };
    if (mood >= 5) return { label: 'Steady', color: Colors.green };
    if (mood >= 3) return { label: 'Managing', color: Colors.gold };
    return { label: 'Difficult', color: Colors.red };
  };

  const getSummaryLine = () => {
    const tasksLeft = getTasksRemaining();
    const status = getStatus();

    if (tasksLeft === 0) {
      return `Mom's having a ${status.label.toLowerCase()} day. All tasks complete.`;
    }
    return `Mom's having a ${status.label.toLowerCase()} day. ${tasksLeft} task${tasksLeft !== 1 ? 's' : ''} left.`;
  };

  const getTasksRemaining = () => {
    return medications.filter((m) => !m.taken).length;
  };

  const getNextAction = () => {
    const hour = new Date().getHours();
    const morningMeds = medications.filter((m) => m.timeSlot === 'morning' && !m.taken);
    const eveningMeds = medications.filter((m) => m.timeSlot === 'evening' && !m.taken);

    if (hour < 12 && morningMeds.length > 0) {
      return {
        icon: '💊',
        title: 'Morning medications',
        subtitle: `${morningMeds.length} med${morningMeds.length !== 1 ? 's' : ''} due at 8:00 AM`,
        action: () => router.push('/medication-confirm'),
      };
    }

    if (hour >= 17 && eveningMeds.length > 0) {
      return {
        icon: '💊',
        title: 'Evening medications',
        subtitle: `${eveningMeds.length} med${eveningMeds.length !== 1 ? 's' : ''} due at 6:00 PM`,
        action: () => router.push('/medication-confirm'),
      };
    }

    return null;
  };

  const getTimelineItems = () => {
    const items = [];
    const hour = new Date().getHours();

    // Morning meds
    const morningMeds = medications.filter((m) => m.timeSlot === 'morning');
    if (morningMeds.length > 0) {
      const allTaken = morningMeds.every((m) => m.taken);
      items.push({
        time: '8:00 AM',
        title: 'Morning medications',
        status: allTaken ? `${morningMeds.length} taken` : `${morningMeds.filter(m => !m.taken).length} to take`,
        completed: allTaken,
        isPending: hour < 12 && !allTaken,
      });
    }

    // Evening meds
    const eveningMeds = medications.filter((m) => m.timeSlot === 'evening');
    if (eveningMeds.length > 0) {
      const allTaken = eveningMeds.every((m) => m.taken);
      items.push({
        time: '6:00 PM',
        title: 'Evening medications',
        status: allTaken ? `${eveningMeds.length} taken` : `${eveningMeds.filter(m => !m.taken).length} to take`,
        completed: allTaken,
        isPending: hour >= 17 && !allTaken,
      });
    }

    // Today's appointments
    const todayAppts = appointments.filter((appt) => {
      const apptDate = new Date(appt.date);
      const today = new Date();
      return (
        apptDate.getDate() === today.getDate() &&
        apptDate.getMonth() === today.getMonth() &&
        apptDate.getFullYear() === today.getFullYear()
      );
    });

    todayAppts.forEach((appt) => {
      items.push({
        time: appt.time || '—',
        title: `${appt.provider} — ${appt.specialty}`,
        status: 'Upcoming',
        completed: false,
        isPending: false,
        isAppointment: true,
      });
    });

    return items;
  };

  const isEvening = () => {
    return new Date().getHours() >= 17;
  };

  const isCheckInComplete = () => {
    return dailyTracking?.mood !== null && dailyTracking?.mood !== undefined;
  };

  const nextAction = getNextAction();
  const status = getStatus();
  const timelineItems = getTimelineItems();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              <Text style={styles.date}>{formatDate()}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: `${status.color}33` }]}>
              <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
            </View>
          </View>
          <Text style={styles.summary}>{getSummaryLine()}</Text>
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
          }
        >
          {/* UP NEXT Card */}
          {nextAction && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>UP NEXT</Text>
              <TouchableOpacity style={styles.nextActionCard} onPress={nextAction.action}>
                <Text style={styles.nextActionIcon}>{nextAction.icon}</Text>
                <View style={styles.nextActionContent}>
                  <Text style={styles.nextActionTitle}>{nextAction.title}</Text>
                  <Text style={styles.nextActionSubtitle}>{nextAction.subtitle}</Text>
                </View>
                <Text style={styles.nextActionArrow}>→</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Timeline */}
          {timelineItems.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>TODAY</Text>
              <View style={styles.timeline}>
                <View style={styles.timelineLine} />
                {timelineItems.map((item, index) => (
                  <View key={index} style={styles.timelineItem}>
                    <View
                      style={[
                        styles.timelineDot,
                        item.completed && styles.timelineDotComplete,
                        item.isPending && styles.timelineDotPending,
                        item.isAppointment && styles.timelineDotAppointment,
                      ]}
                    >
                      {item.completed && <Text style={styles.timelineDotCheck}>✓</Text>}
                    </View>
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineTime}>{item.time}</Text>
                      <Text style={styles.timelineTitle}>{item.title}</Text>
                      <Text
                        style={[
                          styles.timelineStatus,
                          item.completed && styles.timelineStatusComplete,
                          item.isPending && styles.timelineStatusPending,
                        ]}
                      >
                        {item.status}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Quick Log */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>QUICK LOG</Text>
            <View style={styles.quickLogRow}>
              <TouchableOpacity
                style={styles.quickLogButton}
                onPress={() => router.push('/symptom-log')}
              >
                <Text style={styles.quickLogIcon}>🩹</Text>
                <Text style={styles.quickLogLabel}>Symptom</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickLogButton}
                onPress={() => router.push('/vitals-log')}
              >
                <Text style={styles.quickLogIcon}>❤️</Text>
                <Text style={styles.quickLogLabel}>Vitals</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickLogButton}
                onPress={() => router.push('/quick-note')}
              >
                <Text style={styles.quickLogIcon}>📝</Text>
                <Text style={styles.quickLogLabel}>Note</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Evening Check-in Prompt */}
          {isEvening() && !isCheckInComplete() && (
            <TouchableOpacity
              style={styles.checkInCard}
              onPress={() => router.push('/daily-checkin')}
            >
              <Text style={styles.checkInIcon}>🌙</Text>
              <View style={styles.checkInContent}>
                <Text style={styles.checkInTitle}>Evening check-in</Text>
                <Text style={styles.checkInSubtitle}>Log mood, energy, meals (~60s)</Text>
              </View>
              <Text style={styles.checkInArrow}>→</Text>
            </TouchableOpacity>
          )}

          {/* Encouragement Footer */}
          <View style={styles.encouragement}>
            <Text style={styles.encouragementText}>
              ✨ You're doing great. One thing at a time.
            </Text>
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

  // Header
  header: {
    padding: 20,
    paddingTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(20, 184, 166, 0.15)',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '300',
    color: Colors.textPrimary,
  },
  date: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  summary: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 20,
  },

  // Content
  content: {
    flex: 1,
    padding: 20,
  },

  // Section
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.5,
    color: 'rgba(255, 255, 255, 0.4)',
    marginBottom: 10,
  },

  // Next Action Card
  nextActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.goldLight,
    borderWidth: 1,
    borderColor: Colors.goldBorder,
    borderRadius: 16,
    padding: 18,
    gap: 14,
  },
  nextActionIcon: {
    fontSize: 32,
  },
  nextActionContent: {
    flex: 1,
  },
  nextActionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  nextActionSubtitle: {
    fontSize: 13,
    color: Colors.gold,
  },
  nextActionArrow: {
    fontSize: 24,
    color: Colors.gold,
  },

  // Timeline
  timeline: {
    position: 'relative',
    paddingLeft: 32,
  },
  timelineLine: {
    position: 'absolute',
    left: 11,
    top: 12,
    bottom: 12,
    width: 2,
    backgroundColor: 'rgba(20, 184, 166, 0.2)',
  },
  timelineItem: {
    position: 'relative',
    marginBottom: 24,
  },
  timelineDot: {
    position: 'absolute',
    left: -30,
    top: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(20, 184, 166, 0.3)',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotComplete: {
    backgroundColor: Colors.green,
    borderColor: Colors.green,
  },
  timelineDotPending: {
    borderColor: Colors.gold,
    backgroundColor: Colors.goldLight,
  },
  timelineDotAppointment: {
    borderColor: Colors.blue,
    backgroundColor: Colors.blueLight,
  },
  timelineDotCheck: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  timelineContent: {
    paddingLeft: 8,
  },
  timelineTime: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    marginBottom: 2,
  },
  timelineTitle: {
    fontSize: 14,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  timelineStatus: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  timelineStatusComplete: {
    color: Colors.green,
  },
  timelineStatusPending: {
    color: Colors.gold,
  },

  // Quick Log
  quickLogRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickLogButton: {
    flex: 1,
    backgroundColor: 'rgba(13, 148, 136, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.15)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 6,
  },
  quickLogIcon: {
    fontSize: 20,
  },
  quickLogLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
  },

  // Evening Check-in Card
  checkInCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.purpleLight,
    borderWidth: 1,
    borderColor: Colors.purpleBorder,
    borderRadius: 14,
    padding: 16,
    gap: 12,
    marginBottom: 20,
  },
  checkInIcon: {
    fontSize: 24,
  },
  checkInContent: {
    flex: 1,
  },
  checkInTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  checkInSubtitle: {
    fontSize: 12,
    color: '#A78BFA',
  },
  checkInArrow: {
    fontSize: 20,
    color: '#A78BFA',
  },

  // Encouragement
  encouragement: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  encouragementText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
  },
});
