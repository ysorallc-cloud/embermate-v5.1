// ============================================================================
// setUpLovedOneFromSample — owns the sample-mode → real-patient transition.
//
// Surfaced from ManageSampleDataSheet.handleSetUp so the post-setup registry
// state is testable without a full RN render. Three operations, in order:
//   1. clearSampleData()           — wipe seeded demo records
//   2. (write the new patient)     — registry + AsyncStorage mirror
//   3. emit SAMPLE_DATA_CLEARED    — global refresh signal
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearSampleData } from './sampleDataManager';
import { getPatientRegistry, updatePatient } from '../storage/patientRegistry';
import { emitDataUpdate } from '../lib/events';
import { EVENT } from '../lib/eventNames';
import { StorageKeys } from './storageKeys';
import { logError } from './devLog';

/**
 * Resolve the active patient and apply the loved-one rename. When the active
 * patient is the seeded SELF/default (the user themselves), the relationship
 * marker is cleared at the same write — a loved one is not the user. When a
 * non-self active patient already exists (e.g. user added one earlier), only
 * the name updates and the existing relationship is preserved.
 *
 * Single registry write covers both fields so the legacy mirror, registry,
 * and EVENT.PATIENT emission stay consistent.
 */
export async function setUpLovedOneFromSample(name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) return;
  try {
    await clearSampleData();
    const reg = await getPatientRegistry();
    const activeId = reg.activePatientId;
    const active = reg.patients.find((p) => p.id === activeId);
    const updates: { name: string; relationship?: undefined } =
      active?.relationship === 'self'
        ? { name: trimmed, relationship: undefined }
        : { name: trimmed };
    await updatePatient(activeId, updates);
    await AsyncStorage.setItem(StorageKeys.PATIENT_NAME, trimmed);
    emitDataUpdate(EVENT.SAMPLE_DATA_CLEARED);
  } catch (error) {
    logError('setUpLovedOneFromSample', error);
    throw error;
  }
}
