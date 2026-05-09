// ============================================================================
// Phase 11.6 — past-day medication instances are seeded.
//
// Bug: sampleDataGenerator's historical loop (lines 727-742 pre-fix)
// seeded only wellness/sleep/hydration past-day instances. Medications
// were filtered out, so every downstream surface that reads
// listDailyInstancesRange for medication adherence — Insights
// adherence grid, Visit Prep, getDistinctInstanceCompletionDays —
// saw zero past-day medication instances.
//
// Fix: extend the loop to include medication at ~90% adherence
// (matching seedSampleMedicationLogs's 0.1 skip rate). The decision
// logic is extracted into a pure helper (decideHistoricalSeedStatus)
// so it's testable as a unit without running the full sample-data
// pipeline.
//
// Pinned contracts:
//   1. Past-day medication instances would be seeded — helper returns
//      'completed' or 'skipped' for itemType 'medication'.
//   2. Status distribution is roughly 90% completed for medications.
//   3. Wellness/sleep/hydration stay at 100% completed (no regression).
//   4. Source-level audit: the historical loop body in
//      sampleDataGenerator.ts includes medication in its branches
//      and consumes the helper.
//   5. Idempotency: the SAMPLE_DATA_INITIALIZED guard at the top of
//      initializeSampleData prevents re-seeding on a second call.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';
import {
  decideHistoricalSeedStatus,
  HistoricalSeedDecision,
} from '../../utils/sampleDataHistoricalSeedShape';

describe('Phase 11.6 — decideHistoricalSeedStatus', () => {
  describe('Contract 1: past-day medication instances would be seeded', () => {
    it('itemType=medication returns "completed" or "skipped" — never null', () => {
      // Run the predicate enough times that both branches are hit.
      // Random source is replaced with a deterministic counter so the
      // contract is repeatable.
      const decisions = new Set<HistoricalSeedDecision>();
      for (let i = 0; i < 200; i++) {
        const fakeRandom = () => i / 200;
        decisions.add(decideHistoricalSeedStatus('medication', fakeRandom));
      }
      expect(decisions.has('completed')).toBe(true);
      expect(decisions.has('skipped')).toBe(true);
      expect(decisions.has(null)).toBe(false);
    });
  });

  describe('Contract 2: medication status distribution is ~90% completed', () => {
    it('over a uniform random source, completed-rate falls in [85%, 95%]', () => {
      // Math.random replaced with linspace samples so the distribution
      // is exact rather than statistical. random > 0.1 → completed.
      // Out of 200 samples: 200 * 0.9 = 180 completed, 20 skipped.
      let completed = 0;
      let skipped = 0;
      for (let i = 0; i < 200; i++) {
        const fakeRandom = () => i / 200;
        const d = decideHistoricalSeedStatus('medication', fakeRandom);
        if (d === 'completed') completed++;
        else if (d === 'skipped') skipped++;
      }
      const completedPct = (completed / 200) * 100;
      expect(completedPct).toBeGreaterThanOrEqual(85);
      expect(completedPct).toBeLessThanOrEqual(95);
      // Sanity: every sample maps to one of the two states.
      expect(completed + skipped).toBe(200);
    });
  });

  describe('Contract 3: wellness/sleep/hydration regression-pin', () => {
    it.each(['wellness', 'sleep', 'hydration'] as const)(
      'itemType=%s always returns "completed" (100% rate, unchanged)',
      (itemType) => {
        // Random source must not influence the decision for these
        // proxy-compliance signals.
        for (let i = 0; i < 50; i++) {
          const decision = decideHistoricalSeedStatus(itemType, () => i / 50);
          expect(decision).toBe('completed');
        }
      },
    );
  });

  describe('Contract 4: itemTypes outside the seed list return null', () => {
    it.each(['vitals', 'mood', 'activity', 'appointment', 'errand'] as const)(
      'itemType=%s returns null (not seeded by the historical loop)',
      (itemType) => {
        expect(decideHistoricalSeedStatus(itemType, () => 0.5)).toBeNull();
      },
    );
  });
});

// ----------------------------------------------------------------------------
// Source-level wiring audit
// ----------------------------------------------------------------------------

describe('Phase 11.6 — initializeSampleData historical loop wiring', () => {
  const SRC = readFileSync(
    join(__dirname, '../..', 'utils/sampleDataGenerator.ts'),
    'utf8',
  );

  it('contract 4: loop consumes decideHistoricalSeedStatus', () => {
    expect(SRC).toMatch(
      /import\s*\{[^}]*\bdecideHistoricalSeedStatus\b[^}]*\}\s*from\s*['"][^'"]+\/sampleDataHistoricalSeedShape['"]/,
    );
    expect(SRC).toMatch(/decideHistoricalSeedStatus\s*\(/);
  });

  it('contract 4: the historical loop iterates 14 days of pastInstances', () => {
    // Pin the structural shape: a for-loop over daysAgo 1..14, fetching
    // pastInstances per date, then iterating instances and applying the
    // helper's decision.
    expect(SRC).toMatch(/for\s*\(\s*let\s+daysAgo\s*=\s*1;\s*daysAgo\s*<=\s*14/);
    expect(SRC).toMatch(/ensureDailyInstances\s*\(\s*DEFAULT_PATIENT_ID\s*,\s*dateStr\s*\)/);
  });

  it('contract 5: idempotency guard at SAMPLE_DATA_INITIALIZED_KEY remains in place', () => {
    // The early-exit guard at the top of initializeSampleData prevents
    // re-seeding on a second invocation. Pinned because losing it
    // would silently double-seed instances on every app open.
    const fnStart = SRC.indexOf('initializeSampleData = async');
    expect(fnStart).toBeGreaterThan(-1);
    const fnBody = SRC.slice(fnStart, fnStart + 10000);
    expect(fnBody).toMatch(/SAMPLE_DATA_INITIALIZED_KEY[\s\S]*?initialized\s*===\s*['"]true['"]/);
  });
});
