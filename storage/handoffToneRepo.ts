// ============================================================================
// HANDOFF TONE REPO — Per-day caregiver one-liner
// Key pattern: handoff_tone_{YYYY-MM-DD}
//
// Mirrors reflectionStorage.ts shape — small, stable, easy to verify
// during audit guard tests. Empty/missing tone is a normal state and
// causes the canonical handoff builder to omit the TONE section entirely.
// ============================================================================

import { safeGetItem, safeSetItem } from '../utils/safeStorage';
import { logError } from '../utils/devLog';

function toneKey(date: string): string {
  return `handoff_tone_${date}`;
}

export async function getHandoffTone(date: string): Promise<string | null> {
  try {
    const v = await safeGetItem<string | null>(toneKey(date), null);
    if (typeof v !== 'string') return null;
    const trimmed = v.trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch (err) {
    logError('handoffToneRepo.get', err);
    return null;
  }
}

export async function saveHandoffTone(date: string, text: string): Promise<void> {
  try {
    await safeSetItem(toneKey(date), text.trim());
  } catch (err) {
    logError('handoffToneRepo.save', err);
  }
}
