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
    // Phase 4 of v6.7 visual-consistency replaced the legacy "Building
    // your picture" banner with the InsightsEmptyStatePreview consolidated
    // card. The under-14-days gate is the new equivalent of the prior
    // "< 7 days" branch (broader window, single card).
    expect(insightsContent).toMatch(
      /pageData\.daysOfData\s*<\s*14[\s\S]{0,200}<InsightsEmptyStatePreview/,
    );
  });

  it('disclaimer text is present', () => {
    expect(insightsContent).toContain('For informational purposes only');
    expect(insightsContent).toContain('Not a diagnosis');
  });
});
