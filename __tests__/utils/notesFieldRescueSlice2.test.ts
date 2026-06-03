// ============================================================================
// Phase 35 Slice 2 — notes arg-position fix + data-rescue migration.
//
// PART 1: arg-position fix.
//   log-medication-plan-item.tsx:160 passed the caregiver's note in the
//   3rd-arg `data` object: `completeInstance(id, 'taken', { ..., notes })`.
//   But completeInstance's signature is (id, outcome, data?, notes?) —
//   4th arg. The 4th was undefined → createLogEntry stored
//   LogEntry.notes = undefined, with the actual text buried in
//   LogEntry.data.notes. Off-by-one arg bug; only this site has it
//   (other completeInstance calls pass no notes; skipInstance call is
//   correct). Slice 2 fixes the call site so notes land in the
//   canonical LogEntry.notes field, ready for Slice 3 surfacing.
//
// PART 2: data-rescue migration.
//   Existing users have months of logs with notes buried in
//   data.notes. Without rescue, Slice 3 readers would need a forever
//   `LogEntry.notes ?? LogEntry.data?.notes` fallback. Rescue sweeps
//   both log stores once and moves the field to its canonical home.
//
//   Mechanics (mirrors Slice 1 discipline):
//     • Iterate AsyncStorage.getAllKeys() matching the two log-key
//       prefixes.
//     • For each LogEntry array, for each entry with data?.notes set
//       AND notes empty: set entry.notes = entry.data.notes, remove
//       entry.data.notes.
//     • Write the whole array back via safeSetItem (in-place encrypted
//       overwrite at the same key — Slice 1 pattern; atomic per key).
//     • Per-entry idempotency: rescued entries have no data.notes →
//       sweep skips on re-run.
//     • Sweep-level idempotency: NOTES_FIELD_RESCUE_V1 flag set at end.
//     • Ordering: runs Phase 2c in appStartup, AFTER the encryption
//       migration (Phase 2b) so log keys are already encrypted/
//       sensitive when the sweep reads them.
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { setSecureItem, getSecureItem } from '../../utils/secureStorage';
import { safeGetItem } from '../../utils/safeStorage';
import { rescueNotesFieldFromData } from '../../utils/notesFieldRescue';
import { StorageKeys } from '../../utils/storageKeys';
import { readFileSync } from 'fs';
import { join } from 'path';

const PATIENT = 'default';
const DATE_A = '2026-05-15';
const DATE_B = '2026-05-20';
const KEY_DAILY_A = `@embermate_logs_v2:${PATIENT}:${DATE_A}`;
const KEY_DAILY_B = `@embermate_logs_v2:${PATIENT}:${DATE_B}`;
const KEY_ALL = `@embermate_all_logs_v2:${PATIENT}`;
const RESCUE_FLAG = StorageKeys.NOTES_FIELD_RESCUE_V1;

async function clearAll(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  if (keys.length > 0) await AsyncStorage.multiRemove(keys as string[]);
}

function logBuriedNote(id: string, note: string, otherData: any = {}): any {
  return {
    id,
    patientId: PATIENT,
    date: DATE_A,
    timestamp: '2026-05-15T08:00:00.000Z',
    type: 'medication',
    outcome: 'taken',
    immutable: true,
    createdAt: '2026-05-15T08:00:00.000Z',
    // notes is NOT set; data.notes carries the text (the bug shape).
    data: { sideEffect: 'mild headache', notes: note, ...otherData },
  };
}

function logCanonicalNote(id: string, note: string): any {
  return {
    ...logBuriedNote(id, '_should-be-empty_'),
    notes: note,
    data: { sideEffect: 'mild headache' }, // no notes here — canonical
  };
}

function logNoNote(id: string): any {
  return {
    id,
    patientId: PATIENT,
    date: DATE_A,
    timestamp: '2026-05-15T08:00:00.000Z',
    type: 'vitals',
    outcome: 'completed',
    immutable: true,
    createdAt: '2026-05-15T08:00:00.000Z',
    data: { bp: '120/80' },
  };
}

beforeEach(async () => {
  await clearAll();
});

describe('Slice 2 — arg-position fix in the medication log screen (source pin)', () => {
  it('contract 1: log-medication-plan-item.tsx passes `notes` as the 4th arg of completeInstance — NOT inside the 3rd-arg data object', () => {
    // Pin the corrected call shape at the source level so a future
    // refactor can't silently regress the off-by-one again. The
    // correct shape ends with `, notes.trim() || undefined)` (or
    // similar — notes as a SEPARATE positional argument outside the
    // data object).
    const src = readFileSync(
      join(__dirname, '../..', 'app/log-medication-plan-item.tsx'),
      'utf8',
    );
    const stripped = src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/[^\n]*/g, '');
    // The pre-Slice-2 bug shape: a single completeInstance call with
    // `notes:` as a KEY inside an object literal passed as the 3rd
    // arg. Reject that shape — the fix moves notes out of the data
    // object entirely.
    const completeCallIdx = stripped.search(/completeInstance\s*\(\s*instanceId\s*,\s*['"]taken['"]/);
    expect(completeCallIdx).toBeGreaterThan(-1);
    // Walk a 600-char window around the call and look at how the
    // arguments are structured. Pin: the call does NOT contain a
    // `notes:` key inside an object literal at the data-arg
    // position. After the fix the call should have `notes:` removed
    // from the data object and `notes.trim() || undefined` appearing
    // as a separate positional argument.
    const window = stripped.slice(completeCallIdx, Math.min(stripped.length, completeCallIdx + 600));
    // Hard reject: `notes:` appearing as a property inside the
    // completeInstance call's argument list (the buried-in-data
    // shape).
    expect(window).not.toMatch(/notes\s*:\s*notes\.trim/);
    // Constructive: notes is passed as a positional argument by
    // value (notes.trim() reference appears outside an object
    // literal — i.e. immediately preceded by a comma, not by a
    // `notes:` key).
    expect(window).toMatch(/,\s*notes\.trim\s*\(\s*\)/);
  });
});

describe('Slice 2 — data-rescue migration moves data.notes → notes (in-place, both stores)', () => {
  it('contract 2: PRIOR STATE — daily-bucket logs with notes buried in data are rescued; original text preserved at canonical field', async () => {
    const seeded = [
      logBuriedNote('log-1', 'Took with breakfast; BP felt elevated'),
      logBuriedNote('log-2', 'Side effect: mild dizziness'),
    ];
    await setSecureItem(KEY_DAILY_A, seeded);

    await rescueNotesFieldFromData();

    const after = await safeGetItem<any[]>(KEY_DAILY_A, []);
    expect(after.length).toBe(2);
    expect(after[0].notes).toBe('Took with breakfast; BP felt elevated');
    expect(after[1].notes).toBe('Side effect: mild dizziness');
    // The buried-in-data field is GONE on the rescued entries
    // (canonical home now exclusively holds the text).
    expect(after[0].data?.notes).toBeUndefined();
    expect(after[1].data?.notes).toBeUndefined();
    // Other fields preserved.
    expect(after[0].data?.sideEffect).toBe('mild headache');
    expect(after[0].type).toBe('medication');
    expect(after[0].immutable).toBe(true);
  });

  it('contract 3: rescue covers BOTH stores — daily bucket AND @embermate_all_logs_v2 aggregate', async () => {
    // The same LogEntry can live in both stores (createLogEntry
    // writes to both). Rescue must update both, not just one,
    // or readers see inconsistent state.
    const aggregate = [logBuriedNote('log-A', 'Aggregate-only note')];
    await setSecureItem(KEY_ALL, aggregate);

    await rescueNotesFieldFromData();

    const after = await safeGetItem<any[]>(KEY_ALL, []);
    expect(after[0].notes).toBe('Aggregate-only note');
    expect(after[0].data?.notes).toBeUndefined();
  });

  it('contract 4 (LEAVE-ALONE): entries already in canonical shape (notes set, no data.notes) are UNTOUCHED', async () => {
    const seeded = [logCanonicalNote('log-1', 'Already canonical')];
    await setSecureItem(KEY_DAILY_A, seeded);

    await rescueNotesFieldFromData();

    const after = await safeGetItem<any[]>(KEY_DAILY_A, []);
    expect(after[0].notes).toBe('Already canonical');
    expect(after[0].data?.notes).toBeUndefined();
  });

  it('contract 5 (LEAVE-ALONE): entries with no note at all are UNTOUCHED (no spurious empty-string writes)', async () => {
    const seeded = [logNoNote('log-1')];
    await setSecureItem(KEY_DAILY_A, seeded);

    await rescueNotesFieldFromData();

    const after = await safeGetItem<any[]>(KEY_DAILY_A, []);
    expect(after[0].notes).toBeUndefined();
    expect(after[0].data?.notes).toBeUndefined();
    expect(after[0].data?.bp).toBe('120/80');
  });

  it('contract 6 (CONFLICT — canonical wins): entry with BOTH notes set AND data.notes set keeps canonical, drops data.notes', async () => {
    // Defensive — if a future writer (or a half-rescued state)
    // produces both fields, the canonical notes field is the
    // source of truth. Drop data.notes silently.
    const seeded = [{
      ...logBuriedNote('log-1', '_buried-stale_'),
      notes: 'Canonical truth',
    }];
    await setSecureItem(KEY_DAILY_A, seeded);

    await rescueNotesFieldFromData();

    const after = await safeGetItem<any[]>(KEY_DAILY_A, []);
    expect(after[0].notes).toBe('Canonical truth');
    expect(after[0].data?.notes).toBeUndefined();
  });

  it('contract 7 (MULTI-BUCKET): multiple daily-bucket keys all get rescued in one sweep', async () => {
    await setSecureItem(KEY_DAILY_A, [logBuriedNote('log-1', 'Bucket A note')]);
    await setSecureItem(KEY_DAILY_B, [logBuriedNote('log-2', 'Bucket B note')]);

    await rescueNotesFieldFromData();

    const a = await safeGetItem<any[]>(KEY_DAILY_A, []);
    const b = await safeGetItem<any[]>(KEY_DAILY_B, []);
    expect(a[0].notes).toBe('Bucket A note');
    expect(b[0].notes).toBe('Bucket B note');
  });

  it('contract 8 (PER-ENTRY IDEMPOTENCE): re-running rescue on already-rescued data is a no-op (per-entry data.notes check)', async () => {
    await setSecureItem(KEY_DAILY_A, [logBuriedNote('log-1', 'First-pass note')]);
    await rescueNotesFieldFromData();
    const after1 = await safeGetItem<any[]>(KEY_DAILY_A, []);

    // Clear the sweep-level flag so the second call doesn't early-
    // return; force it through the per-entry path.
    await AsyncStorage.removeItem(RESCUE_FLAG);
    await rescueNotesFieldFromData();
    const after2 = await safeGetItem<any[]>(KEY_DAILY_A, []);

    expect(after2[0].notes).toBe('First-pass note');
    expect(after2[0].data?.notes).toBeUndefined();
    // Byte-for-byte stable.
    expect(after2).toEqual(after1);
  });

  it('contract 9 (SWEEP IDEMPOTENCE): NOTES_FIELD_RESCUE_V1 flag set after first run; subsequent call early-returns', async () => {
    await setSecureItem(KEY_DAILY_A, [logBuriedNote('log-1', 'First-pass note')]);
    await rescueNotesFieldFromData();

    const flag = await AsyncStorage.getItem(RESCUE_FLAG);
    expect(flag).not.toBeNull();

    // Seed a fresh bug-shaped entry AFTER the flag is set. A second
    // sweep call should NOT touch it (sweep-level early-return).
    await setSecureItem(KEY_DAILY_B, [logBuriedNote('log-2', 'Post-flag note')]);
    await rescueNotesFieldFromData();
    const b = await safeGetItem<any[]>(KEY_DAILY_B, []);
    // Untouched — sweep is one-time. (If a regression re-introduces
    // the bug shape after Slice 2, the canonical fix is to fix the
    // writer, not re-run the sweep.)
    expect(b[0].notes).toBeUndefined();
    expect(b[0].data?.notes).toBe('Post-flag note');
  });

  it('contract 10 (PRECISE-PREFIX GUARD): the index key @embermate_logs_index_v2: is NOT touched (no LogEntry shape, no health content)', async () => {
    // The index holds an array of date strings, not LogEntry
    // records. The rescue must NOT iterate the index.
    const indexKey = `@embermate_logs_index_v2:${PATIENT}`;
    const dateIndex = [DATE_A, DATE_B];
    // The index is plaintext (non-sensitive per Slice 1).
    await AsyncStorage.setItem(indexKey, JSON.stringify(dateIndex));

    await rescueNotesFieldFromData();

    const after = await AsyncStorage.getItem(indexKey);
    expect(after).toBe(JSON.stringify(dateIndex));
  });
});

// Need to mock expo-secure-store with persistent keychain so the
// encryption layer can round-trip across the test's writes/reads.
jest.mock('expo-secure-store', () => {
  const keychain: Record<string, string> = {};
  return {
    getItemAsync: jest.fn(async (key: string) => keychain[key] ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      keychain[key] = value;
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      delete keychain[key];
    }),
    WHEN_UNLOCKED: 'WHEN_UNLOCKED',
  };
});
