// ============================================================================
// ONBOARDING → CARE PLAN MAPPER
// Converts 4-question answers into a CarePlanConfig
// ============================================================================

import {
  CarePlanConfig,
  BucketType,
  TimeOfDay,
  createDefaultCarePlanConfig,
} from '../types/carePlanConfig';

// ============================================================================
// ANSWER TYPES
// ============================================================================

export type CareRelationship = 'parent' | 'spouse' | 'child' | 'self' | 'other';

export type CareArea =
  | 'medications'
  | 'meals'
  | 'doctor_visits'
  | 'wellness'
  | 'vitals'
  | 'hydration';   // onboarding Q2 — water is a selectable choice, not forced

export type ConcernArea =
  | 'missed_medication'
  | 'symptom_change'
  | 'hydration'
  | 'sleep_patterns'
  | 'weight_changes';

export type CheckInCadence =
  | 'morning_only'
  | 'morning_evening'
  | 'three_times'
  | 'flexible';

export interface OnboardingAnswers {
  relationship: CareRelationship;
  careAreas: CareArea[];
  concerns: ConcernArea[];
  cadence: CheckInCadence;
}

// ============================================================================
// MAPPING LOGIC
// ============================================================================

const CARE_AREA_TO_BUCKET: Record<CareArea, BucketType> = {
  medications: 'meds',
  meals: 'meals',
  doctor_visits: 'appointments',
  wellness: 'wellness',
  vitals: 'vitals',
  hydration: 'water',
};

/** Sane default when the caregiver skips / selects nothing in Q2: meds
 *  (enabled, not required), vitals (with BP), morning/evening wellness.
 *  Water + meals stay off — they're now opt-in choices, not forced. */
export const DEFAULT_CARE_AREAS: CareArea[] = ['medications', 'vitals', 'wellness'];

/** Standard mealtimes a selected Meals bucket lands with so it's usable,
 *  not an empty meals bucket (breakfast/lunch/dinner). */
const MEAL_TIMES: TimeOfDay[] = ['morning', 'midday', 'evening'];

const CONCERN_TO_BUCKET: Record<ConcernArea, BucketType | null> = {
  missed_medication: 'meds',
  symptom_change: null,       // Symptoms are always-on (no bucket gate)
  hydration: 'water',
  sleep_patterns: 'sleep',
  weight_changes: 'vitals',
};

const CADENCE_TO_TIMES: Record<CheckInCadence, TimeOfDay[]> = {
  morning_only: ['morning'],
  morning_evening: ['morning', 'evening'],
  three_times: ['morning', 'midday', 'evening'],
  flexible: ['morning', 'evening'],
};

export function generateCarePlanFromOnboarding(
  answers: OnboardingAnswers
): CarePlanConfig {
  const config = createDefaultCarePlanConfig('default');
  const wellnessTimes = CADENCE_TO_TIMES[answers.cadence];

  // Skip / empty Q2 → the sane default. Otherwise the caregiver's picks.
  const careAreas =
    answers.careAreas.length > 0 ? answers.careAreas : DEFAULT_CARE_AREAS;

  // NOTHING is force-on — every bucket starts disabled and only turns on
  // if it's selected (or in the default set above).
  const allBuckets: BucketType[] = [
    'meds', 'vitals', 'meals', 'water', 'sleep', 'activity', 'wellness', 'appointments',
  ];
  for (const bucket of allBuckets) {
    if (config[bucket]) {
      (config as any)[bucket].enabled = false;
    }
  }

  // Enable the selected areas, each landing USABLE (not an empty bucket).
  for (const area of careAreas) {
    const bucket = CARE_AREA_TO_BUCKET[area];
    if (!bucket || !config[bucket]) continue;
    (config as any)[bucket].enabled = true;
    (config as any)[bucket].priority = 'recommended';

    if (bucket === 'vitals') {
      // Land usable: blood pressure on by default, not an empty vitals bucket.
      (config as any).vitals.vitalTypes = ['bp'];
    } else if (bucket === 'meals') {
      // Standard mealtimes, not meals-enabled-with-no-mealtimes.
      (config as any).meals.timesOfDay = [...MEAL_TIMES];
    } else if (bucket === 'wellness') {
      (config as any).wellness.timesOfDay = wellnessTimes;
    }
    // meds: enabled + 'recommended' (NOT 'required') — an empty meds list
    // is an "add the first medication" invitation, never a silent empty
    // required slot. No placeholder med is invented.
    // water: enabled + 'recommended' (the generic enable above).
  }

  // Elevate priority for explicit concern areas (onboarding passes none;
  // retained for other callers / future use).
  for (const concern of answers.concerns) {
    const bucket = CONCERN_TO_BUCKET[concern];
    if (bucket && config[bucket]) {
      (config as any)[bucket].enabled = true;
      (config as any)[bucket].priority = 'required';
      (config as any)[bucket].notificationsEnabled = true;
    }
  }

  return config;
}

// ============================================================================
// QUICK LOG CORE OPTIONS FROM ANSWERS
// Returns 3 IDs for the core quick-log buttons
// ============================================================================

export function getCoreQuickLogFromAnswers(answers: OnboardingAnswers): string[] {
  const core: string[] = [];

  // Always include wellness
  core.push('wellness');

  // Add from care areas (first 2 that map to quick-log IDs)
  const quickLogMap: Record<CareArea, string> = {
    medications: 'meds',
    meals: 'meals',
    vitals: 'vitals',
    doctor_visits: 'appointment',
    wellness: 'wellness',
    hydration: 'hydration',
  };

  for (const area of answers.careAreas) {
    const id = quickLogMap[area];
    if (id && !core.includes(id) && core.length < 3) {
      core.push(id);
    }
  }

  // Fill remaining slots from concerns
  if (core.length < 3 && answers.concerns.includes('hydration')) {
    core.push('hydration');
  }
  if (core.length < 3 && answers.concerns.includes('missed_medication') && !core.includes('meds')) {
    core.push('meds');
  }

  // Ensure we always have 3
  const fallbacks = ['meds', 'meals', 'hydration'];
  for (const fb of fallbacks) {
    if (core.length >= 3) break;
    if (!core.includes(fb)) core.push(fb);
  }

  return core.slice(0, 3);
}
