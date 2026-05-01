import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

describe('Empty state copy warmth', () => {
  it('Journal timeline empty state uses warm copy', () => {
    // After Phase 10.2 decomposition, the timeline empty state lives in
    // JournalSummary.tsx, not journal.tsx.
    const src = read('components/journal/JournalSummary.tsx');
    expect(src).toContain("Today's a fresh start");
    expect(src).not.toContain('No activity logged yet today');
  });

  it('Insights empty state teases what\'s coming via the consolidated preview card', () => {
    // Phase 4 of the v6.7 visual-consistency pass collapsed the legacy
    // "Building your picture" + "No data yet" banners (which carried the
    // "At 7 days / At 14 days" teasers) into a single consolidated card.
    // The card now carries that teaser intent via the PATTERNS COMING
    // headline + the four pattern preview rows.
    const understandSrc = read('app/(tabs)/understand.tsx');
    const previewSrc = read('components/understand/InsightsEmptyStatePreview.tsx');
    expect(understandSrc).toMatch(/<InsightsEmptyStatePreview/);
    expect(previewSrc).toContain('PATTERNS COMING');
    // The "more day(s)" and "then trends appear" pieces sit in separate
    // template literals in the source. Assert each independently.
    expect(previewSrc).toMatch(/more day\$\{remaining === 1 \? '' : 's'\}/);
    expect(previewSrc).toContain('then trends appear');
  });
});
