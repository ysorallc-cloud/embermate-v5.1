// ============================================================================
// CONSOLIDATED NOTES — Phase 31 F1.
//
// Read-time merge of the two notes-input stores into one consolidated
// value for Journal Section 4 ("For the next caregiver"):
//
//   • reflectionStorage — the canonical store going forward. All NEW
//     writes land here via saveReflection.
//   • handoffToneRepo — the legacy store. Powered the HandoffSheet
//     tone input (retired in Phase 31 F3). Read-only legacy data from
//     this point onward — NEVER written to and NEVER deleted.
//
// HARD LOCK (R5 lock-confirmation): read-time merge ONLY. If this
// utility's merge logic has a bug, no data is lost because the
// originals are untouched. Background-migration scripts (one-shot
// destructive write to consolidate then delete the legacy store)
// were considered and explicitly rejected — too risky.
//
// Pinned by `__tests__/audit/notesConsolidationMigration31.test.ts`
// (8 contracts: 4 input states + dedupe + 2 save-target + 1
// source-level never-write guard).
// ============================================================================

import {
  getReflection,
  saveReflection,
  type StoredReflection,
} from '../storage/reflectionStorage';
import { getHandoffTone } from '../storage/handoffToneRepo';
import { logError } from './devLog';

export interface ConsolidatedNotes {
  /** The text value to populate Section 4's input with. Merged across
   *  both stores per the read-time-merge contract. */
  text: string;
  /** Timestamp from the reflectionStorage entry, when present. null
   *  for legacy-tone-only entries (handoffToneRepo doesn't carry a
   *  savedAt). Section 4 consumers should display this conservatively
   *  — "saved at" copy only when truthy. */
  savedAt: string | null;
}

/**
 * Read-time merge of the two notes stores for a given date.
 *
 * Behavior (pinned by Contract A in notesConsolidationMigration31):
 *   • Neither store has content     → returns null
 *   • Only reflectionStorage        → returns it verbatim (with savedAt)
 *   • Only handoffToneRepo (legacy) → returns tone-as-if-notes (savedAt = null)
 *   • Both with DIFFERENT content   → concatenates with `\n\n` (silent — no marker)
 *   • Both with IDENTICAL content   → dedupes — single copy returned
 *
 * Never writes. Never deletes. The legacy store stays untouched.
 */
export async function getConsolidatedNotes(date: string): Promise<ConsolidatedNotes | null> {
  try {
    const [reflection, legacyTone] = await Promise.all([
      getReflection(date),
      getHandoffTone(date),
    ]);

    const notesText = (reflection?.text ?? '').trim();
    const toneText = (legacyTone ?? '').trim();

    if (!notesText && !toneText) return null;

    if (notesText && !toneText) {
      return { text: notesText, savedAt: reflection?.savedAt ?? null };
    }
    if (!notesText && toneText) {
      // Legacy-tone-only origin — no savedAt on handoffToneRepo
      // entries. The Section 4 consumer treats absent savedAt as
      // "no timestamp to render."
      return { text: toneText, savedAt: null };
    }

    // Both stores have content. Dedupe identical text (Q3 dedupe
    // guard); otherwise concatenate with a plain blank line — no
    // marker, no migration artifact visible in the user's text.
    if (notesText === toneText) {
      return { text: notesText, savedAt: reflection?.savedAt ?? null };
    }
    return {
      text: `${notesText}\n\n${toneText}`,
      savedAt: reflection?.savedAt ?? null,
    };
  } catch (err) {
    logError('consolidatedNotes.getConsolidatedNotes', err);
    return null;
  }
}

/**
 * Save the consolidated notes value. Writes to reflectionStorage ONLY.
 *
 * The legacy handoffToneRepo is NEVER written to from this utility —
 * any future contributor tempted to "keep the legacy store in sync"
 * should add a new utility, not weaken this one. The source-level
 * never-write guard in the contract (pinned absence of saveHandoffTone
 * in this file) defends that boundary.
 */
export async function saveConsolidatedNotes(
  date: string,
  text: string,
): Promise<StoredReflection | null> {
  try {
    // The third arg (prompt) is a structural field of saveReflection
    // preserved from pre-Phase-31. Section 4 doesn't surface the
    // prompt separately; pass an empty string to satisfy the
    // signature without polluting storage with copy that doesn't
    // belong there.
    return await saveReflection(date, text, '');
  } catch (err) {
    logError('consolidatedNotes.saveConsolidatedNotes', err);
    return null;
  }
}
