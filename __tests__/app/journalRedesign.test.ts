// ============================================================================
// Journal Redesign — Integration verification
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';

const journalPath = path.resolve(__dirname, '../../app/(tabs)/journal.tsx');
const src = fs.readFileSync(journalPath, 'utf-8');

describe('Journal redesign', () => {
  it('DateTabStrip is imported and rendered', () => {
    expect(src).toContain("import { DateTabStrip }");
    expect(src).toContain('<DateTabStrip');
    expect(src).toContain('selectedDate');
    expect(src).toContain('onDateSelect');
  });

  it('MonthCalendar is imported and rendered', () => {
    expect(src).toContain("import { MonthCalendar }");
    expect(src).toContain('<MonthCalendar');
    expect(src).toContain('calendarOpen');
  });

  it('Shift Summary section uses SectionLabel + summaryCard', () => {
    expect(src).toContain('title="Shift Summary"');
    expect(src).toContain('summaryCard');
    expect(src).toContain('summaryText');
  });

  it('Watch For section is separate from Patterns', () => {
    expect(src).toContain('title="Watch For"');
    expect(src).toContain('watchCard');
    expect(src).toContain('watchItem');
    expect(src).toContain('watchTitle');
  });

  it('Patterns section uses SectionLabel', () => {
    expect(src).toContain('title="Patterns"');
  });

  it('Day at a Glance tiles do NOT render', () => {
    expect(src).not.toContain("'Day at a Glance'");
    expect(src).not.toContain('<View style={s.glanceGrid}');
  });

  it('DetailedEventLog does NOT render', () => {
    expect(src).not.toContain('<DetailedEventLog');
  });

  it('ReflectionPrompt rendered with SectionLabel', () => {
    expect(src).toContain('title="Reflection"');
    expect(src).toContain('<ReflectionPrompt');
    expect(src).toContain('getDailyPrompt(selectedDate)');
  });

  it('footer says "Not a medical record"', () => {
    expect(src).toContain('Not a medical record');
  });

  it('header uses inline header with Share/Report pills', () => {
    expect(src).toContain('headerRow');
    expect(src).toContain('headerTitle');
    expect(src).toContain('headerPill');
    expect(src).toContain('headerPillReport');
  });

  it('SectionLabel component exists', () => {
    expect(src).toContain('function SectionLabel');
    expect(src).toContain('sectionLabelRow');
    expect(src).toContain('sectionLabelText');
  });

  it('all section headers use SectionLabel', () => {
    expect(src).toContain('<SectionLabel title="Shift Summary"');
    expect(src).toContain('<SectionLabel title="Watch For"');
    expect(src).toContain('<SectionLabel title="Patterns"');
    expect(src).toContain('<SectionLabel title="Reflection"');
  });

  it('old accent bar and glance styles are removed', () => {
    expect(src).not.toMatch(/accentBarRow:\s*\{/);
    expect(src).not.toMatch(/accentBarLabel:\s*\{/);
    expect(src).not.toMatch(/lightCard:\s*\{/);
    expect(src).not.toMatch(/glanceGrid:\s*\{/);
    expect(src).not.toMatch(/glanceTile:\s*\{/);
  });

  it('Watch For uses amber color', () => {
    expect(src).toContain('colors.amberBright');
  });

  it('section order: Summary → Watch For → Patterns → Reflection', () => {
    const summaryIdx = src.indexOf('title="Shift Summary"');
    const watchIdx = src.indexOf('title="Watch For"');
    const patternsIdx = src.indexOf('title="Patterns"');
    const reflectionIdx = src.indexOf('title="Reflection"');
    expect(summaryIdx).toBeLessThan(watchIdx);
    expect(watchIdx).toBeLessThan(patternsIdx);
    expect(patternsIdx).toBeLessThan(reflectionIdx);
  });
});
