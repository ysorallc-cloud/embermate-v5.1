// ============================================================================
// onboardingMedsWriter — write meds entered during onboarding into the care
// plan via the CANONICAL path (addMedicationToPlan), so they generate real
// daily instances identically to a Care Plan add. This is a thin mapper
// (OnboardingMedEntry → addMedicationToPlan payload) — NOT a new write path.
//
// Skipping the onboarding med-step passes an empty list → nothing is written
// (config.meds stays empty; the Now tab's add-medications affordance catches
// the caregiver later).
// ============================================================================

import { addMedicationToPlan } from '../storage/carePlanConfigRepo';
import { DEFAULT_PATIENT_ID } from '../storage/carePlanRepo';
import { TIME_SLOTS, type TimeSlot } from '../components/medication/medicationFormHelpers';
import type { TimeOfDay } from '../types/carePlanConfig';
import { logError } from './devLog';

export interface OnboardingMedEntry {
  name: string;
  dose: string;
  timeSlot: TimeSlot;
}

// The med-form's own slot→TimeOfDay mapping (afternoon lands on the 'midday'
// window). Kept identical so onboarding meds schedule like Care Plan meds.
const SLOT_TO_TIME_OF_DAY: Record<TimeSlot, TimeOfDay> = {
  morning: 'morning',
  afternoon: 'midday',
  evening: 'evening',
  bedtime: 'night',
};

/**
 * Write each entered med through addMedicationToPlan. Returns the number
 * actually written (nameless entries are skipped). Failures are logged and
 * skipped, never thrown — a med-write hiccup must not block onboarding.
 */
export async function writeOnboardingMedications(
  meds: OnboardingMedEntry[],
  patientId: string = DEFAULT_PATIENT_ID,
): Promise<number> {
  let written = 0;
  for (const med of meds) {
    const name = med.name.trim();
    if (!name) continue; // never write a nameless med
    const dose = med.dose.trim();
    const slot = TIME_SLOTS.find((s) => s.key === med.timeSlot);
    const at = slot?.defaultTime ?? '08:00';
    try {
      await addMedicationToPlan(patientId, {
        name,
        dosage: dose,
        timesOfDay: [SLOT_TO_TIME_OF_DAY[med.timeSlot]],
        customTimes: [at],
        scheduledTimeHHmm: at,
        active: true,
        notificationsEnabled: true,
      } as any);
      written += 1;
    } catch (e) {
      logError('writeOnboardingMedications', e);
    }
  }
  return written;
}
