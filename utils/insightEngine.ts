// ============================================================================
// INSIGHT ENGINE
// Analyzes user data to generate actionable insights
// Transforms vague alerts into specific, helpful recommendations
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeGetItem, safeSetItem } from './safeStorage';
import { getMedications, getMedicationLogs, Medication, MedicationLog } from './medicationStorage';
import { getVitalsInRange, VitalReading } from './vitalsStorage';
import { getDailyTrackingLogs, DailyTrackingLog } from './dailyTrackingStorage';
import { logError } from './devLog';
import { getTodayDateString } from '../services/carePlanGenerator';
import { StorageKeys } from './storageKeys';

// ============================================================================
// TYPES
// ============================================================================

export interface InsightData {
  id: string;
  type: 'medication' | 'vitals' | 'mood' | 'correlation' | 'trend';
  severity: 'info' | 'warning' | 'alert';
  title: string;
  specificData: {
    current: number;
    target: number;
    unit: string;
    percentage?: number;
  };
  context: string;
  whyItMatters: string;
  pattern?: string;
  actions: InsightAction[];
  timestamp: Date;
}

export interface InsightAction {
  id: string;
  label: string;
  icon: string;
  type: 'navigate' | 'external' | 'modal';
  destination?: string;
  data?: any;
}

const DISMISSED_INSIGHTS_KEY = StorageKeys.DISMISSED_INSIGHTS;

// ============================================================================
// MEDICATION ADHERENCE ANALYZER
// ============================================================================

/**
 * Analyze medication adherence patterns
 */
export async function analyzeMedicationAdherence(): Promise<InsightData | null> {
  try {
    const medications = await getMedications();
    const activeMeds = medications.filter(m => m.active);

    if (activeMeds.length === 0) {
      return null;
    }

    // Get logs from last 7 days
    const logs = await getMedicationLogs();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentLogs = logs.filter(
      log => new Date(log.timestamp) >= sevenDaysAgo
    );

    // Calculate expected vs actual doses
    const expectedDosesPerDay = activeMeds.length;
    const totalExpectedDoses = expectedDosesPerDay * 7;
    const takenDoses = recentLogs.filter(log => log.taken).length;

    const adherenceRate = totalExpectedDoses > 0
      ? (takenDoses / totalExpectedDoses) * 100
      : 100;

    // Only create insight if adherence is below 90%
    if (adherenceRate >= 90) {
      return null;
    }

    // Analyze which days have most missed doses
    const missedByDay: { [key: string]: number } = {};
    const allLogs = logs.filter(log => new Date(log.timestamp) >= sevenDaysAgo);

    for (const log of allLogs) {
      if (!log.taken) {
        const dayName = new Date(log.timestamp).toLocaleDateString('en-US', { weekday: 'long' });
        missedByDay[dayName] = (missedByDay[dayName] || 0) + 1;
      }
    }

    const mostMissedDay = Object.entries(missedByDay)
      .sort(([, a], [, b]) => b - a)[0]?.[0];

    const severity: 'info' | 'warning' | 'alert' =
      adherenceRate < 60 ? 'alert' :
      adherenceRate < 80 ? 'warning' : 'info';

    return {
      id: 'medication-adherence',
      type: 'medication',
      severity,
      title: 'Medication Adherence Pattern',
      specificData: {
        current: takenDoses,
        target: totalExpectedDoses,
        unit: 'doses',
        percentage: Math.round(adherenceRate),
      },
      context: mostMissedDay
        ? `You're missing doses most often on ${mostMissedDay}.`
        : `You've taken ${takenDoses} of ${totalExpectedDoses} doses this week.`,
      whyItMatters: 'Taking all doses consistently helps manage your health conditions effectively. Missing doses can lead to fluctuations in blood pressure and blood sugar levels.',
      pattern: mostMissedDay ? `Most missed on ${mostMissedDay}` : undefined,
      actions: [
        {
          id: 'adjust-reminders',
          label: 'Adjust Reminder Times',
          icon: '⏰',
          type: 'navigate',
          destination: '/notification-settings',
        },
        {
          id: 'view-schedule',
          label: 'View Medication Schedule',
          icon: '📋',
          type: 'navigate',
          destination: '/medications',
        },
        {
          id: 'talk-to-doctor',
          label: 'Add to Doctor Visit Notes',
          icon: '👨‍⚕️',
          type: 'navigate',
          destination: '/appointments',
          data: { topic: 'medication-schedule' },
        },
      ],
      timestamp: new Date(),
    };
  } catch (error) {
    logError('insightEngine.analyzeMedicationAdherence', error);
    return null;
  }
}

// ============================================================================
// BLOOD PRESSURE ANALYZER
// ============================================================================

/**
 * Analyze blood pressure trends
 */
export async function analyzeBloodPressureTrends(): Promise<InsightData | null> {
  try {
    const endDate = new Date().toISOString();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 14);

    const vitals = await getVitalsInRange(startDate.toISOString(), endDate);

    const systolicReadings = vitals.filter(v => v.type === 'systolic');
    const diastolicReadings = vitals.filter(v => v.type === 'diastolic');

    if (systolicReadings.length < 3) {
      return null; // Not enough data
    }

    // Calculate averages
    const avgSystolic = systolicReadings.reduce((sum, v) => sum + v.value, 0) / systolicReadings.length;
    const avgDiastolic = diastolicReadings.length > 0
      ? diastolicReadings.reduce((sum, v) => sum + v.value, 0) / diastolicReadings.length
      : 0;

    // Check if elevated (>130/80 is considered elevated)
    const isElevated = avgSystolic > 130 || avgDiastolic > 80;

    if (!isElevated) {
      return null;
    }

    // Check for correlation with medication adherence
    const adherence = await analyzeMedicationAdherence();
    const hasAdherenceIssue = adherence && adherence.specificData.percentage! < 80;

    const severity: 'info' | 'warning' | 'alert' = avgSystolic > 140 ? 'alert' : 'warning';

    return {
      id: 'blood-pressure-elevated',
      type: 'vitals',
      severity,
      title: 'Blood Pressure Trending Higher',
      specificData: {
        current: Math.round(avgSystolic),
        target: 120,
        unit: 'mmHg (systolic)',
        percentage: undefined,
      },
      context: avgDiastolic > 0
        ? `Your average blood pressure this week is ${Math.round(avgSystolic)}/${Math.round(avgDiastolic)} mmHg.`
        : `Your average systolic blood pressure this week is ${Math.round(avgSystolic)} mmHg.`,
      whyItMatters: hasAdherenceIssue
        ? 'This may be related to missed medication doses. Consistent medication helps control blood pressure.'
        : 'Keeping blood pressure under 130/80 reduces risk of heart attack and stroke.',
      pattern: hasAdherenceIssue ? 'Correlates with missed medication doses' : undefined,
      actions: [
        {
          id: 'view-trend',
          label: 'View BP Trend Chart',
          icon: '📈',
          type: 'navigate',
          destination: '/vitals',
        },
        {
          id: 'log-reading',
          label: 'Log New Reading',
          icon: '📊',
          type: 'navigate',
          destination: '/(tabs)/journal',
        },
        {
          id: 'prepare-visit',
          label: 'Prepare for Doctor Visit',
          icon: '📋',
          type: 'navigate',
          destination: '/appointments',
          data: { topic: 'blood-pressure' },
        },
      ],
      timestamp: new Date(),
    };
  } catch (error) {
    logError('insightEngine.analyzeBloodPressureTrends', error);
    return null;
  }
}

// ============================================================================
// MOOD PATTERN ANALYZER
// ============================================================================

/**
 * Analyze mood patterns
 */
export async function analyzeMoodPatterns(): Promise<InsightData | null> {
  try {
    const endDate = getTodayDateString();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 14);
    const startDateStr = startDate.toISOString().split('T')[0];

    const tracking = await getDailyTrackingLogs(startDateStr, endDate);
    const moodLogs = tracking.filter(t => t.mood !== null && t.mood !== undefined);

    if (moodLogs.length < 5) {
      return null;
    }

    // Count low mood days (mood < 4 on 1-10 scale)
    const lowMoodDays = moodLogs.filter(t => t.mood !== null && t.mood < 4).length;
    const totalDays = moodLogs.length;
    const lowMoodPercentage = (lowMoodDays / totalDays) * 100;

    if (lowMoodPercentage < 40) {
      return null; // Not a concerning pattern
    }

    const severity: 'info' | 'warning' | 'alert' = lowMoodPercentage > 60 ? 'alert' : 'warning';

    return {
      id: 'mood-pattern-low',
      type: 'mood',
      severity,
      title: 'Mood Pattern Noticed',
      specificData: {
        current: lowMoodDays,
        target: totalDays,
        unit: 'days',
        percentage: Math.round(lowMoodPercentage),
      },
      context: `You've reported lower mood on ${lowMoodDays} of the last ${totalDays} days.`,
      whyItMatters: 'Persistent low mood can affect medication adherence and overall health. It may be helpful to discuss this with your healthcare provider.',
      pattern: undefined,
      actions: [
        {
          id: 'view-mood-trend',
          label: 'View Mood Trend',
          icon: '📊',
          type: 'navigate',
          destination: '/(tabs)/understand',
          data: { focus: 'mood' },
        },
        {
          id: 'log-note',
          label: 'Add Note About Mood',
          icon: '📝',
          type: 'navigate',
          destination: '/log-note',
        },
        {
          id: 'discuss-doctor',
          label: 'Add to Doctor Visit Prep',
          icon: '👨‍⚕️',
          type: 'navigate',
          destination: '/appointments',
          data: { topic: 'mood' },
        },
      ],
      timestamp: new Date(),
    };
  } catch (error) {
    logError('insightEngine.analyzeMoodPatterns', error);
    return null;
  }
}

// ============================================================================
// SLEEP-MOOD CORRELATION ANALYZER
// ============================================================================

/**
 * Analyze correlation between sleep and mood
 */
export async function analyzeSleepMoodCorrelation(): Promise<InsightData | null> {
  try {
    const endDate = getTodayDateString();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 14);
    const startDateStr = startDate.toISOString().split('T')[0];

    const tracking = await getDailyTrackingLogs(startDateStr, endDate);

    // Filter for entries with both sleep and mood data
    const complete = tracking.filter(t =>
      t.sleep !== null && t.sleep !== undefined &&
      t.mood !== null && t.mood !== undefined
    );

    if (complete.length < 7) {
      return null;
    }

    // Calculate correlation (simplified)
    const lowSleepLowMood = complete.filter(t =>
      t.sleep !== null && t.sleep < 6 && t.mood !== null && t.mood < 4
    ).length;

    const correlationStrength = (lowSleepLowMood / complete.length) * 100;

    if (correlationStrength < 30) {
      return null; // No strong correlation
    }

    return {
      id: 'sleep-mood-correlation',
      type: 'correlation',
      severity: 'info',
      title: 'Sleep & Mood Connection',
      specificData: {
        current: lowSleepLowMood,
        target: complete.length,
        unit: 'days',
        percentage: Math.round(correlationStrength),
      },
      context: `On ${lowSleepLowMood} of ${complete.length} days, low sleep (under 6 hours) coincided with lower mood.`,
      whyItMatters: 'Sleep quality significantly affects mood and energy. Improving sleep may help improve overall wellbeing.',
      pattern: 'Low sleep often precedes lower mood days',
      actions: [
        {
          id: 'view-sleep-trend',
          label: 'View Sleep Patterns',
          icon: '😴',
          type: 'navigate',
          destination: '/(tabs)/understand',
          data: { focus: 'sleep-mood' },
        },
        {
          id: 'log-sleep',
          label: 'Log Sleep Tonight',
          icon: '📝',
          type: 'navigate',
          destination: '/(tabs)/journal',
        },
      ],
      timestamp: new Date(),
    };
  } catch (error) {
    logError('insightEngine.analyzeSleepMoodCorrelation', error);
    return null;
  }
}

// ============================================================================
// HYDRATION ANALYZER
// ============================================================================

/**
 * Analyze hydration patterns
 */
export async function analyzeHydration(): Promise<InsightData | null> {
  try {
    const endDate = getTodayDateString();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    const startDateStr = startDate.toISOString().split('T')[0];

    const tracking = await getDailyTrackingLogs(startDateStr, endDate);
    const waterLogs = tracking.filter(t => t.hydration !== null && t.hydration !== undefined);

    if (waterLogs.length < 5) {
      return null;
    }

    const avgWater = waterLogs.reduce((sum, t) => sum + (t.hydration || 0), 0) / waterLogs.length;
    const target = 8; // 8 glasses per day

    if (avgWater >= target * 0.8) {
      return null; // Doing well
    }

    const severity: 'info' | 'warning' | 'alert' = avgWater < target * 0.5 ? 'warning' : 'info';

    return {
      id: 'hydration-low',
      type: 'trend',
      severity,
      title: 'Hydration Below Target',
      specificData: {
        current: Math.round(avgWater * 10) / 10,
        target: target,
        unit: 'glasses per day',
        percentage: Math.round((avgWater / target) * 100),
      },
      context: `You're averaging ${Math.round(avgWater * 10) / 10} glasses of water per day.`,
      whyItMatters: 'Staying hydrated helps with energy, medication effectiveness, and overall health. Aim for 8 glasses daily.',
      pattern: undefined,
      actions: [
        {
          id: 'log-water',
          label: 'Log Water Now',
          icon: '💧',
          type: 'navigate',
          destination: '/(tabs)/journal',
        },
        {
          id: 'set-reminder',
          label: 'Set Hydration Reminders',
          icon: '⏰',
          type: 'navigate',
          destination: '/notification-settings',
        },
      ],
      timestamp: new Date(),
    };
  } catch (error) {
    logError('insightEngine.analyzeHydration', error);
    return null;
  }
}

// ============================================================================
// INSIGHT MANAGEMENT
// ============================================================================

/**
 * Get all current insights
 */
export async function getAllInsights(): Promise<InsightData[]> {
  const insights = await Promise.all([
    analyzeMedicationAdherence(),
    analyzeBloodPressureTrends(),
    analyzeMoodPatterns(),
    analyzeSleepMoodCorrelation(),
    analyzeHydration(),
  ]);

  // Filter out nulls and recently dismissed
  const filtered: InsightData[] = [];
  for (const insight of insights) {
    if (insight && !(await wasRecentlyDismissed(insight.id))) {
      filtered.push(insight);
    }
  }

  // Sort by severity (alert > warning > info)
  const severityOrder = { alert: 0, warning: 1, info: 2 };
  filtered.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  // Limit to 3 insights to avoid overwhelming users
  return filtered.slice(0, 3);
}

/**
 * Dismiss an insight
 */
export async function dismissInsight(insightId: string): Promise<void> {
  try {
    const dismissedList = await safeGetItem<Record<string, number>>(DISMISSED_INSIGHTS_KEY, {});

    dismissedList[insightId] = Date.now();

    await safeSetItem(DISMISSED_INSIGHTS_KEY, dismissedList);
  } catch (error) {
    logError('insightEngine.dismissInsight', error);
  }
}

/**
 * Check if insight was recently dismissed (within 7 days)
 */
export async function wasRecentlyDismissed(insightId: string): Promise<boolean> {
  try {
    const dismissedList = await safeGetItem<Record<string, number>>(DISMISSED_INSIGHTS_KEY, {});
    const dismissedTime = dismissedList[insightId];

    if (!dismissedTime) return false;

    // Show again after 7 days
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    return dismissedTime > sevenDaysAgo;
  } catch (error) {
    logError('insightEngine.wasRecentlyDismissed', error);
    return false;
  }
}

/**
 * Clear all dismissed insights (for testing)
 */
export async function clearDismissedInsights(): Promise<void> {
  try {
    await AsyncStorage.removeItem(DISMISSED_INSIGHTS_KEY);
  } catch (error) {
    logError('insightEngine.clearDismissedInsights', error);
  }
}
