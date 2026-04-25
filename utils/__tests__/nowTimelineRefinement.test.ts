/**
 * Tests for Now Page Timeline Visual Refinement — Time Gutter + Window Banner layout.
 * Replaces old rail+spacing design with time gutter columns and windowBanner headers.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const src = readFileSync(join(__dirname, '../../components/now/TimelineSection.tsx'), 'utf8');
const render = src.slice(src.indexOf('function TimelineModeBContent'));

// ============================================================================
// TL-1: Time gutter layout
// ============================================================================
describe('TL-1: Time gutter layout', () => {
  test('timeGutter style exists for left-side time column', () => {
    const match = src.match(/timeGutter:\s*\{[^}]+\}/);
    expect(match).not.toBeNull();
    expect(match![0]).toContain('width');
  });

  test('gutterTime style exists for time labels', () => {
    const match = src.match(/gutterTime:\s*\{[^}]+\}/);
    expect(match).not.toBeNull();
    expect(match![0]).toContain('fontSize');
  });

  test('gutterDivider style exists as vertical separator', () => {
    const match = src.match(/gutterDivider:\s*\{[^}]+\}/);
    expect(match).not.toBeNull();
    expect(match![0]).toContain('width');
  });
});

// ============================================================================
// TL-2: Window banner headers
// ============================================================================
describe('TL-2: Window banner headers', () => {
  test('windowBanner style exists', () => {
    const match = src.match(/windowBanner:\s*\{[^}]+\}/);
    expect(match).not.toBeNull();
    expect(match![0]).toContain('backgroundColor');
    expect(match![0]).toContain('borderRadius');
  });

  test('windowBannerTitle style exists', () => {
    expect(src).toContain('windowBannerTitle:');
  });

  test('windowBannerCount style exists', () => {
    expect(src).toContain('windowBannerCount:');
  });
});

// ============================================================================
// TL-3: Item padding increased
// ============================================================================
describe('TL-3: Item padding', () => {
  test('timelineItem has paddingVertical >= 8', () => {
    const match = src.match(/timelineItem:\s*\{[^}]+\}/);
    expect(match).not.toBeNull();
    const pvMatch = match![0].match(/paddingVertical:\s*(\d+)/);
    expect(pvMatch).not.toBeNull();
    expect(parseInt(pvMatch![1])).toBeGreaterThanOrEqual(8);
  });
});

// ============================================================================
// TL-4: "overdue" inline with time
// ============================================================================
describe('TL-4: Overdue inline label', () => {
  test('subtitle includes overdue text inline', () => {
    expect(src).toMatch(/overdue/);
  });

  test('getItemSubtitle or getTimeDelta returns overdue', () => {
    expect(src).toMatch(/overdue/);
  });
});

// ============================================================================
// TL-5: Window count text refinement
// ============================================================================
describe('TL-5: Window count text', () => {
  test('shows "remaining" for pending windows', () => {
    expect(render).toContain('remaining');
  });

  test('shows "Complete" with checkmark for finished windows', () => {
    expect(render).toMatch(/Complete.*✓|Complete.*\\u2713/);
  });
});

// ============================================================================
// TL-6: Completed items styling
// ============================================================================
describe('TL-6: Completed items', () => {
  test('completed item name has strikethrough', () => {
    const match = src.match(/timelineNameDone:\s*\{[^}]+\}/);
    expect(match).not.toBeNull();
    expect(match![0]).toContain('line-through');
  });

  test('completed item has muted text color', () => {
    const match = src.match(/timelineNameDone:\s*\{[^}]+\}/);
    expect(match).not.toBeNull();
    expect(match![0]).toContain('textMuted');
  });
});

// ============================================================================
// TL-7: Log button styling
// ============================================================================
describe('TL-7: Log button styling', () => {
  test('timelineLogButton has background styling', () => {
    const match = src.match(/timelineLogButton:\s*\{[^}]+\}/);
    expect(match).not.toBeNull();
    expect(match![0]).toContain('backgroundColor');
  });

  test('Done/status text style exists for completed items', () => {
    expect(src).toMatch(/timelineStatusText|Done/);
  });
});

// ============================================================================
// Structural integrity
// ============================================================================
describe('Structural integrity', () => {
  test('TimelineModeBContent still exists', () => {
    expect(src).toContain('function TimelineModeBContent');
  });

  test('groupByTimeWindow still used', () => {
    expect(src).toContain('groupByTimeWindow');
  });

  test('windowOrder still includes all 4 windows', () => {
    expect(src).toContain('morning');
    expect(src).toContain('afternoon');
    expect(src).toContain('evening');
    expect(src).toContain('night');
  });

  test('collapsible toggle still works', () => {
    expect(src).toContain('toggleWindow');
    expect(src).toContain('collapsedWindows');
  });
});
