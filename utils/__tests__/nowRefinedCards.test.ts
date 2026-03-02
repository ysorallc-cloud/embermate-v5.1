/**
 * Tests for the Now page refined card layout redesign.
 * Verifies the 4 card zones, SectionHeaderRow, GlanceSummary, and style structure.
 */
import * as fs from 'fs';
import * as path from 'path';

const nowTsxPath = path.resolve(__dirname, '../../app/(tabs)/now.tsx');
const nowSource = fs.readFileSync(nowTsxPath, 'utf-8');

describe('Now page refined card layout', () => {
  test('four card styles exist (cardGlance, cardSchedule, cardUpcoming, cardEncouragement)', () => {
    expect(nowSource).toContain('cardGlance:');
    expect(nowSource).toContain('cardSchedule:');
    expect(nowSource).toContain('cardUpcoming:');
    expect(nowSource).toContain('cardEncouragement:');
  });

  test('SectionHeaderRow renders with icons in correct order', () => {
    // At a Glance should appear before Today's Schedule in the render
    const glanceHeaderIdx = nowSource.indexOf('icon="📊"');
    const scheduleHeaderIdx = nowSource.indexOf('icon="🗓️"');
    const upcomingHeaderIdx = nowSource.indexOf('icon="📋"');

    expect(glanceHeaderIdx).toBeGreaterThan(-1);
    expect(scheduleHeaderIdx).toBeGreaterThan(-1);
    expect(upcomingHeaderIdx).toBeGreaterThan(-1);
    expect(glanceHeaderIdx).toBeLessThan(scheduleHeaderIdx);
    expect(scheduleHeaderIdx).toBeLessThan(upcomingHeaderIdx);
  });

  test('Glance summary exists in render before ProgressRings', () => {
    const glanceSummaryIdx = nowSource.indexOf('<GlanceSummary');
    const progressRingsIdx = nowSource.indexOf('<ProgressRings');

    expect(glanceSummaryIdx).toBeGreaterThan(-1);
    expect(progressRingsIdx).toBeGreaterThan(-1);
    expect(glanceSummaryIdx).toBeLessThan(progressRingsIdx);
  });

  test('cardGlance has teal top border', () => {
    // Extract the cardGlance style block
    const cardGlanceMatch = nowSource.match(/cardGlance:\s*\{[^}]+\}/);
    expect(cardGlanceMatch).not.toBeNull();
    const block = cardGlanceMatch![0];
    expect(block).toContain('borderTopWidth: 2');
    expect(block).toContain('borderTopColor: c.accent');
  });

  test('cardSchedule has no accent border color', () => {
    const cardScheduleMatch = nowSource.match(/cardSchedule:\s*\{[^}]+\}/);
    expect(cardScheduleMatch).not.toBeNull();
    const block = cardScheduleMatch![0];
    // Should have glassBorder only, no accent or green border color
    expect(block).not.toContain('c.accent');
    expect(block).not.toContain('c.green');
    expect(block).not.toContain('borderTopColor');
    expect(block).not.toContain('borderLeftColor');
  });

  test('cardUpcoming has green left border', () => {
    const cardUpcomingMatch = nowSource.match(/cardUpcoming:\s*\{[^}]+\}/);
    expect(cardUpcomingMatch).not.toBeNull();
    const block = cardUpcomingMatch![0];
    expect(block).toContain('borderLeftWidth: 3');
    expect(block).toContain('borderLeftColor: c.greenBright');
  });

  test('old standalone SectionHeader "Today\'s Progress" is removed from render', () => {
    // Should NOT contain <SectionHeader as a JSX element (import is also removed)
    expect(nowSource).not.toMatch(/<SectionHeader\s/);
    // Should not import SectionHeader
    expect(nowSource).not.toMatch(/import\s+\{[^}]*SectionHeader[^}]*\}\s+from\s+['"].*SectionHeader/);
  });
});
