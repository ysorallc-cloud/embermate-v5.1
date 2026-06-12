/**
 * Tests for TimelineSection window group changes:
 * 1. Period header — extracted into SchedulePeriodHeader (with chevron + hint).
 * 2. Default collapse based on completion status (not time-of-day).
 */
import * as fs from 'fs';
import * as path from 'path';

const src = fs.readFileSync(
  path.resolve(__dirname, '../../components/now/TimelineSection.tsx'),
  'utf-8',
);
const headerSrc = fs.readFileSync(
  path.resolve(__dirname, '../../components/now/SchedulePeriodHeader.tsx'),
  'utf-8',
);

// ============================================================================
// Change 1: Period header — moved into SchedulePeriodHeader
// ============================================================================
describe('Period header — SchedulePeriodHeader extraction', () => {
  test('TimelineSection delegates to SchedulePeriodHeader', () => {
    expect(src).toContain('<SchedulePeriodHeader');
    expect(src).toContain("import { SchedulePeriodHeader } from './SchedulePeriodHeader'");
  });

  test('header pill style declares background, padding, and rounded corners', () => {
    expect(headerSrc).toMatch(/row:\s*\{[\s\S]{0,400}?backgroundColor:/);
    // May 1 spacing-rhythm Phase 2: card padding moved from
    // paddingVertical/paddingHorizontal axis pair to symmetric `padding: 12`.
    expect(headerSrc).toMatch(/row:\s*\{[\s\S]{0,400}?\bpadding:/);
    expect(headerSrc).toMatch(/row:\s*\{[\s\S]{0,400}?borderRadius:/);
  });

  test('header renders icon, title, and count text nodes', () => {
    expect(headerSrc).toMatch(/styles\.icon\b/);
    expect(headerSrc).toMatch(/styles\.title\b/);
    expect(headerSrc).toMatch(/styles\.count\b/);
  });

  test('count uses caregiver-warm metadata vocabulary', () => {
    // v6.7 tone pass: "remaining" / "Complete ✓" copy was retired in
    // favour of getPeriodStatus labels — "to go" / "caught up" /
    // "complete" / "not logged" / "coming up". The header file should
    // surface those phrases (in the legacy fallback) and not re-introduce
    // the older copy.
    expect(headerSrc).toMatch(/to go|caught up/);
    expect(headerSrc).not.toMatch(/Complete\s+✓|Complete\s+\\u2713/);
  });
});

// ============================================================================
// Change 2: Default collapse based on completion status
// ============================================================================
describe('Window default collapse based on completion', () => {
  test('initial collapsedWindows state does NOT use getCurrentTimeWindow', () => {
    const stateInit = src.match(
      /const \[collapsedWindows, setCollapsedWindows\] = useState[\s\S]*?\)\);/,
    );
    expect(stateInit).not.toBeNull();
    expect(stateInit![0]).not.toContain('getCurrentTimeWindow');
  });

  test('collapsed state is computed from item completion status', () => {
    const stateInit = src.match(
      /const \[collapsedWindows, setCollapsedWindows\] = useState[\s\S]*?\)\);/,
    );
    expect(stateInit).not.toBeNull();
    expect(stateInit![0]).toMatch(/completed|skipped|allDone|every/);
  });

  test('done item names compress to 12px (F7 zone restructure)', () => {
    // Pre-F7 contract: pending + done used identical font size (13),
    // with the strikethrough + opacity carrying the differentiation.
    // F7 explicitly compresses done to 12px so completed work recedes
    // visually under the new zone-architecture rhythm.
    const pendingMatch = src.match(/timelineName:\s*\{[^}]+\}/);
    const doneMatch = src.match(/timelineNameDone:\s*\{[^}]+\}/);
    expect(pendingMatch).not.toBeNull();
    expect(doneMatch).not.toBeNull();
    const pendingSize = pendingMatch![0].match(/fontSize:\s*(\d+)/);
    const doneSize = doneMatch![0].match(/fontSize:\s*(\d+)/);
    expect(pendingSize![1]).toBe('13');
    expect(doneSize![1]).toBe('12');
  });

  test('tap-to-toggle still works via the SchedulePeriodHeader onToggle', () => {
    expect(src).toContain('toggleWindow(window)');
    expect(src).toContain('onToggle={() => toggleWindow(window)}');
  });
});
