// ============================================================================
// Phase 35 Slice 3-C followup — INTEGRATION ROUND-TRIP for the vitals
// write→read pipeline.
//
// STANDING PATTERN (locked in reflectionRoundTrip35S3C.test.ts, applies
// here verbatim):
//
//   For any user-visible action that writes data which another surface
//   will later read, an integration test must exercise the REAL write
//   fn → REAL storage layer → REAL read fn round-trip, with mocks ONLY
//   at the bottom-layer native modules (AsyncStorage, expo-secure-store,
//   expo-crypto — all of which jest.setup.js mocks globally with
//   realistic in-memory implementations).
//
//   Mocks of `saveVitalsLog` / `getTodayVitalsLog` / `buildCareBrief` /
//   `buildHandoffDay` / `centralStorage` / `safeStorage` / `secureStorage`
//   are FORBIDDEN in this file. Any future maintainer adding such a
//   mock is undoing the guard this file exists to enforce.
//
// THIS FILE — the vitals path (Bug A).
//   `app/log-vitals.tsx` (line ~198) and `app/quick-log-more.tsx`
//   (line ~238) both call saveVitalsLog(payload). The Journal page
//   reads via getTodayVitalsLog (inside buildCareBrief). The Share PDF
//   reads via the SAME buildCareBrief inside buildHandoffDay, then
//   gates Share on payload.hasLoggedContent. The walk-surfaced bug
//   ("vital recorded but Share refuses with 'Nothing to share for
//   this day yet'") lives somewhere between saveVitalsLog and
//   payload.hasLoggedContent === true. This test pins the round-trip
//   at every layer so the regression cannot recur silently.
//
// SISTER FILE: reflectionRoundTrip35S3C.test.ts (Bug B — note path).
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  saveVitalsLog,
  getTodayVitalsLog,
  type VitalsLog,
} from '../../utils/centralStorage';
import { buildCareBrief } from '../../utils/careSummaryBuilder';
import { buildHandoffDay } from '../../utils/handoffDayBuilder';
import { getTodayDateString } from '../../services/carePlanGenerator';
import { isSensitiveKey } from '../../utils/safeStorage';
import { StorageKeys } from '../../utils/storageKeys';

async function clearAll(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  if (keys.length > 0) await AsyncStorage.multiRemove(keys as string[]);
}

const BP_PAYLOAD: Omit<VitalsLog, 'id'> = {
  timestamp: new Date().toISOString(),
  systolic: 158,
  diastolic: 95,
  heartRate: 78,
};

describe('Phase 35 Slice 3-C followup — vitals write→read INTEGRATION round-trip (no mocks on the pipeline)', () => {
  beforeEach(async () => {
    await clearAll();
  });

  it('rt-1 (CORE): saveVitalsLog → getTodayVitalsLog returns the saved log with readings intact', async () => {
    await saveVitalsLog({ ...BP_PAYLOAD, timestamp: new Date().toISOString() });

    const read = await getTodayVitalsLog();
    expect(read).not.toBeNull();
    expect(read!.systolic).toBe(158);
    expect(read!.diastolic).toBe(95);
    expect(read!.heartRate).toBe(78);
  });

  it('rt-2 (BUILDER): saveVitalsLog → buildCareBrief(today) populates brief.vitals.recorded=true with readings', async () => {
    // The Journal page Section 2 gates the "Vitals" subsection on
    // brief.vitals.recorded. If this assertion fails, the page would
    // hide the BP — but the user confirmed Q1 the page DOES show it,
    // so this should pass and rt-3 is the bug-pinning case.
    await saveVitalsLog({ ...BP_PAYLOAD, timestamp: new Date().toISOString() });

    const brief = await buildCareBrief(getTodayDateString());
    expect(brief.vitals).not.toBeNull();
    expect(brief.vitals.recorded).toBe(true);
    expect(brief.vitals.readings?.systolic).toBe(158);
    expect(brief.vitals.readings?.diastolic).toBe(95);
  });

  it('rt-3 (BUG A — SHARE UNBLOCK): saveVitalsLog alone → buildHandoffDay(today).hasLoggedContent === true', async () => {
    // The exact bug the user reported: BP saved, page Section 2 shows
    // it, Share button refuses with "Nothing to share for this day
    // yet" because hasLoggedContent is false. The truth gate is
    // hasRecordedVitals = brief.vitals?.recorded === true. With no
    // meds / notes / flagged moments, vitals alone MUST unblock the
    // gate — otherwise a caregiver who's only logged a vital can
    // never share that vital.
    await saveVitalsLog({ ...BP_PAYLOAD, timestamp: new Date().toISOString() });

    const payload = await buildHandoffDay(getTodayDateString());
    expect(payload).not.toBeNull();
    expect(payload!.vitals).not.toBeNull();
    expect(payload!.vitals!.recorded).toBe(true);
    expect(payload!.hasLoggedContent).toBe(true);
  });

  it('rt-4 (PRIVACY — ENCRYPTED AT REST): the vitals logs key is sensitive-prefixed AND raw AsyncStorage value is NOT the plaintext systolic/diastolic numbers', async () => {
    // Standing-rule check (input-validity + privacy/local-only). If
    // safeSetItem routes the vitals key through plaintext AsyncStorage,
    // BP readings are at rest unencrypted — same trust class as
    // any other health input.
    await saveVitalsLog({ ...BP_PAYLOAD, timestamp: new Date().toISOString() });

    // CENTRAL_VITALS_LOGS prefix must be in SENSITIVE_KEY_PREFIXES.
    expect(isSensitiveKey(StorageKeys.CENTRAL_VITALS_LOGS)).toBe(true);

    // The raw AsyncStorage payload at the vitals key must NOT
    // contain the plaintext numbers.
    const rawKeys = await AsyncStorage.getAllKeys();
    const vitalsKey = rawKeys.find((k) =>
      k.startsWith(StorageKeys.CENTRAL_VITALS_LOGS),
    );
    expect(vitalsKey).toBeDefined();
    const rawValue = await AsyncStorage.getItem(vitalsKey!);
    expect(rawValue).not.toBeNull();
    expect(rawValue).not.toContain('158');
    expect(rawValue).not.toContain('"systolic"');

    // And the round-trip read DOES return the plaintext.
    const read = await getTodayVitalsLog();
    expect(read!.systolic).toBe(158);
    expect(read!.diastolic).toBe(95);
  });

  it('rt-5 (EMPTY/NULL-SAFE): no vital saved → getTodayVitalsLog returns null, brief.vitals.recorded=false, and (vitals-alone) hasLoggedContent=false', async () => {
    // The truth gate must correctly REFUSE when nothing is logged.
    // This is the symmetric guard to rt-3: refusing-when-empty is
    // correct (Slice 3-C's intent); refusing-when-vitals-present is
    // Bug A. Both must hold.
    const read = await getTodayVitalsLog();
    expect(read).toBeNull();

    const brief = await buildCareBrief(getTodayDateString());
    expect(brief.vitals.recorded).toBe(false);
    expect(brief.vitals.readings).toBeUndefined();

    const payload = await buildHandoffDay(getTodayDateString());
    expect(payload).not.toBeNull();
    expect(payload!.hasLoggedContent).toBe(false);
  });

  it('rt-6 (TIMESTAMP-DAY MATCH): saveVitalsLog with today\'s ISO timestamp is treated as today by the toDateString filter in getTodayVitalsLog', async () => {
    // getTodayVitalsLog filters by `new Date(log.timestamp).toDateString() === today`.
    // log-vitals.tsx and quick-log-more.tsx both write timestamp = ISO
    // string at the moment of save (i.e. `now`). If the filter ever
    // drifted (timezone bug, DST edge, ISO-vs-Date confusion), the
    // page would still see the raw log via getVitalsLogs but Share
    // and Today-page builders that use getTodayVitalsLog would NOT.
    // Pin both: now-ISO must be "today" by toDateString.
    const nowIso = new Date().toISOString();
    await saveVitalsLog({ ...BP_PAYLOAD, timestamp: nowIso });

    const read = await getTodayVitalsLog();
    expect(read).not.toBeNull();
    expect(read!.timestamp).toBe(nowIso);

    // Also pin the toDateString match (defensive — proves the filter
    // is consistent with what saveVitalsLog wrote).
    expect(new Date(nowIso).toDateString()).toBe(new Date().toDateString());
  });
});
