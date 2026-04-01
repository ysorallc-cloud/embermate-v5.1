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
  });

  it('MonthCalendar is imported and rendered', () => {
    expect(src).toContain("import { MonthCalendar }");
    expect(src).toContain('<MonthCalendar');
  });

  it('header has purpose line referencing patient or care story', () => {
    expect(src).toContain('headerPurpose');
    expect(src).toContain('care story');
  });

  it('Shift Summary has context line', () => {
    expect(src).toContain('title="Shift Summary"');
    expect(src).toContain('A snapshot of today');
  });

  it('Heads up section (renamed from Watch For) with context', () => {
    expect(src).toContain('title="Heads up"');
    expect(src).toContain('What the next caregiver');
  });

  it('Patterns section with context', () => {
    expect(src).toContain('title="Patterns"');
    expect(src).toContain('Trends EmberMate noticed');
  });

  it('Your reflection section with context', () => {
    expect(src).toContain('title="Your reflection"');
    expect(src).toContain('For you, not the chart');
  });

  it('Before Bed section removed', () => {
    expect(src).not.toContain('title="Before Bed"');
    expect(src).not.toContain('<SectionLabel title="Before Bed"');
  });

  it('Day at a Glance tiles do NOT render', () => {
    expect(src).not.toContain("'Day at a Glance'");
  });

  it('DetailedEventLog does NOT render', () => {
    expect(src).not.toContain('<DetailedEventLog');
  });

  it('footer says "Not a medical record"', () => {
    expect(src).toContain('Not a medical record');
  });

  it('sectionContext style exists', () => {
    expect(src).toContain('sectionContext');
    expect(src).toContain("'#4a5a6a'");
  });

  it('section order: Summary → Heads up → Patterns → Reflection', () => {
    const summaryIdx = src.indexOf('title="Shift Summary"');
    const headsUpIdx = src.indexOf('title="Heads up"');
    const patternsIdx = src.indexOf('title="Patterns"');
    const reflectionIdx = src.indexOf('title="Your reflection"');
    expect(summaryIdx).toBeLessThan(headsUpIdx);
    expect(headsUpIdx).toBeLessThan(patternsIdx);
    expect(patternsIdx).toBeLessThan(reflectionIdx);
  });
});
