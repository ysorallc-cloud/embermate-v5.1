// ============================================================================
// Phase 11.7.3b — aggregator counts itemType === 'wellness' as wellness.
//
// Bug repro: Insights "Missing Data" claimed "Evening wellness 14
// days missing" while wellness completions existed across 14
// historical days. Root cause: getCarePlanStatsForRange's switch at
// understandInsights.ts:602-605 increments wellnessPerDay only when
// `itemType === 'mood'`. Sample-data wellness instances have
// itemType === 'wellness', so the wellness counter never fired,
// avgWellnessPerDay stayed 0, and computeDataGaps surfaced the
// "14 days missing" gap.
//
// Fix: extend the switch with a `case 'wellness':` branch that
// increments wellnessPerDay the same way 'mood' does. Both itemTypes
// feed the same per-day counter — wellness instances and mood
// instances are conceptually overlapping check-ins.
//
// Independent commit from 11.7.3a so a bug in one doesn't block the
// other (per user spec). 11.7.3a fixes the data payload so future
// data-aware aggregations see the right shape; 11.7.3b fixes the
// itemType-key mismatch so today's count-based aggregator sees
// wellness completions at all.
//
// Pinned via source-level audit because getCarePlanStatsForRange is
// not exported and loadUnderstandPageData has too heavy a dependency
// graph for end-to-end mounting in tests.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(
  join(__dirname, '../..', 'utils/understandInsights.ts'),
  'utf8',
);

describe('Phase 11.7.3b — aggregator counts wellness itemType', () => {
  it('contract 1: switch includes a "wellness" case', () => {
    // Pin the new branch. The original 'mood' case already populates
    // wellnessPerDay; the fix adds 'wellness' to the same branch
    // (either as a fall-through or a separate case with the same body).
    expect(SRC).toMatch(/case\s+['"]wellness['"]\s*:/);
  });

  it('contract 2: the wellness branch increments wellnessPerDay', () => {
    // Pin the body shape. The branch must populate wellnessPerDay
    // (the same per-day counter the 'mood' case populates) so
    // computeDataGaps no longer flags wellness as missing.
    const fnStart = SRC.indexOf('async function getCarePlanStatsForRange');
    expect(fnStart).toBeGreaterThan(-1);
    const fnBody = SRC.slice(fnStart, fnStart + 5000);
    // Find the wellness case. Either:
    //   case 'wellness':
    //   case 'mood':       (fall-through to mood)
    //     ...wellnessPerDay...
    // OR
    //   case 'wellness': { wellnessPerDay[log.date] = ... ; break; }
    //   case 'mood':     { wellnessPerDay[log.date] = ... ; break; }
    const wellnessCaseIdx = fnBody.indexOf("case 'wellness'");
    expect(wellnessCaseIdx).toBeGreaterThan(-1);
    // Within ~250 chars after the wellness case, wellnessPerDay
    // must be incremented. Generous window covers either fall-
    // through or separate-body shapes.
    const window = fnBody.slice(wellnessCaseIdx, wellnessCaseIdx + 250);
    expect(window).toMatch(/wellnessPerDay\s*\[/);
  });

  it('contract 3: the existing "mood" case still populates wellnessPerDay (regression-pin)', () => {
    // The fix must not silently move wellness counting away from the
    // mood case — both itemTypes feed the same counter so existing
    // mood-tagged logs continue to count.
    const fnStart = SRC.indexOf('async function getCarePlanStatsForRange');
    const fnBody = SRC.slice(fnStart, fnStart + 5000);
    const moodCaseIdx = fnBody.indexOf("case 'mood'");
    expect(moodCaseIdx).toBeGreaterThan(-1);
    const window = fnBody.slice(moodCaseIdx, moodCaseIdx + 250);
    expect(window).toMatch(/wellnessPerDay\s*\[/);
  });
});
