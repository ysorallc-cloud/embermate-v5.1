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

interface AIInsight {
  icon: string;
  title: string;
  message: string;
  type: 'positive' | 'suggestion' | 'reminder' | 'celebration';
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

  // AI Insight
  const [aiInsight, setAiInsight] = useState<AIInsight | null>(null);

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

  // Generate AI Insight based on today's data and upcoming events
  const generateAIInsight = useCallback((
    stats: TodayStats,
    moodLevel: number | null,
    todayAppointments: Appointment[],
    meds: Medication[]
  ): AIInsight | null => {
    const now = new Date();
    const currentHour = now.getHours();
    const insights: AIInsight[] = [];

    // Calculate actual data summaries
    const totalLogged = stats.meds.completed + stats.vitals.completed + stats.mood.completed + stats.meals.completed;
    const medsRemaining = stats.meds.total - stats.meds.completed;
    const eveningMeds = meds.filter(m => m.timeSlot === 'evening' || m.timeSlot === 'bedtime');
    const eveningMedsRemaining = eveningMeds.filter(m => !m.taken).length;

    // CELEBRATION: Strong progress today
    if (stats.meds.completed === stats.meds.total && stats.meds.total > 0 &&
        stats.mood.completed > 0 && stats.meals.completed >= 3) {
      insights.push({
        icon: '🌟',
        title: 'Strong day of care',
        message: `${stats.meds.completed} medications logged, mood tracked, and ${stats.meals.completed} meals recorded. Consistent tracking like this helps you spot patterns and gives doctors better information during visits. Keep it up!`,
        type: 'celebration',
      });
    }

    // REMINDER: Upcoming appointment today (future-looking with context)
    if (todayAppointments.length > 0) {
      const nextAppt = todayAppointments[0];
      insights.push({
        icon: '📅',
        title: 'Appointment today',
        message: `${nextAppt.specialty || 'Appointment'} with ${nextAppt.provider}${nextAppt.time ? ` at ${nextAppt.time}` : ''}. Having recent vitals and medication logs ready can make the visit more productive.`,
        type: 'reminder',
      });
    }

    // REMINDER: Evening medications coming up (future-looking with context)
    if (currentHour >= 16 && currentHour < 20 && eveningMedsRemaining > 0) {
      insights.push({
        icon: '🌙',
        title: 'Evening meds coming up',
        message: `${eveningMedsRemaining} evening medication${eveningMedsRemaining > 1 ? 's' : ''} still to go. Taking medications at consistent times helps maintain stable levels in the body and can improve effectiveness.`,
        type: 'reminder',
      });
    }

    // POSITIVE: Medications complete with context
    if (stats.meds.completed > 0 && stats.meds.completed === stats.meds.total && stats.meds.total > 0) {
      insights.push({
        icon: '💊',
        title: 'Medications complete',
        message: `All ${stats.meds.total} medication${stats.meds.total > 1 ? 's' : ''} logged today. Medication adherence is one of the most impactful things you can do for their health. Great work staying on top of it.`,
        type: 'positive',
      });
    }

    // POSITIVE: Mood insight with context
    if (moodLevel) {
      if (moodLevel >= 4) {
        insights.push({
          icon: '💚',
          title: 'Positive mood today',
          message: moodLevel === 5
            ? "They're feeling great! Positive days are worth noting—tracking mood over time helps you see what activities or routines contribute to better days."
            : "Good spirits logged. Noticing these moments helps you identify what's working well in their care routine.",
          type: 'positive',
        });
      } else if (moodLevel <= 2) {
        insights.push({
          icon: '💙',
          title: 'A harder day',
          message: "Difficult days are part of the journey. Logging them helps you track patterns and share context with healthcare providers. Your presence matters more than you know.",
          type: 'positive',
        });
      }
    }

    // POSITIVE: Meals tracking with context
    if (stats.meals.completed >= 3) {
      insights.push({
        icon: '🍽️',
        title: 'Meals well tracked',
        message: `${stats.meals.completed} meals logged. Tracking nutrition helps you notice appetite changes early—often one of the first signs of health shifts. You're building valuable data.`,
        type: 'positive',
      });
    }

    // POSITIVE: Vitals logged with context
    if (stats.vitals.completed >= 2) {
      insights.push({
        icon: '📊',
        title: 'Vitals captured',
        message: `${stats.vitals.completed} vitals recorded today. Regular tracking creates a baseline that makes it easier to spot meaningful changes and have informed conversations with doctors.`,
        type: 'positive',
      });
    }

    // SUGGESTION: Morning with pending meds
    if (currentHour >= 6 && currentHour < 11 && medsRemaining > 0 && stats.meds.total > 0) {
      insights.push({
        icon: '🌅',
        title: 'Morning medications',
        message: `${medsRemaining} of ${stats.meds.total} medication${medsRemaining > 1 ? 's' : ''} still to log. Morning routines help establish consistency, which makes it easier to remember over time.`,
        type: 'suggestion',
      });
    }

    // SUGGESTION: Afternoon - check meals
    if (currentHour >= 12 && currentHour < 15 && stats.meals.completed < 2) {
      insights.push({
        icon: '🍽️',
        title: 'Lunchtime check-in',
        message: `${stats.meals.completed} of 4 meals logged so far. Even quick notes about appetite help you track nutrition patterns that might be worth mentioning to their doctor.`,
        type: 'suggestion',
      });
    }

    // SUGGESTION: No data yet today
    if (totalLogged === 0 && currentHour >= 8) {
      insights.push({
        icon: '✨',
        title: 'Fresh start today',
        message: "No logs yet—and that's okay. Start with whatever feels most natural. Even logging one thing builds the habit that makes caregiving easier over time.",
        type: 'suggestion',
      });
    }

    // SUGGESTION: Good progress mid-day
    if (currentHour >= 11 && currentHour < 17 && totalLogged >= 2 && totalLogged < 6) {
      insights.push({
        icon: '👍',
        title: 'Building momentum',
        message: `${totalLogged} items logged so far. Each entry adds to a clearer picture of their health over time—helpful for you and for their care team.`,
        type: 'suggestion',
      });
    }

    // Return the most relevant insight (priority: celebration > reminder > positive > suggestion)
    const priorityOrder = ['celebration', 'reminder', 'positive', 'suggestion'];
    for (const priority of priorityOrder) {
      const match = insights.find(i => i.type === priority);
      if (match) return match;
    }

    return null;
  }, []);

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
      // Priority: meds > mood > meals (vitals excluded from nudges)
      if (stats.meds.completed < stats.meds.total && stats.meds.total > 0) {
        setNudgePrompt(getNudgePrompt('medication', '/(tabs)/record'));
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

      // Generate AI Insight
      const todayAppts = appts.filter(appt => {
        const apptDate = new Date(appt.date);
        return apptDate.toDateString() === new Date().toDateString();
      });
      const insight = generateAIInsight(newStats, currentMoodLevel, todayAppts, activeMeds);
      setAiInsight(insight);
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
    const events: Array<{
      id: string;
      time: string;
      status: string;
      title: string;
      subtitle: string;
      icon?: string;
    }> = [];

    // Morning routine - always show
    const morningComplete = todayStats.meds.completed > 0 || todayStats.vitals.completed > 0;
    events.push({
      id: 'morning-routine',
      time: '8:00 AM',
      status: morningComplete ? 'Completed' : (currentHour >= 8 ? 'Available now' : 'Upcoming'),
      title: 'Morning routine',
      subtitle: morningComplete
        ? `${todayStats.meds.completed > 0 ? 'Meds logged' : ''}${todayStats.meds.completed > 0 && todayStats.vitals.completed > 0 ? ', ' : ''}${todayStats.vitals.completed > 0 ? 'vitals checked' : ''}`
        : 'Medications, vitals check',
      icon: '🌅',
    });

    // Physical therapy / exercise - sample recurring event
    events.push({
      id: 'pt-exercise',
      time: '10:30 AM',
      status: currentHour >= 11 ? 'Completed' : (currentHour >= 10 ? 'Available now' : 'Upcoming'),
      title: 'Light stretching',
      subtitle: '15 min gentle movement routine',
      icon: '🧘',
    });

    // Add any actual appointments for today
    const todayAppts = appointments.filter(appt => {
      const apptDate = new Date(appt.date);
      return apptDate.toDateString() === now.toDateString();
    });
    todayAppts.forEach(appt => {
      events.push({
        id: `appt-${appt.id}`,
        time: appt.time || '2:00 PM',
        status: 'Upcoming',
        title: appt.specialty || 'Appointment',
        subtitle: appt.provider,
        icon: '📅',
      });
    });

    // If no appointments, show sample appointment
    if (todayAppts.length === 0) {
      events.push({
        id: 'sample-appt',
        time: '2:00 PM',
        status: currentHour >= 14 ? 'Completed' : 'Upcoming',
        title: 'Dr. Martinez - Cardiology',
        subtitle: 'Follow-up visit, bring medication list',
        icon: '🏥',
      });
    }

    // Evening routine
    const eveningMeds = medications.filter(m => m.timeSlot === 'evening' || m.timeSlot === 'bedtime');
    const eveningMedsCount = eveningMeds.length > 0 ? eveningMeds.length : 2;
    const eveningComplete = eveningMeds.length > 0 ? eveningMeds.every(m => m.taken) : false;
    events.push({
      id: 'evening-routine',
      time: '6:00 PM',
      status: eveningComplete ? 'Completed' : (currentHour >= 18 ? 'Available now' : 'Upcoming'),
      title: 'Evening routine',
      subtitle: `${eveningMedsCount} medications, dinner, relaxation`,
      icon: '🌙',
    });

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

            {/* AI Insight Card - At top of content */}
            {aiInsight && (
              <View style={[
                styles.aiInsightCard,
                aiInsight.type === 'celebration' && styles.aiInsightCelebration,
                aiInsight.type === 'reminder' && styles.aiInsightReminder,
                aiInsight.type === 'positive' && styles.aiInsightPositive,
              ]}>
                <View style={styles.aiInsightHeader}>
                  <Text style={styles.aiInsightDate}>{format(new Date(), 'EEEE, MMMM d')}</Text>
                  <View style={styles.aiInsightBadge}>
                    <Text style={styles.aiInsightBadgeText}>AI INSIGHT</Text>
                  </View>
                </View>
                <View style={styles.aiInsightBody}>
                  <Text style={styles.aiInsightIcon}>{aiInsight.icon}</Text>
                  <View style={styles.aiInsightContent}>
                    <Text style={styles.aiInsightTitle}>{aiInsight.title}</Text>
                    <Text style={styles.aiInsightMessage}>{aiInsight.message}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Progress Section - Below AI Insight */}
            <View style={styles.progressSection}>
              <Text style={styles.sectionTitle}>PROGRESS</Text>
              <View style={styles.progressGrid}>
                {renderProgressRing('💊', 'Meds', todayStats.meds, () => handleQuickCheck('meds'))}
                {renderProgressRing('📊', 'Vitals', todayStats.vitals, () => handleQuickCheck('vitals'))}
                {renderProgressRing('😊', 'Mood', todayStats.mood, () => handleQuickCheck('mood'))}
                {renderProgressRing('🍽️', 'Meals', todayStats.meals, () => handleQuickCheck('meals'))}
              </View>
            </View>

            {/* Nudge Prompt - Single inline suggestion */}
            {nudgePrompt && !showOnboarding && (
              <NudgePrompt
                message={nudgePrompt.message}
                route={nudgePrompt.route}
                category={nudgePrompt.category}
              />
            )}

            {/* Check-In Button */}
            <TouchableOpacity
              style={styles.checkinButton}
              onPress={() => router.push('/quick-checkin')}
              activeOpacity={0.7}
            >
              <Text style={styles.checkinButtonText}>✏️ Check-In</Text>
            </TouchableOpacity>

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
              <View
                key={event.id}
                style={[
                  styles.timelineEvent,
                  event.status === 'Completed' && styles.timelineEventCompleted,
                ]}
              >
                <View style={[
                  styles.eventIcon,
                  event.status === 'Completed' && styles.eventIconCompleted,
                ]}>
                  <Text style={styles.eventIconEmoji}>{event.icon || '🔔'}</Text>
                </View>
                <View style={styles.eventDetails}>
                  <Text style={[
                    styles.eventTime,
                    event.status === 'Completed' && styles.eventTimeCompleted,
                  ]}>
                    {event.time} • {event.status}
                  </Text>
                  <Text style={[
                    styles.eventTitle,
                    event.status === 'Completed' && styles.eventTitleCompleted,
                  ]}>
                    {event.title}
                  </Text>
                  <Text style={styles.eventSubtitle}>{event.subtitle}</Text>
                </View>
              </View>
            ))}

            {timelineExpanded && timelineEvents.length === 0 && (
              <View style={styles.emptyTimeline}>
                <Text style={styles.emptyTimelineText}>{MICROCOPY.ALL_CAUGHT_UP}</Text>
              </View>
            )}

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

  // Progress Section
  progressSection: {
    marginBottom: 16,
  },
  progressGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },

  // Check-In Button
  checkinButton: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(94, 234, 212, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(94, 234, 212, 0.25)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  checkinButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.accent,
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

  // Progress Item
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

  // AI Insight Card
  aiInsightCard: {
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.25)',
    borderRadius: 16,
    padding: 18,
    marginBottom: 25,
  },
  aiInsightCelebration: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  aiInsightReminder: {
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
    borderColor: 'rgba(251, 191, 36, 0.25)',
  },
  aiInsightPositive: {
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderColor: 'rgba(59, 130, 246, 0.25)',
  },
  aiInsightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  aiInsightDate: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  aiInsightBadge: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  aiInsightBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(167, 139, 250, 0.9)',
    letterSpacing: 1,
  },
  aiInsightBody: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  aiInsightIcon: {
    fontSize: 28,
    marginTop: 2,
  },
  aiInsightContent: {
    flex: 1,
  },
  aiInsightTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  aiInsightMessage: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.75)',
    lineHeight: 21,
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

  // Completed event styles
  timelineEventCompleted: {
    borderLeftColor: 'rgba(16, 185, 129, 0.4)',
    opacity: 0.7,
  },
  eventIconCompleted: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  eventTimeCompleted: {
    color: '#10B981',
  },
  eventTitleCompleted: {
    textDecorationLine: 'line-through',
    color: 'rgba(255, 255, 255, 0.6)',
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

});
