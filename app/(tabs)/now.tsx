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
import { SampleDataBanner } from '../../components/common/SampleDataBanner';
import { format } from 'date-fns';

// CarePlan System
import { useCarePlan } from '../../hooks/useCarePlan';
import { useDailyCareInstances } from '../../hooks/useDailyCareInstances';
import { useCareTasks } from '../../hooks/useCareTasks';
import { useAppointments } from '../../hooks/useAppointments';
import { useCarePlanConfig } from '../../hooks/useCarePlanConfig';
import { getTodayDateString } from '../../services/carePlanGenerator';
import { BucketType } from '../../types/carePlanConfig';

// Calm Urgency System
import {
  calculateItemUrgency,
  calculateCategoryUrgency,
  applyAboveFoldConstraint,
  createAboveFoldState,
  getDetailedUrgencyLabel,
  getTimeDeltaString,
  shouldShowOverdueText,
  isClinicalCritical,
  type ItemUrgency,
  type UrgencyTier,
  type UrgencyTone,
  CRITICAL_OVERDUE_MINUTES,
  UPCOMING_WINDOW_MINUTES,
} from '../../utils/urgency';
import type { CarePlanItemType } from '../../types/carePlan';
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
// CARE INSIGHT TYPES
// Pattern-based, preventative, and supportive guidance
// NOT: countdown reminders, urgency alerts, "not logged" warnings
// ============================================================================

interface CareInsight {
  icon: string;
  title: string;
  message: string;
  type: 'pattern' | 'preventative' | 'reinforcement' | 'dependency';
  confidence: number; // 0-1, only show if >= 0.6
}

// ============================================================================
// URGENCY STATUS & SCORING SYSTEM
// Answers: "What is the next irreversible decision the caregiver must make?"
// ============================================================================

// Legacy urgency status (for backward compatibility during transition)
type UrgencyStatus = 'OVERDUE' | 'DUE_SOON' | 'LATER_TODAY' | 'COMPLETE' | 'NOT_APPLICABLE';

interface UrgencyInfo {
  status: UrgencyStatus;
  label: string;
  proximityLabel?: string;  // "Next in 45 minutes"
  minutesUntil?: number;
  minutesOverdue?: number;
  // Calm Urgency additions
  tier?: UrgencyTier;
  tone?: UrgencyTone;
  itemUrgency?: ItemUrgency;
}

// Time window definitions for grouping
type TimeWindow = 'morning' | 'afternoon' | 'evening' | 'night';

const TIME_WINDOW_HOURS: Record<TimeWindow, { start: number; end: number; label: string }> = {
  morning: { start: 5, end: 12, label: 'Morning' },
  afternoon: { start: 12, end: 17, label: 'Afternoon' },
  evening: { start: 17, end: 21, label: 'Evening' },
  night: { start: 21, end: 5, label: 'Night' },
};

// ============================================================================
// CALM URGENCY SYSTEM - Task Status Calculation
// Uses 3-tier model: critical (red), attention (amber), info (neutral)
// Key principle: Mood and non-clinical items NEVER show "Overdue" or red
// ============================================================================

/**
 * Calculate urgency status for a single task using Calm Urgency model
 * @param scheduledTime - ISO timestamp or HH:mm time string
 * @param isCompleted - Whether the task is already done
 * @param itemType - Optional: the type of care item for clinical classification
 */
function getUrgencyStatus(
  scheduledTime: string,
  isCompleted: boolean,
  itemType?: string
): UrgencyInfo {
  if (isCompleted) {
    return {
      status: 'COMPLETE',
      label: 'Done',
      tier: 'info',
      tone: 'neutral',
    };
  }

  if (!scheduledTime) {
    return {
      status: 'NOT_APPLICABLE',
      label: '',
      tier: 'info',
      tone: 'neutral',
    };
  }

  const now = new Date();
  const scheduled = new Date(scheduledTime);

  if (isNaN(scheduled.getTime())) {
    return {
      status: 'NOT_APPLICABLE',
      label: '',
      tier: 'info',
      tone: 'neutral',
    };
  }

  // Use new Calm Urgency system
  const category = (itemType || 'custom') as CarePlanItemType;
  const itemUrgency = calculateItemUrgency({
    category,
    dueAt: scheduled,
    now,
    isCompleted: false,
  });

  const diffMs = scheduled.getTime() - now.getTime();
  const diffMinutes = Math.round(diffMs / (1000 * 60));

  // Map Calm Urgency tier to legacy UrgencyStatus
  // NO time deltas in primary labels - keeps UI calm
  let legacyStatus: UrgencyStatus;
  let proximityLabel: string | undefined;

  if (itemUrgency.tier === 'critical') {
    legacyStatus = 'OVERDUE';
    // Only critical items show time delta
    const hours = Math.floor(itemUrgency.minutesLate / 60);
    const mins = itemUrgency.minutesLate % 60;
    proximityLabel = hours > 0 ? `${hours}h ${mins}m late` : `${mins}m late`;
  } else if (itemUrgency.tier === 'attention') {
    if (itemUrgency.isOverdue) {
      // Non-critical overdue: NO time delta, just friendly label
      legacyStatus = 'OVERDUE';
      proximityLabel = undefined; // Don't show time in header for non-critical
    } else {
      legacyStatus = 'DUE_SOON';
      const minutesUntil = Math.abs(diffMinutes);
      // For upcoming items, show proximity without time pressure
      proximityLabel = minutesUntil <= 0
        ? 'Ready to log'
        : minutesUntil < 60
          ? `Coming up in ${minutesUntil} min`
          : `Coming up in ${Math.round(minutesUntil / 60)}h`;
    }
  } else {
    legacyStatus = 'LATER_TODAY';
    const hours = Math.floor(Math.abs(diffMinutes) / 60);
    proximityLabel = hours > 0 ? `In about ${hours}h` : 'Later today';
  }

  return {
    status: legacyStatus,
    label: itemUrgency.label,
    proximityLabel,
    minutesUntil: diffMinutes > 0 ? diffMinutes : undefined,
    minutesOverdue: itemUrgency.minutesLate || undefined,
    tier: itemUrgency.tier,
    tone: itemUrgency.tone,
    itemUrgency,
  };
}

/**
 * Get urgency status for a category (meds, vitals, etc.) using Calm Urgency
 * Implements above-fold constraint: max 1 red element in top section
 */
interface CategoryUrgencyResult {
  status: UrgencyStatus;
  tier: UrgencyTier;
  tone: UrgencyTone;
  label: string;
  isCritical: boolean;
}

function getCategoryUrgencyStatus(
  instances: any[],
  itemType: string,
  stat: StatData,
  aboveFoldState?: { hasCriticalNextUp: boolean; criticalTileCount: number }
): CategoryUrgencyResult {
  const defaultResult: CategoryUrgencyResult = {
    status: 'NOT_APPLICABLE',
    tier: 'info',
    tone: 'neutral',
    label: '',
    isCritical: false,
  };

  if (stat.total === 0) return defaultResult;

  if (stat.completed === stat.total) {
    return {
      status: 'COMPLETE',
      tier: 'info',
      tone: 'neutral',
      label: 'Complete',
      isCritical: false,
    };
  }

  const pendingInstances = instances.filter(
    i => i.itemType === itemType && i.status === 'pending'
  );

  if (pendingInstances.length === 0) {
    return {
      status: 'COMPLETE',
      tier: 'info',
      tone: 'neutral',
      label: 'Complete',
      isCritical: false,
    };
  }

  // Calculate category urgency using Calm Urgency system
  const category = itemType as CarePlanItemType;
  const categoryUrgency = calculateCategoryUrgency({
    category,
    items: pendingInstances.map(i => ({
      dueAt: i.scheduledTime,
      isCompleted: false,
    })),
  });

  // Apply above-fold constraint if provided
  let finalUrgency = categoryUrgency;
  if (aboveFoldState && categoryUrgency.tier === 'critical') {
    const constraintState = createAboveFoldState(aboveFoldState.hasCriticalNextUp);
    constraintState.criticalTileCount = aboveFoldState.criticalTileCount;
    finalUrgency = applyAboveFoldConstraint(categoryUrgency, constraintState);
  }

  // Map to legacy status
  let legacyStatus: UrgencyStatus;
  if (finalUrgency.tier === 'critical') {
    legacyStatus = 'OVERDUE';
  } else if (finalUrgency.tier === 'attention') {
    legacyStatus = finalUrgency.isOverdue ? 'OVERDUE' : 'DUE_SOON';
  } else {
    legacyStatus = 'LATER_TODAY';
  }

  return {
    status: legacyStatus,
    tier: finalUrgency.tier,
    tone: finalUrgency.tone,
    label: finalUrgency.label,
    isCritical: finalUrgency.tier === 'critical',
  };
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

  // NEW: useCareTasks - Single source of truth for task stats
  // Wraps useDailyCareInstances and provides canonical CarePlanTask model
  const { state: careTasksState } = useCareTasks(today);

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
  // SINGLE SOURCE OF TRUTH: Compute stats from useCareTasks hook
  // This ensures Progress cards and Timeline are always synchronized
  // The hook transforms DailyCareInstances into canonical CarePlanTask model
  // ============================================================================
  const todayStats = useMemo((): TodayStats => {
    // Use useCareTasks as single source of truth when available
    if (careTasksState && careTasksState.tasks.length > 0 && careTasksState.date === today) {
      const getTypeStats = (itemType: string): StatData => {
        const typeTasks = careTasksState.tasks.filter(t => t.type === itemType);
        const completed = typeTasks.filter(t => t.status === 'completed').length;
        return { completed, total: typeTasks.length };
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

    // Fall back to legacy stats (from raw logs) when no tasks or date mismatch
    return legacyStats;
  }, [careTasksState, legacyStats, today]);

  // AI Insight (legacy - being replaced by Care Insight)
  const [aiInsight, setAiInsight] = useState<AIInsight | null>(null);

  // Care Insight - pattern-based, supportive guidance (NEW)
  const [careInsight, setCareInsight] = useState<CareInsight | null>(null);

  // ============================================================================
  // CARE INSIGHT GENERATOR
  // Rules:
  // ✅ Pattern awareness, preventative suggestions, positive reinforcement, dependency awareness
  // ❌ Countdown reminders, "not logged" warnings, urgency alerts, fear-based language
  // ============================================================================
  const generateCareInsight = useCallback((
    stats: TodayStats,
    instances: any[],
    completedCount: number,
    consecutiveLoggingDays: number = 0  // Track logging streak
  ): CareInsight | null => {
    const insights: CareInsight[] = [];
    const now = new Date();
    const currentHour = now.getHours();

    // Calculate some useful metrics
    const totalItems = stats.meds.total + stats.vitals.total + stats.mood.total + stats.meals.total;
    const totalCompleted = stats.meds.completed + stats.vitals.completed + stats.mood.completed + stats.meals.completed;
    const completionRate = totalItems > 0 ? totalCompleted / totalItems : 0;

    // Check for vitals + medication dependency pattern
    const hasPendingMeds = instances.some(i => i.itemType === 'medication' && i.status === 'pending');
    const hasVitalsNotLogged = stats.vitals.total > 0 && stats.vitals.completed === 0;
    const hasBPMedication = instances.some(i =>
      i.itemType === 'medication' &&
      i.itemName.toLowerCase().includes('blood pressure') ||
      i.itemName.toLowerCase().includes('lisinopril') ||
      i.itemName.toLowerCase().includes('amlodipine') ||
      i.itemName.toLowerCase().includes('metoprolol')
    );

    // DEPENDENCY AWARENESS: Vitals before BP medication
    if (hasBPMedication && hasVitalsNotLogged && hasPendingMeds && currentHour >= 6 && currentHour < 12) {
      insights.push({
        icon: '📊',
        title: 'A quick check first',
        message: 'Logging vitals before blood pressure medication helps track how well it\'s working.',
        type: 'dependency',
        confidence: 0.8,
      });
    }

    // PATTERN AWARENESS: Morning medication timing
    if (stats.meds.total > 0 && stats.meds.completed === 0 && currentHour >= 9 && currentHour < 11) {
      const morningMeds = instances.filter(i =>
        i.itemType === 'medication' && i.status === 'pending' &&
        new Date(i.scheduledTime).getHours() < 12
      );
      if (morningMeds.length > 0) {
        insights.push({
          icon: '💊',
          title: 'Consistent timing helps',
          message: 'Taking medications at the same time each day can improve their effectiveness.',
          type: 'pattern',
          confidence: 0.75,
        });
      }
    }

    // PREVENTATIVE: Logging vitals helps detect changes
    if (stats.vitals.total > 0 && stats.vitals.completed > 0 && stats.meds.total > 0) {
      insights.push({
        icon: '📈',
        title: 'Building your baseline',
        message: 'Regular vitals logging helps detect dosage changes early.',
        type: 'preventative',
        confidence: 0.7,
      });
    }

    // REINFORCEMENT: Consistent logging streak
    if (consecutiveLoggingDays >= 3) {
      insights.push({
        icon: '✨',
        title: 'Great consistency',
        message: `You've logged consistently for ${consecutiveLoggingDays} days. That builds strong health baselines.`,
        type: 'reinforcement',
        confidence: 0.9,
      });
    }

    // REINFORCEMENT: Good progress today
    if (completionRate >= 0.5 && completionRate < 1.0 && totalCompleted >= 3) {
      insights.push({
        icon: '👍',
        title: 'Solid progress today',
        message: 'You\'re over halfway through today\'s care tasks.',
        type: 'reinforcement',
        confidence: 0.8,
      });
    }

    // REINFORCEMENT: All complete celebration (soft version)
    if (completionRate === 1.0 && totalItems > 0) {
      insights.push({
        icon: '✓',
        title: 'Today\'s care complete',
        message: 'All scheduled tasks are logged. Great work.',
        type: 'reinforcement',
        confidence: 1.0,
      });
    }

    // PREVENTATIVE: Meal logging for medication absorption
    if (stats.meals.total > 0 && stats.meals.completed === 0 && stats.meds.total > 0 && currentHour >= 12) {
      insights.push({
        icon: '🍽️',
        title: 'Food and medication',
        message: 'Some medications work better with food. Logging meals helps track this.',
        type: 'preventative',
        confidence: 0.65,
      });
    }

    // REMOVED: "Medications ready to log" - redundant with Next Up card
    // The Next Up card already shows what to do next, so this insight
    // adds no value and creates visual clutter

    // REMOVED: "Your care day is set" - too generic, adds no value
    // If Next Up exists, user already knows what to do

    // PATTERN AWARENESS: Mood affects medication adherence
    if (stats.mood.total > 0 && stats.mood.completed > 0) {
      insights.push({
        icon: '😊',
        title: 'Mood tracking helps',
        message: 'Mood patterns can reveal how medications are affecting daily life.',
        type: 'pattern',
        confidence: 0.7,
      });
    }

    // Filter to only high-confidence insights (>= 0.6 threshold)
    const highConfidenceInsights = insights.filter(i => i.confidence >= 0.6);

    // Return the highest confidence insight
    if (highConfidenceInsights.length > 0) {
      highConfidenceInsights.sort((a, b) => b.confidence - a.confidence);
      return highConfidenceInsights[0];
    }

    return null;
  }, []);

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

  // Generate Care Insight when stats or instances change
  useEffect(() => {
    const instances = instancesState?.instances || [];
    const completedCount = instances.filter(
      i => i.status === 'completed' || i.status === 'skipped'
    ).length;

    // TODO: Track consecutive logging days from storage for streak calculation
    const consecutiveLoggingDays = 0; // Placeholder - could be enhanced with actual tracking

    const insight = generateCareInsight(
      todayStats,
      instances,
      completedCount,
      consecutiveLoggingDays
    );
    setCareInsight(insight);
  }, [todayStats, instancesState, generateCareInsight]);

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

  // =========================================================================
  // CALM URGENCY: Track above-fold constraint
  // Rule: Max 1 red/danger element above the fold (Next Up OR one tile)
  // Note: nextUpIsCritical is computed inline in renderProgressRing
  // because todayTimeline is defined later in the render function
  // =========================================================================

  // Track how many critical tiles we've rendered (for above-fold cap)
  let criticalTileCount = 0;

  const renderProgressRing = (
    icon: string,
    label: string,
    stat: StatData,
    onPress: () => void,
    itemType?: string,  // For checking upcoming schedule
    nextUpInstance?: any  // Pass next up instance for above-fold constraint
  ) => {
    const percent = getProgressPercent(stat.completed, stat.total);
    const status = getProgressStatus(stat.completed, stat.total);
    const dashoffset = calculateStrokeDashoffset(percent);
    const circumference = 2 * Math.PI * 21;

    // Compute if Next Up is critical (for above-fold constraint)
    let nextUpIsCritical = false;
    if (nextUpInstance) {
      const nextUpUrgency = getUrgencyStatus(nextUpInstance.scheduledTime, false, nextUpInstance.itemType);
      nextUpIsCritical = nextUpUrgency.tier === 'critical';
    }

    // Get urgency status using Calm Urgency system with above-fold constraint
    const instances = instancesState?.instances || [];
    const urgencyResult = itemType
      ? getCategoryUrgencyStatus(instances, itemType, stat, {
          hasCriticalNextUp: nextUpIsCritical,
          criticalTileCount,
        })
      : { status: 'NOT_APPLICABLE' as UrgencyStatus, tier: 'info' as UrgencyTier, tone: 'neutral' as UrgencyTone, label: '', isCritical: false };

    // Track critical tiles for above-fold constraint
    if (urgencyResult.isCritical) {
      criticalTileCount++;
    }

    // Determine stroke color based on Calm Urgency tier/tone
    // CALM URGENCY: Subdue ring colors when Next Up is present (one visual focus)
    const getStrokeColorWithUrgency = () => {
      if (status === 'complete') return Colors.green;  // Green always shows
      // When Next Up exists, use muted colors for non-complete tiles
      if (nextUpInstance) {
        if (status === 'partial' || status === 'missing') return Colors.toneNeutralBorder;
        return Colors.toneNeutralBorder;
      }
      // No Next Up: show full urgency colors
      if (urgencyResult.tone === 'danger') return Colors.toneDanger;  // Red (only clinical critical)
      if (urgencyResult.tone === 'warn') return Colors.toneWarn;  // Amber
      if (status === 'partial' || status === 'missing') return Colors.toneWarn;  // Soft amber
      return Colors.toneNeutralBorder;  // Neutral gray
    };

    const strokeColor = getStrokeColorWithUrgency();

    // Determine display text based on status and Calm Urgency tier
    // Use friendly labels: NO "pending", "overdue", or time deltas
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
        // CALM URGENCY: Friendly labels only
        if (urgencyResult.tier === 'critical') {
          statusLabel = 'late';  // Only critical clinical items say "late"
          statusStyle = 'stat_overdue' as keyof typeof styles;
        } else if (urgencyResult.tier === 'attention' && urgencyResult.status === 'OVERDUE') {
          statusLabel = 'due earlier';  // Non-critical overdue: calm phrasing
          statusStyle = 'stat_due_soon' as keyof typeof styles;
        } else if (urgencyResult.tier === 'attention') {
          statusLabel = 'still to do';  // Due soon: encouraging
          statusStyle = 'stat_due_soon' as keyof typeof styles;
        } else if (urgencyResult.tier === 'info') {
          statusLabel = 'later today';
          statusStyle = 'stat_later' as keyof typeof styles;
        } else {
          statusLabel = status === 'partial' ? 'in progress' : 'available';
        }
        break;
      case 'inactive':
        statText = '—';
        statusLabel = 'not tracked';
        break;
    }

    // Only make tappable if there's something to log
    const isTappable = status !== 'inactive';

    // Get urgency-based tile styling using Calm Urgency tones
    // CALM URGENCY: Suppress strong styling when Next Up is present
    // Only Next Up gets the dominant visual focus above the fold
    const getTileUrgencyStyle = () => {
      // When Next Up exists, tiles use subdued styling (no strong borders/backgrounds)
      if (nextUpInstance) {
        // Complete tiles can still show green
        if (status === 'complete') return null;
        // All other tiles stay neutral - Next Up has the focus
        return null;
      }
      // No Next Up: tiles can show urgency styling
      if (urgencyResult.tone === 'danger') return styles.checkinItemOverdue;
      if (urgencyResult.tone === 'warn') return styles.checkinItemDueSoon;
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
      return { overdue: [], upcoming: [], completed: [], nextUp: null };
    }

    // Safety check: ensure instancesState is for today
    // This prevents showing stale data from a previous day
    if (instancesState.date !== today) {
      console.log('[NowScreen] Instance date mismatch:', instancesState.date, 'vs today:', today);
      return { overdue: [], upcoming: [], completed: [], nextUp: null };
    }

    const allInstances = instancesState.instances;
    const now = new Date();

    // =========================================================================
    // CALM URGENCY: Priority-based Next Up Selection
    // Rule: Mood can NEVER be Next Up if meds or meals are late or due soon
    //
    // Priority order:
    // 1. Late clinical-critical (meds, meals) - 30+ min overdue
    // 2. Due-soon clinical-critical (within 60 min)
    // 3. Late neutral (vitals)
    // 4. Late non-clinical (mood, hydration, etc.)
    // 5. Due-soon non-clinical
    // 6. Later today items
    // =========================================================================

    const getPriorityScore = (instance: any): number => {
      const scheduled = new Date(instance.scheduledTime);
      if (isNaN(scheduled.getTime())) return 999;

      const diffMs = now.getTime() - scheduled.getTime();
      const minutesLate = Math.floor(diffMs / (1000 * 60));
      const isLate = minutesLate > OVERDUE_GRACE_MINUTES;
      const isDueSoon = !isLate && minutesLate > -UPCOMING_WINDOW_MINUTES;

      const isClinical = isClinicalCritical(instance.itemType);
      const isNeutral = instance.itemType === 'vitals';

      // Priority tiers (lower = higher priority)
      if (isClinical && isLate) return 100 - minutesLate; // Late clinical: highest priority, more late = more urgent
      if (isClinical && isDueSoon) return 200 - minutesLate; // Due-soon clinical
      if (isNeutral && isLate) return 300 - minutesLate; // Late vitals
      if (!isClinical && !isNeutral && isLate) return 400 - minutesLate; // Late non-clinical (mood, etc.)
      if (!isClinical && isDueSoon) return 500 - minutesLate; // Due-soon non-clinical
      return 600 + Math.abs(minutesLate); // Later today (lower priority, further = even lower)
    };

    // Calculate priority scores for all pending instances
    const withScores = allInstances.map(instance => {
      if (instance.status !== 'pending') {
        return { instance, priorityScore: 999 };
      }
      const priorityScore = getPriorityScore(instance);
      return { instance, priorityScore };
    });

    // Filter pending items and sort by PRIORITY SCORE
    const pendingWithScores = withScores
      .filter(w => w.instance.status === 'pending')
      .sort((a, b) => a.priorityScore - b.priorityScore); // Lower priority score = higher priority

    // Separate into overdue and upcoming (keep priority order)
    const overdue = pendingWithScores
      .filter(w => isOverdue(w.instance.scheduledTime))
      .map(w => w.instance);

    const upcoming = pendingWithScores
      .filter(w => !isOverdue(w.instance.scheduledTime))
      .map(w => w.instance);

    const completed = allInstances.filter(
      i => i.status === 'completed' || i.status === 'skipped'
    ).sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

    // "Next Up" = highest PRIORITY pending item (clinical items first when late/due-soon)
    const nextUp = pendingWithScores[0]?.instance || null;

    return { overdue, upcoming, completed, nextUp };
  }, [instancesState?.instances, instancesState?.date, today]);

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

            {/* Sample Data Banner - Shows when demo data is present */}
            <SampleDataBanner compact />

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
            {/* LAYOUT HIERARCHY: Next Up → Care Insight → Progress → Timeline */}
            {/* ============================================================ */}

            {/* 1️⃣ NEXT UP CARD - Primary Decision Engine (visually dominant) */}
            {/* Answers: "What is the next irreversible decision the caregiver must make?" */}
            {/* CALM URGENCY: Only clinical items 30+ min overdue show red */}
            {hasRegimenInstances && todayTimeline.nextUp && (() => {
              const nextUp = todayTimeline.nextUp;
              const nextUpTime = parseTimeForDisplay(nextUp.scheduledTime);
              // Pass itemType for Calm Urgency classification
              const urgencyInfo = getUrgencyStatus(nextUp.scheduledTime, false, nextUp.itemType);

              // Determine card styles based on Calm Urgency tier/tone
              const getCardStyle = () => {
                // Only show red for critical tier (clinical items 30+ min overdue)
                if (urgencyInfo.tone === 'danger') return styles.nextUpCardOverdue;
                if (urgencyInfo.tone === 'warn') return styles.nextUpCardDueSoon;
                if (urgencyInfo.tier === 'info' && urgencyInfo.status !== 'COMPLETE') return styles.nextUpCardLater;
                return null;
              };

              const getIconStyle = () => {
                if (urgencyInfo.tone === 'danger') return styles.nextUpIconOverdue;
                if (urgencyInfo.tone === 'warn') return styles.nextUpIconDueSoon;
                if (urgencyInfo.tier === 'info' && urgencyInfo.status !== 'COMPLETE') return styles.nextUpIconLater;
                return null;
              };

              const getLabelStyle = () => {
                if (urgencyInfo.tone === 'danger') return styles.nextUpLabelOverdue;
                if (urgencyInfo.tone === 'warn') return styles.nextUpLabelDueSoon;
                if (urgencyInfo.tier === 'info' && urgencyInfo.status !== 'COMPLETE') return styles.nextUpLabelLater;
                return null;
              };

              const getUrgencyLabelStyle = () => {
                if (urgencyInfo.tone === 'danger') return styles.nextUpUrgencyLabelOverdue;
                if (urgencyInfo.tone === 'warn') return styles.nextUpUrgencyLabelDueSoon;
                if (urgencyInfo.tier === 'info' && urgencyInfo.status !== 'COMPLETE') return styles.nextUpUrgencyLabelLater;
                return null;
              };

              const getActionStyle = () => {
                if (urgencyInfo.tone === 'danger') return styles.nextUpActionOverdue;
                if (urgencyInfo.tone === 'warn') return styles.nextUpActionDueSoon;
                if (urgencyInfo.tier === 'info' && urgencyInfo.status !== 'COMPLETE') return styles.nextUpActionLater;
                return null;
              };

              // Get display label - uses calm language for non-critical
              const displayLabel = urgencyInfo.itemUrgency
                ? getDetailedUrgencyLabel(urgencyInfo.itemUrgency)
                : urgencyInfo.label;

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
                    {/* Single status label - CALM URGENCY: friendly language, no time deltas */}
                    <Text style={[styles.nextUpProximityLabel, getUrgencyLabelStyle()]}>
                      {urgencyInfo.tier === 'critical' && urgencyInfo.proximityLabel
                        ? urgencyInfo.proximityLabel  // "1h 29m late" for critical only
                        : displayLabel}               {/* "Due earlier today" for non-critical */}
                    </Text>
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

            {/* 2️⃣ CARE PLAN PROGRESS - Orientation Dashboard */}
            {/* Provides fast reassurance: "Are we generally okay?" */}
            {/* CALM URGENCY: Pass nextUp for above-fold constraint */}
            <View style={styles.progressSection}>
              <Text style={styles.sectionTitle}>CARE PLAN PROGRESS</Text>
              <View style={styles.progressGrid}>
                {(enabledBuckets.length === 0 || enabledBuckets.includes('meds' as BucketType)) &&
                  renderProgressRing('💊', 'Meds', todayStats.meds, () => handleProgressTileTap('meds'), 'medication', todayTimeline?.nextUp)}
                {(enabledBuckets.length === 0 || enabledBuckets.includes('vitals' as BucketType)) &&
                  renderProgressRing('📊', 'Vitals', todayStats.vitals, () => handleProgressTileTap('vitals'), 'vitals', todayTimeline?.nextUp)}
                {(enabledBuckets.length === 0 || enabledBuckets.includes('mood' as BucketType)) &&
                  renderProgressRing('😊', 'Mood', todayStats.mood, () => handleProgressTileTap('mood'), 'mood', todayTimeline?.nextUp)}
                {(enabledBuckets.length === 0 || enabledBuckets.includes('meals' as BucketType)) &&
                  renderProgressRing('🍽️', 'Meals', todayStats.meals, () => handleProgressTileTap('meals'), 'nutrition', todayTimeline?.nextUp)}
              </View>
            </View>

            {/* 3️⃣ CARE INSIGHT - Pattern-based supportive guidance */}
            {/* Only show when it adds unique value beyond Next Up card */}
            {/* Hide generic insights when Next Up already provides clear guidance */}
            {careInsight && (
              !todayTimeline?.nextUp ||  // Show if no Next Up
              careInsight.type === 'reinforcement' ||  // Always show positive reinforcement
              careInsight.type === 'dependency' ||  // Always show dependency warnings
              careInsight.confidence >= 0.8  // Show high-confidence insights
            ) && (
              <View style={[
                styles.careInsightCard,
                careInsight.type === 'reinforcement' && styles.careInsightReinforcement,
                careInsight.type === 'pattern' && styles.careInsightPattern,
                careInsight.type === 'preventative' && styles.careInsightPreventative,
                careInsight.type === 'dependency' && styles.careInsightDependency,
              ]}>
                <View style={styles.careInsightHeader}>
                  <Text style={styles.careInsightLabel}>CARE INSIGHT</Text>
                </View>
                <View style={styles.careInsightBody}>
                  <Text style={styles.careInsightIcon}>{careInsight.icon}</Text>
                  <View style={styles.careInsightContent}>
                    <Text style={styles.careInsightTitle}>{careInsight.title}</Text>
                    <Text style={styles.careInsightMessage}>{careInsight.message}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* 4️⃣ TIMELINE DETAILS - Task Backlog with Time Grouping */}
            {/* Auto-shown when items exist */}
            {hasRegimenInstances && (todayTimeline.overdue.length > 0 || todayTimeline.upcoming.length > 0) && (
              <>
                {/* Timeline header with Adjust Today link */}
                <View style={styles.timelineSectionHeader}>
                  <Text style={styles.sectionTitle}>TODAY'S PLAN</Text>
                  <TouchableOpacity
                    onPress={() => router.push('/today-scope' as any)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.adjustTodayLink}>Adjust Today</Text>
                  </TouchableOpacity>
                </View>

                {/* Overdue items - highest priority, always expanded */}
                {/* CALM URGENCY: Unified "Needs attention" header - never say "Overdue" */}
                {todayTimeline.overdue.length > 0 && (() => {
                  // Check if ANY overdue item is critical (clinical + 30+ min late)
                  const hasCriticalItem = todayTimeline.overdue.some(instance => {
                    const urgency = getUrgencyStatus(instance.scheduledTime, false, instance.itemType);
                    return urgency.tier === 'critical';
                  });
                  // CALM URGENCY: Always "Needs attention" - consistent with item labels
                  // Critical items get subtle visual distinction but same header
                  const sectionEmoji = hasCriticalItem ? '⚠️' : '📋';
                  const sectionLabel = 'Needs attention';
                  const titleStyle = hasCriticalItem ? styles.timeGroupTitleOverdue : styles.timeGroupTitlePending;
                  const countStyle = hasCriticalItem ? styles.timeGroupCountOverdue : styles.timeGroupCountPending;

                  return (
                  <View style={styles.overdueSection}>
                    <View style={styles.timeGroupHeader}>
                      <View style={styles.timeGroupHeaderTouchable}>
                        <Text style={[styles.timeGroupTitle, titleStyle]}>
                          {sectionEmoji} {sectionLabel}
                        </Text>
                        <Text style={[styles.timeGroupCount, countStyle]}>
                          ({todayTimeline.overdue.length})
                        </Text>
                      </View>
                    </View>
                    {todayTimeline.overdue.map((instance) => {
                      const timeDisplay = parseTimeForDisplay(instance.scheduledTime);
                      // CALM URGENCY: Pass itemType for clinical classification
                      const urgencyInfo = getUrgencyStatus(instance.scheduledTime, false, instance.itemType);

                      // CALM URGENCY: Friendly status label (no time delta)
                      const statusLabel = urgencyInfo.itemUrgency
                        ? getDetailedUrgencyLabel(urgencyInfo.itemUrgency)
                        : 'Due earlier today';

                      // Time delta only shown as small secondary info
                      const timeDelta = urgencyInfo.itemUrgency
                        ? getTimeDeltaString(urgencyInfo.itemUrgency)
                        : null;

                      // CALM URGENCY: Only use red styling for critical tier
                      const isRed = urgencyInfo.tone === 'danger';
                      const itemStyle = isRed ? styles.timelineItemOverdue : styles.timelineItemPending;
                      const iconStyle = isRed ? styles.timelineIconOverdue : styles.timelineIconPending;
                      const timeStyle = isRed ? styles.timelineTimeOverdue : styles.timelineTimePending;
                      const actionStyle = isRed ? styles.timelineActionOverdue : styles.timelineActionPending;

                      return (
                        <TouchableOpacity
                          key={instance.id}
                          style={[styles.timelineItem, itemStyle]}
                          onPress={() => handleTimelineItemPress(instance)}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.timelineIcon, iconStyle]}>
                            <Text style={styles.timelineIconEmoji}>{instance.itemEmoji || '🔔'}</Text>
                          </View>
                          <View style={styles.timelineDetails}>
                            <Text style={timeStyle}>
                              {timeDisplay ? `${timeDisplay} • ${statusLabel}` : statusLabel}
                            </Text>
                            <Text style={styles.timelineTitle}>{instance.itemName}</Text>
                            {/* Time delta shown as small secondary text only */}
                            {timeDelta && (
                              <Text style={styles.timelineSubtitle}>{timeDelta}</Text>
                            )}
                            {instance.instructions && !timeDelta && (
                              <Text style={styles.timelineSubtitle} numberOfLines={1}>
                                {instance.instructions}
                              </Text>
                            )}
                          </View>
                          <View style={[styles.timelineAction, actionStyle]}>
                            <Text style={styles.timelineActionText}>Log</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  );
                })()}

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
                          // CALM URGENCY: Pass itemType for proper classification
                          const urgencyInfo = getUrgencyStatus(instance.scheduledTime, false, instance.itemType);

                          // CALM URGENCY: Friendly status label
                          const statusLabel = urgencyInfo.itemUrgency
                            ? getDetailedUrgencyLabel(urgencyInfo.itemUrgency)
                            : urgencyInfo.label;

                          // CALM URGENCY: Apply styling based on tier (amber for attention, neutral for info)
                          const isDueSoon = urgencyInfo.tier === 'attention' && !urgencyInfo.itemUrgency?.isOverdue;
                          const itemStyle = isDueSoon ? styles.timelineItemDueSoon : null;
                          const iconStyle = isDueSoon ? styles.timelineIconDueSoon : null;
                          const timeStyle = isDueSoon ? styles.timelineTimeDueSoon : styles.timelineTime;

                          return (
                            <TouchableOpacity
                              key={instance.id}
                              style={[styles.timelineItem, itemStyle]}
                              onPress={() => handleTimelineItemPress(instance)}
                              activeOpacity={0.7}
                            >
                              <View style={[styles.timelineIcon, iconStyle]}>
                                <Text style={styles.timelineIconEmoji}>{instance.itemEmoji || '🔔'}</Text>
                              </View>
                              <View style={styles.timelineDetails}>
                                <Text style={timeStyle}>
                                  {timeDisplay ? `${timeDisplay} • ${statusLabel}` : statusLabel}
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

            {/* Empty states - shown when no regimen instances */}
            {!hasRegimenInstances && !hasBucketCarePlan && !carePlan && (
              <View style={styles.emptyTimeline}>
                <Text style={styles.emptyTimelineText}>No Care Plan set up yet</Text>
                <Text style={styles.emptyTimelineSubtext}>Add medications or items to see your timeline</Text>
              </View>
            )}

            {/* Care Plan exists but no instances generated yet */}
            {!hasRegimenInstances && (hasBucketCarePlan || carePlan) && (
              <View style={styles.emptyTimeline}>
                <Text style={styles.emptyTimelineText}>No items scheduled for today</Text>
                <Text style={styles.emptyTimelineSubtext}>Check your Care Plan settings</Text>
              </View>
            )}

            {hasRegimenInstances &&
              todayTimeline.overdue.length === 0 &&
              todayTimeline.upcoming.length === 0 &&
              todayTimeline.completed.length === 0 && (
              <View style={styles.emptyTimeline}>
                <Text style={styles.emptyTimelineText}>No items scheduled for today</Text>
              </View>
            )}

            {hasRegimenInstances &&
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

  // Section Header (kept for compatibility)
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  timelineSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  adjustTodayLink: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.accent,
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

  // ============================================================================
  // CARE INSIGHT - Pattern-based supportive guidance
  // Softer styling than Next Up, calm and supportive tone
  // ============================================================================
  careInsightCard: {
    backgroundColor: 'rgba(139, 92, 246, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.15)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  careInsightReinforcement: {
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderColor: 'rgba(16, 185, 129, 0.15)',
  },
  careInsightPattern: {
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    borderColor: 'rgba(59, 130, 246, 0.15)',
  },
  careInsightPreventative: {
    backgroundColor: 'rgba(251, 191, 36, 0.05)',
    borderColor: 'rgba(251, 191, 36, 0.15)',
  },
  careInsightDependency: {
    backgroundColor: 'rgba(94, 234, 212, 0.05)',
    borderColor: 'rgba(94, 234, 212, 0.15)',
  },
  careInsightHeader: {
    marginBottom: 10,
  },
  careInsightLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(139, 92, 246, 0.7)',
    letterSpacing: 1,
  },
  careInsightBody: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  careInsightIcon: {
    fontSize: 20,
    marginTop: 2,
  },
  careInsightContent: {
    flex: 1,
  },
  careInsightTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  careInsightMessage: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.65)',
    lineHeight: 19,
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
  // CALM URGENCY: Pending style for non-critical overdue items (amber, not red)
  timelineItemPending: {
    borderLeftColor: 'rgba(245, 158, 11, 0.5)',
    backgroundColor: 'rgba(245, 158, 11, 0.06)',
  },
  // CALM URGENCY: Due soon style for upcoming items (soft amber highlight)
  timelineItemDueSoon: {
    borderLeftColor: 'rgba(245, 158, 11, 0.35)',
    backgroundColor: 'rgba(245, 158, 11, 0.04)',
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
  // CALM URGENCY: Pending icon style (amber, not red)
  timelineIconPending: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  // CALM URGENCY: Due soon icon style (soft amber)
  timelineIconDueSoon: {
    backgroundColor: 'rgba(245, 158, 11, 0.10)',
    borderColor: 'rgba(245, 158, 11, 0.25)',
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
  // CALM URGENCY: Pending time style (amber, not red)
  timelineTimePending: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '600',
    marginBottom: 3,
  },
  // CALM URGENCY: Due soon time style (softer amber for upcoming)
  timelineTimeDueSoon: {
    fontSize: 12,
    color: 'rgba(245, 158, 11, 0.85)',
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
  // CALM URGENCY: Pending action style (amber, not red)
  timelineActionPending: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
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
  // CALM URGENCY: Pending section title (amber, not red)
  timeGroupTitlePending: {
    color: '#F59E0B',
  },
  timeGroupCount: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    marginLeft: 8,
  },
  timeGroupCountOverdue: {
    color: '#EF4444',
  },
  // CALM URGENCY: Pending section count (amber, not red)
  timeGroupCountPending: {
    color: '#F59E0B',
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
