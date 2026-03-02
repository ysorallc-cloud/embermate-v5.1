/**
 * Tests for Now Page Timeline Visual Refinement (Option B — Rail + Spacing).
 * Vertical rail, spacing between windows, overdue inline labels,
 * completed item styling, and button refinements.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const src = readFileSync(join(__dirname, '../../components/now/TimelineSection.tsx'), 'utf8');
const render = src.slice(src.indexOf('function TimelineModeBContent'));

// ============================================================================
// TL-1: Vertical rail on items container
// ============================================================================
describe('TL-1: Vertical rail', () => {
  test('timeGroupItems has borderLeft style', () => {
    const match = src.match(/timeGroupItems:\s*\{[^}]+\}/);
    expect(match).not.toBeNull();
    expect(match![0]).toContain('borderLeftWidth');
  });

  test('timeGroupItems has paddingLeft for indentation', () => {
    const match = src.match(/timeGroupItems:\s*\{[^}]+\}/);
    expect(match).not.toBeNull();
    expect(match![0]).toMatch(/paddingLeft:\s*(?!0\b)/);
  });

  test('timeGroupItems has marginLeft for rail offset', () => {
    const match = src.match(/timeGroupItems:\s*\{[^}]+\}/);
    expect(match).not.toBeNull();
    expect(match![0]).toContain('marginLeft');
  });
});

// ============================================================================
// TL-2: Window spacing
// ============================================================================
describe('TL-2: Window spacing', () => {
  test('timeGroup has marginBottom >= 10', () => {
    const match = src.match(/timeGroup:\s*\{[^}]+\}/);
    expect(match).not.toBeNull();
    const mbMatch = match![0].match(/marginBottom:\s*(\d+)/);
    expect(mbMatch).not.toBeNull();
    expect(parseInt(mbMatch![1])).toBeGreaterThanOrEqual(10);
  });
});

// ============================================================================
// TL-3: Item padding increased
// ============================================================================
describe('TL-3: Item padding', () => {
  test('timelineItem has paddingVertical >= 10', () => {
    const match = src.match(/timelineItem:\s*\{[^}]+\}/);
    expect(match).not.toBeNull();
    const pvMatch = match![0].match(/paddingVertical:\s*(\d+)/);
    expect(pvMatch).not.toBeNull();
    expect(parseInt(pvMatch![1])).toBeGreaterThanOrEqual(10);
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
// TL-7: Log button filled background
// ============================================================================
describe('TL-7: Log button styling', () => {
  test('timelineLogButton has filled background', () => {
    const match = src.match(/timelineLogButton:\s*\{[^}]+\}/);
    expect(match).not.toBeNull();
    expect(match![0]).toContain('backgroundColor');
  });

  test('Done button style exists for completed items', () => {
    expect(src).toMatch(/doneButton|b-ibtn.*done|timelineStatusText|Done/);
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
