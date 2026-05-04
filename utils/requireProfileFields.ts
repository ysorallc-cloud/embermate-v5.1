// ============================================================================
// REQUIRE PROFILE FIELDS — Phase 5.8.c
//
// Single check used by every report generator before assembly. Returns
// { missing: ['patient' | 'caregiver'] }. The reports surface a profile
// prompt sheet when missing is non-empty, then re-run after save.
// ============================================================================

import { getPatientRegistry } from '../storage/patientRegistry';
import { getCaregiverProfile } from '../storage/caregiverProfileRepo';

export type ProfileField = 'patient' | 'caregiver';

export interface ProfileFieldsResult {
  missing: ProfileField[];
  patientName: string | null;
  caregiverName: string | null;
  caregiverShortName: string | null;
}

const PATIENT_PLACEHOLDER_NAMES = new Set(['patient']);

export async function requireProfileFields(): Promise<ProfileFieldsResult> {
  const [registry, caregiver] = await Promise.all([
    getPatientRegistry(),
    getCaregiverProfile(),
  ]);

  const active = registry.patients.find((p) => p.id === registry.activePatientId)
    ?? registry.patients[0];
  const rawPatient = (active?.name ?? '').trim();
  const patientMissing =
    rawPatient.length === 0 ||
    PATIENT_PLACEHOLDER_NAMES.has(rawPatient.toLowerCase());

  const caregiverMissing = caregiver === null;

  const missing: ProfileField[] = [];
  if (patientMissing) missing.push('patient');
  if (caregiverMissing) missing.push('caregiver');

  return {
    missing,
    patientName: patientMissing ? null : rawPatient,
    caregiverName: caregiverMissing ? null : caregiver!.name,
    caregiverShortName: caregiverMissing ? null : (caregiver!.shortName ?? null),
  };
}
