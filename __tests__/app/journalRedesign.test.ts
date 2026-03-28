// ============================================================================
// Journal Redesign (7G) — Integration verification
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';

const journalPath = path.resolve(__dirname, '../../app/(tabs)/journal.tsx');
const src = fs.readFileSync(journalPath, 'utf-8');

describe('Journal redesign (Step 7G)', () => {
  it('DateTabStrip is imported and rendered', () => {
    expect(src).toContain("import { DateTabStrip }");
    expect(src).toContain('<DateTabStrip');
    expect(src).toContain('selectedDate');
    expect(src).toContain('onDateSelect');
    expect(src).toContain('onCalendarToggle');
  });

  it('MonthCalendar is imported and rendered', () => {
    expect(src).toContain("import { MonthCalendar }");
    expect(src).toContain('<MonthCalendar');
    expect(src).toContain('calendarOpen');
    expect(src).toContain('dayStatuses');
  });

  it('Summary section uses accent bar (teal) + light card', () => {
    expect(src).toContain("backgroundColor: '#5DCAA5'");
    expect(src).toContain('Summary');
    expect(src).toContain('lightCard');
    expect(src).toContain('paddingLeft: 22');
  });

  it('Flagged section merges handoff notes and patterns', () => {
    expect(src).toContain("backgroundColor: '#c8a44e'");
    expect(src).toContain('Flagged');
    // Both handoffNotes and insights render inside Flagged
    expect(src).toContain('handoffNotes.map');
    expect(src).toContain('insights.map');
  });

  it('Flagged section hidden when both empty', () => {
    expect(src).toContain('handoffNotes.length > 0 || insights.length > 0');
  });

  it('DetailedEventLog is rendered', () => {
    expect(src).toContain("import { DetailedEventLog }");
    expect(src).toContain('<DetailedEventLog');
    expect(src).toContain('journalEvents');
  });

  it('ReflectionPrompt is rendered with per-date data', () => {
    expect(src).toContain("import { ReflectionPrompt }");
    expect(src).toContain('<ReflectionPrompt');
    expect(src).toContain('getDailyPrompt(selectedDate)');
    expect(src).toContain('handleSaveReflection');
  });

  it('footer says "Not a medical record"', () => {
    expect(src).toContain('Not a medical record');
  });

  it('no ALL CAPS section headers remain', () => {
    // Old ALL CAPS headers should be gone
    expect(src).not.toContain("'KEEP AN EYE ON'");
    expect(src).not.toContain("'IF YOU'RE HANDING OFF'");
  });

  it('no "Updated X:XX PM" timestamp', () => {
    // Old "Updated" timestamp removed
    expect(src).not.toContain("'Updated '");
  });

  it('tab strip date selection closes calendar', () => {
    expect(src).toContain('setCalendarOpen(false)');
  });

  it('calendar date selection keeps calendar open', () => {
    expect(src).toContain('handleCalendarDateSelect');
    // handleCalendarDateSelect does NOT call setCalendarOpen(false)
    expect(src).toMatch(/handleCalendarDateSelect[\s\S]*?setSelectedDate\(date\)[\s\S]*?Calendar stays open/);
  });
});
