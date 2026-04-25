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
  // The Journal pattern card's "View trend on Insights" link was removed in
  // the flat redesign (JOURNAL_FLAT_REDESIGN.md Phase 5). Pattern rows are
  // now plain "title: context" lines that expand to a single action label.
  // Insights still reads `focusTrend` for navigation from elsewhere.
  it('Insights tab reads focusTrend param', () => {
    expect(insightsContent).toContain('useLocalSearchParams');
    expect(insightsContent).toContain('focusTrend');
  });
});
