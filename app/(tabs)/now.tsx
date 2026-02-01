// ============================================================================
// NOW PAGE - Progress Rings + Bottom Encouragement
// "What's happening right now?" — Quick status and timeline
// ============================================================================

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
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
import {
  shouldShowWelcomeBanner,
  dismissWelcomeBanner,
  recordVisit,
} from '../../utils/lastVisitTracker';
import { MICROCOPY } from '../../constants/microcopy';

// Prompt System
import {
  getOrientationPrompt,
  getRegulationPrompt,
  getNudgePrompt,
  getClosurePrompt,
  recordAppOpen,
  getHoursSinceLastOpen,
  isFirstOpenOfDay,
  isRapidNavigation,
  recordNavigation,
  dismissPrompt,
  isPromptDismissed,
  isOnboardingComplete,
  completeOnboarding,
  shouldShowNotificationPrompt,
  dismissNotificationPrompt,
  Prompt,
  OrientationPrompt as OrientationPromptType,
  RegulationPrompt as RegulationPromptType,
  NudgePrompt as NudgePromptType,
  ClosurePrompt as ClosurePromptType,
} from '../../utils/promptSystem';
import {
  OrientationPrompt,
  RegulationPrompt,
  NudgePrompt,
  ClosurePrompt,
  OnboardingPrompt,
  NotificationPrompt,
} from '../../components/prompts';
import * as Notifications from 'expo-notifications';

// Aurora Components
import { AuroraBackground } from '../../components/aurora/AuroraBackground';
import { ScreenHeader } from '../../components/ScreenHeader';
import { WelcomeBackBanner } from '../../components/common/WelcomeBackBanner';
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
  const [timelineExpanded, setTimelineExpanded] = useState(true);
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(false);

  // Prompt system state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const [orientationPrompt, setOrientationPrompt] = useState<OrientationPromptType | null>(null);
  const [regulationPrompt, setRegulationPrompt] = useState<RegulationPromptType | null>(null);
  const [nudgePrompt, setNudgePrompt] = useState<NudgePromptType | null>(null);
  const [showClosure, setShowClosure] = useState(false);
  const [closureMessage, setClosureMessage] = useState('');

  // Stats for progress rings
  const [todayStats, setTodayStats] = useState<TodayStats>({
    meds: { completed: 0, total: 0 },
    vitals: { completed: 0, total: 4 },
    mood: { completed: 0, total: 1 },
    meals: { completed: 0, total: 3 },
  });

  // Check for onboarding, notification prompt, and welcome banner on mount
  useEffect(() => {
    checkOnboarding();
    checkNotificationPrompt();
    checkWelcomeBanner();
  }, []);

  const checkOnboarding = async () => {
    const complete = await isOnboardingComplete();
    setShowOnboarding(!complete);
  };

  const checkNotificationPrompt = async () => {
    const shouldShow = await shouldShowNotificationPrompt();
    setShowNotificationPrompt(shouldShow);
  };

  const checkWelcomeBanner = async () => {
    const shouldShow = await shouldShowWelcomeBanner();
    setShowWelcomeBanner(shouldShow);
  };

  const handleDismissBanner = async () => {
    await dismissWelcomeBanner();
    setShowWelcomeBanner(false);
  };

  const handleShowMeWhatMatters = async () => {
    await completeOnboarding();
    setShowOnboarding(false);
    // Navigate to Record page to show what matters
    router.push('/(tabs)/record');
  };

  const handleExploreOnMyOwn = async () => {
    await completeOnboarding();
    setShowOnboarding(false);
  };

  const handleEnableNotifications = async () => {
    // Dismiss the prompt first (won't show again regardless of outcome)
    await dismissNotificationPrompt();
    setShowNotificationPrompt(false);

    // Request notification permissions
    const { status } = await Notifications.requestPermissionsAsync();
    if (status === 'granted') {
      // Navigate to notification settings so user can configure
      router.push('/notification-settings');
    }
  };

  const handleNotNowNotifications = async () => {
    await dismissNotificationPrompt();
    setShowNotificationPrompt(false);
  };

  const handleDismissRegulation = async () => {
    await dismissPrompt('regulation');
    setRegulationPrompt(null);
  };

  // Compute prompts based on current state
  const computePrompts = useCallback(async (stats: TodayStats, moodLevel: number | null) => {
    try {
      // Record navigation for rapid navigation detection
      recordNavigation();

      const hoursSinceOpen = await getHoursSinceLastOpen();
      const firstOpen = await isFirstOpenOfDay();
      const rapid = isRapidNavigation();

      // Calculate pending count (items not complete)
      const pendingCount =
        (stats.meds.total - stats.meds.completed) +
        (stats.vitals.total - stats.vitals.completed) +
        (stats.mood.total - stats.mood.completed) +
        (stats.meals.total - stats.meals.completed);

      // Calculate overdue count (for simplicity, items started but not complete)
      const overdueCount = pendingCount;

      // 1. Check for CLOSURE (all done)
      const allComplete =
        stats.meds.completed >= stats.meds.total &&
        stats.vitals.completed >= stats.vitals.total &&
        stats.mood.completed >= stats.mood.total &&
        stats.meals.completed >= stats.meals.total;

      if (allComplete && stats.meds.total + stats.vitals.total + stats.mood.total + stats.meals.total > 0) {
        const closure = getClosurePrompt();
        setClosureMessage(closure.message);
        setShowClosure(true);
        setOrientationPrompt(null);
        setRegulationPrompt(null);
        setNudgePrompt(null);
        return;
      } else {
        setShowClosure(false);
      }

      // 2. Check for REGULATION prompt (emotional support needed)
      const regDismissed = await isPromptDismissed('regulation');
      if (!regDismissed) {
        const reg = getRegulationPrompt(overdueCount, moodLevel, rapid, hoursSinceOpen);
        if (reg) {
          setRegulationPrompt(reg);
        } else {
          setRegulationPrompt(null);
        }
      } else {
        setRegulationPrompt(null);
      }

      // 3. Set ORIENTATION prompt (always show on first open or returning)
      if (firstOpen || hoursSinceOpen >= 12) {
        const orientation = getOrientationPrompt(pendingCount, firstOpen);
        setOrientationPrompt(orientation);
      } else {
        setOrientationPrompt(null);
      }

      // 4. Check for NUDGE prompt (single incomplete item suggestion)
      // Priority: meds > vitals > mood > meals
      if (stats.meds.completed < stats.meds.total && stats.meds.total > 0) {
        setNudgePrompt(getNudgePrompt('medication', '/(tabs)/record'));
      } else if (stats.vitals.completed < stats.vitals.total) {
        setNudgePrompt(getNudgePrompt('vitals', '/(tabs)/record'));
      } else if (stats.mood.completed < stats.mood.total) {
        setNudgePrompt(getNudgePrompt('mood', '/(tabs)/record'));
      } else if (stats.meals.completed < stats.meals.total) {
        setNudgePrompt(getNudgePrompt('meals', '/(tabs)/record'));
      } else {
        setNudgePrompt(null);
      }

      // Record this app open for next time
      await recordAppOpen();
    } catch (error) {
      console.error('Error computing prompts:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
      // Check if notification prompt should show (after adding meds/appointments)
      checkNotificationPrompt();
      // Record visit when screen loads
      recordVisit();
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

      const newStats = {
        meds: { completed: takenMeds, total: totalMeds },
        vitals: { completed: vitalsLogged, total: 4 },
        mood: { completed: moodLogged, total: 1 },
        meals: { completed: mealsLogged, total: 4 }, // breakfast, lunch, dinner, snack
      };
      setTodayStats(newStats);

      // Compute prompts based on current state
      const currentMoodLevel = moodLog?.mood ?? null;
      await computePrompts(newStats, currentMoodLevel);
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
    // Navigate directly to the specific log screen
    switch (type) {
      case 'meds':
        router.push('/medication-confirm');
        break;
      case 'vitals':
        router.push('/log-vitals');
        break;
      case 'mood':
        router.push('/log-mood');
        break;
      case 'meals':
        router.push('/log-meal');
        break;
    }
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
        <ScreenHeader
          title="Now"
          subtitle={showClosure ? undefined : "What needs attention today"}
          kicker={format(new Date(), 'EEEE, MMMM d')}
        />

        {/* Onboarding Prompt - First app open */}
        {showOnboarding && (
          <OnboardingPrompt
            onShowMeWhatMatters={handleShowMeWhatMatters}
            onExploreOnMyOwn={handleExploreOnMyOwn}
          />
        )}

        {/* Closure Prompt - Shows in header area when all done */}
        {showClosure && !showOnboarding && (
          <View style={styles.closureContainer}>
            <ClosurePrompt message={closureMessage} />
          </View>
        )}

        {/* Orientation Prompt - Calm text under header */}
        {orientationPrompt && !showClosure && !showOnboarding && (
          <View style={styles.orientationContainer}>
            <OrientationPrompt
              message={orientationPrompt.message}
              pendingCount={orientationPrompt.pendingCount}
            />
          </View>
        )}

        <View style={styles.content}>
            {/* Regulation Prompt - Emotional support when needed */}
            {regulationPrompt && !showOnboarding && (
              <RegulationPrompt
                message={regulationPrompt.message}
                onDismiss={handleDismissRegulation}
              />
            )}

            {/* Welcome Banner (if returning after 3+ days) */}
            {showWelcomeBanner && (
              <WelcomeBackBanner onDismiss={handleDismissBanner} />
            )}

            {/* Notification Prompt - Contextual, after meds/appointments added */}
            {showNotificationPrompt && !showOnboarding && (
              <NotificationPrompt
                onEnable={handleEnableNotifications}
                onNotNow={handleNotNowNotifications}
              />
            )}

            {/* Quick Check-In Card with Progress Rings */}
            <View style={styles.quickCheckinCard}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>{MICROCOPY.QUICK_CHECKIN}</Text>
              </View>

              <View style={styles.checkinGrid}>
                {renderProgressRing('💊', 'Meds', todayStats.meds, () => handleQuickCheck('meds'))}
                {renderProgressRing('📊', 'Vitals', todayStats.vitals, () => handleQuickCheck('vitals'))}
                {renderProgressRing('😊', 'Mood', todayStats.mood, () => handleQuickCheck('mood'))}
                {renderProgressRing('🍽️', 'Meals', todayStats.meals, () => handleQuickCheck('meals'))}
              </View>

              {/* Nudge Prompt - Single inline suggestion */}
              {nudgePrompt && !showOnboarding && (
                <NudgePrompt
                  message={nudgePrompt.message}
                  route={nudgePrompt.route}
                  category={nudgePrompt.category}
                />
              )}

              <View style={styles.openFullLog}>
                <TouchableOpacity
                  onPress={() => router.push('/(tabs)/record')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.openFullLogLink}>{MICROCOPY.OPEN_FULL_RECORD} →</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Timeline Section */}
            <TouchableOpacity
              style={styles.sectionHeaderRow}
              onPress={() => setTimelineExpanded(!timelineExpanded)}
              activeOpacity={0.7}
            >
              <Text style={styles.sectionTitle}>{MICROCOPY.TODAYS_SCHEDULE}</Text>
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
                <Text style={styles.emptyTimelineText}>{MICROCOPY.ALL_CAUGHT_UP}</Text>
              </View>
            )}

            {/* Encouragement Message at Bottom */}
            <View style={styles.encouragement}>
              <Text style={styles.encouragementTitle}>{MICROCOPY.ONE_STEP}</Text>
              <Text style={styles.encouragementSubtitle}>{MICROCOPY.YOU_GOT_THIS}</Text>
            </View>
          </View>

        {/* Bottom spacing for tab bar */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },

  // Prompt Containers
  closureContainer: {
    paddingHorizontal: 20,
    marginTop: -4,
  },
  orientationContainer: {
    paddingHorizontal: 20,
    marginTop: -4,
    marginBottom: 4,
  },

  // Content
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
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
