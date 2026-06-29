// ============================================================================
// CANONICAL MEDICATION ADHERENCE — the single source of truth for clinician
// artifacts (care-report Comprehensive Report + Visit Prep PDF).
//
// Wave-1 clinician-artifact convergence. Reports conform to the SCREENS, not
// vice versa. The canonical source is DailyCareInstance.status — exactly what
// Now and Journal read (via listDailyInstancesRange). This util exists so the
// clinician PDFs cannot drift onto a different store (the prior bug: care-
// report computed adherence from a MedicationLog/`m.taken` today-snapshot
// mislabeled "7-day").
//
// LOCKED DEFINITION (applies everywhere this feeds a clinician artifact):
//   A SKIPPED dose is NOT adherent. Only 'completed' counts toward adherence;
//   'skipped', 'missed', and 'pending' all count AGAINST it. (The Insights
//   tile's skipped-as-adherent rounding is wrong wherever it reaches a
//   clinician — that broader alignment is the next slice.)
//
// The window is computed relative to a caller-passed referenceDate (default
// now), mirroring the Insights screen's window math (start = ref − windowDays,
// end = ref) so the report honors the day the caller selected instead of
// silently recomputing off "today".
// ============================================================================

import { listDailyInstancesRange, DEFAULT_PATIENT_ID } from '../storage/carePlanRepo';
import { toLocalDateString } from '../services/carePlanGenerator';
import { logError } from './devLog';

export interface CanonicalAdherence {
  /** completed / total, 0–100. Skipped/missed/pending count against. */
  rate: number;
  /** instances with status 'completed'. */
  taken: number;
  /** all medication instances in the window (the denominator). */
  total: number;
  /** the window length used (for honest labeling). */
  windowDays: number;
  /** inclusive window bounds actually queried (local YYYY-MM-DD). */
  startDate: string;
  endDate: string;
}

/**
 * THE canonical adherence computation for clinician artifacts.
 * Source = DailyCareInstance.status (Now/Journal truth). Skipped counts
 * AGAINST adherence. Window = [referenceDate − windowDays, referenceDate].
 */
export async function computeCanonicalAdherence(
  windowDays: number,
  referenceDate: Date = new Date(),
): Promise<CanonicalAdherence> {
  const endDate = toLocalDateString(referenceDate);
  const start = new Date(referenceDate);
  start.setDate(start.getDate() - windowDays);
  const startDate = toLocalDateString(start);

  try {
    const instances = await listDailyInstancesRange(DEFAULT_PATIENT_ID, startDate, endDate);
    const medInstances = instances.filter(i => i.itemType === 'medication');
    const total = medInstances.length;
    // LOCKED: only 'completed' is adherent. Skipped is NOT credited.
    const taken = medInstances.filter(i => i.status === 'completed').length;
    const rate = total > 0 ? Math.round((taken / total) * 100) : 0;
    return { rate, taken, total, windowDays, startDate, endDate };
  } catch (err) {
    logError('adherenceCanonical.computeCanonicalAdherence', err);
    return { rate: 0, taken: 0, total: 0, windowDays, startDate, endDate };
  }
}
