// ============================================================================
// TODAY PAGE - Aurora Redesign
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
import { InsightCard } from '../../components/today/InsightCard';
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
      setStreakDays(streaks.wellness.current);
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

  const getHeroWord = () => {
    const tasksLeft = medications.filter((m) => !m.taken).length;
    const hour = new Date().getHours();
    const morningMeds = medications.filter((m) => m.timeSlot === 'morning' && !m.taken);
    const isOverdue = hour > 12 && morningMeds.length > 0;

    if (isOverdue) return 'Attention';
    if (tasksLeft === 0) return 'Peaceful';
    if (tasksLeft <= 2) return 'Flowing';
    return 'Active';
  };

  const getStatusMessage = () => {
    const tasksLeft = medications.filter((m) => !m.taken).length;
    if (tasksLeft === 0) return 'All care flows smoothly today';
    if (tasksLeft === 1) return 'One task remaining';
    return `${tasksLeft} tasks to complete`;
  };

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

  const { items: timelineItems, overdueCount } = useTimeline({
    medications: timelineMedications,
    appointments: timelineAppointments,
    today: new Date(),
  });

  const tomorrowItemCount = getTomorrowItemCount();

  // Calculate wellness status (morning/evening checkins)
  const wellnessComplete = dailyTracking?.mood ? 1 : 0;
  const totalWellness = isEvening() ? 2 : 1; // Morning check always required, evening after 5pm

  // Calculate med adherence
  const totalMeds = medications.length;
  const takenMeds = medications.filter((m) => m.taken).length;
  const adherencePercent = totalMeds > 0 ? Math.round((takenMeds / totalMeds) * 100) : 100;

  // Get mood display
  const todayMood = dailyTracking?.mood ? `${dailyTracking.mood}/10` : '—';

  // Quick actions - preserve existing navigation
  const quickActions = [
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
      icon: '📝',
      label: 'Note',
      onPress: () => router.push('/log-note'),
    },
  ];

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
          {/* Header with Date */}
          <View style={styles.dateHeader}>
            <Text style={styles.dateText}>
              {format(new Date(), 'EEEE, MMMM d')}
            </Text>
            <TouchableOpacity
              style={styles.pauseButton}
              onPress={() => setCoffeeMomentVisible(true)}
            >
              <Text style={styles.pauseIcon}>☕</Text>
            </TouchableOpacity>
          </View>

          {/* Hero Section */}
          <View style={styles.hero}>
            <Text style={styles.heroWord}>{getHeroWord()}</Text>
            <Text style={styles.heroSubtext}>{getStatusMessage()}</Text>
            {streakDays > 0 && (
              <View style={styles.streakBadge}>
                <Text style={styles.streakEmoji}>🔥</Text>
                <Text style={styles.streakText}>{streakDays} day streak</Text>
              </View>
            )}
          </View>

          {/* Status Orbs */}
          <View style={styles.orbsContainer}>
            <StatusOrb
              label="Wellness"
              value={`${wellnessComplete}/${totalWellness}`}
              color={Colors.accent}
            />
            <StatusOrb
              label="Meds"
              value={`${adherencePercent}%`}
              color={Colors.green}
            />
            <StatusOrb
              label="Mood"
              value={todayMood}
              color={Colors.purple}
            />
          </View>

          {/* Quick Actions Row */}
          <View style={styles.quickActionsRow}>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => router.push('/hub/reports')}
            >
              <Text style={styles.quickActionIcon}>📊</Text>
              <Text style={styles.quickActionLabel}>Reports</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => router.push('/visit-prep')}
            >
              <Text style={styles.quickActionIcon}>📋</Text>
              <Text style={styles.quickActionLabel}>Visit Prep</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => setCoffeeMomentVisible(true)}
            >
              <Text style={styles.quickActionIcon}>☕</Text>
              <Text style={styles.quickActionLabel}>Breathe</Text>
            </TouchableOpacity>
          </View>

          {/* Alert Banner (if needed) */}
          {overdueCount > 0 && (
            <TouchableOpacity
              style={styles.alertBanner}
              onPress={() => {
                // Scroll to timeline or open medication screen
                router.push('/medication-confirm');
              }}
            >
              <Text style={styles.alertIcon}>🚨</Text>
              <View style={styles.alertContent}>
                <Text style={styles.alertTitle}>{overdueCount} Overdue Item{overdueCount > 1 ? 's' : ''}</Text>
                <Text style={styles.alertSubtitle}>Medication needs attention</Text>
              </View>
              <Text style={styles.alertChevron}>›</Text>
            </TouchableOpacity>
          )}

          {/* AI Insights */}
          <View style={styles.section}>
            <InsightCard medications={medications} />
          </View>

          {/* Timeline */}
          <View style={styles.section}>
            <Timeline items={timelineItems} tomorrowCount={tomorrowItemCount} onRefresh={loadData} />
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActionsSection}>
            <SectionHeader title="Quick Log" />
            <QuickActionGrid actions={quickActions} />
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

  // Header
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  dateText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  pauseButton: {
    padding: Spacing.sm,
  },
  pauseIcon: {
    fontSize: 20,
  },

  // Hero
  hero: {
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
  },
  heroWord: {
    ...Typography.displayLarge,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  heroSubtext: {
    ...Typography.bodyLarge,
    color: Colors.textSecondary,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.sm,
  },
  streakEmoji: {
    fontSize: 16,
  },
  streakText: {
    fontSize: 12,
    color: Colors.amber,
    fontWeight: '600',
  },

  // Orbs
  orbsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xl,
    marginBottom: Spacing.xxxl,
  },

  // Sections
  section: {
    marginBottom: Spacing.xxl,
  },

  // Quick Actions Row
  quickActionsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
  },
  quickActionIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  quickActionLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
  },

  // Alert Banner
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.redLight,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 16,
    padding: 14,
    marginBottom: Spacing.lg,
  },
  alertIcon: {
    fontSize: 20,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.red,
  },
  alertSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  alertChevron: {
    fontSize: 18,
    color: Colors.textMuted,
  },

  // Quick Actions (original section)
  quickActionsSection: {
    marginBottom: Spacing.xxl,
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
