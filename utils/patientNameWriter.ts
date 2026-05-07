// ============================================================================
// patientNameWriter — Phase 5.13.1.b.
//
// Single source of truth for writing the patient name. Three operations
// must always happen together:
//   1. Update the registry (the canonical store)
//   2. Mirror the value to AsyncStorage[StorageKeys.PATIENT_NAME] for
//      backward compat with legacy readers
//   3. Emit EVENT.PATIENT so PatientContext (and any direct listeners)
//      refresh
//
// updatePatient() in storage/patientRegistry.ts already emits the event
// when it succeeds — the explicit emit in this helper is belt-and-suspenders
// in case the registry write is replaced later. The mirror write is the
// piece that callers most often forgot.
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { updatePatient } from '../storage/patientRegistry';
import { emitDataUpdate } from '../lib/events';
import { EVENT } from '../lib/eventNames';
import { StorageKeys } from './storageKeys';
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
    await AsyncStorage.setItem(StorageKeys.PATIENT_NAME, trimmed);
    emitDataUpdate(EVENT.PATIENT);
  } catch (error) {
    logError('writePatientName', error);
    throw error;
  }
}
