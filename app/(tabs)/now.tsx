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
import { useDailyCareInstances } from '../../hooks/useDailyCareInstances';
import { useAppointments } from '../../hooks/useAppointments';
import { useCarePlanConfig } from '../../hooks/useCarePlanConfig';
import { getTodayDateString } from '../../services/carePlanGenerator';
import { BucketType } from '../../types/carePlanConfig';
import {
  NoMedicationsBanner,
  NoCarePlanBanner,
  DataIntegrityBanner,
} from '../../components/common/ConsistencyBanner';

// Helper to format 24hr time (HH:MM) to display format - with NaN protection
function formatTime(time24: string): string {
  if (!time24 || typeof time24 !== 'string') return 'Time not set';

  const parts = time24.split(':');
  if (parts.length < 2) return 'Time not set';

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);

  // Validate hours and minutes are valid numbers
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return 'Time not set';
  }

  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}

// Grace period in minutes before an item is considered overdue
const OVERDUE_GRACE_MINUTES = 30;

// Helper to check if a scheduled time is overdue
function isOverdue(scheduledTime: string, graceMinutes: number = OVERDUE_GRACE_MINUTES): boolean {
  if (!scheduledTime) return false;
  const now = new Date();
  const scheduled = new Date(scheduledTime);
  // Handle invalid dates
  if (isNaN(scheduled.getTime())) return false;
  // Add grace period to scheduled time
  const graceCutoff = new Date(scheduled.getTime() + graceMinutes * 60 * 1000);
  return now > graceCutoff;
}

// Helper to check if scheduled time is in the future
function isFuture(scheduledTime: string): boolean {
  if (!scheduledTime) return false;
  const now = new Date();
  const scheduled = new Date(scheduledTime);
  // Handle invalid dates
  if (isNaN(scheduled.getTime())) return false;
  return scheduled > now;
}

// Helper to parse time for display (handles both ISO and HH:mm formats) - with NaN protection
// Returns null if time is invalid (for cleaner display)
function parseTimeForDisplay(scheduledTime: string): string | null {
  if (!scheduledTime || typeof scheduledTime !== 'string') return null;

  // If it's an ISO timestamp, parse it
  if (scheduledTime.includes('T')) {
    const date = new Date(scheduledTime);
    // Validate the date is valid
    if (isNaN(date.getTime())) return null;

    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  }
  // Otherwise assume HH:mm format
  const formatted = formatTime(scheduledTime);
  return formatted === 'Time not set' ? null : formatted;
}

// Helper to get route for instance item type (from NEW regimen system)
function getRouteForInstanceType(itemType: string): string {
  switch (itemType) {
    case 'medication': return '/medication-confirm';
    case 'vitals': return '/log-vitals';
    case 'nutrition': return '/log-meal';
    case 'mood': return '/log-mood';
    case 'sleep': return '/log-sleep';
    case 'hydration': return '/log-water';
    case 'activity': return '/log-activity';
    case 'appointment': return '/appointments';
    case 'custom':
    default:
      return '/log-note';
  }
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

// ============================================================================
// URGENCY STATUS & SCORING SYSTEM
// Answers: "What is the next irreversible decision the caregiver must make?"
// ============================================================================

type UrgencyStatus = 'OVERDUE' | 'DUE_SOON' | 'LATER_TODAY' | 'COMPLETE' | 'NOT_APPLICABLE';

interface UrgencyInfo {
  status: UrgencyStatus;
  label: string;
  proximityLabel?: string;  // "Next in 45 minutes"
  minutesUntil?: number;
  minutesOverdue?: number;
  urgencyScore?: number;  // Dynamic ranking score
}

// Time window definitions for grouping
type TimeWindow = 'morning' | 'afternoon' | 'evening' | 'night';

const TIME_WINDOW_HOURS: Record<TimeWindow, { start: number; end: number; label: string }> = {
  morning: { start: 5, end: 12, label: 'Morning' },
  afternoon: { start: 12, end: 17, label: 'Afternoon' },
  evening: { start: 17, end: 21, label: 'Evening' },
  night: { start: 21, end: 5, label: 'Night' },
};

// Medical dependency mappings (e.g., vitals needed before BP medication)
const MEDICAL_DEPENDENCIES: Record<string, string[]> = {
  'blood_pressure_med': ['vitals'],  // BP meds may need vitals first
  'insulin': ['meals', 'vitals'],     // Insulin timing depends on meals
  'pain_med': ['mood'],               // Pain assessment helps pain med decisions
};

// ============================================================================
// URGENCY SCORING MODEL
// Score = Time proximity + Medical dependency + Missed history + Risk confidence
// ============================================================================
interface UrgencyScoreFactors {
  timeProximity: number;      // 0-40 points based on how soon
  medicalDependency: number;  // 0-30 points if blocks other tasks
  missedHistory: number;      // 0-20 points based on recent misses
  riskConfidence: number;     // 0-10 points based on clinical importance
}

function calculateUrgencyScore(
  instance: any,
  allInstances: any[],
  missedCount: number = 0
): { score: number; factors: UrgencyScoreFactors; isSafetyRelevant: boolean } {
  const factors: UrgencyScoreFactors = {
    timeProximity: 0,
    medicalDependency: 0,
    missedHistory: 0,
    riskConfidence: 0,
  };

  let isSafetyRelevant = false;

  // TIME PROXIMITY (0-40 points)
  const now = new Date();
  const scheduled = new Date(instance.scheduledTime);
  if (!isNaN(scheduled.getTime())) {
    const diffMinutes = (scheduled.getTime() - now.getTime()) / (1000 * 60);

    if (diffMinutes < -OVERDUE_GRACE_MINUTES) {
      factors.timeProximity = 40;  // Overdue = max time urgency
      isSafetyRelevant = true;
    } else if (diffMinutes <= 0) {
      factors.timeProximity = 35;  // Due now
      isSafetyRelevant = true;
    } else if (diffMinutes <= 30) {
      factors.timeProximity = 30;  // Within 30 min
    } else if (diffMinutes <= 60) {
      factors.timeProximity = 25;  // Within 1 hour
    } else if (diffMinutes <= 120) {
      factors.timeProximity = 15;  // Within 2 hours
    } else {
      factors.timeProximity = Math.max(0, 10 - Math.floor(diffMinutes / 60));
    }
  }

  // MEDICAL DEPENDENCY (0-30 points)
  // Check if this task is a dependency for upcoming medications
  if (instance.itemType === 'vitals') {
    // Vitals may be required before certain medications
    const upcomingMeds = allInstances.filter(
      i => i.itemType === 'medication' && i.status === 'pending'
    );
    if (upcomingMeds.length > 0) {
      factors.medicalDependency = 20;
      isSafetyRelevant = true;
    }
  }
  if (instance.itemType === 'medication') {
    factors.medicalDependency = 25;  // Medications are high priority
    isSafetyRelevant = true;
  }

  // MISSED HISTORY (0-20 points)
  // Items frequently missed get priority
  factors.missedHistory = Math.min(20, missedCount * 5);
  if (missedCount >= 2) {
    isSafetyRelevant = true;
  }

  // RISK CONFIDENCE (0-10 points)
  // Based on item type clinical importance
  const riskByType: Record<string, number> = {
    medication: 10,
    vitals: 8,
    nutrition: 5,
    mood: 4,
    hydration: 3,
    sleep: 3,
    activity: 2,
    custom: 1,
  };
  factors.riskConfidence = riskByType[instance.itemType] || 1;

  const score = factors.timeProximity + factors.medicalDependency +
                factors.missedHistory + factors.riskConfidence;

  return { score, factors, isSafetyRelevant };
}

// Calculate urgency status for a single task
function getUrgencyStatus(scheduledTime: string, isCompleted: boolean): UrgencyInfo {
  if (isCompleted) {
    return { status: 'COMPLETE', label: 'Done' };
  }

  if (!scheduledTime) {
    return { status: 'NOT_APPLICABLE', label: '' };  // No text, just indicator
  }

  const now = new Date();
  const scheduled = new Date(scheduledTime);

  if (isNaN(scheduled.getTime())) {
    return { status: 'NOT_APPLICABLE', label: '' };
  }

  const diffMs = scheduled.getTime() - now.getTime();
  const diffMinutes = Math.round(diffMs / (1000 * 60));

  // OVERDUE: currentTime > scheduledTime (past grace period)
  if (diffMinutes < -OVERDUE_GRACE_MINUTES) {
    const minutesOverdue = Math.abs(diffMinutes);
    const hours = Math.floor(minutesOverdue / 60);
    const mins = minutesOverdue % 60;
    return {
      status: 'OVERDUE',
      label: 'Overdue',
      proximityLabel: hours > 0 ? `${hours}h ${mins}m overdue` : `${mins}m overdue`,
      minutesOverdue
    };
  }

  // DUE_SOON: within next 2 hours (120 minutes)
  if (diffMinutes <= 120) {
    const proximityLabel = diffMinutes <= 0
      ? 'Due now'
      : diffMinutes < 60
        ? `Next in ${diffMinutes} min`
        : `Next in ${Math.round(diffMinutes / 60)}h`;
    return {
      status: 'DUE_SOON',
      label: diffMinutes <= 0 ? 'Due now' : 'Coming up',
      proximityLabel,
      minutesUntil: Math.max(0, diffMinutes)
    };
  }

  // LATER_TODAY: more than 2 hours away
  const hours = Math.floor(diffMinutes / 60);
  return {
    status: 'LATER_TODAY',
    label: '',  // No text for later items
    proximityLabel: `In ${hours}h`,
    minutesUntil: diffMinutes
  };
}

// Get urgency status for a category (meds, vitals, etc.)
function getCategoryUrgencyStatus(
  instances: any[],
  itemType: string,
  stat: StatData
): UrgencyStatus {
  if (stat.total === 0) return 'NOT_APPLICABLE';
  if (stat.completed === stat.total) return 'COMPLETE';

  const pendingInstances = instances.filter(
    i => i.itemType === itemType && i.status === 'pending'
  );

  if (pendingInstances.length === 0) return 'COMPLETE';

  // Check if any are overdue
  const hasOverdue = pendingInstances.some(i => {
    const info = getUrgencyStatus(i.scheduledTime, false);
    return info.status === 'OVERDUE';
  });
  if (hasOverdue) return 'OVERDUE';

  // Check if any are due soon
  const hasDueSoon = pendingInstances.some(i => {
    const info = getUrgencyStatus(i.scheduledTime, false);
    return info.status === 'DUE_SOON';
  });
  if (hasDueSoon) return 'DUE_SOON';

  return 'LATER_TODAY';
}

// Get time window for a scheduled time
function getTimeWindow(scheduledTime: string): TimeWindow {
  const date = new Date(scheduledTime);
  if (isNaN(date.getTime())) return 'morning';

  const hour = date.getHours();

  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

// Get current time window
function getCurrentTimeWindow(): TimeWindow {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

// Group instances by time window
function groupByTimeWindow(instances: any[]): Record<TimeWindow, any[]> {
  const groups: Record<TimeWindow, any[]> = {
    morning: [],
    afternoon: [],
    evening: [],
    night: [],
  };

  instances.forEach(instance => {
    const window = getTimeWindow(instance.scheduledTime);
    groups[window].push(instance);
  });

  // Sort each group by scheduled time
  Object.keys(groups).forEach(key => {
    groups[key as TimeWindow].sort((a, b) =>
      a.scheduledTime.localeCompare(b.scheduledTime)
    );
  });

  return groups;
}

export default function NowScreen() {
  const router = useRouter();

  // Track today's date - updates when screen gains focus to handle day changes
  const [today, setToday] = useState(() => getTodayDateString());

  // NEW: Daily Care Instances hook - uses the regimen-based system
  // Pass today as the date parameter so it reloads when the day changes
  const {
    state: instancesState,
    loading: instancesLoading,
    completeInstance,
    refresh: refreshInstances,
  } = useDailyCareInstances(today);

  // CarePlan hook - provides progress, timeline, and schedule from derived state
  // Pass today as the date parameter so it reloads when the day changes
  const { dayState, carePlan, overrides, snoozeItem, setItemOverride, integrityWarnings, refresh: refreshCarePlan } = useCarePlan(today);

  // Appointments hook - single source of truth for appointments
  const {
    todayAppointments,
    complete: completeAppointment,
  } = useAppointments();

  // NEW: Bucket-based Care Plan Config hook
  const { hasCarePlan: hasBucketCarePlan, loading: carePlanConfigLoading, enabledBuckets } = useCarePlanConfig();

  // Determine which system to use:
  // If instancesState has instances, prefer the NEW regimen-based system
  const hasRegimenInstances = instancesState && instancesState.instances.length > 0;

  // A care plan exists if EITHER the old routine-based plan exists OR the new bucket-based config has enabled buckets
  const hasAnyCarePlan = carePlan || hasBucketCarePlan || hasRegimenInstances;

  const [medications, setMedications] = useState<Medication[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [dailyTracking, setDailyTracking] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [timelineExpanded, setTimelineExpanded] = useState(true);
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(false);

  // Time group expansion state for What's Left Today
  // By default, only upcoming time window is expanded, future groups collapsed
  const [expandedTimeGroups, setExpandedTimeGroups] = useState<Record<TimeWindow, boolean>>(() => {
    const currentWindow = getCurrentTimeWindow();
    return {
      morning: currentWindow === 'morning',
      afternoon: currentWindow === 'afternoon',
      evening: currentWindow === 'evening',
      night: currentWindow === 'night',
    };
  });

  // Prompt system state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const [orientationPrompt, setOrientationPrompt] = useState<OrientationPromptType | null>(null);
  const [regulationPrompt, setRegulationPrompt] = useState<RegulationPromptType | null>(null);
  const [showClosure, setShowClosure] = useState(false);
  const [closureMessage, setClosureMessage] = useState('');

  // Legacy stats state - only used when no regimen instances exist
  const [legacyStats, setLegacyStats] = useState<TodayStats>({
    meds: { completed: 0, total: 0 },
    vitals: { completed: 0, total: 4 },
    mood: { completed: 0, total: 1 },
    meals: { completed: 0, total: 3 },
  });

  // ============================================================================
  // SINGLE SOURCE OF TRUTH: Compute stats from instancesState
  // This ensures Progress cards and Timeline are always synchronized
  // ============================================================================
  const todayStats = useMemo((): TodayStats => {
    // If we have regimen instances for TODAY, derive stats directly from them
    // Safety check: ensure instancesState is for today (not stale data from yesterday)
    if (instancesState && instancesState.instances.length > 0 && instancesState.date === today) {
      const getTypeStats = (itemType: string): StatData => {
        const typeInstances = instancesState.instances.filter(i => i.itemType === itemType);
        const completed = typeInstances.filter(i => i.status === 'completed').length;
        return { completed, total: typeInstances.length };
      };

      const stats: TodayStats = {
        meds: getTypeStats('medication'),
        vitals: getTypeStats('vitals'),
        mood: getTypeStats('mood'),
        meals: getTypeStats('nutrition'),
      };

      // Only return instance-based stats if we have data for at least one category
      const hasAnyInstanceData = stats.meds.total > 0 || stats.vitals.total > 0 ||
                                  stats.mood.total > 0 || stats.meals.total > 0;
      if (hasAnyInstanceData) {
        return stats;
      }
    }

    // Fall back to legacy stats (from raw logs) when no instances or date mismatch
    return legacyStats;
  }, [instancesState, legacyStats, today]);

  // AI Insight
  const [aiInsight, setAiInsight] = useState<AIInsight | null>(null);

  // Fix #4: Generate AI Insight that arbitrates between Progress and Timeline
  // Considers both high-level progress AND specific timeline items
  // IMPORTANT: All data must come from instancesState to ensure consistency with Progress cards and Timeline
  // NOTE: Defined here BEFORE the useEffect that uses it to avoid declaration order issues
  const generateAIInsight = useCallback((
    stats: TodayStats,
    moodLevel: number | null,
    todayAppointments: Appointment[],
    meds: Medication[],
    timelineOverdue: number = 0,
    timelineUpcoming: number = 0,
    timelineCompleted: number = 0,
    eveningMedsRemaining: number = 0
  ): AIInsight | null => {
    const now = new Date();
    const currentHour = now.getHours();
    const insights: AIInsight[] = [];

    const totalLogged = stats.meds.completed + stats.vitals.completed + stats.mood.completed + stats.meals.completed;
    const medsRemaining = stats.meds.total - stats.meds.completed;

    // REMINDER: Overdue items - highest priority
    if (timelineOverdue > 0) {
      insights.push({
        icon: '⏰',
        title: timelineOverdue === 1 ? '1 item overdue' : `${timelineOverdue} items overdue`,
        message: 'Tap above to log or adjust.',
        type: 'reminder',
      });
    }

    // CELEBRATION: All timeline items complete
    if (timelineOverdue === 0 && timelineUpcoming === 0 && timelineCompleted > 0) {
      insights.push({
        icon: '✓',
        title: 'All done for today',
        message: `${timelineCompleted} item${timelineCompleted > 1 ? 's' : ''} logged.`,
        type: 'celebration',
      });
    }

    // CELEBRATION: Strong progress (legacy system)
    if (timelineCompleted === 0 && stats.meds.completed === stats.meds.total && stats.meds.total > 0 &&
        stats.mood.completed > 0 && stats.meals.completed >= 3) {
      insights.push({
        icon: '✓',
        title: 'All done for today',
        message: 'Meds, mood, and meals logged.',
        type: 'celebration',
      });
    }

    // REMINDER: Upcoming appointment
    if (todayAppointments.length > 0) {
      const nextAppt = todayAppointments[0];
      const apptTime = nextAppt.time ? ` at ${nextAppt.time}` : '';
      insights.push({
        icon: '📅',
        title: `${nextAppt.specialty || 'Appointment'}${apptTime}`,
        message: `With ${nextAppt.provider}. Recent logs help.`,
        type: 'reminder',
      });
    }

    // REMINDER: Evening medications
    if (currentHour >= 16 && currentHour < 20 && eveningMedsRemaining > 0) {
      insights.push({
        icon: '💊',
        title: `${eveningMedsRemaining} evening med${eveningMedsRemaining > 1 ? 's' : ''} remaining`,
        message: 'Consistent timing helps.',
        type: 'reminder',
      });
    }

    // POSITIVE: Medications complete
    if (stats.meds.completed > 0 && stats.meds.completed === stats.meds.total && stats.meds.total > 0) {
      insights.push({
        icon: '💊',
        title: 'Medications complete',
        message: `All ${stats.meds.total} logged today.`,
        type: 'positive',
      });
    }

    // SUGGESTION: Morning medications pending
    if (currentHour >= 6 && currentHour < 11 && medsRemaining > 0 && stats.meds.total > 0) {
      insights.push({
        icon: '💊',
        title: `${medsRemaining} medication${medsRemaining > 1 ? 's' : ''} not logged`,
        message: 'Tap Record to log.',
        type: 'suggestion',
      });
    }

    // SUGGESTION: Lunch not logged
    if (currentHour >= 12 && currentHour < 15 && stats.meals.completed < 2) {
      insights.push({
        icon: '🍽️',
        title: 'Lunch not logged yet',
        message: 'Quick note helps track appetite.',
        type: 'suggestion',
      });
    }

    // SUGGESTION: Mood not logged
    if (currentHour >= 14 && stats.mood.completed === 0) {
      insights.push({
        icon: '😊',
        title: 'Mood not logged yet',
        message: 'A quick check-in helps spot patterns.',
        type: 'suggestion',
      });
    }

    // SUGGESTION: Vitals not logged
    if (currentHour >= 10 && stats.vitals.completed === 0 && stats.vitals.total > 0) {
      insights.push({
        icon: '📊',
        title: 'Vitals not logged yet',
        message: 'Regular readings build a baseline.',
        type: 'suggestion',
      });
    }

    // SUGGESTION: No data yet today
    if (totalLogged === 0 && currentHour >= 8) {
      insights.push({
        icon: '📋',
        title: 'Nothing logged yet today',
        message: 'Start with whatever feels natural.',
        type: 'suggestion',
      });
    }

    // POSITIVE: Good progress with items remaining
    const progressPercent = (stats.meds.total > 0 ? stats.meds.completed / stats.meds.total : 0) +
                           (stats.vitals.total > 0 ? stats.vitals.completed / stats.vitals.total : 0) +
                           (stats.mood.total > 0 ? stats.mood.completed / stats.mood.total : 0) +
                           (stats.meals.total > 0 ? stats.meals.completed / stats.meals.total : 0);
    const avgProgress = progressPercent / 4;
    if (avgProgress >= 0.5 && timelineUpcoming > 0 && timelineOverdue === 0) {
      insights.push({
        icon: '📋',
        title: `${timelineUpcoming} item${timelineUpcoming > 1 ? 's' : ''} left today`,
        message: 'Over halfway done.',
        type: 'positive',
      });
    }

    // POSITIVE: Meals well tracked
    if (stats.meals.completed >= 3) {
      insights.push({
        icon: '🍽️',
        title: `${stats.meals.completed} meals logged`,
        message: 'Helps track appetite patterns.',
        type: 'positive',
      });
    }

    // POSITIVE: Vitals captured
    if (stats.vitals.completed >= 2) {
      insights.push({
        icon: '📊',
        title: `${stats.vitals.completed} vitals recorded`,
        message: 'Building a useful baseline.',
        type: 'positive',
      });
    }

    // Return the most relevant insight
    const priorityOrder = ['reminder', 'celebration', 'suggestion', 'positive'];
    for (const priority of priorityOrder) {
      const match = insights.find(i => i.type === priority);
      if (match) return match;
    }
    return null;
  }, []);

  // Regenerate AI Insight when stats or timeline change (ensures sync with Progress cards)
  useEffect(() => {
    if (!medications) return;

    // Get timeline counts from instancesState
    let overdueCount = 0;
    let upcomingCount = 0;
    let completedCount = 0;
    let eveningMedsRemaining = 0;

    if (instancesState?.instances && instancesState.date === today) {
      overdueCount = instancesState.instances.filter(i => i.status === 'pending' && isOverdue(i.scheduledTime)).length;
      upcomingCount = instancesState.instances.filter(i => i.status === 'pending' && !isOverdue(i.scheduledTime)).length;
      completedCount = instancesState.instances.filter(i => i.status === 'completed' || i.status === 'skipped').length;

      // Calculate evening meds from instances (4PM-10PM = hours 16-22)
      eveningMedsRemaining = instancesState.instances.filter(i => {
        if (i.itemType !== 'medication' || i.status !== 'pending') return false;
        const scheduledDate = new Date(i.scheduledTime);
        const hour = scheduledDate.getHours();
        return hour >= 16 && hour < 22;
      }).length;
    }

    // Filter today's appointments
    const todayAppts = appointments.filter(appt => {
      const apptDate = new Date(appt.date);
      return apptDate.toDateString() === new Date().toDateString();
    });

    // Get mood level from daily tracking
    const moodLevel = dailyTracking?.mood ?? null;

    const insight = generateAIInsight(
      todayStats,
      moodLevel,
      todayAppts,
      medications,
      overdueCount,
      upcomingCount,
      completedCount,
      eveningMedsRemaining
    );
    setAiInsight(insight);
  }, [todayStats, instancesState, today, medications, appointments, dailyTracking, generateAIInsight]);

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
      // Update today's date - handles day change when app was backgrounded overnight
      const currentDate = getTodayDateString();

      // Check if date has changed (e.g., midnight passed while app was backgrounded)
      if (currentDate !== today) {
        console.log('[NowScreen] Date changed from', today, 'to', currentDate);
        setToday(currentDate);
      }

      // Always refresh all data when screen gains focus
      // This ensures we have fresh data regardless of date change
      refreshInstances();
      refreshCarePlan();

      loadData();
      // Check if notification prompt should show (after adding meds/appointments)
      checkNotificationPrompt();
      // Record visit when screen loads
      recordVisit();
    }, [today, refreshInstances, refreshCarePlan])
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

      // Load today's log status from central storage (for legacy fallback)
      const status = await getTodayLogStatus();

      // Load vitals to count (legacy fallback)
      const todayVitals = await getTodayVitalsLog();
      let vitalsLogged = 0;
      if (todayVitals) {
        if (todayVitals.systolic) vitalsLogged++;
        if (todayVitals.diastolic) vitalsLogged++;
        if (todayVitals.heartRate) vitalsLogged++;
        if (todayVitals.temperature) vitalsLogged++;
      }

      // Calculate legacy stats (fallback when no regimen instances)
      const takenMeds = activeMeds.filter(m => m.taken).length;
      const totalMeds = activeMeds.length;

      // Get meals from central storage (legacy fallback)
      const mealsLog = await getTodayMealsLog();
      const mealsLogged = mealsLog?.meals?.length || 0;

      // Get mood status (legacy fallback)
      const moodLog = await getTodayMoodLog();
      const moodLogged = moodLog?.mood !== null && moodLog?.mood !== undefined ? 1 : 0;

      // Update legacy stats for fallback (used only when no regimen instances)
      // The main todayStats is computed via useMemo from instancesState
      let legacyStatsUpdate: TodayStats;
      if (carePlan && dayState?.progress) {
        // OLD routine system - use dayState.progress
        const dsProgress = dayState.progress;
        legacyStatsUpdate = {
          meds: { completed: dsProgress.meds.completed, total: dsProgress.meds.expected },
          vitals: { completed: dsProgress.vitals.completed, total: dsProgress.vitals.expected },
          mood: { completed: dsProgress.mood.completed, total: dsProgress.mood.expected },
          meals: { completed: dsProgress.meals.completed, total: dsProgress.meals.expected },
        };
      } else {
        // Raw log calculations
        legacyStatsUpdate = {
          meds: { completed: takenMeds, total: totalMeds },
          vitals: { completed: vitalsLogged, total: 4 },
          mood: { completed: moodLogged, total: 1 },
          meals: { completed: mealsLogged, total: 4 },
        };
      }
      setLegacyStats(legacyStatsUpdate);

      // Compute prompts based on current state
      const currentMoodLevel = moodLog?.mood ?? null;
      await computePrompts(legacyStatsUpdate, currentMoodLevel);

      // Generate AI Insight - pass timeline data for arbitration (Fix #4)
      const todayAppts = appts.filter(appt => {
        const apptDate = new Date(appt.date);
        return apptDate.toDateString() === new Date().toDateString();
      });

      // Get timeline counts from instancesState if available
      let overdueCount = 0;
      let upcomingCount = 0;
      let completedCount = 0;
      let eveningMedsRemaining = 0;

      if (instancesState?.instances && instancesState.date === today) {
        const sorted = [...instancesState.instances];
        overdueCount = sorted.filter(i => i.status === 'pending' && isOverdue(i.scheduledTime)).length;
        upcomingCount = sorted.filter(i => i.status === 'pending' && !isOverdue(i.scheduledTime)).length;
        completedCount = sorted.filter(i => i.status === 'completed' || i.status === 'skipped').length;

        // Calculate evening meds from instances (4PM-10PM = hours 16-22)
        eveningMedsRemaining = sorted.filter(i => {
          if (i.itemType !== 'medication' || i.status !== 'pending') return false;
          const scheduledDate = new Date(i.scheduledTime);
          const hour = scheduledDate.getHours();
          return hour >= 16 && hour < 22;
        }).length;
      }

      const insight = generateAIInsight(
        legacyStatsUpdate, // Will be overridden by useMemo stats if instances exist
        currentMoodLevel,
        todayAppts,
        activeMeds,
        overdueCount,
        upcomingCount,
        completedCount,
        eveningMedsRemaining
      );
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

  // ============================================================================
  // CARE PLAN PROGRESS - Make Gaps Actionable
  // Color semantics: gray = not applicable, amber = missing, green = complete
  // ============================================================================

  const getProgressPercent = (completed: number, total: number) => {
    return total > 0 ? (completed / total) * 100 : 0;
  };

  // Status: 'complete' (green), 'missing' (amber), 'partial' (amber), 'inactive' (gray)
  const getProgressStatus = (completed: number, total: number): 'complete' | 'partial' | 'missing' | 'inactive' => {
    if (total === 0) return 'inactive';           // Not applicable today
    if (completed === total) return 'complete';   // All done
    if (completed > 0) return 'partial';          // Some done
    return 'missing';                              // Expected but none logged
  };

  const getStrokeColor = (status: string) => {
    if (status === 'complete') return '#10B981';              // Green
    if (status === 'partial' || status === 'missing') return '#F59E0B';  // Soft amber
    return 'rgba(255, 255, 255, 0.15)';                       // Neutral gray
  };

  const calculateStrokeDashoffset = (percent: number) => {
    const circumference = 2 * Math.PI * 21; // radius = 21
    return circumference * (1 - percent / 100);
  };

  // Check if there are upcoming (not yet due) instances for a category
  const hasUpcomingForType = (itemType: string): boolean => {
    if (!todayTimeline?.upcoming) return false;
    return todayTimeline.upcoming.some(i => i.itemType === itemType);
  };

  // Route to Record tab with appropriate logging screen
  const handleProgressTileTap = (type: 'meds' | 'vitals' | 'mood' | 'meals') => {
    // Route directly to the logging screen for actionable context
    switch (type) {
      case 'meds':
        router.push('/(tabs)/record');  // Record tab shows medication logging options
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
    onPress: () => void,
    itemType?: string  // For checking upcoming schedule
  ) => {
    const percent = getProgressPercent(stat.completed, stat.total);
    const status = getProgressStatus(stat.completed, stat.total);
    const dashoffset = calculateStrokeDashoffset(percent);
    const circumference = 2 * Math.PI * 21;

    // Get urgency status for this category
    const instances = instancesState?.instances || [];
    const urgencyStatus = itemType
      ? getCategoryUrgencyStatus(instances, itemType, stat)
      : 'NOT_APPLICABLE';

    // Determine stroke color based on urgency
    const getStrokeColorWithUrgency = () => {
      if (status === 'complete') return '#10B981';  // Green
      if (urgencyStatus === 'OVERDUE') return '#EF4444';  // Red
      if (urgencyStatus === 'DUE_SOON') return '#F59E0B';  // Amber
      if (status === 'partial' || status === 'missing') return '#F59E0B';  // Soft amber
      return 'rgba(255, 255, 255, 0.15)';  // Neutral gray
    };

    const strokeColor = getStrokeColorWithUrgency();

    // Determine display text based on status and urgency
    let statText = '';
    let statusLabel = '';
    let statusStyle = `stat_${status}` as keyof typeof styles;

    switch (status) {
      case 'complete':
        statText = `${stat.completed}/${stat.total}`;
        statusLabel = 'complete';
        break;
      case 'partial':
      case 'missing':
        statText = `${stat.completed}/${stat.total}`;
        // Use urgency-aware status labels
        if (urgencyStatus === 'OVERDUE') {
          statusLabel = 'overdue';
          statusStyle = 'stat_overdue' as keyof typeof styles;
        } else if (urgencyStatus === 'DUE_SOON') {
          statusLabel = 'due soon';
          statusStyle = 'stat_due_soon' as keyof typeof styles;
        } else if (urgencyStatus === 'LATER_TODAY') {
          statusLabel = 'later today';
          statusStyle = 'stat_later' as keyof typeof styles;
        } else {
          statusLabel = status === 'partial' ? 'logged' : 'not logged yet';
        }
        break;
      case 'inactive':
        statText = '—';
        statusLabel = 'not tracked today';  // Improved from "not set up"
        break;
    }

    // Only make tappable if there's something to log
    const isTappable = status !== 'inactive';

    // Get urgency-based tile styling
    const getTileUrgencyStyle = () => {
      if (urgencyStatus === 'OVERDUE') return styles.checkinItemOverdue;
      if (urgencyStatus === 'DUE_SOON') return styles.checkinItemDueSoon;
      return null;
    };

    return (
      <TouchableOpacity
        style={[
          styles.checkinItem,
          !isTappable && styles.checkinItemInactive,
          getTileUrgencyStyle(),
        ]}
        onPress={isTappable ? onPress : undefined}
        activeOpacity={isTappable ? 0.7 : 1}
        accessible={true}
        accessibilityRole={isTappable ? "button" : "text"}
        accessibilityLabel={`${label}. ${statText} ${statusLabel}`}
        accessibilityHint={isTappable ? `Tap to log ${label.toLowerCase()}` : undefined}
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
        <Text style={[styles.checkinStat, styles[statusStyle] || styles.stat_missing]}>
          {statText}
        </Text>
        <Text style={[styles.checkinStatusLabel, styles[statusStyle] || styles.stat_missing]}>
          {statusLabel}
        </Text>
      </TouchableOpacity>
    );
  };

  // ============================================================================
  // TODAY TIMELINE - Built from DailyCareInstances
  // ============================================================================

  // Compute timeline from DailyCareInstances sorted by urgency score (highest priority first)
  const todayTimeline = useMemo(() => {
    if (!instancesState?.instances) {
      return { overdue: [], upcoming: [], completed: [], nextUp: null, hasSafetyRelevant: false };
    }

    // Safety check: ensure instancesState is for today
    // This prevents showing stale data from a previous day
    if (instancesState.date !== today) {
      console.log('[NowScreen] Instance date mismatch:', instancesState.date, 'vs today:', today);
      return { overdue: [], upcoming: [], completed: [], nextUp: null, hasSafetyRelevant: false };
    }

    const allInstances = instancesState.instances;

    // Calculate urgency scores for all pending instances
    const withScores = allInstances.map(instance => {
      if (instance.status !== 'pending') {
        return { instance, score: 0, factors: null, isSafetyRelevant: false };
      }
      // Count missed instances for this item type (for missed history scoring)
      const missedCount = allInstances.filter(
        i => i.itemType === instance.itemType && i.status === 'missed'
      ).length;
      const { score, factors, isSafetyRelevant } = calculateUrgencyScore(instance, allInstances, missedCount);
      return { instance, score, factors, isSafetyRelevant };
    });

    // Check if any pending item is safety-relevant
    const hasSafetyRelevant = withScores.some(w => w.isSafetyRelevant && w.instance.status === 'pending');

    // Filter and sort by urgency score (highest first) for pending items
    const pendingWithScores = withScores
      .filter(w => w.instance.status === 'pending')
      .sort((a, b) => b.score - a.score);

    // Separate into overdue and upcoming (already sorted by urgency)
    const overdue = pendingWithScores
      .filter(w => isOverdue(w.instance.scheduledTime))
      .map(w => ({ ...w.instance, urgencyScore: w.score }));

    const upcoming = pendingWithScores
      .filter(w => !isOverdue(w.instance.scheduledTime))
      .map(w => ({ ...w.instance, urgencyScore: w.score }));

    const completed = allInstances.filter(
      i => i.status === 'completed' || i.status === 'skipped'
    ).sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

    // "Next Up" = highest urgency pending item (overdue first, then upcoming)
    const nextUp = overdue[0] || upcoming[0] || null;

    return { overdue, upcoming, completed, nextUp, hasSafetyRelevant };
  }, [instancesState?.instances, instancesState?.date, today]);

  // ============================================================================
  // SIGNAL OVER SENTIMENT: Auto-manage timeline expansion
  // Auto-collapse when empty, auto-expand when overdue items appear
  // ============================================================================
  useEffect(() => {
    const hasOverdue = todayTimeline.overdue.length > 0;
    const hasUpcoming = todayTimeline.upcoming.length > 0;
    const isEmpty = !hasOverdue && !hasUpcoming;

    if (hasOverdue) {
      // Auto-expand when items become overdue - needs attention
      setTimelineExpanded(true);
    } else if (isEmpty && hasRegimenInstances) {
      // Auto-collapse when nothing left to do
      setTimelineExpanded(false);
    }
  }, [todayTimeline.overdue.length, todayTimeline.upcoming.length, hasRegimenInstances]);

  // Handler for timeline item tap
  const handleTimelineItemPress = useCallback((instance: any) => {
    // For medications, route to contextual logging screen with pre-filled data
    if (instance.itemType === 'medication') {
      router.push({
        pathname: '/log-medication-plan-item',
        params: {
          medicationId: instance.carePlanItemId,
          instanceId: instance.id,
          scheduledTime: instance.scheduledTime,
          itemName: instance.itemName,
          itemDosage: instance.itemDosage || '',
          itemInstructions: instance.instructions || '',
        },
      } as any);
      return;
    }
    // For other item types, use the standard route
    const route = getRouteForInstanceType(instance.itemType);
    router.push(route as any);
  }, [router]);

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

            {/* ============================================================ */}
            {/* NEW LAYOUT HIERARCHY: AI Insight → Next Up → Progress → Timeline */}
            {/* ============================================================ */}

            {/* 1️⃣ AI INSIGHT CARD - Advisory Layer (conditional on safety relevance) */}
            {/* Only shows when: safety-relevant items, overdue tasks, or celebrations */}
            {/* Reduces noise by hiding generic suggestions when no urgent care concerns */}
            {aiInsight && (todayTimeline.hasSafetyRelevant || aiInsight.type === 'reminder' || aiInsight.type === 'celebration') && (
              <View style={[
                styles.aiInsightCard,
                aiInsight.type === 'celebration' && styles.aiInsightCelebration,
                aiInsight.type === 'reminder' && styles.aiInsightReminder,
                aiInsight.type === 'positive' && styles.aiInsightPositive,
              ]}>
                <View style={styles.aiInsightHeader}>
                  <Text style={styles.aiInsightDate}>{format(new Date(), 'EEE, MMM d')}</Text>
                  <View style={styles.aiInsightBadge}>
                    <Text style={styles.aiInsightBadgeText}>AI</Text>
                  </View>
                </View>
                <View style={styles.aiInsightBody}>
                  <Text style={styles.aiInsightIcon}>{aiInsight.icon}</Text>
                  <View style={styles.aiInsightContent}>
                    <Text style={styles.aiInsightTitle} numberOfLines={1}>{aiInsight.title}</Text>
                    <Text style={styles.aiInsightMessage} numberOfLines={2}>{aiInsight.message}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* 2️⃣ NEXT UP CARD - Primary Decision Engine (visually dominant) */}
            {/* Answers: "What is the next irreversible decision the caregiver must make?" */}
            {hasRegimenInstances && todayTimeline.nextUp && (() => {
              const nextUp = todayTimeline.nextUp;
              const nextUpTime = parseTimeForDisplay(nextUp.scheduledTime);
              const urgencyInfo = getUrgencyStatus(nextUp.scheduledTime, false);

              // Determine card styles based on urgency
              const getCardStyle = () => {
                switch (urgencyInfo.status) {
                  case 'OVERDUE': return styles.nextUpCardOverdue;
                  case 'DUE_SOON': return styles.nextUpCardDueSoon;
                  case 'LATER_TODAY': return styles.nextUpCardLater;
                  default: return null;
                }
              };

              const getIconStyle = () => {
                switch (urgencyInfo.status) {
                  case 'OVERDUE': return styles.nextUpIconOverdue;
                  case 'DUE_SOON': return styles.nextUpIconDueSoon;
                  case 'LATER_TODAY': return styles.nextUpIconLater;
                  default: return null;
                }
              };

              const getLabelStyle = () => {
                switch (urgencyInfo.status) {
                  case 'OVERDUE': return styles.nextUpLabelOverdue;
                  case 'DUE_SOON': return styles.nextUpLabelDueSoon;
                  case 'LATER_TODAY': return styles.nextUpLabelLater;
                  default: return null;
                }
              };

              const getUrgencyLabelStyle = () => {
                switch (urgencyInfo.status) {
                  case 'OVERDUE': return styles.nextUpUrgencyLabelOverdue;
                  case 'DUE_SOON': return styles.nextUpUrgencyLabelDueSoon;
                  case 'LATER_TODAY': return styles.nextUpUrgencyLabelLater;
                  default: return null;
                }
              };

              const getActionStyle = () => {
                switch (urgencyInfo.status) {
                  case 'OVERDUE': return styles.nextUpActionOverdue;
                  case 'DUE_SOON': return styles.nextUpActionDueSoon;
                  case 'LATER_TODAY': return styles.nextUpActionLater;
                  default: return null;
                }
              };

              return (
                <TouchableOpacity
                  style={[styles.nextUpCard, getCardStyle()]}
                  onPress={() => handleTimelineItemPress(nextUp)}
                  activeOpacity={0.7}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={`${nextUp.itemName}. ${urgencyInfo.label}. Tap to log.`}
                >
                  <View style={[styles.nextUpIcon, getIconStyle()]}>
                    <Text style={styles.nextUpEmoji}>
                      {nextUp.itemEmoji || '💊'}
                    </Text>
                  </View>
                  <View style={styles.nextUpContent}>
                    <Text style={[styles.nextUpLabel, getLabelStyle()]}>
                      NEXT UP
                    </Text>
                    <Text style={styles.nextUpTitle}>
                      {nextUp.itemName}
                    </Text>
                    {nextUp.instructions && (
                      <Text style={styles.nextUpSubtitle} numberOfLines={1}>
                        {nextUp.instructions}
                      </Text>
                    )}
                    {/* Time Proximity Indicator - shows when coming up */}
                    {urgencyInfo.proximityLabel && (
                      <Text style={[styles.nextUpProximityLabel, getUrgencyLabelStyle()]}>
                        {urgencyInfo.proximityLabel}
                      </Text>
                    )}
                    {/* Urgency Label - for overdue items */}
                    {urgencyInfo.status === 'OVERDUE' && (
                      <Text style={[styles.nextUpUrgencyLabel, getUrgencyLabelStyle()]}>
                        {urgencyInfo.label}
                      </Text>
                    )}
                  </View>
                  <View style={[styles.nextUpAction, getActionStyle()]}>
                    <Text style={styles.nextUpActionText}>Log</Text>
                  </View>
                </TouchableOpacity>
              );
            })()}

            {/* Empty state: All caught up - show when no tasks remain */}
            {hasRegimenInstances && !todayTimeline.nextUp && todayTimeline.completed.length > 0 && (
              <View style={styles.nextUpEmpty}>
                <Text style={styles.nextUpEmptyEmoji}>✓</Text>
                <Text style={styles.nextUpEmptyTitle}>All caught up!</Text>
                <Text style={styles.nextUpEmptySubtitle}>No scheduled items remain today.</Text>
              </View>
            )}

            {/* Data Integrity Warning - Show if CarePlan has orphaned references */}
            {integrityWarnings && integrityWarnings.length > 0 && (
              <DataIntegrityBanner
                issueCount={integrityWarnings.length}
                onFix={() => router.push('/care-plan' as any)}
              />
            )}

            {/* Empty State: No Medications Set Up */}
            {medications.length === 0 && !showOnboarding && (
              <NoMedicationsBanner />
            )}

            {/* Empty State: No Care Plan Set Up */}
            {!hasAnyCarePlan && !showOnboarding && !carePlanConfigLoading && (
              <NoCarePlanBanner onSetup={() => router.push('/care-plan' as any)} />
            )}

            {/* 3️⃣ CARE PLAN PROGRESS - Orientation Dashboard */}
            {/* Provides fast reassurance: "Are we generally okay?" */}
            <View style={styles.progressSection}>
              <Text style={styles.sectionTitle}>CARE PLAN PROGRESS</Text>
              <View style={styles.progressGrid}>
                {(enabledBuckets.length === 0 || enabledBuckets.includes('meds' as BucketType)) &&
                  renderProgressRing('💊', 'Meds', todayStats.meds, () => handleProgressTileTap('meds'), 'medication')}
                {(enabledBuckets.length === 0 || enabledBuckets.includes('vitals' as BucketType)) &&
                  renderProgressRing('📊', 'Vitals', todayStats.vitals, () => handleProgressTileTap('vitals'), 'vitals')}
                {(enabledBuckets.length === 0 || enabledBuckets.includes('mood' as BucketType)) &&
                  renderProgressRing('😊', 'Mood', todayStats.mood, () => handleProgressTileTap('mood'), 'mood')}
                {(enabledBuckets.length === 0 || enabledBuckets.includes('meals' as BucketType)) &&
                  renderProgressRing('🍽️', 'Meals', todayStats.meals, () => handleProgressTileTap('meals'), 'nutrition')}
              </View>
            </View>

            {/* What's Left Today Section - Built from DailyCareInstances */}
            {/* Fix #2: Renamed from "Today Timeline" to "What's left today" with dynamic subtitle */}
            <View style={styles.timelineHeaderContainer}>
              <TouchableOpacity
                style={styles.sectionHeaderRow}
                onPress={() => setTimelineExpanded(!timelineExpanded)}
                activeOpacity={0.7}
              >
                <View>
                  <Text style={styles.sectionTitle}>WHAT'S LEFT TODAY</Text>
                  {hasRegimenInstances && (
                    <Text style={styles.sectionSubtitle}>
                      {(() => {
                        const itemsRemaining = todayTimeline.overdue.length + todayTimeline.upcoming.length;
                        if (itemsRemaining === 0) {
                          return 'All caught up!';
                        } else if (itemsRemaining === 1) {
                          return '1 item still needs attention';
                        } else {
                          return `${itemsRemaining} items still need attention`;
                        }
                      })()}
                    </Text>
                  )}
                </View>
                <Text style={styles.collapseIcon}>{timelineExpanded ? '▼' : '▶'}</Text>
              </TouchableOpacity>
              {/* Adjust Today Link */}
              <TouchableOpacity
                style={styles.adjustTodayLink}
                onPress={() => router.push('/today-scope' as any)}
                activeOpacity={0.7}
              >
                <Text style={styles.adjustTodayText}>Adjust Today</Text>
              </TouchableOpacity>
            </View>

            {/* REMAINING TODAY PLANNING SUMMARY */}
            {/* Quick glance at time distribution: "Morning: 2 • Afternoon: 3 • Evening: 1" */}
            {hasRegimenInstances && todayTimeline.upcoming.length > 0 && (
              <View style={styles.remainingSummary}>
                {(() => {
                  const allPending = [...todayTimeline.overdue, ...todayTimeline.upcoming];
                  const grouped = groupByTimeWindow(allPending);
                  const parts: string[] = [];

                  if (grouped.morning.length > 0) parts.push(`Morning: ${grouped.morning.length}`);
                  if (grouped.afternoon.length > 0) parts.push(`Afternoon: ${grouped.afternoon.length}`);
                  if (grouped.evening.length > 0) parts.push(`Evening: ${grouped.evening.length}`);
                  if (grouped.night.length > 0) parts.push(`Night: ${grouped.night.length}`);

                  if (parts.length === 0) return null;

                  return (
                    <Text style={styles.remainingSummaryText}>
                      {parts.join(' • ')}
                    </Text>
                  );
                })()}
              </View>
            )}

            {/* 4️⃣ WHAT'S LEFT TODAY - Task Backlog with Time Grouping */}
            {timelineExpanded && hasRegimenInstances && (
              <>
                {/* Overdue items - highest priority, always expanded */}
                {todayTimeline.overdue.length > 0 && (
                  <View style={styles.overdueSection}>
                    <View style={styles.timeGroupHeader}>
                      <View style={styles.timeGroupHeaderTouchable}>
                        <Text style={[styles.timeGroupTitle, styles.timeGroupTitleOverdue]}>
                          ⚠️ Overdue
                        </Text>
                        <Text style={[styles.timeGroupCount, styles.timeGroupCountOverdue]}>
                          ({todayTimeline.overdue.length})
                        </Text>
                      </View>
                    </View>
                    {todayTimeline.overdue.map((instance) => {
                      const timeDisplay = parseTimeForDisplay(instance.scheduledTime);
                      const urgencyInfo = getUrgencyStatus(instance.scheduledTime, false);
                      const displayText = urgencyInfo.minutesOverdue
                        ? `${Math.floor(urgencyInfo.minutesOverdue / 60)}h ${urgencyInfo.minutesOverdue % 60}m overdue`
                        : 'Overdue';
                      return (
                        <TouchableOpacity
                          key={instance.id}
                          style={[styles.timelineItem, styles.timelineItemOverdue]}
                          onPress={() => handleTimelineItemPress(instance)}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.timelineIcon, styles.timelineIconOverdue]}>
                            <Text style={styles.timelineIconEmoji}>{instance.itemEmoji || '🔔'}</Text>
                          </View>
                          <View style={styles.timelineDetails}>
                            <Text style={styles.timelineTimeOverdue}>
                              {timeDisplay ? `${timeDisplay} • ${displayText}` : displayText}
                            </Text>
                            <Text style={styles.timelineTitle}>{instance.itemName}</Text>
                            {instance.instructions && (
                              <Text style={styles.timelineSubtitle} numberOfLines={1}>
                                {instance.instructions}
                              </Text>
                            )}
                          </View>
                          <View style={[styles.timelineAction, styles.timelineActionOverdue]}>
                            <Text style={styles.timelineActionText}>Log</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {/* Time-grouped upcoming items */}
                {(() => {
                  const currentWindow = getCurrentTimeWindow();
                  const groupedUpcoming = groupByTimeWindow(todayTimeline.upcoming);
                  const timeWindows: TimeWindow[] = ['morning', 'afternoon', 'evening', 'night'];

                  return timeWindows.map((window) => {
                    const items = groupedUpcoming[window];
                    if (items.length === 0) return null;

                    const isCurrentWindow = window === currentWindow;
                    const isExpanded = expandedTimeGroups[window];

                    return (
                      <View key={window} style={styles.timeGroupSection}>
                        <TouchableOpacity
                          style={styles.timeGroupHeader}
                          onPress={() => setExpandedTimeGroups(prev => ({
                            ...prev,
                            [window]: !prev[window]
                          }))}
                          activeOpacity={0.7}
                        >
                          <View style={styles.timeGroupHeaderTouchable}>
                            <Text style={[
                              styles.timeGroupTitle,
                              isCurrentWindow && styles.timeGroupTitleCurrent
                            ]}>
                              {TIME_WINDOW_HOURS[window].label}
                            </Text>
                            <Text style={styles.timeGroupCount}>
                              ({items.length})
                            </Text>
                          </View>
                          <Text style={styles.timeGroupCollapseIcon}>
                            {isExpanded ? '▼' : '▶'}
                          </Text>
                        </TouchableOpacity>

                        {isExpanded && items.map((instance) => {
                          const timeDisplay = parseTimeForDisplay(instance.scheduledTime);
                          const urgencyInfo = getUrgencyStatus(instance.scheduledTime, false);
                          return (
                            <TouchableOpacity
                              key={instance.id}
                              style={styles.timelineItem}
                              onPress={() => handleTimelineItemPress(instance)}
                              activeOpacity={0.7}
                            >
                              <View style={styles.timelineIcon}>
                                <Text style={styles.timelineIconEmoji}>{instance.itemEmoji || '🔔'}</Text>
                              </View>
                              <View style={styles.timelineDetails}>
                                <Text style={styles.timelineTime}>
                                  {timeDisplay || urgencyInfo.label}
                                </Text>
                                <Text style={styles.timelineTitle}>{instance.itemName}</Text>
                                {instance.instructions && (
                                  <Text style={styles.timelineSubtitle} numberOfLines={1}>
                                    {instance.instructions}
                                  </Text>
                                )}
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    );
                  });
                })()}

                {/* Completed items - minimized, collapsible */}
                {todayTimeline.completed.length > 0 && (
                  <View style={styles.completedSection}>
                    <Text style={styles.completedHeader}>
                      ✓ Completed ({todayTimeline.completed.length})
                    </Text>
                    {todayTimeline.completed.slice(0, 3).map((instance) => {
                      const timeDisplay = parseTimeForDisplay(instance.scheduledTime);
                      const statusText = instance.status === 'skipped' ? 'Skipped' : 'Done';
                      const displayText = timeDisplay ? `${timeDisplay} • ${statusText}` : statusText;

                      return (
                        <View
                          key={instance.id}
                          style={[styles.timelineItem, styles.timelineItemCompleted]}
                        >
                          <View style={[styles.timelineIcon, styles.timelineIconCompleted]}>
                            <Text style={styles.timelineIconEmoji}>✓</Text>
                          </View>
                          <View style={styles.timelineDetails}>
                            <Text style={styles.timelineTimeCompleted}>
                              {displayText}
                            </Text>
                            <Text style={styles.timelineTitleCompleted}>{instance.itemName}</Text>
                          </View>
                        </View>
                      );
                    })}
                    {todayTimeline.completed.length > 3 && (
                      <Text style={styles.completedMoreText}>
                        +{todayTimeline.completed.length - 3} more completed
                      </Text>
                    )}
                  </View>
                )}
              </>
            )}

            {/* Empty states */}
            {timelineExpanded && !hasRegimenInstances && !hasBucketCarePlan && !carePlan && (
              <View style={styles.emptyTimeline}>
                <Text style={styles.emptyTimelineText}>No Care Plan set up yet</Text>
                <Text style={styles.emptyTimelineSubtext}>Add medications or items to see your timeline</Text>
              </View>
            )}

            {/* Care Plan exists but no instances generated yet */}
            {timelineExpanded && !hasRegimenInstances && (hasBucketCarePlan || carePlan) && (
              <View style={styles.emptyTimeline}>
                <Text style={styles.emptyTimelineText}>No items scheduled for today</Text>
                <Text style={styles.emptyTimelineSubtext}>Check your Care Plan settings</Text>
              </View>
            )}

            {timelineExpanded && hasRegimenInstances &&
              todayTimeline.overdue.length === 0 &&
              todayTimeline.upcoming.length === 0 &&
              todayTimeline.completed.length === 0 && (
              <View style={styles.emptyTimeline}>
                <Text style={styles.emptyTimelineText}>No items scheduled for today</Text>
              </View>
            )}

            {timelineExpanded && hasRegimenInstances &&
              todayTimeline.overdue.length === 0 &&
              todayTimeline.upcoming.length === 0 &&
              todayTimeline.completed.length > 0 && (
              <View style={styles.allDoneMessage}>
                <Text style={styles.allDoneEmoji}>🎉</Text>
                <Text style={styles.allDoneText}>All caught up!</Text>
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

  // Timeline Header Container
  timelineHeaderContainer: {
    marginBottom: 16,
  },

  // Section Header
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // Adjust Today Link
  adjustTodayLink: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  adjustTodayText: {
    fontSize: 12,
    color: Colors.accent,
    fontWeight: '500',
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
  checkinStatusLabel: {
    fontSize: 9,
    fontWeight: '500',
    marginTop: 2,
  },
  stat_complete: {
    color: '#10B981',  // Green - all done
  },
  stat_partial: {
    color: '#F59E0B',  // Soft amber - some logged
  },
  stat_missing: {
    color: '#F59E0B',  // Soft amber - expected but not logged
  },
  stat_inactive: {
    color: 'rgba(255, 255, 255, 0.35)',  // Neutral gray - not applicable
  },
  checkinItemInactive: {
    opacity: 0.6,
  },
  // Urgency indicator styles for progress tiles
  checkinItemOverdue: {
    borderColor: 'rgba(239, 68, 68, 0.5)',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  checkinItemDueSoon: {
    borderColor: 'rgba(251, 191, 36, 0.5)',
    backgroundColor: 'rgba(251, 191, 36, 0.06)',
  },
  stat_overdue: {
    color: '#EF4444',  // Red - overdue
  },
  stat_due_soon: {
    color: '#F59E0B',  // Amber - due soon
  },
  stat_later: {
    color: 'rgba(255, 255, 255, 0.5)',  // Muted - scheduled later
  },

  // AI Insight Card - Advisory Layer (reduced visual dominance)
  aiInsightCard: {
    backgroundColor: 'rgba(139, 92, 246, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,  // Reduced spacing - compact advisory layer
  },
  aiInsightCelebration: {
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  aiInsightReminder: {
    backgroundColor: 'rgba(251, 191, 36, 0.06)',
    borderColor: 'rgba(251, 191, 36, 0.2)',
  },
  aiInsightPositive: {
    backgroundColor: 'rgba(59, 130, 246, 0.06)',
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  aiInsightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,  // Reduced
  },
  aiInsightDate: {
    fontSize: 11,  // Reduced
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  aiInsightBadge: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  aiInsightBadgeText: {
    fontSize: 9,  // Reduced
    fontWeight: '700',
    color: 'rgba(167, 139, 250, 0.8)',
    letterSpacing: 0.8,
  },
  aiInsightBody: {
    flexDirection: 'row',
    alignItems: 'center',  // Changed from flex-start to center
    gap: 10,  // Reduced
  },
  aiInsightIcon: {
    fontSize: 22,  // Reduced from 28
  },
  aiInsightContent: {
    flex: 1,
  },
  aiInsightTitle: {
    fontSize: 14,  // Reduced from 17
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,  // Reduced
  },
  aiInsightMessage: {
    fontSize: 12,  // Reduced from 14
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 17,
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
  completedMoreText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.35)',
    textAlign: 'center',
    paddingVertical: 8,
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

  // ============================================================================
  // NEXT UP CARD - Primary Decision Engine (visually dominant)
  // This is the dominant task anchor. Must answer:
  // "What is the next irreversible decision the caregiver must make?"
  // ============================================================================
  nextUpCard: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.4)',
    borderRadius: 16,
    padding: 18,  // Increased padding
    marginBottom: 24,  // Increased spacing below
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    // Shadow for visual prominence
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  nextUpIcon: {
    width: 52,  // Larger icon
    height: 52,
    backgroundColor: 'rgba(59, 130, 246, 0.25)',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextUpEmoji: {
    fontSize: 26,  // Larger emoji
  },
  nextUpContent: {
    flex: 1,
  },
  nextUpLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3B82F6',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  nextUpTitle: {
    fontSize: 17,  // Larger title
    fontWeight: '700',
    color: '#FFFFFF',
  },
  nextUpSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },
  nextUpUrgencyLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3B82F6',
    marginTop: 4,
  },
  nextUpProximityLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
  },
  nextUpAction: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,  // Increased CTA size
    paddingVertical: 12,
    borderRadius: 12,
    minHeight: 44,  // Accessibility: minimum 44pt
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextUpActionText: {
    fontSize: 15,  // Larger text
    fontWeight: '700',
    color: '#FFFFFF',
  },
  nextUpTime: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 2,
  },

  // Due Soon variant (Amber)
  nextUpCardDueSoon: {
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
    borderColor: 'rgba(251, 191, 36, 0.4)',
    shadowColor: '#F59E0B',
  },
  nextUpIconDueSoon: {
    backgroundColor: 'rgba(251, 191, 36, 0.25)',
  },
  nextUpLabelDueSoon: {
    color: '#F59E0B',
  },
  nextUpUrgencyLabelDueSoon: {
    color: '#F59E0B',
  },
  nextUpActionDueSoon: {
    backgroundColor: '#F59E0B',
  },

  // Overdue variant (Red - Strong Amber)
  nextUpCardOverdue: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.5)',
    shadowColor: '#EF4444',
  },
  nextUpIconOverdue: {
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
  },
  nextUpLabelOverdue: {
    color: '#EF4444',
  },
  nextUpUrgencyLabelOverdue: {
    color: '#EF4444',
  },
  nextUpActionOverdue: {
    backgroundColor: '#EF4444',
  },

  // Later Today variant (Muted)
  nextUpCardLater: {
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderColor: 'rgba(59, 130, 246, 0.25)',
    borderWidth: 1,
  },
  nextUpIconLater: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  nextUpLabelLater: {
    color: 'rgba(59, 130, 246, 0.8)',
  },
  nextUpUrgencyLabelLater: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
  nextUpActionLater: {
    backgroundColor: 'rgba(59, 130, 246, 0.6)',
  },

  // Empty state when all caught up
  nextUpEmpty: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
  },
  nextUpEmptyEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  nextUpEmptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#10B981',
    marginBottom: 4,
  },
  nextUpEmptySubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
  },

  // Timeline items (new simplified version)
  timelineItem: {
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
  timelineItemOverdue: {
    borderLeftColor: 'rgba(239, 68, 68, 0.5)',
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
  },
  // Fix #5: Make completed items visually recede more
  timelineItemCompleted: {
    borderLeftColor: 'rgba(16, 185, 129, 0.3)',
    opacity: 0.45,
  },
  timelineIcon: {
    width: 38,
    height: 38,
    backgroundColor: 'rgba(255, 193, 7, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(255, 193, 7, 0.3)',
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineIconOverdue: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  timelineIconCompleted: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  timelineIconEmoji: {
    fontSize: 16,
  },
  timelineDetails: {
    flex: 1,
  },
  timelineTime: {
    fontSize: 12,
    color: '#FFC107',
    fontWeight: '600',
    marginBottom: 3,
  },
  timelineTimeOverdue: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
    marginBottom: 3,
  },
  timelineTimeCompleted: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
    marginBottom: 3,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  timelineTitleCompleted: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    textDecorationLine: 'line-through',
  },
  timelineSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  timelineAction: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  timelineActionOverdue: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  timelineActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Overdue section
  overdueSection: {
    marginBottom: 12,
  },
  overdueHeader: {
    fontSize: 11,
    fontWeight: '600',
    color: '#EF4444',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },

  // Time group sections for What's Left Today
  timeGroupSection: {
    marginBottom: 16,
  },
  timeGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  timeGroupHeaderTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  timeGroupTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timeGroupTitleCurrent: {
    color: '#3B82F6',
  },
  timeGroupTitleOverdue: {
    color: '#EF4444',
  },
  timeGroupCount: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    marginLeft: 8,
  },
  timeGroupCountOverdue: {
    color: '#EF4444',
  },
  timeGroupCollapseIcon: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    marginLeft: 8,
  },
  timeGroupDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 12,
  },

  // Remaining Today Planning Summary
  remainingSummary: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  remainingSummaryText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    letterSpacing: 0.3,
  },

  // All done message
  allDoneMessage: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 8,
  },
  allDoneEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  allDoneText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
  },

});
