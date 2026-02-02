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
import {
  getAllBaselines,
  getAllTodayVsBaseline,
  getNextBaselineToConfirm,
  confirmBaseline,
  rejectBaseline,
  dismissBaselinePrompt,
  BaselineData,
  TodayVsBaseline,
  BaselineCategory,
  CategoryBaseline,
  getBaselineLanguage,
  MIN_DAYS_FOR_BASELINE,
} from '../../utils/baselineStorage';

// Prompt System
import {
  getOrientationPrompt,
  getRegulationPrompt,
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
  ClosurePrompt as ClosurePromptType,
} from '../../utils/promptSystem';
import {
  OrientationPrompt,
  RegulationPrompt,
  ClosurePrompt,
  OnboardingPrompt,
  NotificationPrompt,
  BaselineConfirmPrompt,
} from '../../components/prompts';
import * as Notifications from 'expo-notifications';

// Aurora Components
import { AuroraBackground } from '../../components/aurora/AuroraBackground';
import { ScreenHeader } from '../../components/ScreenHeader';
import { WelcomeBackBanner } from '../../components/common/WelcomeBackBanner';
import { format } from 'date-fns';

// CarePlan System
import { useCarePlan } from '../../hooks/useCarePlan';
import { useAppointments } from '../../hooks/useAppointments';
import {
  buildTodaySchedule,
  groupScheduleByStatus,
  getScheduleAttentionCount,
  isScheduleComplete,
  getScheduleEntryRoute,
  ScheduleConflict,
} from '../../utils/carePlanSchedule';
import {
  ScheduleEntry,
  ScheduleStatus,
  formatMinutesAsTime,
} from '../../types/schedule';
import { routeForScheduleEntry } from '../../utils/carePlanRouting';
import {
  NoMedicationsBanner,
  NoCarePlanBanner,
  DataIntegrityBanner,
} from '../../components/common/ConsistencyBanner';

// Helper to format 24hr time (HH:MM) to display format
function formatTime(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}

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

  // CarePlan hook - provides progress, timeline, and schedule from derived state
  const { dayState, carePlan, overrides, snoozeItem, setItemOverride, integrityWarnings } = useCarePlan();

  // Appointments hook - single source of truth for appointments
  const {
    todayAppointments,
    complete: completeAppointment,
  } = useAppointments();

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

  // Baseline state
  const [baselineData, setBaselineData] = useState<BaselineData | null>(null);
  const [todayVsBaseline, setTodayVsBaseline] = useState<TodayVsBaseline[]>([]);
  const [baselineToConfirm, setBaselineToConfirm] = useState<{
    category: BaselineCategory;
    baseline: CategoryBaseline;
  } | null>(null);

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
          icon: '😊',
          title: 'Positive mood today',
          message: moodLevel === 5
            ? "They're feeling great! Positive days are worth noting—tracking mood over time helps you see what activities or routines contribute to better days."
            : "Good spirits logged. Noticing these moments helps you identify what's working well in their care routine.",
          type: 'positive',
        });
      } else if (moodLevel <= 2) {
        insights.push({
          icon: '😔',
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

    // Default fallback - always show something
    const hour = currentHour;
    if (hour < 12) {
      return {
        icon: '🌅',
        title: 'Good morning',
        message: "A new day of caregiving begins. Every small action you take matters—even just being present makes a difference.",
        type: 'suggestion',
      };
    } else if (hour < 17) {
      return {
        icon: '☀️',
        title: 'Afternoon check-in',
        message: "You're doing great. Caregiving is a marathon, not a sprint. Take a moment to appreciate your efforts today.",
        type: 'suggestion',
      };
    } else if (hour < 21) {
      return {
        icon: '🌆',
        title: 'Evening wind-down',
        message: "The day is winding down. Reflect on what went well today—consistency over perfection is what matters most.",
        type: 'suggestion',
      };
    } else {
      return {
        icon: '🌙',
        title: 'Rest well',
        message: "Another day of care complete. Rest is part of caregiving too—you can't pour from an empty cup.",
        type: 'suggestion',
      };
    }
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

  // Baseline confirmation handlers
  const handleBaselineYes = async () => {
    if (baselineToConfirm) {
      await confirmBaseline(baselineToConfirm.category);
      setBaselineToConfirm(null);
      // Check for next one to confirm
      const next = await getNextBaselineToConfirm();
      setBaselineToConfirm(next);
    }
  };

  const handleBaselineNotReally = async () => {
    if (baselineToConfirm) {
      await rejectBaseline(baselineToConfirm.category);
      setBaselineToConfirm(null);
      const next = await getNextBaselineToConfirm();
      setBaselineToConfirm(next);
    }
  };

  const handleBaselineDismiss = async () => {
    if (baselineToConfirm) {
      await dismissBaselinePrompt(baselineToConfirm.category);
      setBaselineToConfirm(null);
      const next = await getNextBaselineToConfirm();
      setBaselineToConfirm(next);
    }
  };

  // Generate baseline status messages
  const getBaselineStatusMessage = (comparison: TodayVsBaseline): { main: string; sub?: string } | null => {
    const { category, baseline, today, matchesBaseline, belowBaseline } = comparison;

    // Get confidence level from baselineData
    let categoryBaseline: CategoryBaseline | null = null;
    if (baselineData) {
      switch (category) {
        case 'meals':
          categoryBaseline = baselineData.meals;
          break;
        case 'vitals':
          categoryBaseline = baselineData.vitals;
          break;
        case 'meds':
          categoryBaseline = baselineData.meds;
          break;
      }
    }

    if (!categoryBaseline || categoryBaseline.confidence === 'none') return null;

    const { adverb } = getBaselineLanguage(categoryBaseline.confidence);
    const isConfident = categoryBaseline.confidence === 'confident';

    if (matchesBaseline) {
      switch (category) {
        case 'meals':
          return { main: isConfident ? 'Meals are on your usual routine today.' : `Meals match your ${adverb} pattern.` };
        case 'vitals':
          return { main: isConfident ? 'Vitals match your normal daily pattern.' : `Vitals are on track so far.` };
        case 'meds':
          return { main: isConfident ? 'Medications are on your usual routine.' : `Medications are going as ${adverb}.` };
        default:
          return null;
      }
    }

    if (belowBaseline) {
      switch (category) {
        case 'meals':
          return {
            main: `Meals are lower than ${adverb} so far today.`,
            sub: "That's okay. You can update this anytime.",
          };
        case 'vitals':
          return {
            main: `Vitals are lower than ${adverb} so far today.`,
            sub: "That's okay. You can update this anytime.",
          };
        case 'meds':
          return {
            main: `Medications are behind ${adverb} today.`,
            sub: "That's okay. You can update this anytime.",
          };
        default:
          return null;
      }
    }

    return null;
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
      const todayVitals = await getTodayVitalsLog();
      let vitalsLogged = 0;
      if (todayVitals) {
        if (todayVitals.systolic) vitalsLogged++;
        if (todayVitals.diastolic) vitalsLogged++;
        if (todayVitals.heartRate) vitalsLogged++;
        if (todayVitals.temperature) vitalsLogged++;
      }

      // Calculate stats
      const takenMeds = activeMeds.filter(m => m.taken).length;
      const totalMeds = activeMeds.length;

      // Get meals from central storage
      const mealsLog = await getTodayMealsLog();
      const mealsLogged = mealsLog?.meals?.length || 0;

      // Get mood status
      const moodLog = await getTodayMoodLog();
      const moodLogged = moodLog?.mood !== null && moodLog?.mood !== undefined ? 1 : 0;

      // GUARDRAIL: Only use dayState.progress when CarePlan exists
      // Never compute progress from raw logs if a CarePlan is loaded
      // Fallback logic ONLY when: no CarePlan exists OR CarePlan failed to load
      let newStats: TodayStats;

      if (carePlan && dayState?.progress) {
        // CarePlan exists - use dayState.progress as single source of truth
        const dsProgress = dayState.progress;
        newStats = {
          meds: { completed: dsProgress.meds.completed, total: dsProgress.meds.expected },
          vitals: { completed: dsProgress.vitals.completed, total: dsProgress.vitals.expected },
          mood: { completed: dsProgress.mood.completed, total: dsProgress.mood.expected },
          meals: { completed: dsProgress.meals.completed, total: dsProgress.meals.expected },
        };
      } else {
        // No CarePlan - fallback to raw log calculations
        newStats = {
          meds: { completed: takenMeds, total: totalMeds },
          vitals: { completed: vitalsLogged, total: 4 },
          mood: { completed: moodLogged, total: 1 },
          meals: { completed: mealsLogged, total: 4 },
        };
      }
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

      // Load baseline data
      const baselines = await getAllBaselines();
      setBaselineData(baselines);

      if (baselines.hasAnyBaseline) {
        const comparisons = await getAllTodayVsBaseline();
        setTodayVsBaseline(comparisons);
      }

      // Check if we should show baseline confirmation
      const toConfirm = await getNextBaselineToConfirm();
      setBaselineToConfirm(toConfirm);
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
    // Navigate to the appropriate canonical screen
    switch (type) {
      case 'meds':
        router.push('/medications');  // Canonical Understand medications screen
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

  // Build unified Today's Schedule from CarePlan + Appointments
  // This is the SINGLE SOURCE OF TRUTH for Today's Schedule
  const todaySchedule = useMemo(() => {
    return buildTodaySchedule({
      dayState,
      carePlan,
      appointments: todayAppointments, // Use appointments from hook (single source of truth)
      overrides,
      currentTime: new Date(),
    });
  }, [dayState, carePlan, todayAppointments, overrides]);

  // Destructure for convenience
  const scheduleEntries = todaySchedule.entries;
  const groupedSchedule = todaySchedule.grouped;
  const scheduleConflicts = todaySchedule.conflicts;
  const scheduleStats = todaySchedule.stats;

  // Check if schedule is complete (for closure state)
  const scheduleComplete = useMemo(() => {
    return isScheduleComplete(scheduleEntries);
  }, [scheduleEntries]);

  // Helper to get status display text
  const getStatusDisplayText = (status: ScheduleStatus): string => {
    switch (status) {
      case 'availableNow': return 'Available now';
      case 'upcoming': return 'Upcoming';
      case 'completed': return 'Completed';
      case 'missed': return 'Missed';
      case 'snoozed': return 'Snoozed';
      default: return '';
    }
  };

  // Handler for schedule item tap
  // - Care Plan items: go to logging screen with CarePlan context params
  // - Appointments: go to Understand's appointment form (canonical view/edit UI)
  const handleScheduleItemPress = useCallback((entry: ScheduleEntry) => {
    if (entry.source === 'appointment') {
      // Route to Understand's canonical appointment form (view/edit)
      router.push(`/appointment-form?id=${entry.appointmentId}` as any);
    } else if (entry.source === 'carePlan') {
      // Use routing helper to get proper route with CarePlan context
      const route = routeForScheduleEntry(entry);
      if (route) {
        router.push({
          pathname: route.pathname,
          params: route.params,
        } as any);
      } else if (entry.actionRoute) {
        // Fallback to action route without context
        router.push(entry.actionRoute as any);
      }
    }
  }, [router]);

  // Handler for completing an appointment from the schedule
  const handleAppointmentComplete = useCallback(async (appointmentId: string) => {
    await completeAppointment(appointmentId);
  }, [completeAppointment]);

  // Handler for "Later" action (snooze)
  const handleSnooze = useCallback(async (entry: ScheduleEntry) => {
    if (entry.routineId && entry.itemId) {
      await snoozeItem(entry.routineId, entry.itemId, 30); // Snooze for 30 minutes
    }
  }, [snoozeItem]);

  // Handler for manual mark as done
  const handleMarkDone = useCallback(async (entry: ScheduleEntry) => {
    if (entry.routineId && entry.itemId) {
      await setItemOverride(entry.routineId, entry.itemId, true);
    }
  }, [setItemOverride]);

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

            {/* Baseline Confirmation Prompt */}
            {baselineToConfirm && !showOnboarding && (
              <BaselineConfirmPrompt
                category={baselineToConfirm.category}
                baseline={baselineToConfirm.baseline}
                onYes={handleBaselineYes}
                onNotReally={handleBaselineNotReally}
                onDismiss={handleBaselineDismiss}
              />
            )}

            {/* Baseline Status Messages - Only show when baseline exists */}
            {todayVsBaseline.length > 0 && !showOnboarding && (
              <View style={styles.baselineStatusContainer}>
                {todayVsBaseline.map(comparison => {
                  const message = getBaselineStatusMessage(comparison);
                  if (!message) return null;
                  return (
                    <View key={comparison.category} style={[
                      styles.baselineStatus,
                      comparison.matchesBaseline && styles.baselineStatusMatch,
                      comparison.belowBaseline && styles.baselineStatusBelow,
                    ]}>
                      <Text style={styles.baselineStatusMain}>{message.main}</Text>
                      {message.sub && (
                        <Text style={styles.baselineStatusSub}>{message.sub}</Text>
                      )}
                    </View>
                  );
                })}
              </View>
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

            {/* Data Integrity Warning - Show if CarePlan has orphaned references */}
            {integrityWarnings && integrityWarnings.length > 0 && (
              <DataIntegrityBanner
                issueCount={integrityWarnings.length}
                onFix={() => router.push('/care-plan-settings' as any)}
              />
            )}

            {/* Empty State: No Medications Set Up */}
            {medications.length === 0 && !showOnboarding && (
              <NoMedicationsBanner />
            )}

            {/* Empty State: No Care Plan Set Up */}
            {!carePlan && !showOnboarding && (
              <NoCarePlanBanner onSetup={() => router.push('/care-plan-settings' as any)} />
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

            {/* Today's Schedule Section - Driven by CarePlan */}
            <TouchableOpacity
              style={styles.sectionHeaderRow}
              onPress={() => setTimelineExpanded(!timelineExpanded)}
              activeOpacity={0.7}
            >
              <View>
                <Text style={styles.sectionTitle}>{MICROCOPY.TODAYS_SCHEDULE}</Text>
                {carePlan && (
                  <Text style={styles.sectionSubtitle}>
                    {scheduleStats.carePlanItems} tasks + {scheduleStats.appointments} appointments
                  </Text>
                )}
              </View>
              <Text style={styles.collapseIcon}>{timelineExpanded ? '▼' : '▶'}</Text>
            </TouchableOpacity>

            {/* Conflict hints - show when appointments overlap with routines */}
            {timelineExpanded && scheduleConflicts.length > 0 && (
              <View style={styles.conflictHintContainer}>
                {scheduleConflicts.map((conflict, index) => (
                  <View key={`conflict-${index}`} style={styles.conflictHint}>
                    <Text style={styles.conflictHintIcon}>⚠️</Text>
                    <View style={styles.conflictHintContent}>
                      <Text style={styles.conflictHintText}>{conflict.message}</Text>
                      <Text style={styles.conflictHintSuggestion}>{conflict.suggestion}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {timelineExpanded && (
              <>
                {/* Active items (availableNow + missed) - highest priority */}
                {groupedSchedule.active.map((entry) => (
                  <TouchableOpacity
                    key={entry.id}
                    style={[
                      styles.scheduleItem,
                      entry.source === 'appointment' && styles.scheduleItemAppointment,
                      entry.status === 'missed' && styles.scheduleItemMissed,
                      entry.status === 'availableNow' && styles.scheduleItemActive,
                    ]}
                    onPress={() => handleScheduleItemPress(entry)}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.scheduleIcon,
                      entry.source === 'appointment' && styles.scheduleIconAppointment,
                      entry.status === 'missed' && styles.scheduleIconMissed,
                    ]}>
                      <Text style={styles.scheduleIconEmoji}>{entry.emoji || '🔔'}</Text>
                    </View>
                    <View style={styles.scheduleDetails}>
                      <View style={styles.scheduleTimeRow}>
                        <Text style={[
                          styles.scheduleTime,
                          entry.status === 'missed' && styles.scheduleTimeMissed,
                        ]}>
                          {formatMinutesAsTime(entry.startMin)} • {getStatusDisplayText(entry.status)}
                        </Text>
                        {entry.source === 'appointment' && (
                          <View style={styles.appointmentBadge}>
                            <Text style={styles.appointmentBadgeText}>APPT</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.scheduleTitle}>{entry.title}</Text>
                      <Text style={styles.scheduleSubtitle}>
                        {entry.subtitle}
                        {entry.completed !== undefined && entry.expected !== undefined && (
                          ` • ${entry.completed}/${entry.expected}`
                        )}
                      </Text>
                    </View>
                    <View style={[
                      styles.scheduleAction,
                      entry.source === 'appointment' && styles.scheduleActionAppointment,
                    ]}>
                      <Text style={styles.scheduleActionText}>{entry.actionLabel || 'Log'}</Text>
                    </View>
                  </TouchableOpacity>
                ))}

                {/* Upcoming items */}
                {groupedSchedule.upcoming.map((entry) => (
                  <TouchableOpacity
                    key={entry.id}
                    style={[
                      styles.scheduleItem,
                      entry.source === 'appointment' && styles.scheduleItemAppointment,
                    ]}
                    onPress={() => handleScheduleItemPress(entry)}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.scheduleIcon,
                      entry.source === 'appointment' && styles.scheduleIconAppointment,
                    ]}>
                      <Text style={styles.scheduleIconEmoji}>{entry.emoji || '🔔'}</Text>
                    </View>
                    <View style={styles.scheduleDetails}>
                      <View style={styles.scheduleTimeRow}>
                        <Text style={styles.scheduleTime}>
                          {formatMinutesAsTime(entry.startMin)} • {getStatusDisplayText(entry.status)}
                        </Text>
                        {entry.source === 'appointment' && (
                          <View style={styles.appointmentBadge}>
                            <Text style={styles.appointmentBadgeText}>APPT</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.scheduleTitle}>{entry.title}</Text>
                      <Text style={styles.scheduleSubtitle}>{entry.subtitle}</Text>
                    </View>
                  </TouchableOpacity>
                ))}

                {/* Snoozed items */}
                {groupedSchedule.snoozed.length > 0 && (
                  <View style={styles.snoozedSection}>
                    <Text style={styles.snoozedHeader}>Snoozed</Text>
                    {groupedSchedule.snoozed.map((entry) => (
                      <TouchableOpacity
                        key={entry.id}
                        style={[styles.scheduleItem, styles.scheduleItemSnoozed]}
                        onPress={() => handleScheduleItemPress(entry)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.scheduleIcon, styles.scheduleIconSnoozed]}>
                          <Text style={styles.scheduleIconEmoji}>{entry.emoji || '🔔'}</Text>
                        </View>
                        <View style={styles.scheduleDetails}>
                          <Text style={styles.scheduleTimeSnoozed}>
                            Until {formatMinutesAsTime(entry.snoozedUntilMin || 0)}
                          </Text>
                          <Text style={styles.scheduleTitleSnoozed}>{entry.title}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Completed items - collapsible */}
                {groupedSchedule.completed.length > 0 && (
                  <View style={styles.completedSection}>
                    <Text style={styles.completedHeader}>
                      Completed today ({groupedSchedule.completed.length})
                    </Text>
                    {groupedSchedule.completed.map((entry) => (
                      <View
                        key={entry.id}
                        style={[styles.scheduleItem, styles.scheduleItemCompleted]}
                      >
                        <View style={[styles.scheduleIcon, styles.scheduleIconCompleted]}>
                          <Text style={styles.scheduleIconEmoji}>{entry.emoji || '✓'}</Text>
                        </View>
                        <View style={styles.scheduleDetails}>
                          <Text style={styles.scheduleTimeCompleted}>
                            {formatMinutesAsTime(entry.startMin)} • Completed
                          </Text>
                          <Text style={styles.scheduleTitleCompleted}>{entry.title}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}

            {timelineExpanded && scheduleEntries.length === 0 && !carePlan && (
              <View style={styles.emptyTimeline}>
                <Text style={styles.emptyTimelineText}>{MICROCOPY.ALL_CAUGHT_UP}</Text>
              </View>
            )}

            {timelineExpanded && scheduleEntries.length === 0 && carePlan && (
              <View style={styles.emptyTimeline}>
                <Text style={styles.emptyTimelineText}>No items scheduled for today</Text>
                <Text style={styles.emptyTimelineSubtext}>Your Care Plan is set up, check back tomorrow</Text>
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
  emptyTimelineSubtext: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.35)',
    marginTop: 4,
  },

  // Section subtitle for "Built from Care Plan"
  sectionSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 2,
  },

  // Schedule Items (New CarePlan-driven schedule system)
  scheduleItem: {
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
  scheduleItemActive: {
    borderLeftColor: 'rgba(59, 130, 246, 0.6)',
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
  },
  scheduleItemMissed: {
    borderLeftColor: 'rgba(239, 68, 68, 0.5)',
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
  },
  scheduleItemAppointment: {
    borderLeftColor: 'rgba(139, 92, 246, 0.5)',
    backgroundColor: 'rgba(139, 92, 246, 0.06)',
  },
  scheduleItemSnoozed: {
    borderLeftColor: 'rgba(156, 163, 175, 0.4)',
    opacity: 0.7,
  },
  scheduleItemCompleted: {
    borderLeftColor: 'rgba(16, 185, 129, 0.4)',
    opacity: 0.6,
  },
  scheduleIcon: {
    width: 38,
    height: 38,
    backgroundColor: 'rgba(255, 193, 7, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(255, 193, 7, 0.3)',
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleIconMissed: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  scheduleIconAppointment: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  scheduleIconSnoozed: {
    backgroundColor: 'rgba(156, 163, 175, 0.15)',
    borderColor: 'rgba(156, 163, 175, 0.3)',
  },
  scheduleIconCompleted: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  scheduleIconEmoji: {
    fontSize: 16,
  },
  scheduleDetails: {
    flex: 1,
  },
  scheduleTime: {
    fontSize: 12,
    color: '#FFC107',
    fontWeight: '600',
  },
  scheduleTimeMissed: {
    color: '#EF4444',
  },
  scheduleTimeSnoozed: {
    color: 'rgba(156, 163, 175, 0.8)',
  },
  scheduleTimeCompleted: {
    color: '#10B981',
  },
  scheduleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  scheduleTitleSnoozed: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  scheduleTitleCompleted: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    textDecorationLine: 'line-through',
  },
  scheduleSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  scheduleTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  appointmentBadge: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  appointmentBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(167, 139, 250, 0.9)',
    letterSpacing: 0.5,
  },
  scheduleAction: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  scheduleActionAppointment: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
  },
  scheduleActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Snoozed section
  snoozedSection: {
    marginTop: 8,
    marginBottom: 8,
  },
  snoozedHeader: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.4)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },

  // Completed section
  completedSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  completedHeader: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.4)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },

  // Conflict hints
  conflictHintContainer: {
    marginBottom: 12,
    gap: 8,
  },
  conflictHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.2)',
    borderRadius: 8,
    padding: 10,
    gap: 8,
  },
  conflictHintIcon: {
    fontSize: 14,
  },
  conflictHintContent: {
    flex: 1,
  },
  conflictHintText: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  conflictHintSuggestion: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 2,
  },

  // Baseline Status
  baselineStatusContainer: {
    marginBottom: 16,
    gap: 6,
  },
  baselineStatus: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  baselineStatusMatch: {
    borderLeftWidth: 3,
    borderLeftColor: 'rgba(16, 185, 129, 0.4)',
  },
  baselineStatusBelow: {
    borderLeftWidth: 3,
    borderLeftColor: 'rgba(251, 191, 36, 0.4)',
  },
  baselineStatusMain: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 18,
  },
  baselineStatusSub: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 2,
  },

});
