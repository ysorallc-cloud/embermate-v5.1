/**
 * Tests for TimelineSection window group changes:
 * 1. Window banner headers with icon, title, count
 * 2. Default collapse based on completion status (not time-of-day)
 */
import * as fs from 'fs';
import * as path from 'path';

const src = fs.readFileSync(
  path.resolve(__dirname, '../../components/now/TimelineSection.tsx'), 'utf-8'
);

// ============================================================================
// Change 1: Window banner headers
// ============================================================================
describe('Window banner headers', () => {
  test('windowBanner style exists with background and padding', () => {
    const bannerMatch = src.match(/windowBanner:\s*\{[^}]+\}/);
    expect(bannerMatch).not.toBeNull();
    const block = bannerMatch![0];
    expect(block).toContain('backgroundColor');
    expect(block).toContain('borderRadius');
    expect(block).toContain('paddingHorizontal');
  });

  test('windowBannerTitle and windowBannerCount styles exist', () => {
    expect(src).toContain('windowBannerTitle:');
    expect(src).toContain('windowBannerCount:');
  });

  test('window header renders banner with icon, title, and count', () => {
    // The header should render windowBanner, windowIcon, windowBannerTitle, windowBannerCount
    expect(src).toContain('styles.windowBanner');
    expect(src).toContain('styles.windowIcon');
    expect(src).toContain('styles.windowBannerTitle');
    expect(src).toContain('styles.windowBannerCount');
  });

  test('banner count shows remaining or Complete check', () => {
    expect(src).toContain('remaining');
    expect(src).toMatch(/Complete.*\\u2713|Complete.*✓/);
  });
});

// ============================================================================
// Change 2: Default collapse based on completion status
// ============================================================================
describe('Window default collapse based on completion', () => {
  test('initial collapsedWindows state does NOT use getCurrentTimeWindow', () => {
    // The useState initializer for collapsedWindows should not call getCurrentTimeWindow
    const stateInit = src.match(
      /const \[collapsedWindows, setCollapsedWindows\] = useState[\s\S]*?\)\);/
    );
    expect(stateInit).not.toBeNull();
    const initBlock = stateInit![0];
    expect(initBlock).not.toContain('getCurrentTimeWindow');
  });

  test('collapsed state is computed from item completion status', () => {
    // The initializer should check if all items in a window are completed/skipped
    const stateInit = src.match(
      /const \[collapsedWindows, setCollapsedWindows\] = useState[\s\S]*?\)\);/
    );
    expect(stateInit).not.toBeNull();
    const initBlock = stateInit![0];
    // Should reference status checks for completed/skipped or allDone
    expect(initBlock).toMatch(/completed|skipped|allDone|every/);
  });

  test('pending and done item names use identical font size', () => {
    const pendingMatch = src.match(/timelineName:\s*\{[^}]+\}/);
    const doneMatch = src.match(/timelineNameDone:\s*\{[^}]+\}/);
    expect(pendingMatch).not.toBeNull();
    expect(doneMatch).not.toBeNull();
    // Extract fontSize from both
    const pendingSize = pendingMatch![0].match(/fontSize:\s*(\d+)/);
    const doneSize = doneMatch![0].match(/fontSize:\s*(\d+)/);
    expect(pendingSize).not.toBeNull();
    expect(doneSize).not.toBeNull();
    expect(pendingSize![1]).toBe(doneSize![1]);
  });

  test('tap-to-toggle still works via TouchableOpacity', () => {
    expect(src).toContain('toggleWindow(window)');
    expect(src).toContain('TouchableOpacity');
  });
});
