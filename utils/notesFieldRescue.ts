// ============================================================================
// Phase 35 Slice 2 — one-time data-rescue: move LogEntry.data.notes →
// LogEntry.notes (canonical field).
//
// Pre-Slice-2 the medication log screen passed the caregiver's note via
// the 3rd-arg `data` object of completeInstance(id, outcome, data, notes).
// The 4th-arg `notes` was undefined → createLogEntry wrote
// LogEntry.notes = undefined with the actual text buried in
// LogEntry.data.notes. The writer fix lands at the same time as this
// rescue; the rescue covers existing users' history so Slice 3 readers
// don't need a forever `LogEntry.notes ?? LogEntry.data?.notes`
// fallback.
//
// MECHANICS (mirrors the Slice 1 encryption-migration discipline):
//   • Iterate AsyncStorage.getAllKeys() matching the two log-store
//     prefixes: `@embermate_logs_v2:` (per-day buckets) and
//     `@embermate_all_logs_v2:` (append-only aggregate).
//   • For each LogEntry array, for each entry whose data.notes is set
//     and notes is empty: set entry.notes = entry.data.notes and
//     remove entry.data.notes.
//   • Write the whole bucket back via safeSetItem (in-place encrypted
//     overwrite at the same AsyncStorage key — same atomic pattern as
//     Slice 1; no absence window).
//   • Per-entry idempotence: rescued entries have no data.notes →
//     next sweep skips them.
//   • Sweep-level idempotence: NOTES_FIELD_RESCUE_V1 flag.
//   • Ordering: appStartup Phase 2c — AFTER Phase 2b
//     (migrateToEncryptedStorage) so the log keys are already
//     sensitive/encrypted when this sweep reads/writes them.
//
// SAFETY:
//   • The index key `@embermate_logs_index_v2:` is precise-prefix-
//     excluded (it holds date strings, not LogEntry shapes).
//   • The immutability flag on LogEntry (immutable: true) is metadata
//     guarding against user-edit paths; this is a one-time field-
//     location correction, not user content modification.
//   • If interrupted between buckets, the per-entry idempotence
//     handles it on next run (rescued entries are no-ops; unrescued
//     get rescued).
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeGetItem, safeSetItem } from './safeStorage';
import { devLog, logError } from './devLog';
import { StorageKeys } from './storageKeys';

const RESCUE_FLAG = StorageKeys.NOTES_FIELD_RESCUE_V1;

// Precise prefixes — must NOT match the date-only index key
// `@embermate_logs_index_v2:` (which has no LogEntry shape).
const LOG_KEY_PREFIXES = [
  '@embermate_logs_v2:',
  '@embermate_all_logs_v2:',
];

function shouldRescueKey(key: string): boolean {
  return LOG_KEY_PREFIXES.some((p) => key.startsWith(p));
}

/**
 * Move `entry.data.notes → entry.notes` on a single LogEntry array.
 * Returns the (possibly mutated) array AND whether any entry changed
 * so the caller can skip the write when nothing needed rescuing.
 */
function rescueArrayInPlace(entries: any[]): { entries: any[]; changed: boolean } {
  let changed = false;
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue;
    const buried = entry.data?.notes;
    if (typeof buried !== 'string' || buried.length === 0) continue;
    // Canonical wins on conflict — if entry.notes is already set,
    // drop the buried duplicate silently.
    if (!entry.notes || (typeof entry.notes === 'string' && entry.notes.length === 0)) {
      entry.notes = buried;
    }
    // Always remove the buried copy once we've decided what to do.
    delete entry.data.notes;
    changed = true;
  }
  return { entries, changed };
}

export async function rescueNotesFieldFromData(): Promise<void> {
  try {
    const alreadyRescued = await AsyncStorage.getItem(RESCUE_FLAG);
    if (alreadyRescued) return;

    devLog('[NotesRescue] Starting one-time notes-field rescue sweep...');
    const allKeys = await AsyncStorage.getAllKeys();
    let bucketsTouched = 0;

    for (const key of allKeys) {
      if (!shouldRescueKey(key)) continue;
      try {
        const entries = await safeGetItem<any[]>(key, []);
        if (!Array.isArray(entries) || entries.length === 0) continue;
        const { entries: rescued, changed } = rescueArrayInPlace(entries);
        if (!changed) continue;
        await safeSetItem(key, rescued);
        bucketsTouched++;
      } catch (err) {
        // Per-key failure shouldn't abort the sweep; the next sweep
        // run picks up untouched keys (per-entry idempotence).
        logError('notesFieldRescue.rescueKey', err, { key });
      }
    }

    await AsyncStorage.setItem(RESCUE_FLAG, new Date().toISOString());
    devLog(`[NotesRescue] Sweep complete: ${bucketsTouched} buckets rescued.`);
  } catch (error) {
    logError('notesFieldRescue.rescueNotesFieldFromData', error);
    // Don't throw — rescue failure shouldn't break app startup.
  }
}
