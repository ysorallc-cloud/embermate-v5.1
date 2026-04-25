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

  it('Insights "Building your picture" teases 7-day and 14-day unlocks', () => {
    const src = read('app/(tabs)/understand.tsx');
    expect(src).toContain('At 7 days: weekly mood and sleep trends');
    expect(src).toContain('At 14 days: medication adherence patterns and visit prep');
  });
});
