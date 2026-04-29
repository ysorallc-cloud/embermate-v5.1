// ============================================================================
// Phase 6 — Calendar icon removed from the Journal date strip.
// The legacy calendar-mode toggle is retired; v7 will reintroduce a full
// calendar surface separately.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const journalSrc = readFileSync(join(ROOT, 'app/(tabs)/journal.tsx'), 'utf8');
const stripSrc = readFileSync(join(ROOT, 'components/journal/DateTabStrip.tsx'), 'utf8');

describe('Journal — calendar icon and route handler removed', () => {
  it('Journal does not render <MonthCalendar', () => {
    expect(journalSrc).not.toMatch(/<MonthCalendar\b/);
  });

  it('Journal does not import MonthCalendar', () => {
    expect(journalSrc).not.toMatch(/from\s+['"][^'"]*MonthCalendar['"]/);
  });

  it('Journal does not maintain calendarOpen / setCalendarOpen state', () => {
    expect(journalSrc).not.toMatch(/calendarOpen,\s*setCalendarOpen/);
    expect(journalSrc).not.toMatch(/setCalendarOpen\(/);
  });

  it('DateTabStrip\'s only 📅 usage is the new Jump button label', () => {
    const matches = stripSrc.match(/📅/g) ?? [];
    expect(matches.length).toBeLessThanOrEqual(1);
    if (matches.length === 1) {
      expect(stripSrc).toMatch(/📅 Jump|jumpText[\s\S]{0,200}?📅/);
    }
  });
});
