// ============================================================================
// Journal redesign — surviving structural assertions after the v6.7 handoff
// recompose. The old "Heads up / Patterns" layout assertions moved to
// __tests__/screens/journalHandoffOrder.test.tsx; the assertions below
// guard the parts of the layout that did NOT change.
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';

const journalPath = path.resolve(__dirname, '../../app/(tabs)/journal.tsx');
const src = fs.readFileSync(journalPath, 'utf-8');

describe('Journal — preserved structural pieces', () => {
  it('DateTabStrip is imported and rendered', () => {
    expect(src).toContain('import { DateTabStrip }');
    expect(src).toContain('<DateTabStrip');
  });

  it('MonthCalendar import is gone (v6.7 retired the in-Journal calendar mode)', () => {
    expect(src).not.toContain('import { MonthCalendar }');
    expect(src).not.toContain('<MonthCalendar');
  });

  it('header has a purpose line (now driven by journalSubtitle)', () => {
    expect(src).toContain('headerPurpose');
    expect(src).toContain('headerSubtitle');
  });

  it('JournalNotesCard component is now the journal text input surface', () => {
    expect(src).toContain('<JournalNotesCard');
    expect(src).not.toContain('<ReflectionPrompt');
  });

  it('DetailedEventLog still does NOT render', () => {
    expect(src).not.toContain('<DetailedEventLog');
  });

  it('footer says "Not a medical record"', () => {
    expect(src).toContain('Not a medical record');
  });

  it('headerPurpose style uses the textSecondary token (unified in v6.7)', () => {
    expect(src).toMatch(/headerPurpose:\s*\{[^}]*color:\s*c\.textSecondary/s);
  });
});
