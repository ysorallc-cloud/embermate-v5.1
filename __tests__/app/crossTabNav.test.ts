// ============================================================================
// Cross-Tab Navigation — Journal → Insights
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';

const journalPath = path.resolve(__dirname, '../../app/(tabs)/journal.tsx');
const journalContent = fs.readFileSync(journalPath, 'utf-8');

const insightsPath = path.resolve(__dirname, '../../app/(tabs)/understand.tsx');
const insightsContent = fs.readFileSync(insightsPath, 'utf-8');

describe('Cross-tab navigation (Journal → Insights)', () => {
  it('pattern card on Journal shows "View trend on Insights" link', () => {
    expect(journalContent).toContain('View trend on Insights');
    expect(journalContent).toContain('patternTrendLink');
    expect(journalContent).toContain('patternTrendLinkText');
  });

  it('tapping pattern navigates to Insights with focusTrend param', () => {
    expect(journalContent).toContain('focusTrend=');
    expect(journalContent).toContain('/(tabs)/understand?focusTrend=');
  });

  it('Insights tab reads focusTrend param', () => {
    expect(insightsContent).toContain('useLocalSearchParams');
    expect(insightsContent).toContain('focusTrend');
  });
});
