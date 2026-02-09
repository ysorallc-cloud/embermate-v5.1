// ============================================================================
// CARE SUMMARY BUILDER
// Aggregates today's care data into a compact handoff summary
// ============================================================================

import { getMorningWellness, getEveningWellness } from './wellnessCheckStorage';
import { getUpcomingAppointments } from './appointmentStorage';
import { getTodayVitalsLog, getMealsLogs } from './centralStorage';
import { listDailyInstances, listLogsByDate, DEFAULT_PATIENT_ID } from '../storage/carePlanRepo';

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

  // Mood arc from wellness checks
  let moodArc: string | null = null;
  if (morningWellness?.mood || eveningWellness?.mood) {
    const moods: string[] = [];
    if (morningWellness?.mood) moods.push(MOOD_DISPLAY[morningWellness.mood] || morningWellness.mood);
    if (eveningWellness?.mood) moods.push(MOOD_DISPLAY[eveningWellness.mood] || eveningWellness.mood);
    moodArc = moods.length > 1 ? moods.join(' \u2192 ') : moods[0];
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

// ============================================================================
// SHIFT REPORT TYPES (used by Journal narrative components)
// ============================================================================

export interface MedicationDetail {
  name: string;
  dosage?: string;
  status: 'completed' | 'pending' | 'skipped' | 'missed';
  scheduledTime: string;
  takenAt?: string;
  sideEffects?: string[];
}

export interface VitalsDetail {
  scheduled: boolean;
  recorded: boolean;
  scheduledTime?: string;
  recordedAt?: string;
  readings?: {
    systolic?: number;
    diastolic?: number;
    heartRate?: number;
    glucose?: number;
    temperature?: number;
    oxygen?: number;
    weight?: number;
  };
}

export interface MoodDetail {
  entries: { source: string; label: string }[];
  morningWellness?: {
    sleepQuality: number;
    mood: string;
    orientation?: string;
  };
  eveningWellness?: {
    dayRating: number;
    painLevel?: string;
  };
}

export interface MealsDetail {
  total: number;
  meals: {
    name: string;
    status: 'completed' | 'pending';
    appetite?: string;
    scheduledTime?: string;
  }[];
}

export interface AttentionItem {
  text: string;
  detail?: string;
}

export interface ShiftReport {
  medications: MedicationDetail[];
  vitals: VitalsDetail;
  mood: MoodDetail;
  meals: MealsDetail;
  attentionItems: AttentionItem[];
  nextAppointment: { provider: string; specialty: string; date: string } | null;
}

// ============================================================================
// SHIFT REPORT BUILDER
// ============================================================================

export async function buildShiftReport(): Promise<ShiftReport> {
  const today = new Date().toISOString().split('T')[0];

  const [instances, logs, morningWellness, eveningWellness, todayVitals, mealsLogs, upcomingAppointments] =
    await Promise.all([
      listDailyInstances(DEFAULT_PATIENT_ID, today),
      listLogsByDate(DEFAULT_PATIENT_ID, today),
      getMorningWellness(today),
      getEveningWellness(today),
      getTodayVitalsLog(),
      getMealsLogs(),
      getUpcomingAppointments(),
    ]);

  // --- Medications ---
  const medInstances = instances.filter(i => i.itemType === 'medication');
  const medications: MedicationDetail[] = medInstances.map(inst => {
    const log = inst.logId ? logs.find(l => l.id === inst.logId) : undefined;
    const medData = log?.data && 'type' in log.data && log.data.type === 'medication' ? log.data : undefined;
    return {
      name: inst.itemName,
      dosage: inst.itemDosage,
      status: inst.status as MedicationDetail['status'],
      scheduledTime: inst.scheduledTime,
      takenAt: log?.timestamp,
      sideEffects: medData?.sideEffects,
    };
  });

  // --- Vitals ---
  const vitalsInstances = instances.filter(i => i.itemType === 'vitals');
  const vitalsScheduled = vitalsInstances.length > 0;
  const vitalsRecorded = todayVitals != null || vitalsInstances.some(i => i.status === 'completed');
  const vitals: VitalsDetail = {
    scheduled: vitalsScheduled,
    recorded: vitalsRecorded,
    scheduledTime: vitalsInstances[0]?.scheduledTime,
  };
  if (todayVitals) {
    vitals.readings = {
      systolic: todayVitals.systolic,
      diastolic: todayVitals.diastolic,
      heartRate: todayVitals.heartRate,
      glucose: todayVitals.glucose,
      temperature: todayVitals.temperature,
      oxygen: todayVitals.oxygen,
      weight: todayVitals.weight,
    };
    vitals.recordedAt = todayVitals.timestamp;
  }

  // --- Mood & Wellness (mood is captured within wellness checks) ---
  const moodEntries: MoodDetail['entries'] = [];
  if (morningWellness?.mood) {
    moodEntries.push({
      source: 'morning-wellness',
      label: MOOD_DISPLAY[morningWellness.mood] || morningWellness.mood,
    });
  }
  if (eveningWellness?.mood) {
    moodEntries.push({
      source: 'evening-wellness',
      label: MOOD_DISPLAY[eveningWellness.mood] || eveningWellness.mood,
    });
  }

  const mood: MoodDetail = { entries: moodEntries };
  if (morningWellness) {
    mood.morningWellness = {
      sleepQuality: morningWellness.sleepQuality ?? 0,
      mood: MOOD_DISPLAY[morningWellness.mood] || morningWellness.mood || 'Unknown',
      orientation: morningWellness.orientation
        ? ORIENTATION_LABELS[morningWellness.orientation] ?? morningWellness.orientation
        : undefined,
    };
  }
  if (eveningWellness) {
    mood.eveningWellness = {
      dayRating: eveningWellness.dayRating ?? 0,
      painLevel: eveningWellness.painLevel
        ? PAIN_LABELS[eveningWellness.painLevel] ?? eveningWellness.painLevel
        : undefined,
    };
  }

  // --- Meals ---
  const mealInstances = instances.filter(i => i.itemType === 'nutrition');
  const todayStr = new Date().toDateString();
  const todayMeals = mealsLogs.filter((m: any) => new Date(m.timestamp).toDateString() === todayStr);

  const meals: MealsDetail = {
    total: mealInstances.length,
    meals: mealInstances.map(inst => {
      const matchedMeal = todayMeals.find((m: any) =>
        m.mealType?.toLowerCase() === inst.itemName.toLowerCase()
      );
      return {
        name: inst.itemName,
        status: (inst.status === 'completed' ? 'completed' : 'pending') as 'completed' | 'pending',
        appetite: matchedMeal?.appetite
          ? APPETITE_LABELS[matchedMeal.appetite] ?? matchedMeal.appetite
          : undefined,
        scheduledTime: inst.scheduledTime,
      };
    }),
  };

  // --- Attention Items ---
  const attentionItems: AttentionItem[] = [];
  const now = new Date();

  // Overdue medications
  const overdueMeds = medInstances.filter(
    i => i.status === 'pending' && new Date(i.scheduledTime) < now
  );
  for (const m of overdueMeds) {
    attentionItems.push({
      text: `${m.itemName} not yet logged`,
      detail: m.itemDosage,
    });
  }

  // Orientation concern
  if (
    morningWellness?.orientation &&
    ['confused-responsive', 'disoriented', 'unresponsive'].includes(morningWellness.orientation)
  ) {
    attentionItems.push({
      text: ORIENTATION_LABELS[morningWellness.orientation] ?? morningWellness.orientation,
      detail: 'from morning wellness check',
    });
  }

  // Severe pain
  if (eveningWellness?.painLevel === 'severe') {
    attentionItems.push({
      text: 'Severe pain reported',
      detail: 'from evening wellness check',
    });
  }

  // Poor appetite
  const lastMeal = todayMeals.length > 0 ? todayMeals[0] : null;
  if (lastMeal?.appetite && ['poor', 'refused'].includes(lastMeal.appetite)) {
    attentionItems.push({
      text: 'Poor appetite',
      detail: `${lastMeal.mealType || 'Meal'} — ${APPETITE_LABELS[lastMeal.appetite] ?? lastMeal.appetite}`,
    });
  }

  // Evening wellness check not completed
  if (!eveningWellness && now.getHours() >= 20) {
    attentionItems.push({
      text: 'Evening wellness check not completed',
    });
  }

  // --- Next Appointment ---
  const nextAppt = upcomingAppointments.length > 0 ? upcomingAppointments[0] : null;
  const nextAppointment = nextAppt
    ? { provider: nextAppt.provider, specialty: nextAppt.specialty, date: nextAppt.date }
    : null;

  return {
    medications,
    vitals,
    mood,
    meals,
    attentionItems,
    nextAppointment,
  };
}
