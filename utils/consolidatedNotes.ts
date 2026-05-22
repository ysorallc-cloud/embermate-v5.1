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
import { safeGetItem, safeSetItem } from './safeStorage';
import { logError } from './devLog';

// ----------------------------------------------------------------------------
// Authoritative-flag mechanism — closes the after-save re-merge corruption bug.
//
// Pre-flag: every read merges both stores. After the user saves a value that
// has diverged from the raw legacy tone, the next read still concatenates,
// doubling the user's text. Pinned by contract (a) in
// notesConsolidationMigration31.
//
// Flag semantics (per design lock):
//   • SET for a date → reflectionStorage is authoritative; tone store is
//     never consulted for that date again. This is what kills the doubling
//     at the root — once the user has saved through the consolidated input,
//     their notes are canonical and the legacy tone is purely historical.
//   • NOT SET → read-time merge applies (the 4-state logic above).
//   • Set unconditionally on first save through saveConsolidatedNotes
//     (regardless of whether the tone store had content — defensive: even
//     if tone was empty, marking the date authoritative protects against
//     future drift if legacy data ever appeared via migration).
//
// R5 PRESERVED: this is a NEW namespace (`@embermate_consolidated_notes_
// authoritative_v1:{date}`); the tone store is still never written to or
// deleted.
// ----------------------------------------------------------------------------

const AUTHORITATIVE_FLAG_KEY = (date: string): string =>
  `@embermate_consolidated_notes_authoritative_v1:${date}`;

async function isReflectionAuthoritative(date: string): Promise<boolean> {
  try {
    const v = await safeGetItem<boolean>(AUTHORITATIVE_FLAG_KEY(date), false);
    return v === true;
  } catch (err) {
    logError('consolidatedNotes.isReflectionAuthoritative', err);
    // Fail safe: if the flag read errors, treat as not-authoritative so
    // the merge still surfaces both stores. The cost is occasional
    // false-merging, which is recoverable; the alternative (false
    // authoritative) would silently hide legacy data.
    return false;
  }
}

async function markReflectionAuthoritative(date: string): Promise<void> {
  try {
    await safeSetItem(AUTHORITATIVE_FLAG_KEY(date), true);
  } catch (err) {
    logError('consolidatedNotes.markReflectionAuthoritative', err);
    // Non-fatal: if the flag write fails, the next load will re-merge.
    // That's a cosmetic regression at worst, not data loss.
  }
}

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
 *
 *   • Authoritative flag SET for the date → return reflectionStorage
 *     ONLY. Legacy tone is not consulted. The user's saved value is
 *     canonical from the first save onward.
 *
 *   • Authoritative flag NOT SET (first interaction with this date):
 *     - Neither store has content     → returns null
 *     - Only reflectionStorage        → returns it verbatim (with savedAt)
 *     - Only handoffToneRepo (legacy) → returns tone-as-if-notes (savedAt = null)
 *     - Both with DIFFERENT content   → concatenates with `\n\n` (silent — no marker)
 *     - Both with IDENTICAL content   → dedupes — single copy returned
 *
 * Never writes to either notes store. Never deletes. The legacy store
 * stays permanently untouched.
 */
export async function getConsolidatedNotes(date: string): Promise<ConsolidatedNotes | null> {
  try {
    const authoritative = await isReflectionAuthoritative(date);

    if (authoritative) {
      // Flag SET — reflectionStorage owns this date. Skip the tone
      // store entirely. This is the after-save path: the user has
      // already merged + saved, and any subsequent reload must read
      // ONLY what they saved (else we'd re-append the legacy tone
      // every load and double their text).
      const reflection = await getReflection(date);
      const text = (reflection?.text ?? '').trim();
      if (!text) return null;
      return { text, savedAt: reflection?.savedAt ?? null };
    }

    // Flag NOT SET — first interaction with this date. Run the
    // original 4-state merge to surface any legacy tone alongside
    // notes.
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
    const saved = await saveReflection(date, text, '');
    // Mark the date authoritative — from this save onward, the legacy
    // tone store is no longer consulted by getConsolidatedNotes for
    // this date. Unconditional: set the flag even when no tone was
    // present (defensive against a tone appearing later via some
    // future migration). The flag write is non-fatal — a failure here
    // means the next load may re-merge, which is recoverable; it does
    // NOT cause data loss.
    await markReflectionAuthoritative(date);
    return saved;
  } catch (err) {
    logError('consolidatedNotes.saveConsolidatedNotes', err);
    return null;
  }
}
