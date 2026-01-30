// ============================================================================
// TODAY PAGE - Aurora Redesign
// "What do I do now?" — Show next action, complete tasks
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, Typography } from '../_theme/theme-tokens';
import { getMedications, Medication } from '../../utils/medicationStorage';
import { getUpcomingAppointments, Appointment } from '../../utils/appointmentStorage';
import { getDailyTracking } from '../../utils/dailyTrackingStorage';
import { getSymptoms, SymptomLog } from '../../utils/symptomStorage';
import { getNotes, NoteLog } from '../../utils/noteStorage';
import { getVitals, VitalReading } from '../../utils/vitalsStorage';

// Aurora Components
import { AuroraBackground } from '../../components/aurora/AuroraBackground';
import { GlassCard } from '../../components/aurora/GlassCard';
import { StatusOrb } from '../../components/aurora/StatusOrb';
import { SectionHeader } from '../../components/aurora/SectionHeader';
import { QuickActionGrid } from '../../components/aurora/QuickActionGrid';

// Existing Components (keep functionality)
import { CoffeeMomentModal } from '../../components/CoffeeMomentModal';
import { QuickLogCard } from '../../components/today/QuickLogCard';
import { Timeline } from '../../components/today/Timeline';
import { useTimeline } from '../../hooks/useTimeline';
import { addDays, format } from 'date-fns';
import { getStreaks } from '../../utils/streakStorage';

export default function TodayScreen() {
  const router = useRouter();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [dailyTracking, setDailyTracking] = useState<any>(null);
  const [symptoms, setSymptoms] = useState<SymptomLog[]>([]);
  const [notes, setNotes] = useState<NoteLog[]>([]);
  const [vitals, setVitals] = useState<VitalReading[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [coffeeMomentVisible, setCoffeeMomentVisible] = useState(false);
  const [streakDays, setStreakDays] = useState(0);
  const [timelineExpanded, setTimelineExpanded] = useState(true);
  const [quickLogExpanded, setQuickLogExpanded] = useState(true);

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

      const allSymptoms = await getSymptoms();
      const todaySymptoms = allSymptoms.filter((s) => s.date === today);
      setSymptoms(todaySymptoms);

      const allNotes = await getNotes();
      const todayNotes = allNotes.filter((n) => n.date === today);
      setNotes(todayNotes);

      const allVitals = await getVitals();
      const todayVitals = allVitals.filter((v) => {
        const vitalDate = new Date(v.timestamp).toISOString().split('T')[0];
        return vitalDate === today;
      });
      setVitals(todayVitals);

      // Load streak data
      const streaks = await getStreaks();
      // Use wellness streak as the primary streak for display
      setStreakDays(streaks.wellnessCheck.current);
    } catch (error) {
      console.error('Error loading TODAY data:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const getDateLabel = () => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).toUpperCase();
  };

  const getStatus = () => {
    const mood = dailyTracking?.mood;
    if (!mood) return { label: 'Steady', color: Colors.green };
    if (mood >= 7) return { label: 'Great', color: Colors.green };
    if (mood >= 5) return { label: 'Steady', color: Colors.green };
    if (mood >= 3) return { label: 'Managing', color: Colors.gold };
    return { label: 'Difficult', color: Colors.red };
  };

  // Memoize greeting and message to prevent changes on every render
  const heroGreeting = useMemo(() => {
    const hour = new Date().getHours();
    const greetings = {
      morning: ['Good morning', 'Rise and shine', 'Hello sunshine', 'New day ahead'],
      afternoon: ['Good afternoon', 'Keep going', 'You\'re doing great', 'One step at a time'],
      evening: ['Good evening', 'Almost there', 'Winding down', 'Rest soon'],
    };

    if (hour < 12) {
      return greetings.morning[Math.floor(Math.random() * greetings.morning.length)];
    } else if (hour < 17) {
      return greetings.afternoon[Math.floor(Math.random() * greetings.afternoon.length)];
    } else {
      return greetings.evening[Math.floor(Math.random() * greetings.evening.length)];
    }
  }, []);

  const encouragingMessage = useMemo(() => {
    const messages = [
      'Taking care, one moment at a time',
      'You\'re doing an amazing job',
      'Small steps make big differences',
      'Every bit of care matters',
      'Being present is enough',
      'You\'ve got this',
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }, []);

  const isEvening = () => {
    return new Date().getHours() >= 17;
  };

  const isCheckInComplete = () => {
    return dailyTracking?.mood !== null && dailyTracking?.mood !== undefined;
  };

  const getTomorrowItemCount = (): number => {
    const tomorrow = addDays(new Date(), 1);
    let count = 2; // Always has morning + evening wellness checks

    const tomorrowAppts = appointments.filter((appt) => {
      const apptDate = new Date(appt.date);
      return (
        apptDate.getDate() === tomorrow.getDate() &&
        apptDate.getMonth() === tomorrow.getMonth() &&
        apptDate.getFullYear() === tomorrow.getFullYear()
      );
    });
    count += tomorrowAppts.length;

    const morningMeds = medications.filter((m) => m.timeSlot === 'morning');
    const eveningMeds = medications.filter((m) => m.timeSlot === 'evening');
    if (morningMeds.length > 0) count++;
    if (eveningMeds.length > 0) count++;

    return count;
  };

  // Transform data for timeline
  const timelineMedications = medications.map((med) => ({
    id: med.id,
    name: med.name,
    timeSlot: med.timeSlot as 'morning' | 'evening' | 'afternoon' | 'bedtime',
    scheduledHour: med.timeSlot === 'morning' ? 8 : 18,
    scheduledMinute: 0,
    taken: med.taken || false,
    takenTime: med.lastTaken ? new Date(med.lastTaken) : undefined,
  }));

  const timelineAppointments = appointments.map((apt) => ({
    id: apt.id,
    provider: apt.provider,
    specialty: apt.specialty,
    date: apt.date,
    time: apt.time || '12:00',
    location: apt.location,
  }));

  // Memoize today's date to prevent infinite re-renders in useTimeline
  const today = React.useMemo(() => new Date(), []);

  const { items: baseTimelineItems, overdueCount } = useTimeline({
    medications: timelineMedications,
    appointments: timelineAppointments,
    today,
  });

  // Enhance timeline with additional daily activities and helpful descriptions
  const enhanceTimelineItems = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const tomorrow = addDays(now, 1);

    // Helper to create a Date object for a given hour and minute today
    const createScheduledTime = (hour: number, minute: number): Date => {
      const date = new Date();
      date.setHours(hour, minute, 0, 0);
      return date;
    };

    // Check for tomorrow's appointments
    const tomorrowAppts = appointments.filter((appt) => {
      const apptDate = new Date(appt.date);
      return (
        apptDate.getDate() === tomorrow.getDate() &&
        apptDate.getMonth() === tomorrow.getMonth() &&
        apptDate.getFullYear() === tomorrow.getFullYear()
      );
    });

    // Additional daily activities to show a full day
    const dailyActivities: any[] = [
      {
        id: 'morning-wellness',
        scheduledTime: createScheduledTime(7, 0),
        scheduledHour: 7,
        scheduledMinute: 0,
        title: 'Morning wellness check',
        subtitle: 'Quick vitals and mood log to start your day',
        type: 'wellness',
        status: currentHour >= 8 ? 'overdue' : 'upcoming',
      },
      {
        id: 'breakfast-log',
        scheduledTime: createScheduledTime(8, 30),
        scheduledHour: 8,
        scheduledMinute: 30,
        title: 'Breakfast',
        subtitle: 'Log meals to track nutrition patterns',
        type: 'meal',
        status: currentHour > 8 || (currentHour === 8 && now.getMinutes() >= 30) ? 'done' : 'upcoming',
      },
      {
        id: 'hydration-reminder',
        scheduledTime: createScheduledTime(10, 0),
        scheduledHour: 10,
        scheduledMinute: 0,
        title: 'Hydration check',
        subtitle: 'Log water intake - aim for 8 glasses daily',
        type: 'hydration',
        status: currentHour >= 10 ? (currentHour >= 11 ? 'done' : 'next') : 'upcoming',
      },
      {
        id: 'lunch-log',
        scheduledTime: createScheduledTime(12, 30),
        scheduledHour: 12,
        scheduledMinute: 30,
        title: 'Lunch',
        subtitle: 'Track midday meal and energy levels',
        type: 'meal',
        status: currentHour > 12 || (currentHour === 12 && now.getMinutes() >= 30) ? 'done' : 'upcoming',
      },
      {
        id: 'afternoon-activity',
        scheduledTime: createScheduledTime(14, 0),
        scheduledHour: 14,
        scheduledMinute: 0,
        title: 'Movement & activity',
        subtitle: 'Light walk or stretching improves circulation',
        type: 'activity',
        status: currentHour >= 14 ? (currentHour >= 15 ? 'done' : 'next') : 'upcoming',
      },
      {
        id: 'symptom-check',
        scheduledTime: createScheduledTime(16, 0),
        scheduledHour: 16,
        scheduledMinute: 0,
        title: 'Symptom check-in',
        subtitle: 'Note any symptoms to track patterns',
        type: 'symptom',
        status: currentHour >= 16 ? (currentHour >= 17 ? 'done' : 'next') : 'upcoming',
      },
      {
        id: 'dinner-log',
        scheduledTime: createScheduledTime(18, 30),
        scheduledHour: 18,
        scheduledMinute: 30,
        title: 'Dinner',
        subtitle: 'Log evening meal and satisfaction',
        type: 'meal',
        status: currentHour > 18 || (currentHour === 18 && now.getMinutes() >= 30) ? 'done' : 'upcoming',
      },
    ];

    // Add appointment prep item if there are tomorrow appointments
    if (tomorrowAppts.length > 0) {
      const firstAppt = tomorrowAppts[0];
      const apptTime = firstAppt.time || '9:00 AM';
      const prepHour = currentHour >= 19 ? 19 : 19;
      const prepMinute = currentHour >= 19 ? 30 : 0;

      dailyActivities.push({
        id: 'appointment-prep',
        scheduledTime: createScheduledTime(prepHour, prepMinute),
        scheduledHour: prepHour,
        scheduledMinute: prepMinute,
        title: 'Prepare for tomorrow\'s appointment',
        subtitle: `${firstAppt.provider} at ${apptTime}. Gather meds list, insurance card, questions`,
        type: 'appointment-prep',
        status: currentHour >= prepHour ? (currentHour >= prepHour + 1 ? 'done' : 'next') : 'upcoming',
      });
    }

    // Evening wellness check
    dailyActivities.push({
      id: 'evening-wellness',
      scheduledTime: createScheduledTime(20, 0),
      scheduledHour: 20,
      scheduledMinute: 0,
      title: 'Evening wellness check',
      subtitle: 'Review your day, log mood and energy',
      type: 'wellness',
      status: currentHour >= 20 ? (currentHour >= 21 ? 'done' : 'next') : 'upcoming',
    });

    // Sleep prep
    dailyActivities.push({
      id: 'sleep-prep',
      scheduledTime: createScheduledTime(21, 30),
      scheduledHour: 21,
      scheduledMinute: 30,
      title: 'Sleep preparation',
      subtitle: 'Wind down routine for better rest',
      type: 'sleep',
      status: currentHour > 21 || (currentHour === 21 && now.getMinutes() >= 30) ? 'done' : 'upcoming',
    });

    // Convert baseTimelineItems to include scheduledHour/scheduledMinute for sorting
    const convertedBaseItems = baseTimelineItems.map((item) => {
      const scheduledTime = item.scheduledTime instanceof Date ? item.scheduledTime : new Date(item.scheduledTime);
      return {
        ...item,
        scheduledHour: scheduledTime.getHours(),
        scheduledMinute: scheduledTime.getMinutes(),
      };
    });

    // Merge with existing timeline items and sort by time
    const allItems = [...convertedBaseItems, ...dailyActivities].sort((a, b) => {
      const timeA = a.scheduledHour * 60 + (a.scheduledMinute || 0);
      const timeB = b.scheduledHour * 60 + (b.scheduledMinute || 0);
      return timeA - timeB;
    });

    return allItems;
  };

  // Memoize timeline items to prevent recalculation on every render
  const timelineItems = useMemo(() => enhanceTimelineItems(), [baseTimelineItems, appointments]);

  const tomorrowItemCount = useMemo(() => getTomorrowItemCount(), [appointments, medications]);

  // AI Insight - Based on actual app data (medications, wellness, vitals, appointments)
  // Memoized to prevent recalculation on every render
  const aiInsight = useMemo(() => {
    const now = new Date();
    const currentHour = now.getHours();
    const todayStr = now.toISOString().split('T')[0];
    const tomorrow = addDays(now, 1);

    // Calculate actual medication status
    const totalMedsCount = medications.length;
    const takenMedsCount = medications.filter((m) => m.taken).length;
    const untakenMeds = medications.filter((m) => !m.taken);
    const morningMedsOverdue = currentHour >= 12 && medications.some((m) => m.timeSlot === 'morning' && !m.taken);
    const eveningMedsOverdue = currentHour >= 22 && medications.some((m) => m.timeSlot === 'evening' && !m.taken);

    // Check wellness/mood status
    const moodLogged = dailyTracking?.mood !== null && dailyTracking?.mood !== undefined;
    const morningWellnessOverdue = currentHour >= 10 && !moodLogged;

    // Check vitals
    const vitalsLoggedToday = vitals.length > 0;

    // Check today's appointments
    const todayAppts = appointments.filter((appt) => appt.date === todayStr);
    const hasAppointmentToday = todayAppts.length > 0;

    // Check tomorrow's appointments (for prep reminder)
    const tomorrowAppts = appointments.filter((appt) => {
      const apptDate = new Date(appt.date);
      return (
        apptDate.getDate() === tomorrow.getDate() &&
        apptDate.getMonth() === tomorrow.getMonth() &&
        apptDate.getFullYear() === tomorrow.getFullYear()
      );
    });

    // Check symptoms logged today
    const symptomsLoggedToday = symptoms.length > 0;

    // Priority 1: Overdue medications (urgent)
    if (morningMedsOverdue) {
      const overdueMorningMeds = medications.filter((m) => m.timeSlot === 'morning' && !m.taken);
      return `Morning medications overdue. ${overdueMorningMeds.length} med${overdueMorningMeds.length > 1 ? 's' : ''} still need to be taken.`;
    }

    if (eveningMedsOverdue) {
      const overdueEveningMeds = medications.filter((m) => m.timeSlot === 'evening' && !m.taken);
      return `Evening medications overdue. ${overdueEveningMeds.length} med${overdueEveningMeds.length > 1 ? 's' : ''} still need to be taken.`;
    }

    // Priority 2: Today's appointment reminder
    if (hasAppointmentToday) {
      const nextAppt = todayAppts[0];
      return `Appointment today with ${nextAppt.provider} at ${nextAppt.time}. Have questions and med list ready.`;
    }

    // Priority 3: Morning wellness check overdue
    if (morningWellnessOverdue) {
      return `Morning wellness check not logged yet. A quick check-in helps track patterns over time.`;
    }

    // Priority 4: Medications due soon (time-based reminders)
    if (currentHour >= 7 && currentHour < 10 && untakenMeds.some((m) => m.timeSlot === 'morning')) {
      const morningMeds = untakenMeds.filter((m) => m.timeSlot === 'morning');
      return `Morning medications ready. ${morningMeds.length} med${morningMeds.length > 1 ? 's' : ''} to take with breakfast.`;
    }

    if (currentHour >= 17 && currentHour < 20 && untakenMeds.some((m) => m.timeSlot === 'evening')) {
      const eveningMeds = untakenMeds.filter((m) => m.timeSlot === 'evening');
      return `Evening medications due soon. ${eveningMeds.length} med${eveningMeds.length > 1 ? 's' : ''} to take with dinner.`;
    }

    // Priority 5: Tomorrow's appointment prep (evening reminder)
    if (currentHour >= 18 && tomorrowAppts.length > 0) {
      const appt = tomorrowAppts[0];
      return `Appointment tomorrow with ${appt.provider}. Good time to prepare questions and gather documents.`;
    }

    // Priority 6: Vitals reminder (morning is best)
    if (currentHour >= 6 && currentHour < 10 && !vitalsLoggedToday) {
      return `Morning is ideal for vitals. Blood pressure and weight are most consistent after waking.`;
    }

    // Priority 7: Streak celebration
    if (streakDays >= 7) {
      return `${streakDays} day streak! Consistent tracking reveals valuable health patterns.`;
    } else if (streakDays >= 3) {
      return `${streakDays} day streak! Keep it going—patterns become clearer with each day.`;
    }

    // Priority 8: All caught up celebration
    if (totalMedsCount > 0 && takenMedsCount === totalMedsCount && moodLogged) {
      if (vitalsLoggedToday) {
        return `All caught up! Medications taken, mood logged, vitals recorded. Great caregiving today.`;
      }
      return `Medications complete and mood logged. Consider logging vitals when convenient.`;
    }

    if (totalMedsCount > 0 && takenMedsCount === totalMedsCount) {
      return `All ${totalMedsCount} medication${totalMedsCount > 1 ? 's' : ''} taken today. Well done staying on schedule!`;
    }

    // Priority 9: Evening wind-down
    if (currentHour >= 20 && !isCheckInComplete()) {
      return `Evening check-in time. Log how the day went to track patterns.`;
    }

    // Priority 10: Symptom tracking encouragement (if symptoms were logged)
    if (symptomsLoggedToday) {
      return `${symptoms.length} symptom${symptoms.length > 1 ? 's' : ''} logged today. Tracking helps identify triggers.`;
    }

    // Default: Context-aware encouragement
    if (currentHour < 12) {
      return `Good morning! Start the day with a wellness check and medications.`;
    } else if (currentHour < 17) {
      return `Afternoon check: How is energy and hydration? Small logs add up.`;
    } else {
      return `Evening approaching. Review the day and prepare for a restful night.`;
    }
  }, [medications, dailyTracking, vitals, appointments, symptoms, streakDays]);

  // Calculate wellness status (morning/evening checkins)
  const wellnessComplete = dailyTracking?.mood ? 1 : 0;
  const totalWellness = isEvening() ? 2 : 1; // Morning check always required, evening after 5pm

  // Calculate med adherence
  const totalMeds = medications.length;
  const takenMeds = medications.filter((m) => m.taken).length;
  const adherencePercent = totalMeds > 0 ? Math.round((takenMeds / totalMeds) * 100) : 100;

  // Get mood display
  const todayMood = dailyTracking?.mood ? `${dailyTracking.mood}/10` : '—';

  // Quick actions - preserve existing navigation (memoized)
  const quickActions = useMemo(() => [
    {
      icon: '💊',
      label: 'Meds',
      onPress: () => router.push('/medication-confirm'),
    },
    {
      icon: '😊',
      label: 'Mood',
      onPress: () => router.push('/log-mood'),
    },
    {
      icon: '❤️',
      label: 'Vitals',
      onPress: () => router.push('/log-vitals'),
    },
    {
      icon: '📅',
      label: 'Calendar',
      onPress: () => router.push('/appointments'),
    },
  ], [router]);

  return (
    <View style={styles.container}>
      <AuroraBackground variant="today" />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.accent}
            />
          }
        >
          {/* Header - Dynamic greeting with encouraging message */}
          <View style={styles.header}>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerLabel}>YOUR DAY</Text>
              <Text style={styles.headerTitle}>{heroGreeting}</Text>
              <Text style={styles.headerSubtitle}>{encouragingMessage}</Text>
            </View>
            <TouchableOpacity
              style={styles.pauseButton}
              onPress={() => setCoffeeMomentVisible(true)}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Take a coffee moment"
              accessibilityHint="Opens a brief mindfulness break for caregivers"
            >
              <Text style={styles.pauseIcon} importantForAccessibility="no-hide-descendants">☕</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Check-In Card - Primary CTA */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/quick-checkin')}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Quick Check-In. Vitals, meds, mood, all in one flow"
            accessibilityHint="Opens the quick check-in wizard"
          >
            <GlassCard style={styles.quickCheckinCard}>
              <View style={styles.quickCheckinContent}>
                <View style={styles.quickCheckinIcon}>
                  <Text style={styles.quickCheckinIconText}>📋</Text>
                </View>
                <View style={styles.quickCheckinText}>
                  <Text style={styles.quickCheckinTitle}>Quick Check-In</Text>
                  <Text style={styles.quickCheckinSubtitle}>
                    Vitals, meds, mood — all in one flow
                  </Text>
                </View>
                <Text style={styles.quickCheckinArrow}>→</Text>
              </View>
            </GlassCard>
          </TouchableOpacity>

          {/* AI Insight Card */}
          <GlassCard style={styles.insightCard}>
            <View style={styles.insightContent}>
              <View style={styles.insightIcon}>
                <Text style={styles.insightIconText}>✨</Text>
              </View>
              <View style={styles.insightText}>
                <Text style={styles.insightTitle}>AI Insight</Text>
                <Text style={styles.insightMessage}>
                  {aiInsight}
                </Text>
              </View>
              {streakDays > 0 && (
                <View style={styles.streakBadge}>
                  <Text style={styles.streakEmoji}>🔥</Text>
                  <Text style={styles.streakText}>{streakDays}</Text>
                </View>
              )}
            </View>
          </GlassCard>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Collapsible Timeline Section */}
          <View style={styles.section}>
            <TouchableOpacity
              onPress={() => setTimelineExpanded(!timelineExpanded)}
              activeOpacity={0.7}
              style={styles.timelineHeader}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`Today's Schedule. ${timelineExpanded ? 'Expanded' : 'Collapsed'}`}
              accessibilityHint={timelineExpanded ? 'Tap to collapse' : 'Tap to expand'}
              accessibilityState={{ expanded: timelineExpanded }}
            >
              <SectionHeader title="Today's Schedule" />
              <Text style={styles.collapseIcon} importantForAccessibility="no-hide-descendants">
                {timelineExpanded ? '▼' : '▶'}
              </Text>
            </TouchableOpacity>

            {timelineExpanded && (
              <Timeline items={timelineItems} tomorrowCount={tomorrowItemCount} onRefresh={loadData} />
            )}
          </View>

          {/* Quick Log - Collapsible Separate Card */}
          <View style={styles.section}>
            <TouchableOpacity
              onPress={() => setQuickLogExpanded(!quickLogExpanded)}
              activeOpacity={0.7}
              style={styles.quickLogHeader}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`Quick Log. ${quickLogExpanded ? 'Expanded' : 'Collapsed'}`}
              accessibilityHint={quickLogExpanded ? 'Tap to collapse' : 'Tap to expand'}
              accessibilityState={{ expanded: quickLogExpanded }}
            >
              <SectionHeader title="Quick Log" />
              <Text style={styles.collapseIcon} importantForAccessibility="no-hide-descendants">
                {quickLogExpanded ? '▼' : '▶'}
              </Text>
            </TouchableOpacity>

            {quickLogExpanded && (
              <GlassCard>
                <View style={styles.quickLogContainer}>
                  <View style={styles.quickLogGrid}>
                    {quickActions.map((action, i) => (
                      <TouchableOpacity
                        key={i}
                        style={styles.quickLogButton}
                        onPress={action.onPress}
                        activeOpacity={0.7}
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel={`Log ${action.label}`}
                        accessibilityHint={`Tap to log ${action.label.toLowerCase()}`}
                      >
                        <View style={styles.quickLogAction}>
                          <Text style={styles.quickLogIcon} importantForAccessibility="no-hide-descendants">{action.icon}</Text>
                          <Text style={styles.quickLogText} importantForAccessibility="no-hide-descendants">{action.label}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* More Options Button */}
                  <TouchableOpacity
                    style={styles.moreOptionsButton}
                    onPress={() => router.push('/log')}
                    activeOpacity={0.7}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel="More logging options"
                    accessibilityHint="Opens the full log screen with all logging options"
                  >
                    <Text style={styles.moreOptionsIcon} importantForAccessibility="no-hide-descendants">➕</Text>
                    <Text style={styles.moreOptionsText} importantForAccessibility="no-hide-descendants">More options</Text>
                  </TouchableOpacity>
                </View>
              </GlassCard>
            )}
          </View>

          {/* Evening Check-in Prompt */}
          {isEvening() && !isCheckInComplete() && (
            <GlassCard
              style={styles.checkInCard}
              glow={Colors.purpleGlow}
            >
              <TouchableOpacity
                style={styles.checkInButton}
                onPress={() => router.push('/daily-checkin')}
                activeOpacity={0.7}
              >
                <Text style={styles.checkInIcon}>🌙</Text>
                <View style={styles.checkInContent}>
                  <Text style={styles.checkInTitle}>Evening check-in</Text>
                  <Text style={styles.checkInSubtitle}>Log mood, energy, meals</Text>
                </View>
                <Text style={styles.checkInArrow}>→</Text>
              </TouchableOpacity>
            </GlassCard>
          )}

          {/* Encouragement Footer */}
          <View style={styles.encouragement}>
            <Text style={styles.encouragementText}>
              ✨ You're doing great. One thing at a time.
            </Text>
          </View>

          {/* Bottom spacing for tab bar */}
          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>

      {/* Coffee Moment Modal - UNCHANGED */}
      <CoffeeMomentModal
        visible={coffeeMomentVisible}
        onClose={() => setCoffeeMomentVisible(false)}
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
  scrollContent: {
    padding: Spacing.xl,
  },

  // Header - Dynamic greeting with encouraging message
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xl,
    paddingTop: Spacing.sm,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerLabel: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  headerTitle: {
    ...Typography.displayMedium,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  pauseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseIcon: {
    fontSize: 22,
  },

  // Quick Check-In Card
  quickCheckinCard: {
    backgroundColor: `${Colors.accent}12`,
    borderColor: `${Colors.accent}35`,
    marginBottom: Spacing.md,
  },
  quickCheckinContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  quickCheckinIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: `${Colors.accent}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickCheckinIconText: {
    fontSize: 22,
  },
  quickCheckinText: {
    flex: 1,
  },
  quickCheckinTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.accent,
    marginBottom: 2,
  },
  quickCheckinSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  quickCheckinArrow: {
    fontSize: 20,
    color: Colors.accent,
  },

  // AI Insight Card
  insightCard: {
    backgroundColor: `${Colors.purple}08`,
    borderColor: `${Colors.purple}25`,
    marginBottom: Spacing.xl,
  },
  insightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  insightIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${Colors.purple}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightIconText: {
    fontSize: 20,
  },
  insightText: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.purple,
    marginBottom: 4,
  },
  insightMessage: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: `${Colors.amber}15`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  streakEmoji: {
    fontSize: 14,
  },
  streakText: {
    fontSize: 12,
    color: Colors.amber,
    fontWeight: '600',
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: Colors.glassBorder,
    marginVertical: Spacing.xl,
    marginHorizontal: Spacing.md,
  },

  // Sections
  section: {
    marginBottom: Spacing.xxl,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  collapseIcon: {
    fontSize: 12,
    color: Colors.textMuted,
    marginLeft: Spacing.sm,
  },

  // Quick Log - Collapsible
  quickLogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  quickLogContainer: {
    padding: Spacing.md,
  },
  quickLogGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  quickLogButton: {
    flex: 1,
  },
  quickLogAction: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  quickLogIcon: {
    fontSize: 32,
    marginBottom: 2,
  },
  quickLogText: {
    fontSize: 10,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  moreOptionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.glassBorder,
    marginTop: Spacing.xs,
  },
  moreOptionsIcon: {
    fontSize: 16,
    color: Colors.accent,
  },
  moreOptionsText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
  },

  // Quick Actions - Compact
  quickActionsSection: {
    marginBottom: Spacing.lg,
  },

  // Evening Check-in
  checkInCard: {
    backgroundColor: `${Colors.purple}08`,
    borderColor: Colors.purpleBorder,
    marginBottom: Spacing.xxl,
  },
  checkInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  checkInIcon: {
    fontSize: 24,
  },
  checkInContent: {
    flex: 1,
  },
  checkInTitle: {
    ...Typography.body,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  checkInSubtitle: {
    ...Typography.bodySmall,
    color: Colors.purple,
  },
  checkInArrow: {
    fontSize: 20,
    color: Colors.purple,
  },

  // Encouragement
  encouragement: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  encouragementText: {
    ...Typography.bodySmall,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
