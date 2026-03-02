// File: utils/__tests__/duplicateProgressHeader.test.ts
// PURPOSE: Verify no duplicate progress header and new SectionHeaderRow is used
// Updated for refined card layout: SectionHeader replaced by SectionHeaderRow

import { readFileSync } from 'fs';
import { join } from 'path';

describe('Duplicate progress header fix', () => {
  test('ProgressRings does NOT render its own section header', () => {
    const content = readFileSync(
      join(__dirname, '../../components/now/ProgressRings.tsx'), 'utf8'
    );
    // Should NOT contain the internal header text
    expect(content).not.toContain("TODAY'S PROGRESS");
    // Should NOT contain the internal manageLink/Care Plan text
    expect(content).not.toMatch(/Manage Care Plan/);
  });

  test('Now screen uses SectionHeaderRow "Today\'s Progress" instead of old SectionHeader', () => {
    const content = readFileSync(
      join(__dirname, '../../app/(tabs)/now.tsx'), 'utf8'
    );
    // Old SectionHeader component should not be used
    expect(content).not.toMatch(/<SectionHeader\s/);
    // New SectionHeaderRow with "Today's Progress" should exist
    expect(content).toContain('title="Today\'s Progress"');
  });

  test('ProgressRings still renders the tile strip', () => {
    const content = readFileSync(
      join(__dirname, '../../components/now/ProgressRings.tsx'), 'utf8'
    );
    expect(content).toContain('styles.strip');
    expect(content).toContain('renderCell');
  });
});
