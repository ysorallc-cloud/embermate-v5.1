// ============================================================================
// NOW PAGE - Progress Rings + Bottom Encouragement
// "What's happening right now?" — Quick status and timeline
// ============================================================================

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, Typography } from '../../theme/theme-tokens';
import { getMedications, Medication } from '../../utils/medicationStorage';
import { getUpcomingAppointments, Appointment } from '../../utils/appointmentStorage';
import { getDailyTracking } from '../../utils/dailyTrackingStorage';
import { getVitalsForDate } from '../../utils/vitalsStorage';
import {
  getTodayMedicationLog,
  getTodayVitalsLog,
  getTodayMoodLog,
  getTodayMealsLog,
  TodayLogStatus,
  getTodayLogStatus,
} from '../../utils/centralStorage';

// Aurora Components
import { AuroraBackground } from '../../components/aurora/AuroraBackground';
import { CoffeeMomentMinimal } from '../../components/CoffeeMomentMinimal';
import { format } from 'date-fns';

interface StatData {
  completed: number;
  total: number;
}

interface TodayStats {
  meds: StatData;
  vitals: StatData;
  mood: StatData;
  meals: StatData;
}

export default function NowScreen() {
  const router = useRouter();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [dailyTracking, setDailyTracking] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [coffeeMomentVisible, setCoffeeMomentVisible] = useState(false);
  const [timelineExpanded, setTimelineExpanded] = useState(true);

  // Stats for progress rings
  const [todayStats, setTodayStats] = useState<TodayStats>({
    meds: { completed: 0, total: 0 },
    vitals: { completed: 0, total: 4 },
    mood: { completed: 0, total: 1 },
    meals: { completed: 0, total: 3 },
  });

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      // Load medications
      const meds = await getMedications();
      const activeMeds = meds.filter((m) => m.active);
      setMedications(activeMeds);

      // Load appointments
      const appts = await getUpcomingAppointments();
      setAppointments(appts);

      // Load daily tracking
      const today = new Date().toISOString().split('T')[0];
      const tracking = await getDailyTracking(today);
      setDailyTracking(tracking);

      // Load today's log status from central storage
      const status = await getTodayLogStatus();

      // Load vitals to count
      const todayVitals = await getVitalsForDate(today);
      const vitalTypes = new Set(todayVitals.map(v => v.type));
      const vitalsLogged = vitalTypes.size;

      // Calculate stats
      const takenMeds = activeMeds.filter(m => m.taken).length;
      const totalMeds = activeMeds.length;

      // Get meals from central storage
      const mealsLog = await getTodayMealsLog();
      const mealsLogged = mealsLog?.meals?.length || 0;

      // Get mood status
      const moodLog = await getTodayMoodLog();
      const moodLogged = moodLog?.mood !== null && moodLog?.mood !== undefined ? 1 : 0;

      setTodayStats({
        meds: { completed: takenMeds, total: totalMeds },
        vitals: { completed: vitalsLogged, total: 4 },
        mood: { completed: moodLogged, total: 1 },
        meals: { completed: mealsLogged, total: 3 },
      });
    } catch (error) {
      console.error('Error loading Now data:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  // Progress ring calculations
  const getProgressPercent = (completed: number, total: number) => {
    return total > 0 ? (completed / total) * 100 : 0;
  };

  const getProgressStatus = (percent: number): 'complete' | 'partial' | 'empty' => {
    if (percent >= 100) return 'complete';
    if (percent > 0) return 'partial';
    return 'empty';
  };

  const getStrokeColor = (status: string) => {
    if (status === 'complete') return '#10B981';
    if (status === 'partial') return '#FFC107';
    return 'rgba(255, 255, 255, 0.2)';
  };

  const calculateStrokeDashoffset = (percent: number) => {
    const circumference = 2 * Math.PI * 21; // radius = 21
    return circumference * (1 - percent / 100);
  };

  const handleQuickCheck = (type: 'meds' | 'vitals' | 'mood' | 'meals') => {
    // Navigate to Record page
    router.push('/(tabs)/record');
  };

  const renderProgressRing = (
    icon: string,
    label: string,
    stat: StatData,
    onPress: () => void
  ) => {
    const percent = getProgressPercent(stat.completed, stat.total);
    const status = getProgressStatus(percent);
    const strokeColor = getStrokeColor(status);
    const dashoffset = calculateStrokeDashoffset(percent);
    const circumference = 2 * Math.PI * 21;

    const statText = stat.total > 0
      ? `${stat.completed}/${stat.total}`
      : '--';

    return (
      <TouchableOpacity
        style={styles.checkinItem}
        onPress={onPress}
        activeOpacity={0.7}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`${label}. ${statText}`}
      >
        <View style={styles.ringContainer}>
          <Svg width={50} height={50} style={styles.progressRing}>
            <Circle
              cx={25}
              cy={25}
              r={21}
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth={4}
              fill="none"
            />
            <Circle
              cx={25}
              cy={25}
              r={21}
              stroke={strokeColor}
              strokeWidth={4}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashoffset}
              fill="none"
              rotation={-90}
              origin="25, 25"
            />
          </Svg>
          <Text style={styles.ringIcon}>{icon}</Text>
        </View>
        <Text style={styles.checkinLabel}>{label}</Text>
        <Text style={[styles.checkinStat, styles[`stat_${status}`]]}>
          {statText}
        </Text>
      </TouchableOpacity>
    );
  };

  // Generate timeline events based on current time and data
  const timelineEvents = useMemo(() => {
    const now = new Date();
    const currentHour = now.getHours();
    const events = [];

    // Morning wellness check (vitals)
    const vitalsRemaining = 4 - todayStats.vitals.completed;
    if (vitalsRemaining > 0) {
      events.push({
        id: 'morning-wellness',
        time: '7:00 AM',
        status: currentHour >= 7 ? 'Still available' : 'Upcoming',
        title: 'Morning wellness check',
        subtitle: vitalsRemaining === 4 ? 'Log vitals' : `Log remaining vitals`,
      });
    }

    // Morning medications
    const medsRemaining = todayStats.meds.total - todayStats.meds.completed;
    if (medsRemaining > 0 && todayStats.meds.total > 0) {
      events.push({
        id: 'morning-meds',
        time: '8:00 AM',
        status: currentHour >= 8 ? 'Still available' : 'Upcoming',
        title: 'Morning medications',
        subtitle: medsRemaining === 1 ? '1 medication remaining' : `${medsRemaining} medications remaining`,
      });
    }

    // Lunch medications (if any afternoon meds)
    const afternoonMeds = medications.filter(m => m.timeSlot === 'afternoon');
    if (afternoonMeds.length > 0) {
      events.push({
        id: 'lunch-meds',
        time: '12:00 PM',
        status: currentHour >= 12 ? 'Still available' : 'Upcoming',
        title: 'Lunch medications',
        subtitle: `${afternoonMeds.length} medication${afternoonMeds.length > 1 ? 's' : ''}`,
      });
    }

    // Add any appointments for today
    const todayAppts = appointments.filter(appt => {
      const apptDate = new Date(appt.date);
      return apptDate.toDateString() === now.toDateString();
    });
    todayAppts.forEach(appt => {
      events.push({
        id: `appt-${appt.id}`,
        time: appt.time || '12:00 PM',
        status: 'Upcoming',
        title: appt.specialty || 'Appointment',
        subtitle: appt.provider,
      });
    });

    // Evening medications
    const eveningMeds = medications.filter(m => m.timeSlot === 'evening' || m.timeSlot === 'bedtime');
    if (eveningMeds.length > 0 && currentHour < 20) {
      events.push({
        id: 'evening-meds',
        time: '6:00 PM',
        status: currentHour >= 18 ? 'Still available' : 'Upcoming',
        title: 'Evening medications',
        subtitle: `${eveningMeds.length} medication${eveningMeds.length > 1 ? 's' : ''}`,
      });
    }

    return events;
  }, [todayStats, medications, appointments]);

  return (
    <View style={styles.container}>
      <AuroraBackground variant="today" />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.accent}
            />
          }
        >
          {/* Header - Simplified */}
          <View style={styles.header}>
            <Text style={styles.date}>{format(new Date(), 'EEEE, MMMM d')}</Text>
            <View style={styles.titleRow}>
              <Text style={styles.pageTitle}>Now</Text>
              <TouchableOpacity
                style={styles.coffeeIcon}
                onPress={() => setCoffeeMomentVisible(true)}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Take a coffee moment"
              >
                <Text style={styles.coffeeEmoji}>☕</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.content}>
            {/* Quick Check-In Card with Progress Rings */}
            <View style={styles.quickCheckinCard}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>QUICK CHECK-IN</Text>
              </View>

              <View style={styles.checkinGrid}>
                {renderProgressRing('💊', 'Meds', todayStats.meds, () => handleQuickCheck('meds'))}
                {renderProgressRing('📊', 'Vitals', todayStats.vitals, () => handleQuickCheck('vitals'))}
                {renderProgressRing('😊', 'Mood', todayStats.mood, () => handleQuickCheck('mood'))}
                {renderProgressRing('🍽️', 'Meals', todayStats.meals, () => handleQuickCheck('meals'))}
              </View>

              <View style={styles.openFullLog}>
                <TouchableOpacity
                  onPress={() => router.push('/(tabs)/record')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.openFullLogLink}>Open Full Record →</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Timeline Section */}
            <TouchableOpacity
              style={styles.sectionHeaderRow}
              onPress={() => setTimelineExpanded(!timelineExpanded)}
              activeOpacity={0.7}
            >
              <Text style={styles.sectionTitle}>TODAY'S SCHEDULE</Text>
              <Text style={styles.collapseIcon}>{timelineExpanded ? '▼' : '▶'}</Text>
            </TouchableOpacity>

            {timelineExpanded && timelineEvents.map((event) => (
              <View key={event.id} style={styles.timelineEvent}>
                <View style={styles.eventIcon}>
                  <Text style={styles.eventIconEmoji}>🔔</Text>
                </View>
                <View style={styles.eventDetails}>
                  <Text style={styles.eventTime}>{event.time} • {event.status}</Text>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <Text style={styles.eventSubtitle}>{event.subtitle}</Text>
                </View>
              </View>
            ))}

            {timelineExpanded && timelineEvents.length === 0 && (
              <View style={styles.emptyTimeline}>
                <Text style={styles.emptyTimelineText}>All caught up for now!</Text>
              </View>
            )}

            {/* Encouragement Message at Bottom */}
            <View style={styles.encouragement}>
              <Text style={styles.encouragementTitle}>One step at a time</Text>
              <Text style={styles.encouragementSubtitle}>You've got this</Text>
            </View>
          </View>

          {/* Bottom spacing for tab bar */}
          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>

      {/* Coffee Moment */}
      <CoffeeMomentMinimal
        visible={coffeeMomentVisible}
        onClose={() => setCoffeeMomentVisible(false)}
        microcopy="Pause for a minute"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },

  // Header
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  date: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: 34,
    fontWeight: '300',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  coffeeIcon: {
    width: 50,
    height: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coffeeEmoji: {
    fontSize: 28,
  },

  // Content
  content: {
    padding: 20,
    paddingTop: 0,
  },

  // Quick Check-In Card
  quickCheckinCard: {
    backgroundColor: 'rgba(94, 234, 212, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(94, 234, 212, 0.25)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 25,
  },

  // Section Header
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  collapseIcon: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.5)',
  },

  // Check-in Grid
  checkinGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  checkinItem: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
  },

  // Progress Ring
  ringContainer: {
    width: 50,
    height: 50,
    marginBottom: 8,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRing: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  ringIcon: {
    fontSize: 24,
    position: 'absolute',
  },

  // Labels and Stats
  checkinLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 3,
  },
  checkinStat: {
    fontSize: 10,
    fontWeight: '500',
  },
  stat_complete: {
    color: '#10B981',
  },
  stat_partial: {
    color: '#FFC107',
  },
  stat_empty: {
    color: 'rgba(255, 255, 255, 0.4)',
  },

  // Open Full Record Link
  openFullLog: {
    alignItems: 'center',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(94, 234, 212, 0.15)',
  },
  openFullLogLink: {
    color: 'rgba(94, 234, 212, 0.7)',
    fontSize: 12,
    fontWeight: '500',
  },

  // Timeline Events
  timelineEvent: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderLeftWidth: 3,
    borderLeftColor: 'rgba(255, 193, 7, 0.4)',
    borderRadius: 8,
    padding: 12,
    paddingLeft: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  eventIcon: {
    width: 38,
    height: 38,
    backgroundColor: 'rgba(255, 193, 7, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(255, 193, 7, 0.3)',
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventIconEmoji: {
    fontSize: 16,
  },
  eventDetails: {
    flex: 1,
  },
  eventTime: {
    fontSize: 12,
    color: '#FFC107',
    fontWeight: '600',
    marginBottom: 3,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  eventSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
  },

  // Empty timeline
  emptyTimeline: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyTimelineText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
  },

  // Encouragement at Bottom
  encouragement: {
    alignItems: 'center',
    paddingVertical: 24,
    marginTop: 20,
  },
  encouragementTitle: {
    fontSize: 24,
    fontWeight: '300',
    color: '#FFFFFF',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  encouragementSubtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '400',
  },
});
