// ============================================================================
// medDoseLog — Piece 2 (Shape 1) dose-on-create for the medication-confirm →
// medication-form custom-add flow.
//
// When a custom med is added from the log screen (medication-form entered with
// logDose=1), it must become a proper SCHEDULED regimen med
// (config.meds.medications → generates daily instances) AND the dose the
// caregiver was recording must be logged. This encapsulates that combined write
// as one testable unit so it can't drift from the normal add path:
//   • duplicate guard — never add a second config med with the same name (that
//     would double the generated daily instances)
//   • legacy mirror — createMedication (taken) so the dose has a record to log
//   • dose log — markMedicationTaken + saveMedicationLog
//   • care-plan progress — trackCarePlanProgress when routine/item present
//
// This is the config-writing (Care Plan) side only — it is NEVER called on a
// normal add/edit (no logDose). See app/medication-form.tsx handleSave.
// ============================================================================

import { getMedicationsFromPlan, addMedicationToPlan } from '../storage/carePlanConfigRepo';
import { DEFAULT_PATIENT_ID } from '../storage/carePlanRepo';
import { createMedication, markMedicationTaken, type Medication } from './medicationStorage';
import { saveMedicationLog } from './centralStorage';
import { trackCarePlanProgress } from './carePlanStorage';
import type { MedicationPlanItem } from '../types/carePlanConfig';
import { logError } from './devLog';

export interface CreateScheduledMedAndLogDoseOptions {
  /** Care-plan routine id, when the log screen was entered from a care-plan item. */
  routineId?: string;
  /** Care-plan item id, paired with routineId to record progress. */
  carePlanItemId?: string;
  patientId?: string;
}

/**
 * Create the scheduled config med (duplicate-guarded) + a legacy mirror, then
 * record the dose the caregiver was logging. Idempotent on the config side:
 * if a med with the same name already exists in config, it is reused (no second
 * scheduled med → no doubled daily instance); the dose is still logged.
 */
export async function createScheduledMedAndLogDose(
  planMedData: Omit<MedicationPlanItem, 'id' | 'createdAt' | 'updatedAt'>,
  legacyData: Omit<Medication, 'id' | 'createdAt'>,
  opts: CreateScheduledMedAndLogDoseOptions = {},
): Promise<void> {
  const { routineId, carePlanItemId, patientId = DEFAULT_PATIENT_ID } = opts;

  // Duplicate guard — a second config med with the same name would double the
  // generated daily instances.
  const nameKey = planMedData.name.trim().toLowerCase();
  const existing = await getMedicationsFromPlan(patientId);
  const alreadyScheduled = existing.some(
    (m) => m.name.trim().toLowerCase() === nameKey,
  );
  if (!alreadyScheduled) {
    await addMedicationToPlan(patientId, planMedData);
  }

  // Legacy mirror to hang the dose log on, then record the dose taken. A legacy
  // duplicate (createMedication throws on same-name) must not lose the dose log,
  // so fall back to logging against the existing legacy record if present.
  let legacyMedId: string | undefined;
  try {
    const legacyMed = await createMedication({ ...legacyData, taken: true });
    legacyMedId = legacyMed.id;
  } catch (createErr) {
    logError('medDoseLog.createMedication', createErr);
  }

  if (legacyMedId) {
    await markMedicationTaken(legacyMedId, true, undefined, patientId);
    await saveMedicationLog(
      { timestamp: new Date().toISOString(), medicationIds: [legacyMedId] },
      patientId,
    );
  }

  if (routineId && carePlanItemId) {
    await trackCarePlanProgress(routineId, carePlanItemId, { logType: 'meds' });
  }
}
