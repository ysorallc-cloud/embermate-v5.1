/**
 * Tests for Journal redesign — briefing layout with data rows and insight callouts.
 * Replaces the old card-based JournalSection layout.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const src = readFileSync(join(__dirname, '../../app/(tabs)/journal.tsx'), 'utf8');
const render = src.slice(src.indexOf('return ('));

// ============================================================================
// ZONE 1: TODAY'S SUMMARY (narrative briefing)
// ============================================================================
describe('Zone 1: Today\'s Summary', () => {
  test('section header "Today\'s Summary" exists', () => {
    expect(render).toContain("Today's Summary");
  });

  test('briefing paragraph renders handoffNarrative or statusNarrative', () => {
    // Should reference brief.handoffNarrative or brief.statusNarrative
    expect(src).toMatch(/handoffNarrative|statusNarrative/);
    // Should have a briefing style
    expect(src).toContain('briefingText');
  });

  test('zone divider appears after briefing', () => {
    const briefingIdx = render.indexOf('briefingText');
    const dividerIdx = render.indexOf('zoneDivider', briefingIdx);
    expect(briefingIdx).toBeGreaterThan(-1);
    expect(dividerIdx).toBeGreaterThan(briefingIdx);
  });
});

// ============================================================================
// ZONE 2: DETAILS (data rows with status dots)
// ============================================================================
describe('Zone 2: Details data rows', () => {
  test('section header "Details" exists', () => {
    expect(render).toContain('"Details"');
  });

  test('data row styles exist (dataRow, dataRowDot, dataRowLabel, dataRowDetail, dataRowValue)', () => {
    expect(src).toContain('dataRow:');
    expect(src).toContain('dataRowDot:');
    expect(src).toContain('dataRowLabel:');
    expect(src).toContain('dataRowDetail:');
    expect(src).toContain('dataRowValue:');
  });

  test('three dot color variants exist (dotGreen, dotAmber, dotRed)', () => {
    expect(src).toContain('dotGreen:');
    expect(src).toContain('dotAmber:');
    expect(src).toContain('dotRed:');
  });

  test('data row dot is 8px circle', () => {
    const dotMatch = src.match(/dataRowDot:\s*\{[^}]+\}/);
    expect(dotMatch).not.toBeNull();
    const block = dotMatch![0];
    expect(block).toContain('width: 8');
    expect(block).toContain('height: 8');
    expect(block).toContain('borderRadius: 4');
  });
});

// ============================================================================
// INSIGHT CALLOUTS
// ============================================================================
describe('Insight callouts', () => {
  test('insight callout styles exist', () => {
    expect(src).toContain('insightCallout:');
    expect(src).toContain('insightLabel:');
    expect(src).toContain('insightText:');
  });

  test('insight callout has amber left border', () => {
    const match = src.match(/insightCallout:\s*\{[^}]+\}/);
    expect(match).not.toBeNull();
    expect(match![0]).toContain('borderLeftWidth');
    expect(match![0]).toContain('borderLeftColor');
  });

  test('interpretations are used to render insight callouts', () => {
    expect(src).toMatch(/interpretations/);
  });
});

// ============================================================================
// ZONE 3: TOMORROW (appointment)
// ============================================================================
describe('Zone 3: Tomorrow', () => {
  test('section header "Tomorrow" exists', () => {
    expect(render).toContain('"Tomorrow"');
  });

  test('appointment renders with prep progress bar', () => {
    expect(src).toContain('prepBar');
    expect(src).toContain('prepDot');
  });
});

// ============================================================================
// REMOVED ELEMENTS
// ============================================================================
describe('Removed elements', () => {
  test('JournalSection component is removed', () => {
    expect(src).not.toMatch(/function JournalSection/);
    expect(render).not.toMatch(/<JournalSection/);
  });

  test('Badge component is removed', () => {
    expect(src).not.toMatch(/function Badge\(/);
  });

  test('Quick log buttons are removed from render', () => {
    expect(render).not.toContain('quickLogRow');
    expect(render).not.toContain('quickLogChip');
    expect(render).not.toContain('Quick log');
  });

  test('purpose prop is removed from header', () => {
    // The ScreenHeader in the main render should not have purpose="A record of today\'s care."
    const headerBlock = render.match(/<ScreenHeader[\s\S]*?\/>/);
    expect(headerBlock).not.toBeNull();
    expect(headerBlock![0]).not.toContain('purpose=');
  });
});

// ============================================================================
// STRUCTURAL INTEGRITY
// ============================================================================
describe('Structural integrity', () => {
  test('Share button still exists in header', () => {
    expect(render).toContain('Share');
    expect(src).toContain('/care-report');
  });

  test('zone dividers separate the three zones', () => {
    const dividers = render.match(/zoneDivider/g);
    expect(dividers).not.toBeNull();
    expect(dividers!.length).toBeGreaterThanOrEqual(2);
  });

  test('timestamp still renders at the bottom', () => {
    expect(render).toContain('s.timestamp');
  });
});
