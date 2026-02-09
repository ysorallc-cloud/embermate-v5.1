// ============================================================================
// CARE SUMMARY BUILDER
// Aggregates today's care data into a compact handoff summary
// ============================================================================

import { getMorningWellness, getEveningWellness } from './wellnessCheckStorage';
import { getUpcomingAppointments } from './appointmentStorage';
import { getTodayVitalsLog, getMealsLogs } from './centralStorage';
import { listDailyInstances, DEFAULT_PATIENT_ID } from '../storage/carePlanRepo';

// ============================================================================
// TYPES
// ============================================================================

export interface TodaySummary {
  medsAdherence: { taken: number; total: number };
  orientation: string | null;
  painLevel: string | null;
  appetite: string | null;
  alertness: string | null;
  vitalsReading: string | null;
  mealsStatus: { logged: number; total: number; overdueNames: string[] } | null;
  moodArc: string | null;
  overdueItems: string[];
  nextAppointment: { provider: string; specialty: string; date: string } | null;
  flaggedItems: string[];
}

// ============================================================================
// DISPLAY LABELS
// ============================================================================

const ORIENTATION_LABELS: Record<string, string> = {
  'alert-oriented': 'Alert & Oriented',
  'confused-responsive': 'Confused but Responsive',
  'disoriented': 'Disoriented',
  'unresponsive': 'Unresponsive',
};

const PAIN_LABELS: Record<string, string> = {
  none: 'None',
  mild: 'Mild',
  moderate: 'Moderate',
  severe: 'Severe',
};

const APPETITE_LABELS: Record<string, string> = {
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
  refused: 'Refused',
};

const ALERTNESS_LABELS: Record<string, string> = {
  alert: 'Alert',
  confused: 'Confused',
  drowsy: 'Drowsy',
  unresponsive: 'Unresponsive',
};

const MOOD_DISPLAY: Record<string, string> = {
  struggling: 'Struggling',
  difficult: 'Difficult',
  managing: 'Managing',
  good: 'Good',
  great: 'Great',
};

// ============================================================================
// BUILDER
// ============================================================================

export async function buildTodaySummary(): Promise<TodaySummary> {
  const today = new Date().toISOString().split('T')[0];

  const [instances, morningWellness, eveningWellness, todayVitals, mealsLogs, upcomingAppointments] =
    await Promise.all([
      listDailyInstances(DEFAULT_PATIENT_ID, today),
      getMorningWellness(today),
      getEveningWellness(today),
      getTodayVitalsLog(),
      getMealsLogs(),
      getUpcomingAppointments(),
    ]);

  // Medication adherence from DailyCareInstance (same source as Now tab)
  const medInstances = instances.filter(i => i.itemType === 'medication');
  const medsTaken = medInstances.filter(i => i.status === 'completed').length;
  const medsTotal = medInstances.length;

  // Orientation from morning wellness
  const orientation = morningWellness?.orientation
    ? ORIENTATION_LABELS[morningWellness.orientation] ?? morningWellness.orientation
    : null;

  // Pain level from evening wellness
  const painLevel = eveningWellness?.painLevel
    ? PAIN_LABELS[eveningWellness.painLevel] ?? eveningWellness.painLevel
    : null;

  // Alertness from evening wellness
  const alertness = eveningWellness?.alertness
    ? ALERTNESS_LABELS[eveningWellness.alertness] ?? eveningWellness.alertness
    : null;

  // Vitals reading from centralStorage
  let vitalsReading: string | null = null;
  if (todayVitals) {
    const parts: string[] = [];
    if (todayVitals.systolic != null && todayVitals.diastolic != null) {
      parts.push(`BP ${todayVitals.systolic}/${todayVitals.diastolic}`);
    }
    if (todayVitals.heartRate != null) parts.push(`HR ${todayVitals.heartRate}`);
    if (todayVitals.glucose != null) parts.push(`Glucose ${todayVitals.glucose}`);
    if (parts.length > 0) vitalsReading = parts.join(' \u00B7 ');
  }

  // Meals status from instances + centralStorage for appetite
  const mealInstances = instances.filter(i => i.itemType === 'nutrition');
  const mealsCompleted = mealInstances.filter(i => i.status === 'completed').length;
  const now = new Date();
  const overdueNames = mealInstances
    .filter(i => i.status === 'pending' && new Date(i.scheduledTime) < now)
    .map(i => i.itemName);
  const mealsStatus = mealInstances.length > 0
    ? { logged: mealsCompleted, total: mealInstances.length, overdueNames }
    : null;

  // Appetite from most recent centralStorage meals log today
  const todayStr = new Date().toDateString();
  const todayMeals = mealsLogs.filter(m => new Date(m.timestamp).toDateString() === todayStr);
  const lastMeal = todayMeals.length > 0 ? todayMeals[0] : null; // logs are unshifted (newest first)
  const appetite = lastMeal?.appetite
    ? APPETITE_LABELS[lastMeal.appetite] ?? lastMeal.appetite
    : null;

  // Mood arc from instances
  const moodInstances = instances
    .filter(i => i.itemType === 'mood' && i.status === 'completed')
    .sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());
  let moodArc: string | null = null;
  if (morningWellness?.mood || eveningWellness?.mood) {
    const moods: string[] = [];
    if (morningWellness?.mood) moods.push(MOOD_DISPLAY[morningWellness.mood] || morningWellness.mood);
    if (eveningWellness?.mood) moods.push(MOOD_DISPLAY[eveningWellness.mood] || eveningWellness.mood);
    moodArc = moods.length > 1 ? moods.join(' \u2192 ') : moods[0];
  } else if (moodInstances.length > 0) {
    moodArc = `${moodInstances.length} check-in${moodInstances.length > 1 ? 's' : ''}`;
  }

  // Overdue items (pending instances past their scheduled time)
  const overdueItems = instances
    .filter(i => i.status === 'pending' && new Date(i.scheduledTime) < now)
    .map(i => i.itemName);

  // Next appointment
  const nextAppt = upcomingAppointments.length > 0 ? upcomingAppointments[0] : null;
  const nextAppointment = nextAppt
    ? {
        provider: nextAppt.provider,
        specialty: nextAppt.specialty,
        date: nextAppt.date,
      }
    : null;

  // Flagged items
  const flaggedItems: string[] = [];

  const notTaken = medsTotal - medsTaken;
  if (notTaken > 0) {
    flaggedItems.push(`${notTaken} med${notTaken > 1 ? 's' : ''} not logged`);
  }

  if (
    morningWellness?.orientation &&
    ['confused-responsive', 'disoriented', 'unresponsive'].includes(morningWellness.orientation)
  ) {
    flaggedItems.push(
      ORIENTATION_LABELS[morningWellness.orientation] ?? morningWellness.orientation
    );
  }

  if (eveningWellness?.painLevel === 'severe') {
    flaggedItems.push('Severe pain reported');
  }

  if (lastMeal?.appetite && ['poor', 'refused'].includes(lastMeal.appetite)) {
    flaggedItems.push('Poor appetite');
  }

  return {
    medsAdherence: { taken: medsTaken, total: medsTotal },
    orientation,
    painLevel,
    appetite,
    alertness,
    vitalsReading,
    mealsStatus,
    moodArc,
    overdueItems,
    nextAppointment,
    flaggedItems,
  };
}
