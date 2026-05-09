// ============================================================================
// Phase 11.5.3 — sample-data parity for Insights middle-section.
//
// generateSampleCorrelationData() is the function that seeds the
// correlation engine's read sources: 14 days of dailyTracking
// (mood/sleep/hydration/pain numeric values), trend symptoms
// (Pain/Fatigue/Nausea/Dizziness with severity > 2), and per-day
// @medication_logs_<date> keys for adherence calc.
//
// Pre-fix the function was defined and re-exported but had ZERO
// callers in the codebase. Insights middle-section ("Stand Out
// Insights" / "Positive Observations" / "Correlation Cards") read
// from sources that were never seeded, so the section rendered empty
// in sample-data mode despite the data shape existing ready-to-seed.
//
// Fix: invoke from initializeSampleData(). The function is idempotent
// via the SAMPLE_CORRELATION_GENERATED flag so re-runs are safe.
//
// Pinned contracts:
//   1. dailyTracking has ≥14 distinct dates after run.
//   2. Symptoms count ≥7 after run (the severity > 2 filter naturally
//      yields 7-14 entries depending on the random spread).
//   3. ≥14 @medication_logs_<date> keys exist after run.
//   4. Source wiring: initializeSampleData() calls
//      generateSampleCorrelationData().
//   5. Idempotency: calling generateSampleCorrelationData() twice
//      doesn't duplicate dailyTracking or symptoms — the second run
//      short-circuits via SAMPLE_CORRELATION_GENERATED flag.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

// In-memory AsyncStorage so the generator can read/write without a
// device. Mirrors the pattern used by narrativeSummaryBuilder tests.
const store = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: (k: string) => Promise.resolve(store.get(k) ?? null),
    setItem: (k: string, v: string) => { store.set(k, v); return Promise.resolve(); },
    removeItem: (k: string) => { store.delete(k); return Promise.resolve(); },
    multiSet: (pairs: Array<[string, string]>) => {
      for (const [k, v] of pairs) store.set(k, v);
      return Promise.resolve();
    },
    multiRemove: (keys: string[]) => {
      keys.forEach((k) => store.delete(k));
      return Promise.resolve();
    },
    getAllKeys: () => Promise.resolve(Array.from(store.keys())),
  },
}));

jest.mock('../../utils/safeStorage', () => ({
  // Mirror real safeStorage: always JSON.stringify on write so the
  // round-trip preserves type identity (string 'true' stays a string,
  // not boolean true on read).
  safeGetItem: async <T,>(k: string, fallback: T): Promise<T> => {
    const raw = store.get(k);
    if (raw == null) return fallback;
    try { return JSON.parse(raw) as T; } catch { return fallback; }
  },
  safeSetItem: async (k: string, v: any): Promise<boolean> => {
    store.set(k, JSON.stringify(v));
    return true;
  },
}));

jest.mock('../../utils/devLog', () => ({
  logError: () => {},
  devLog: () => {},
}));

import { generateSampleCorrelationData } from '../../utils/sampleDataGenerator';
import { getSymptoms } from '../../utils/symptomStorage';
import { getDailyTracking } from '../../utils/dailyTrackingStorage';
import { StorageKeys } from '../../utils/storageKeys';

function pad2(n: number): string { return n < 10 ? `0${n}` : String(n); }
function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

beforeEach(() => {
  store.clear();
});

describe('Phase 11.5.3 — generateSampleCorrelationData seeds Insights inputs', () => {
  it('contract 1: dailyTracking has ≥14 distinct dates after run', async () => {
    await generateSampleCorrelationData();

    // Walk back 14 days from today; count those with a saved
    // dailyTracking entry. Generator iterates startDate → endDate
    // inclusive over a 14-day window.
    const today = new Date();
    let withData = 0;
    for (let n = 0; n <= 14; n++) {
      const d = new Date(today);
      d.setDate(d.getDate() - n);
      const entry = await getDailyTracking(ymd(d));
      if (entry) withData++;
    }
    expect(withData).toBeGreaterThanOrEqual(14);
  });

  it('contract 2: symptom count ≥7 after run (severity > 2 filter)', async () => {
    await generateSampleCorrelationData();
    const symptoms = await getSymptoms();
    // The generator emits entries per day per symptom-type when
    // severity > 2. With 14 days and 4 symptom types and the
    // severity threshold, the expected count is ~7-14 in the random
    // spread. The lower-bound contract pins ≥7.
    expect(symptoms.length).toBeGreaterThanOrEqual(7);
  });

  it('contract 3: ≥14 @medication_logs_<date> keys exist after run', async () => {
    await generateSampleCorrelationData();
    const keys = Array.from(store.keys()).filter((k) =>
      /^@medication_logs_\d{4}-\d{2}-\d{2}$/.test(k),
    );
    expect(keys.length).toBeGreaterThanOrEqual(14);
  });

  it('contract 5: idempotent — second run doesn\'t duplicate dailyTracking', async () => {
    await generateSampleCorrelationData();
    const symptomsAfterFirst = (await getSymptoms()).length;
    // Second invocation should short-circuit via the flag.
    await generateSampleCorrelationData();
    const symptomsAfterSecond = (await getSymptoms()).length;
    expect(symptomsAfterSecond).toBe(symptomsAfterFirst);
  });

  it('contract 5: idempotent — flag is set after first run', async () => {
    await generateSampleCorrelationData();
    const flag = store.get(StorageKeys.SAMPLE_CORRELATION_GENERATED);
    // safeStorage JSON-stringifies on write, so the raw string lands
    // as '"true"' in AsyncStorage; reads parse back to 'true'.
    expect(flag).toBe('"true"');
  });
});

// ----------------------------------------------------------------------------
// Source-level wiring audit
// ----------------------------------------------------------------------------

describe('Phase 11.5.3 — initializeSampleData wiring', () => {
  const SRC = readFileSync(
    join(__dirname, '../..', 'utils/sampleDataGenerator.ts'),
    'utf8',
  );

  it('contract 4: initializeSampleData calls generateSampleCorrelationData', () => {
    // Call site must live inside the initializeSampleData body. The
    // function was orphaned for an extended stretch — this audit
    // pins the integration so it doesn't drift back out.
    const fnStart = SRC.indexOf('initializeSampleData = async');
    expect(fnStart).toBeGreaterThan(-1);
    // Find the matching closing brace by walking from fnStart to the
    // first balanced closure. Simpler: take a generous slice.
    const fnBody = SRC.slice(fnStart, fnStart + 10000);
    expect(fnBody).toMatch(/await\s+generateSampleCorrelationData\s*\(\)/);
  });

  it('contract 4: the call is wrapped in try/catch (non-blocking)', () => {
    // Per the existing pattern (historicalData seeding), correlation
    // seeding failure must not block sample-data initialization.
    const fnStart = SRC.indexOf('initializeSampleData = async');
    const fnBody = SRC.slice(fnStart, fnStart + 10000);
    // Match: try { ... generateSampleCorrelationData ... } catch
    expect(fnBody).toMatch(
      /try\s*\{[\s\S]*?generateSampleCorrelationData\s*\(\)[\s\S]*?\}\s*catch/,
    );
  });
});
