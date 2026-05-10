// ============================================================================
// Phase 11.7.3a — sample-data historical seed passes LogEntryData
// payloads so the Insights aggregator can decode wellness/sleep/
// hydration completions.
//
// Bug repro: device check after 11.6 surfaced "PATTERNS COMING — 7
// of 14 days" plus the Missing Data section claiming
// Sleep/Hydration/Evening wellness each have "14 days missing" —
// while the same screen renders correlations built on the same
// underlying data ("Pain & Hydration", "Mood & Sleep").
//
// Root cause: the aggregator at understandInsights.ts:614-619 reads
// `LogEntry.data?.type === 'sleep'` / `'hydration'` to bucket
// avgSleepHours / avgHydrationPerDay. Sample-data's historical loop
// called logInstanceCompletion with NO data argument — so persisted
// LogEntry.data was undefined, and the aggregator's switch never
// fired. (Correlations populated from a separate dailyTracking store
// seeded by generateSampleCorrelationData — different storage path,
// hence the inconsistency.)
//
// Fix: extend the historical seed shape with a per-itemType data
// payload helper. Status decision stays in
// decideHistoricalSeedStatus; payload decision lives alongside in a
// new historicalSeedDataPayload helper. The loop now passes both.
//
// Pinned contracts:
//   1. Sleep itemType returns SleepLogData with type 'sleep' + hours.
//   2. Hydration itemType returns HydrationLogData with type
//      'hydration' + glasses.
//   3. Wellness itemType returns a payload with type 'mood' and a
//      mood field (the aggregator's current key — to be augmented
//      with itemType='wellness' in 11.7.3b).
//   4. Medication itemType returns undefined (the medication
//      aggregator works without a payload; logInstanceCompletion
//      tolerates undefined).
//   5. Other itemTypes return undefined (loop skips them via
//      decideHistoricalSeedStatus anyway).
//   6. SAMPLE_SEED_SHAPE_VERSION is bumped so 11.7.2's migration
//      re-seeds existing testers under the new payload shape.
//   7. Source-level audit: the historical loop in
//      sampleDataGenerator.ts passes the payload to
//      logInstanceCompletion.
// ============================================================================

import {
  historicalSeedDataPayload,
} from '../../utils/sampleDataHistoricalSeedShape';

describe('Phase 11.7.3a — historicalSeedDataPayload', () => {
  it('contract 1: sleep returns { type: "sleep", hours: <plausible> }', () => {
    const out = historicalSeedDataPayload('sleep');
    expect(out).toBeDefined();
    expect((out as any).type).toBe('sleep');
    // The aggregator divides into avgSleepHours; a plausible value in
    // [4, 12] hours keeps the average inside a reasonable display
    // range across 14 days of seeded data.
    expect((out as any).hours).toBeGreaterThanOrEqual(4);
    expect((out as any).hours).toBeLessThanOrEqual(12);
  });

  it('contract 2: hydration returns { type: "hydration", glasses: <plausible> }', () => {
    const out = historicalSeedDataPayload('hydration');
    expect(out).toBeDefined();
    expect((out as any).type).toBe('hydration');
    // Plausible glasses-per-day spread; aggregator sums per-day.
    expect((out as any).glasses).toBeGreaterThanOrEqual(1);
    expect((out as any).glasses).toBeLessThanOrEqual(12);
  });

  it('contract 3: wellness returns a payload that the current aggregator can decode', () => {
    // Pre-11.7.3b the aggregator counts wellness via itemType === 'mood'
    // (see understandInsights.ts:604). Use type 'mood' so the payload
    // also passes through any future data-aware aggregation. 11.7.3b
    // will fix the itemType-key mismatch independently; this test
    // pins the data shape, not the aggregator behaviour.
    const out = historicalSeedDataPayload('wellness');
    expect(out).toBeDefined();
    expect((out as any).type).toBe('mood');
    expect(typeof (out as any).mood).toBe('number');
  });

  it('contract 4: medication returns undefined (no payload required)', () => {
    // The medication aggregator counts via itemType === 'medication'
    // and instance.status — data payload not required. Returning
    // undefined keeps logInstanceCompletion happy and avoids
    // fabricating a medicationName/dose pair.
    expect(historicalSeedDataPayload('medication')).toBeUndefined();
  });

  it.each(['vitals', 'activity', 'mood', 'appointment', 'errand'] as const)(
    'contract 5: itemType=%s returns undefined (loop skips them anyway)',
    (itemType) => {
      expect(historicalSeedDataPayload(itemType)).toBeUndefined();
    },
  );
});

// ----------------------------------------------------------------------------
// Source-level wiring + version-bump audits
// ----------------------------------------------------------------------------

import { readFileSync } from 'fs';
import { join } from 'path';
import {
  SAMPLE_SEED_SHAPE_VERSION,
} from '../../utils/sampleDataGenerator';

describe('Phase 11.7.3a — wiring + version bump', () => {
  const SRC = readFileSync(
    join(__dirname, '../..', 'utils/sampleDataGenerator.ts'),
    'utf8',
  );

  it('contract 6: SAMPLE_SEED_SHAPE_VERSION bumped to 2 (re-seed for testers on 11.7.2 shape)', () => {
    // 11.7.2 set the version to 1. 11.7.3a adds data payloads —
    // testers already on shape 1 must re-seed once to get the
    // payload-bearing logs the aggregator can decode.
    expect(SAMPLE_SEED_SHAPE_VERSION).toBeGreaterThanOrEqual(2);
  });

  it('contract 7: historical loop passes the payload to logInstanceCompletion', () => {
    expect(SRC).toMatch(
      /import\s*\{[^}]*\bhistoricalSeedDataPayload\b[^}]*\}\s*from\s*['"][^'"]+\/sampleDataHistoricalSeedShape['"]/,
    );
    // Pin the call shape inside the historical loop: the helper is
    // invoked, its result is named `data`, and that variable feeds
    // logInstanceCompletion as the 5th argument. The order is
    //   const data = historicalSeedDataPayload(...);
    //   await logInstanceCompletion(pid, date, instId, decision, data);
    // (the `data` parameter is positional, not via a payload object).
    expect(SRC).toMatch(/historicalSeedDataPayload\s*\(/);
    // Pin: logInstanceCompletion(...) call body contains a `data`
    // argument on its own line — distinguishes the new 5-arg signature
    // from the old 4-arg form.
    expect(SRC).toMatch(
      /logInstanceCompletion\s*\(\s*DEFAULT_PATIENT_ID\s*,\s*dateStr\s*,\s*inst\.id\s*,\s*decision\s*,\s*data\s*,?\s*\)/,
    );
  });
});
