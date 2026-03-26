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
    expect(insightsContent).toContain('SECTION 1: AI SUMMARY');
    expect(insightsContent).toContain('generatePlainLanguageSummary');
    expect(insightsContent).toContain('daysOfData >= 7');
    expect(insightsContent).toContain('aiSummarySection');
  });

  it('AI summary hidden when daysOfData < 7', () => {
    // The condition gates on >= 7, so < 7 won't render
    expect(insightsContent).toContain('pageData.daysOfData >= 7');
  });

  it('"Building your picture" card still renders when < 7 days', () => {
    // The onboarding/building card should still exist
    expect(insightsContent).toContain('Building your picture');
  });

  it('disclaimer text is present', () => {
    expect(insightsContent).toContain('For informational purposes only');
    expect(insightsContent).toContain('Not a diagnosis');
  });
});
