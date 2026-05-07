// ============================================================================
// useActivePatientName — Phase 5.13.1.a.
//
// Canonical patient-name accessor. Reads from PatientContext (registry-backed)
// and applies the friendly placeholder when no real name is set. Replaces
// the scattered AsyncStorage[StorageKeys.PATIENT_NAME] reads that previously
// drifted out of sync with the registry.
//
// All Journal/Now/Insights/Settings/etc. surfaces should consume this hook
// rather than reading the legacy AsyncStorage key directly. The key remains
// as a write mirror for backward compatibility with older installs (see
// 5.13.1.d for the deprecation plan).
// ============================================================================

import { usePatient } from '../contexts/PatientContext';

const PLACEHOLDER = 'your loved one';
const LEGACY_PLACEHOLDERS = new Set(['Patient', 'patient', '']);

/**
 * Returns the active patient's name, or the friendly placeholder
 * 'your loved one' when no real name is set.
 */
export function useActivePatientName(): string {
  const { activePatient } = usePatient();
  const raw = activePatient?.name?.trim() ?? '';
  if (!raw || LEGACY_PLACEHOLDERS.has(raw)) return PLACEHOLDER;
  return raw;
}

/**
 * Same canonical source, but returns the raw value or null — useful for
 * decisions like "should we prompt the user to enter a name?"
 */
export function useActivePatientNameRaw(): string | null {
  const { activePatient } = usePatient();
  const raw = activePatient?.name?.trim() ?? '';
  if (!raw || LEGACY_PLACEHOLDERS.has(raw)) return null;
  return raw;
}
