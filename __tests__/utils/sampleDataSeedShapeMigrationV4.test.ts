// ============================================================================
// Phase 28 Batch B MEALS post-audit (THE READ Item 2) — clean-slate seed-shape
// migration contracts.
//
// Pre-fix: `migrateSampleSeedShape` cleared `SAMPLE_DATA_INITIALIZED` +
// `SAMPLE_CORRELATION_GENERATED` flags so the next launch re-ran
// `initializeSampleData()`. But existing LOGS_V2 LogEntries from the prior
// seed shape persisted — `ensureDailyInstances` is idempotent per instance,
// but the LogEntries written by `logInstanceCompletion` accumulated across
// versions. Observed effect: `avgHydrationPerDay` inflated from the
// intended ~7.5 glasses/day to 13.7+ on the THE READ tile (each version
// bump's re-seed added new hydration logs on top of stale ones).
//
// The fix has three pieces, all pinned by this file:
//
//   1. `clearSampleData` iterates LOGS_V2:* keys via the same
//      filterSampleFromArray pattern used for INSTANCES_V2:*. Defensive —
//      currently a no-op for un-tagged LogEntries (`LogEntry` has no
//      `origin` field; `LogSource` enum excludes 'sample'), but the
//      addition is architecturally symmetric and catches any future
//      origin-tagged sample LogEntries.
//
//   2. `migrateSampleSeedShape` calls `clearSampleData()` AND
//      unconditionally removes all LOGS_V2:* keys before clearing the
//      init flags. The unconditional wipe is the actually-effective
//      mechanism for clearing untagged accumulated logs — safe because
//      the migration only fires when the persisted version is behind
//      the code's `SAMPLE_SEED_SHAPE_VERSION`, i.e., the user's
//      LogEntries reflect a stale seed shape anyway.
//
//   3. `SAMPLE_SEED_SHAPE_VERSION` bumped 3 → 4 so existing v3 testers
//      get the clean re-seed on next launch (not just new installs).
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';
import { SAMPLE_SEED_SHAPE_VERSION } from '../../utils/sampleDataGenerator';

const ROOT = join(__dirname, '../..');
const generatorSrc = readFileSync(join(ROOT, 'utils/sampleDataGenerator.ts'), 'utf8');
const managerSrc = readFileSync(join(ROOT, 'utils/sampleDataManager.ts'), 'utf8');

describe('Phase 28 Batch B MEALS post-audit — seed-shape migration accumulation fix', () => {
  it('SAMPLE_SEED_SHAPE_VERSION is at version 4 (or beyond)', () => {
    expect(SAMPLE_SEED_SHAPE_VERSION).toBeGreaterThanOrEqual(4);
  });

  it('clearSampleData iterates the LOGS_V2 prefix (carePlanLogs) — defensive symmetry with INSTANCES_V2 handling', () => {
    // The function declares SAMPLE_DATA_KEYS.prefixes.carePlanLogs but
    // pre-fix never iterated it. This pin defends against a future
    // refactor accidentally dropping the iteration again.
    expect(managerSrc).toMatch(/SAMPLE_DATA_KEYS\.prefixes\.carePlanLogs/);
    // Pin the loop shape — filter allKeys by the prefix, iterate, call
    // filterSampleFromArray on each key (same pattern as instanceKeys).
    expect(managerSrc).toMatch(
      /allKeys\.filter\([^)]*SAMPLE_DATA_KEYS\.prefixes\.carePlanLogs[^)]*\)/,
    );
  });

  it('migrateSampleSeedShape calls clearSampleData() before clearing init flags', () => {
    // Pin: the call happens BEFORE the SAMPLE_DATA_INITIALIZED_KEY removal.
    // Pre-fix migration only cleared the init flag, leaving stale logs in place.
    const migrationFn = generatorSrc.slice(
      generatorSrc.indexOf('export async function migrateSampleSeedShape'),
      generatorSrc.indexOf('export async function migrateSampleSeedShape') + 2500,
    );
    expect(migrationFn).toMatch(/await\s+clearSampleData\s*\(\s*\)/);
    // Position check: clearSampleData call appears before the
    // SAMPLE_DATA_INITIALIZED_KEY removal.
    const clearIdx = migrationFn.indexOf('clearSampleData');
    const initFlagIdx = migrationFn.indexOf('SAMPLE_DATA_INITIALIZED_KEY');
    expect(clearIdx).toBeGreaterThan(0);
    expect(initFlagIdx).toBeGreaterThan(0);
    expect(clearIdx).toBeLessThan(initFlagIdx);
  });

  it('migrateSampleSeedShape also unconditionally wipes LOGS_V2:* keys (the effective accumulation-clearing pillar)', () => {
    // Pin the multiRemove of LOGS_V2 keys inside the migration. This is
    // what actually clears the accumulated hydration/meals/wellness logs
    // because LogEntries lack an origin field that filterSampleFromArray
    // can match against.
    const migrationFn = generatorSrc.slice(
      generatorSrc.indexOf('export async function migrateSampleSeedShape'),
      generatorSrc.indexOf('export async function migrateSampleSeedShape') + 2500,
    );
    expect(migrationFn).toMatch(/StorageKeyPrefixes\.LOGS_V2/);
    expect(migrationFn).toMatch(/AsyncStorage\.multiRemove\s*\(/);
  });
});
