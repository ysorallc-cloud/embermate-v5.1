// File: utils/__tests__/duplicateProgressHeader.test.ts
// PURPOSE: Verify ProgressRings is a flat inline component and now.tsx uses SectionHeaderRow

import { readFileSync } from 'fs';
import { join } from 'path';

describe('Duplicate progress header fix', () => {
  test('ProgressRings does NOT render its own section header', () => {
    const content = readFileSync(
      join(__dirname, '../../components/now/ProgressRings.tsx'), 'utf8'
    );
    // Should NOT render TODAY'S PROGRESS as a visible header element
    expect(content).not.toMatch(/<Text[^>]*>.*TODAY'S PROGRESS/);
    expect(content).not.toMatch(/title.*TODAY'S PROGRESS/i);
    // Should NOT contain the internal manageLink/Care Plan text
    expect(content).not.toMatch(/Manage Care Plan/);
  });

  test('Now screen uses SectionHeaderRow instead of old SectionHeader', () => {
    // SectionHeaderRow moved to NowTimeline.tsx during Phase 10.3 decomposition
    const timelineSrc = readFileSync(
      join(__dirname, '../../components/now/NowTimeline.tsx'), 'utf8'
    );
    const nowSrc = readFileSync(
      join(__dirname, '../../app/(tabs)/now.tsx'), 'utf8'
    );
    // Old SectionHeader component should not be used in either file
    expect(nowSrc).not.toMatch(/<SectionHeader\s/);
    expect(timelineSrc).not.toMatch(/<SectionHeader\s/);
    // SectionHeaderRow should exist in NowTimeline (replaced SectionHeader)
    expect(timelineSrc).toContain('SectionHeaderRow');
  });

  test('ProgressRings renders as flat inline row with dot+label per category', () => {
    const content = readFileSync(
      join(__dirname, '../../components/now/ProgressRings.tsx'), 'utf8'
    );
    // Uses CATEGORY_CONFIG for labels/colors
    expect(content).toContain('CATEGORY_CONFIG');
    // Renders a row of items with dot + label
    expect(content).toContain('styles.row');
    expect(content).toContain('styles.dot');
    expect(content).toContain('styles.label');
  });
});
