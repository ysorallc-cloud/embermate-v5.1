// ============================================================================
// CAREGIVER PROFILE REPO — Per-installation, not per-patient
// Phase 5.8.c
//
// Single record. Stored at fixed key "caregiver_profile". The caregiver
// is the person using the app to log/share care; multi-patient apps still
// have one caregiver. Patient-side identity stays in patientRegistry.
// ============================================================================

import { safeGetItem, safeSetItem } from '../utils/safeStorage';
import { logError } from '../utils/devLog';
import { emitDataUpdate } from '../lib/events';
import { EVENT } from '../lib/eventNames';

export const CAREGIVER_PROFILE_KEY = 'caregiver_profile';

export interface CaregiverProfile {
  name: string;
  shortName?: string;
  createdAt: string;
}

interface StoredCaregiverProfile {
  name: string;
  shortName?: string;
  createdAt: string;
}

export async function getCaregiverProfile(): Promise<CaregiverProfile | null> {
  try {
    const raw = await safeGetItem<StoredCaregiverProfile | null>(
      CAREGIVER_PROFILE_KEY,
      null,
    );
    if (!raw || typeof raw.name !== 'string') return null;
    const trimmed = raw.name.trim();
    if (trimmed.length === 0) return null;
    return {
      name: trimmed,
      shortName: raw.shortName?.trim() || undefined,
      createdAt: raw.createdAt,
    };
  } catch (err) {
    logError('caregiverProfileRepo.get', err);
    return null;
  }
}

export async function saveCaregiverProfile(
  patch: { name: string; shortName?: string },
): Promise<void> {
  try {
    const existing = await safeGetItem<StoredCaregiverProfile | null>(
      CAREGIVER_PROFILE_KEY,
      null,
    );
    const createdAt = existing?.createdAt ?? new Date().toISOString();
    const next: StoredCaregiverProfile = {
      name: patch.name.trim(),
      shortName: patch.shortName?.trim() || undefined,
      createdAt,
    };
    await safeSetItem(CAREGIVER_PROFILE_KEY, next);
    // Notify live surfaces (Now-tab ProfileNamePrompt, JournalIdentityStrip)
    // so they re-read and reflect the new name without a restart. The
    // prompt's useDataListener already subscribes to EVENT.PATIENT.
    emitDataUpdate(EVENT.PATIENT);
  } catch (err) {
    logError('caregiverProfileRepo.save', err);
  }
}
