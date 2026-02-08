// ============================================================================
// CARE SUMMARY BUILDER
// Aggregates today's care data into a compact handoff summary
// ============================================================================

import { getMedications } from './medicationStorage';
import { getMorningWellness, getEveningWellness } from './wellnessCheckStorage';
import { getLogEventsByDate, MealEvent } from './logEvents';
import { getUpcomingAppointments } from './appointmentStorage';

// ============================================================================
// TYPES
// ============================================================================

export interface TodaySummary {
  medsAdherence: { taken: number; total: number };
  orientation: string | null;
  painLevel: string | null;
  appetite: string | null;
  alertness: string | null;
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

// ============================================================================
// BUILDER
// ============================================================================

export async function buildTodaySummary(): Promise<TodaySummary> {
  const today = new Date().toISOString().split('T')[0];

  const [medications, morningWellness, eveningWellness, todayEvents, upcomingAppointments] =
    await Promise.all([
      getMedications(),
      getMorningWellness(today),
      getEveningWellness(today),
      getLogEventsByDate(today),
      getUpcomingAppointments(),
    ]);

  // Medication adherence — active meds only
  const activeMeds = medications.filter(m => m.active);
  const takenCount = activeMeds.filter(m => m.taken).length;

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

  // Appetite from most recent meal event today
  const mealEvents = todayEvents.filter(e => e.type === 'meal') as MealEvent[];
  const lastMeal = mealEvents.length > 0 ? mealEvents[mealEvents.length - 1] : null;
  const appetite = lastMeal?.appetite
    ? APPETITE_LABELS[lastMeal.appetite] ?? lastMeal.appetite
    : null;

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

  const notTaken = activeMeds.length - takenCount;
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
    medsAdherence: { taken: takenCount, total: activeMeds.length },
    orientation,
    painLevel,
    appetite,
    alertness,
    nextAppointment,
    flaggedItems,
  };
}
