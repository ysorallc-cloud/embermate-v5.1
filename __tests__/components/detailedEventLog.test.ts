// ============================================================================
// DetailedEventLog — Structure and style tests
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';

const componentPath = path.resolve(__dirname, '../../components/journal/DetailedEventLog.tsx');
const src = fs.readFileSync(componentPath, 'utf-8');

describe('DetailedEventLog', () => {
  it('exports DetailedEventLog and EventLogEntry', () => {
    expect(src).toContain('export function DetailedEventLog');
    expect(src).toContain('export interface EventLogEntry');
  });

  it('collapsed state shows accent bar + label + count + chevron', () => {
    expect(src).toContain('accentBar');
    expect(src).toContain('Events logged');
    expect(src).toContain('headerCount');
    expect(src).toContain('chevron');
  });

  it('expanded state renders light card with event rows', () => {
    expect(src).toContain('expanded');
    expect(src).toContain("rgba(74,107,93,0.06)");  // light card bg
    expect(src).toContain("rgba(74,107,93,0.1)");   // light card border
    expect(src).toContain('borderRadius: 14');
  });

  it('event rows show time (11px, 50px wide) + title (13px weight 500)', () => {
    expect(src).toContain('eventTime');
    expect(src).toContain('fontSize: 11');
    expect(src).toContain('width: 50');
    expect(src).toContain('eventTitle');
    // title font
    expect(src).toMatch(/eventTitle[\s\S]*?fontSize: 13[\s\S]*?fontWeight: '500'/);
  });

  it('completed events show green checkmark', () => {
    expect(src).toContain('checkmark');
    expect(src).toContain('#5DCAA5');
  });

  it('skipped events show amber badge', () => {
    expect(src).toContain('skippedBadge');
    expect(src).toContain('Skipped');
    expect(src).toContain('#c8a44e');
  });

  it('detail line renders below title', () => {
    expect(src).toContain('eventDetail');
    expect(src).toContain('numberOfLines={3}');
  });

  it('returns null when events array is empty', () => {
    expect(src).toContain('if (events.length === 0) return null');
  });

  it('defaultExpanded defaults to false', () => {
    expect(src).toContain('defaultExpanded = false');
  });

  it('accent bar uses gray color for events section', () => {
    expect(src).toContain("backgroundColor: 'rgba(200,195,180,0.15)'");
  });

  it('EventLogEntry has required fields: id, time, title, detail, status', () => {
    expect(src).toContain('id: string');
    expect(src).toContain('time: string');
    expect(src).toContain('title: string');
    expect(src).toContain('detail: string');
    expect(src).toContain("status: 'completed' | 'skipped'");
  });
});
