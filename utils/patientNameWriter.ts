// ============================================================================
// patientNameWriter — Phase 5.13.1.b.
//
// Single source of truth for writing the patient name. Three operations
// must always happen together:
//   1. Update the registry (the canonical store)
//   2. Mirror the value to StorageKeys.PATIENT_NAME (via safeSetItem,
//      encrypted at rest post encrypt-pii) for backward compat with
//      legacy readers — all of which read through safeGetItem
//   3. Emit EVENT.PATIENT so PatientContext (and any direct listeners)
//      refresh
//
// updatePatient() in storage/patientRegistry.ts already emits the event
// when it succeeds — the explicit emit in this helper is belt-and-suspenders
// in case the registry write is replaced later. The mirror write is the
// piece that callers most often forgot.
// ============================================================================

import { updatePatient } from '../storage/patientRegistry';
import { emitDataUpdate } from '../lib/events';
import { EVENT } from '../lib/eventNames';
import { StorageKeys } from './storageKeys';
import { safeSetItem } from './safeStorage';
import { logError } from './devLog';

/**
 * Canonical patient-name writer. Writes to registry, mirrors to
 * AsyncStorage (legacy compat), and emits EVENT.PATIENT so downstream
 * subscribers refresh. No-op when name is empty after trimming.
 */
export async function writePatientName(
  patientId: string,
  name: string,
): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) return;
  try {
    await updatePatient(patientId, { name: trimmed });
    // encrypt-pii — the mirror now routes through safeSetItem so the
    // legacy @embermate_patient_name key is encrypted at rest (was a
    // raw plaintext AsyncStorage.setItem).
    await safeSetItem(StorageKeys.PATIENT_NAME, trimmed);
    emitDataUpdate(EVENT.PATIENT);
  } catch (error) {
    logError('writePatientName', error);
    throw error;
  }
}
