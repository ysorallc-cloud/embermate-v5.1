// ============================================================================
// VISIT PREP DRAFT REPO — Per-day saved "What changed" text
// Phase 5.8.b. Key pattern: visit_prep_draft_{YYYY-MM-DD}
//
// Saves the user's edited "What changed" lede so reopening the visit-prep
// preview doesn't regenerate the auto-draft on top of their edits. The
// date key is the END of the visit-prep date range (the report's reference
// date), not today.
// ============================================================================

import { safeGetItem, safeSetItem } from '../utils/safeStorage';
import { logError } from '../utils/devLog';

function draftKey(endDate: string): string {
  return `visit_prep_draft_${endDate}`;
}

export async function getVisitPrepDraft(endDate: string): Promise<string | null> {
  try {
    const v = await safeGetItem<string | null>(draftKey(endDate), null);
    if (typeof v !== 'string') return null;
    const trimmed = v.trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch (err) {
    logError('visitPrepDraftRepo.get', err);
    return null;
  }
}

export async function saveVisitPrepDraft(endDate: string, text: string): Promise<void> {
  try {
    await safeSetItem(draftKey(endDate), text.trim());
  } catch (err) {
    logError('visitPrepDraftRepo.save', err);
  }
}

export async function clearVisitPrepDraft(endDate: string): Promise<void> {
  try {
    await safeSetItem(draftKey(endDate), '');
  } catch (err) {
    logError('visitPrepDraftRepo.clear', err);
  }
}
