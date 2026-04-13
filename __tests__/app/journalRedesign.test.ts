// ============================================================================
// Journal Redesign — Integration verification
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';

const journalPath = path.resolve(__dirname, '../../app/(tabs)/journal.tsx');
const src = fs.readFileSync(journalPath, 'utf-8');
const flaggedPath = path.resolve(__dirname, '../../components/journal/JournalFlagged.tsx');
const flaggedSrc = fs.readFileSync(flaggedPath, 'utf-8');
const patternsPath = path.resolve(__dirname, '../../components/journal/JournalPatterns.tsx');
const patternsSrc = fs.readFileSync(patternsPath, 'utf-8');

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

  it('Heads up section renders via JournalFlagged component', () => {
    // Phase 10.2 — extracted to JournalFlagged component
    expect(src).toContain('<JournalFlagged');
    expect(flaggedSrc).toContain('>Heads up<');
    expect(flaggedSrc).toContain('bar');
  });

  it('Patterns section renders via JournalPatterns component', () => {
    // Phase 10.2 — extracted to JournalPatterns component
    expect(src).toContain('<JournalPatterns');
    expect(patternsSrc).toContain('>Patterns<');
  });

  it('Reflection renders via ReflectionPrompt component without a section header', () => {
    // Phase 6 — the SectionLabel + context line were removed; the italic
    // prompt inside ReflectionPrompt now serves as the section anchor.
    expect(src).toContain('<ReflectionPrompt');
    expect(src).not.toContain('title="Your reflection"');
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

  it('headerPurpose style uses muted color', () => {
    // sectionContext was removed during decomposition; headerPurpose
    // serves the same purpose with the same color.
    expect(src).toContain('headerPurpose');
    expect(src).toContain("'#4a5a6a'");
  });

  it('section order: Status → Heads up → Patterns → Reflection', () => {
    // The flat redesign anchors on the day status block instead of an
    // "At a glance" SectionLabel. Subsequent sections still reference the
    // headers that remain in the render path.
    const statusIdx = src.indexOf('DAY STATUS');
    const headsUpIdx = src.indexOf('HEADS UP');
    const patternsIdx = src.indexOf('PATTERNS');
    const reflectionIdx = src.indexOf('REFLECTION');
    expect(statusIdx).toBeGreaterThan(-1);
    expect(statusIdx).toBeLessThan(headsUpIdx);
    expect(headsUpIdx).toBeLessThan(patternsIdx);
    expect(patternsIdx).toBeLessThan(reflectionIdx);
  });
});
