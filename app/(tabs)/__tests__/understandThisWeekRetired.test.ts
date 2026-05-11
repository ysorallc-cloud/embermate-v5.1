// ============================================================================
// Phase 15.10 — "This Week" callout retired from Insights.
//
// Pre-15.10 understand.tsx rendered a RecentWindowCard tied to
// topPattern just above the Upcoming Visit / Visit Prep block.
// The card was not BP-specific in code, but with current data it
// resolved to a BP headline (e.g. "Blood pressure — 145/88 avg")
// that duplicated the Vitals 4-tile grid below it, where BP is
// already the first tile (e.g. "BP 132/82"). Two surfaces, one
// metric — visual noise without informational gain.
//
// 15.10 removes the duplicate surface. The Vitals 4-tile grid is
// the canonical BP surface on Insights. RecentWindowCard.tsx is
// left in place as orphan source for a separate cleanup scope,
// per the 15.6 buildJournalPreview pattern.
//
// BP averaging discrepancy (132/82 vs 145/88) is Phase 17 scope,
// NOT 15.10. The Vitals tile keeps computing BP via the existing
// computeVitalTiles aggregator; removing the duplicate display
// does not reconcile the underlying logic. Pinned in the test
// for clarity below.
//
// Pinned contracts:
//   1. The standalone "THIS WEEK" callout block is gone from
//      understand.tsx.
//   2. The orphan topPattern state + setTopPattern + load try
//      block are gone.
//   3. RecentWindowCard + PatternHeadline imports are gone.
//   4. The orphan thisWeekSection / thisWeekEyebrow styles are
//      gone.
//   5. The canonical BP path (computeVitalTiles + Vitals render)
//      stays — pinned by presence checks.
//   6. classifyInsightsState + gatingForState stay (other sections
//      still consume them).
//
// Source-level audit; codeOnly() strips comments so retirement
// prose mentioning the removed symbols by name does not false-
// positive.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

function codeOnly(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('Phase 15.10 — "This Week" RecentWindowCard retired from Insights', () => {
  const source = readFileSync(
    join(__dirname, '../understand.tsx'), 'utf8',
  );
  const code = codeOnly(source);

  it('contract 1: the standalone "THIS WEEK" callout block is gone', () => {
    expect(code).not.toMatch(/<RecentWindowCard\b/);
    expect(code).not.toMatch(/'THIS WEEK'/);
    expect(code).not.toMatch(/\bthisWeekSection\b/);
    expect(code).not.toMatch(/\bthisWeekEyebrow\b/);
  });

  it('contract 2: orphan topPattern state + load are gone', () => {
    expect(code).not.toMatch(/\btopPattern\b/);
    expect(code).not.toMatch(/\bsetTopPattern\b/);
  });

  it('contract 3: RecentWindowCard + PatternHeadline imports are gone', () => {
    expect(code).not.toMatch(/\bRecentWindowCard\b/);
    expect(code).not.toMatch(/\bPatternHeadline\b/);
  });

  it('contract 4: orphan getAllInsights / InsightData imports are gone', () => {
    // After dropping the topPattern derivation these become unused.
    // (classifyInsightsState + gatingForState stay — other sections
    // still consume them.)
    expect(code).not.toMatch(/\bgetAllInsights\b/);
    expect(code).not.toMatch(/\bInsightData\b/);
  });

  it('contract 5: BP / Vitals canonical surface preserved', () => {
    // computeVitalTiles + the Vitals render block + the systolic
    // averaging arithmetic must all still be present. The
    // duplicate surface is gone; the canonical one is not.
    expect(code).toMatch(/function computeVitalTiles\b/);
    expect(code).toMatch(/setVitalTiles\b/);
    expect(code).toMatch(/Vitals this week/);
    // Pin the systolic-by-type slice — this is the BP aggregator
    // entry point. Phase 17 will revisit its math; 15.10 must not.
    expect(code).toMatch(/byType\[['"]systolic['"]\]/);
  });

  it('contract 6: classifyInsightsState + gatingForState still present (used by other sections)', () => {
    expect(code).toMatch(/\bclassifyInsightsState\b/);
    expect(code).toMatch(/\bgatingForState\b/);
  });

  it('contract 7: RecentWindowCard.tsx file is left in place as orphan source (separate cleanup scope)', () => {
    // Per the 15.6 buildJournalPreview pattern — the duplicate
    // surface is what 15.10 retires; the dead component file is
    // filed for a later sweep. Pinned so a future "tidy up" pass
    // that deletes the file gets routed through that scope.
    const componentPath = join(__dirname, '../../../components/understand/RecentWindowCard.tsx');
    const exists = (() => {
      try { readFileSync(componentPath, 'utf8'); return true; } catch { return false; }
    })();
    expect(exists).toBe(true);
  });
});
