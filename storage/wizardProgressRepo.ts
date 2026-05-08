// ============================================================================
// WIZARD PROGRESS REPO — Phase 5.13.a.
//
// Persists in-progress Care Plan setup wizard state under a single key so
// the user can resume after a force-quit. The 24h TTL covers "interrupted
// by care recipient mid-setup" without keeping half-state forever; older
// payloads are treated as abandoned, the key is cleared, and the user
// starts fresh.
//
// Read returns null on:
//   • No payload                 (first launch / completed wizard)
//   • Payload older than 24h     (abandoned — also clears the key)
//   • Malformed JSON             (data hygiene)
//   • Missing or unknown `step`  (schema drift safety)
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logError } from '../utils/devLog';

export const WIZARD_PROGRESS_KEY = '@embermate_wizard_progress_v1';
const TTL_MS = 24 * 60 * 60 * 1000;

export type WizardStep = 'who' | 'template' | 'confirm';

export interface WizardProgress {
  step: WizardStep;
  patientName?: string;
  caregiverName?: string;
  templateId?: string;
  /** ISO timestamp when the user first entered the wizard. */
  startedAt: string;
}

const VALID_STEPS: ReadonlySet<WizardStep> = new Set(['who', 'template', 'confirm']);

function parseProgress(raw: string): WizardProgress | null {
  let candidate: any;
  try {
    candidate = JSON.parse(raw);
  } catch {
    return null;
  }
  if (
    !candidate ||
    typeof candidate !== 'object' ||
    typeof candidate.step !== 'string' ||
    !VALID_STEPS.has(candidate.step) ||
    typeof candidate.startedAt !== 'string'
  ) {
    return null;
  }
  return candidate as WizardProgress;
}

function isWithinTtl(startedAt: string): boolean {
  const ts = Date.parse(startedAt);
  if (!Number.isFinite(ts)) return false;
  return Date.now() - ts < TTL_MS;
}

/**
 * Read the saved wizard progress. Returns null when nothing is saved,
 * the payload is older than 24h, or the payload is malformed. Stale
 * payloads are cleared as a side effect of the read.
 */
export async function getWizardProgress(): Promise<WizardProgress | null> {
  try {
    const raw = await AsyncStorage.getItem(WIZARD_PROGRESS_KEY);
    if (raw == null) return null;
    const parsed = parseProgress(raw);
    if (!parsed) return null;
    if (!isWithinTtl(parsed.startedAt)) {
      await AsyncStorage.removeItem(WIZARD_PROGRESS_KEY);
      return null;
    }
    return parsed;
  } catch (error) {
    logError('wizardProgressRepo.getWizardProgress', error);
    return null;
  }
}

/**
 * Persist the wizard's current step + collected fields. Caller controls
 * `startedAt` so that the TTL is anchored to the original wizard entry,
 * not each step transition.
 */
export async function saveWizardProgress(progress: WizardProgress): Promise<void> {
  try {
    await AsyncStorage.setItem(WIZARD_PROGRESS_KEY, JSON.stringify(progress));
  } catch (error) {
    logError('wizardProgressRepo.saveWizardProgress', error);
    throw error;
  }
}

/**
 * Wipe the saved progress. Called on wizard completion (Step 3 Done) and
 * — implicitly — by getWizardProgress() when it finds a stale payload.
 */
export async function clearWizardProgress(): Promise<void> {
  try {
    await AsyncStorage.removeItem(WIZARD_PROGRESS_KEY);
  } catch (error) {
    logError('wizardProgressRepo.clearWizardProgress', error);
  }
}
