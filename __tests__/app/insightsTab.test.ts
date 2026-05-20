// ============================================================================
// Insights tab — page-level structural contracts.
//
// Phase 28 Batch B F6 (audit-revised cadence) reframed this file:
//   • The old "AI summary renders when daysOfData >= 7" tests pinned the
//     inline `SECTION 1: THIS WEEK'S PULSE` block + `aiSummarySection`
//     style + `generatePlainLanguageSummary` import. F6 swapped that
//     surface for `<InsightsReadCard>`. The new contract asserts the
//     three-card structure is mounted; per-card behavior is contracted
//     in insightsReadCard28 / insightsDataCard28 / insightsThreeCard
//     Structure28 / insightsMissingDataDemotion28.
//   • The disclaimer text "For informational purposes only · Not a
//     diagnosis" relocated from inline understand.tsx to inside
//     InsightsReadCard (per its docstring). The remaining page-level
//     disclaimer is the footer "Analysis based on N days of data · Not
//     a medical diagnosis", which stays in understand.tsx for the
//     populated-state path.
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';

const insightsPath = path.resolve(__dirname, '../../app/(tabs)/understand.tsx');
const insightsContent = fs.readFileSync(insightsPath, 'utf-8');

describe('Insights tab', () => {
  it('Care Score ring does NOT render', () => {
    // Pre-Phase-28 the SECTION 1 marker said CARE SCORE, then AI SUMMARY,
    // then was retired in F6 entirely. Either way, no Care Score render.
    expect(insightsContent).not.toContain('SECTION 1: CARE SCORE');
    expect(insightsContent).not.toMatch(/<CareScoreRing\s/);
  });

  it('three-card structure is mounted (InsightsReadCard + InsightsDataCard + UpcomingVisitInsightsCard)', () => {
    expect(insightsContent).toMatch(/<InsightsReadCard\b/);
    expect(insightsContent).toMatch(/<InsightsDataCard\b/);
    expect(insightsContent).toMatch(/<UpcomingVisitInsightsCard\b/);
  });

  it('the consolidated empty-state preview renders for under-14-day windows', () => {
    // Phase 4 of v6.7 visual-consistency introduced the InsightsEmptyStatePreview.
    // Phase 3.7.3 replaced the literal `< 14` gate with the
    // classifyInsightsState helper (which encodes the same threshold via
    // POPULATED_DAYS_THRESHOLD = 14). Two acceptable wirings:
    //   1. `gating.showPatternsComing` — the canonical Phase 3.7.3 gate
    //   2. legacy `pageData.daysOfData < 14` literal (pre-3.7.3 fallback)
    const usesGating =
      /gating\.showPatternsComing[\s\S]{0,300}<InsightsEmptyStatePreview/.test(
        insightsContent,
      );
    const usesLiteral = /pageData\.daysOfData\s*<\s*14[\s\S]{0,200}<InsightsEmptyStatePreview/.test(
      insightsContent,
    );
    expect(usesGating || usesLiteral).toBe(true);
  });

  it('page-level disclaimer footer is present for populated state', () => {
    // The "For informational purposes only · Not a diagnosis" footnote
    // moved INTO InsightsReadCard with F6. The page-level footer
    // ("Analysis based on N days of data · Not a medical diagnosis") is
    // what remains in understand.tsx, gated to the populated state.
    expect(insightsContent).toContain('Not a medical diagnosis');
  });
});
