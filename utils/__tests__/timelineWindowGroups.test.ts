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
    expect(headerSrc).toMatch(/row:\s*\{[\s\S]{0,400}?paddingHorizontal:/);
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

  test('pending and done item names use identical font size', () => {
    const pendingMatch = src.match(/timelineName:\s*\{[^}]+\}/);
    const doneMatch = src.match(/timelineNameDone:\s*\{[^}]+\}/);
    expect(pendingMatch).not.toBeNull();
    expect(doneMatch).not.toBeNull();
    const pendingSize = pendingMatch![0].match(/fontSize:\s*(\d+)/);
    const doneSize = doneMatch![0].match(/fontSize:\s*(\d+)/);
    expect(pendingSize).not.toBeNull();
    expect(doneSize).not.toBeNull();
    expect(pendingSize![1]).toBe(doneSize![1]);
  });

  test('tap-to-toggle still works via the SchedulePeriodHeader onToggle', () => {
    expect(src).toContain('toggleWindow(window)');
    expect(src).toContain('onToggle={() => toggleWindow(window)}');
  });
});
