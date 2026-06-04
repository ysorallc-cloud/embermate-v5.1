// ============================================================================
// Phase 35 Slice 3-C followup — INTEGRATION ROUND-TRIP for the
// reflection / consolidated-notes write→read pipeline.
//
// STANDING PATTERN (locked this commit, applies to every future
// "write to storage → read elsewhere" path in this codebase):
//
//   The trap class three Slice 3-C commits exposed was identical:
//   unit tests mocked the storage layer, asserted the predicate /
//   handler math, and shipped GREEN. The real device walk surfaced
//   bugs that lived in the GAP between the write call and the read
//   call — the layer no unit test exercised. Specifically:
//     • Slice 3-C cleanup — Share button silent on all failure
//       paths because the discarded boolean lived in the gap.
//     • Slice 3-C truth-gate — hasLoggedContent predicate was
//       correct in isolation but missed scheduled-but-pending
//       meds because no test exercised the real careSummaryBuilder
//       output for an empty-but-profiled day.
//     • Bug B (this fix) — note input mount/unmount race because
//       no test exercised the parent's addNoteMode lifecycle
//       against the JournalEmptyDay tap path.
//
//   The structural guard: for any user-visible action that writes
//   data which another surface will later read, an integration
//   test must exercise the REAL write fn → REAL storage layer →
//   REAL read fn round-trip, with mocks only at the bottom-layer
//   native modules (AsyncStorage, expo-secure-store, expo-crypto —
//   all of which jest.setup.js mocks globally with realistic
//   in-memory implementations).
//
//   The mocks of `saveConsolidatedNotes` / `saveReflection` /
//   `safeStorage` / `secureStorage` / `reflectionStorage` that
//   would have masked the bug are FORBIDDEN in this file. Any
//   future maintainer adding such a mock is undoing the guard
//   this file exists to enforce.
//
// THIS FILE — the note path (Bug B).
//   The inline-input save on JournalEmptyDay calls
//   saveConsolidatedNotes(date, text). When the caregiver later
//   returns to that day, JournalNotesCard reads via
//   getConsolidatedNotes(date). The single-source-of-truth
//   contract requires text round-trips IDENTICALLY through that
//   pipeline. Encryption, sensitive-prefix routing, and the
//   reflection-authoritative flag are exercised end-to-end.
//
// SISTER FILE TO BUILD (Bug A, blocked on Q1 answer):
//   __tests__/integration/vitalsRoundTrip35S3C.test.ts —
//   saveVitalsLog(date, payload) → getTodayVitalsLog() →
//   buildCareBrief(date) round-trip. Will surface the exact
//   scheduled-vs-recorded layer the Slice 3-C truth-gate
//   walk-surfaced bug lived in.
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  saveConsolidatedNotes,
  getConsolidatedNotes,
} from '../../utils/consolidatedNotes';
import { getReflection } from '../../storage/reflectionStorage';
import { isSensitiveKey } from '../../utils/safeStorage';

async function clearAll(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  if (keys.length > 0) await AsyncStorage.multiRemove(keys as string[]);
}

describe('Phase 35 Slice 3-C followup — reflection write→read INTEGRATION round-trip (no mocks on the pipeline)', () => {
  beforeEach(async () => {
    await clearAll();
  });

  it('rt-1 (CORE): saveConsolidatedNotes(date, text) → getConsolidatedNotes(date) returns the same text (full encrypted pipeline)', async () => {
    // The single source of truth — the inline JournalEmptyDay save and
    // the Section 4 JournalNotesCard save both write through
    // saveConsolidatedNotes. The page-level read (and buildHandoffDay's
    // read for the Share path) both fetch through getConsolidatedNotes.
    // If these don't agree, the bug class returns regardless of which
    // surface the caregiver typed into.
    const DATE = '2026-06-04';
    const TEXT = 'Dad was off this morning — slept poorly.';

    const saved = await saveConsolidatedNotes(DATE, TEXT);
    expect(saved).not.toBeNull();
    expect(saved!.text).toBe(TEXT);

    const read = await getConsolidatedNotes(DATE);
    expect(read).not.toBeNull();
    expect(read!.text).toBe(TEXT);
    expect(read!.savedAt).toBe(saved!.savedAt);
  });

  it('rt-2 (PER-DATE ISOLATION): writes to one date do NOT bleed into another date\'s read', async () => {
    // The Slice 3-A "Observations from logging" sub-section will read
    // listLogsByDate(date); the reflection read uses date-keyed storage
    // (reflection_{YYYY-MM-DD}). Round-trip must respect the date key
    // — if a write to today bleeds into yesterday's read, past-day
    // handoffs would surface today's content silently.
    await saveConsolidatedNotes('2026-06-04', 'Note for the 4th.');
    await saveConsolidatedNotes('2026-06-03', 'Note for the 3rd.');

    const fourth = await getConsolidatedNotes('2026-06-04');
    const third = await getConsolidatedNotes('2026-06-03');
    expect(fourth!.text).toBe('Note for the 4th.');
    expect(third!.text).toBe('Note for the 3rd.');
  });

  it('rt-3 (OVERWRITE SEMANTICS): a second save to the same date replaces the first (no append, no merge)', async () => {
    // JournalNotesCard's edit-and-save flow is replace-not-append.
    // The inline JournalEmptyDay input lands on the same semantics so
    // a caregiver editing the day later via JournalNotesCard sees the
    // single canonical value, not a concatenation.
    const DATE = '2026-06-04';
    await saveConsolidatedNotes(DATE, 'First draft.');
    await saveConsolidatedNotes(DATE, 'Second draft, this one stays.');

    const read = await getConsolidatedNotes(DATE);
    expect(read!.text).toBe('Second draft, this one stays.');
  });

  it('rt-4 (PRIVACY — ENCRYPTED AT REST): the persisted reflection key is sensitive-prefixed AND the raw AsyncStorage value is NOT the plaintext text', async () => {
    // Standing-rule check (input-validity + privacy/local-only). If
    // safeSetItem routes the reflection key through plaintext
    // AsyncStorage, the caregiver's personal observations are at
    // rest unencrypted — same trust class as the notes-into-the-
    // void bug.
    const DATE = '2026-06-04';
    const SECRET_TEXT = 'Sensitive observation about Dad\'s mental state.';
    await saveConsolidatedNotes(DATE, SECRET_TEXT);

    // The reflection key prefix is `reflection_`. Confirm it's in
    // SENSITIVE_KEY_PREFIXES via isSensitiveKey.
    expect(isSensitiveKey('reflection_2026-06-04')).toBe(true);

    // The raw AsyncStorage payload at the reflection key must NOT
    // contain the plaintext (the encryption layer wraps it).
    const rawKeys = await AsyncStorage.getAllKeys();
    const reflectionKey = rawKeys.find((k) => k.startsWith('reflection_'));
    expect(reflectionKey).toBeDefined();
    const rawValue = await AsyncStorage.getItem(reflectionKey!);
    expect(rawValue).not.toBeNull();
    expect(rawValue).not.toContain(SECRET_TEXT);
    // And the round-trip read DOES return the plaintext.
    const read = await getConsolidatedNotes(DATE);
    expect(read!.text).toBe(SECRET_TEXT);
  });

  it('rt-5 (EMPTY/NULL-SAFE): getConsolidatedNotes(date) for an unwritten date returns null without throwing', async () => {
    // The Share button's empty-day check (Slice 3-C truth gate)
    // depends on a clean null for the absent case — not a default,
    // not a throw, not an empty StoredReflection that would
    // false-positive hasNonEmptyNotes.
    const read = await getConsolidatedNotes('2026-06-04');
    expect(read).toBeNull();
  });

  it('rt-6 (LEGACY-CONSUMER PARITY): the lower-level getReflection sees the same value as getConsolidatedNotes (the merge utility doesn\'t mask the canonical store)', async () => {
    // getConsolidatedNotes is the merge utility over reflectionStorage
    // + legacy handoffToneRepo. After Slice 3-C cleanup the legacy
    // tone store is read-only / never-written. New writes hit
    // reflectionStorage; the merge utility must surface them
    // identically. If getReflection ever diverges from
    // getConsolidatedNotes for a freshly-written value, the screen-
    // direct readers (page brief) and the merge readers (handoff
    // payload) drift.
    const DATE = '2026-06-04';
    const TEXT = 'Identical through both readers.';
    await saveConsolidatedNotes(DATE, TEXT);

    const merged = await getConsolidatedNotes(DATE);
    const direct = await getReflection(DATE);

    expect(merged!.text).toBe(TEXT);
    expect(direct!.text).toBe(TEXT);
  });
});
