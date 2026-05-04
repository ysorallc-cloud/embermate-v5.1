// ============================================================================
// Insights Tab — Care Score removal and AI Summary presence tests
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';

const insightsPath = path.resolve(__dirname, '../../app/(tabs)/understand.tsx');
const insightsContent = fs.readFileSync(insightsPath, 'utf-8');

describe('Insights tab', () => {
  it('Care Score ring does NOT render', () => {
    // The SECTION 1 comment should say AI SUMMARY, not CARE SCORE
    expect(insightsContent).not.toContain('SECTION 1: CARE SCORE');
    // CareScoreRing should not be called in the JSX
    expect(insightsContent).not.toMatch(/<CareScoreRing\s/);
  });

  it('AI summary renders when daysOfData >= 7', () => {
    expect(insightsContent).toContain("SECTION 1: THIS WEEK'S PULSE");
    expect(insightsContent).toContain('generatePlainLanguageSummary');
    expect(insightsContent).toContain('daysOfData >= 7');
    expect(insightsContent).toContain('aiSummarySection');
  });

  it('AI summary hidden when daysOfData < 7', () => {
    // The condition gates on >= 7, so < 7 won't render
    expect(insightsContent).toContain('pageData.daysOfData >= 7');
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

  it('disclaimer text is present', () => {
    expect(insightsContent).toContain('For informational purposes only');
    expect(insightsContent).toContain('Not a diagnosis');
  });
});
