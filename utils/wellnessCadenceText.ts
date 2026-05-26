// ============================================================================
// Phase 33 F4 — wellness cadence subtitle helper.
//
// Pure function reading the wellness store shape (@embermate_wellness_
// settings) and returning a human-readable check-in cadence label for
// the Care Plan home's wellness row subtitle. Read-only — no writes,
// no state, no side effects.
//
// Wellness is the P5 bridge case: its config lives in the wellness
// store via useWellnessSettings, NOT CarePlanConfig. So
// getBucketStatusText(config, 'wellness') can't read it and returns
// null. This helper closes that gap as a separate composable, called
// from app/care-plan/index.tsx through a `getBucketDetail` wrapper.
//
// User-locked behavior (2026-05-26):
//   • Both periods enabled → "Morning + evening check-in"
//   • Morning only         → "Morning check-in"
//   • Evening only         → "Evening check-in"
//   • Neither enabled      → null (do NOT invent text)
//   • Missing settings     → null (defensive)
// ============================================================================

import type { WellnessSettings } from '../types/wellnessSettings';

export function getWellnessCadenceText(
  settings: WellnessSettings | null | undefined,
): string | null {
  if (!settings) return null;

  const morning = settings.morning?.enabled === true;
  const evening = settings.evening?.enabled === true;

  if (morning && evening) return 'Morning + evening check-in';
  if (morning) return 'Morning check-in';
  if (evening) return 'Evening check-in';
  return null;
}
