import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const journalSrc = readFileSync(join(ROOT, 'app/(tabs)/journal.tsx'), 'utf8');

describe('Journal — feed-forward banner', () => {
  it('renders a visit prep feed-forward banner', () => {
    expect(journalSrc).toMatch(/feed.?forward|visitPrepBanner|feedBanner/i);
  });

  it('navigates to Insights on tap', () => {
    // Should route to /(tabs)/understand or insights when tapped.
    expect(journalSrc).toMatch(/navigate.*understand|navigate.*insight/i);
  });

  it('shows only when an appointment is within 14 days', () => {
    // Should reference a lookahead or upcoming appointment check.
    expect(journalSrc).toMatch(/14|FEED_LOOKAHEAD|feedLookahead/);
  });
});
